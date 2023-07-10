// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

import "./libraries/MulDivMath.sol";
import "./libraries/TwoPower.sol";
import "./libraries/LogPowMath.sol";
import "./libraries/SoloLimOrder.sol";
import "./libraries/SoloLimOrderCircularQueue.sol";

import "./base/base.sol";

contract LimitOrderManagerSolo is Base, IiZiSwapAddLimOrderCallback {

    using SoloLimOrderCircularQueue for SoloLimOrderCircularQueue.Queue;

    /// @notice Emitted when user successfully create an limit order
    /// @param pool address of swap pool
    /// @param point point (price) of this limit order
    /// @param user address of user
    /// @param amount amount of token ready to sell
    /// @param sellingRemain amount of selling token remained after successfully create this limit order
    /// @param earn amount of acquired token after successfully create this limit order
    /// @param sellXEarnY true if this order sell tokenX, false if sell tokenY
    event NewLimitOrder(
        address pool,
        int24 point,
        address user,
        uint128 amount,
        uint128 sellingRemain,
        uint128 earn,
        bool sellXEarnY
    );
    /// @notice Emitted when user successfully add an limit order
    /// @param pool address of swap pool
    /// @param point point (price) of this limit order
    /// @param user address of user
    /// @param amount amount of added
    /// @param sellingRemain amount of selling token remained after successfully create this limit order
    /// @param earn amount of acquired token after successfully create this limit order
    /// @param sellXEarnY true if this order sell tokenX, false if sell tokenY
    event AddLimitOrder(
        address pool,
        int24 point,
        address user,
        uint128 amount,
        uint128 sellingRemain,
        uint128 earn,
        bool sellXEarnY
    );
    /// @notice Emitted when user dec or update his limit order
    /// @param pool address of swap pool
    /// @param point point (price) of this limit order
    /// @param user address of user
    /// @param sold amount of token sold from last claim to now
    /// @param earn amount of token earned from last claim to now
    /// @param sellXEarnY true if sell tokenX, false if sell tokenY
    event Claim(
        address pool,
        int24 point,
        address user,
        uint128 sold,
        uint128 earn,
        bool sellXEarnY
    );
    // max-poolId in poolIds, poolId starts from 1
    uint128 private maxPoolId = 1;

    address public seller;

    struct PoolMeta {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    // mapping from pool id to pool's meta info
    mapping(uint128 =>PoolMeta) public poolMetas;

    // mapping from pool id to pool address
    mapping(uint128 =>address) public poolAddrs;

    // mapping from pool address to poolid
    mapping(address =>uint128) public poolIds;

    // set 0 means cancel
    // otherwise value = realIdx + 1
    mapping(address=>mapping(int24=>uint128)) public sellXIdx;
    mapping(address=>mapping(int24=>uint128)) public sellYIdx;

    // seller's active order id
    SoloLimOrder[] private activeOrder;
    // seller's canceled or finished order id
    SoloLimOrderCircularQueue.Queue private deactiveOrder;

    // maximum number of active order per user
    // TODO: 
    //   currently we used a fixed number of storage space. A better way is to allow user to expand it.
    //   Otherwise, the first 300 orders need more gas for storage.
    uint128 public immutable DEACTIVE_ORDER_LIM = 300;

    // callback data passed through iZiSwapPool#addLimOrderWithX(Y) to the callback
    struct LimCallbackData {
        // tokenX of swap pool
        address tokenX;
        // tokenY of swap pool
        address tokenY;
        // fee amount of swap pool
        uint24 fee;
        // the address who provides token to sell
        address payer;
    }

    modifier checkActive(uint128 lIdx) {
        require(activeOrder.length > lIdx, 'Out Of Length!');
        require(activeOrder[lIdx].active, 'Not Active!');
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, 'Not Seller!');
        _;
    }

    /// @notice Constructor to create this contract.
    /// @param factory address of iZiSwapFactory
    /// @param weth address of WETH token
    constructor( address factory, address weth, address sellerAddr ) Base(factory, weth) {
        seller = sellerAddr;
    }

    /// @notice Callback for add limit order, in order to deposit corresponding tokens
    /// @param x amount of tokenX need to pay from miner
    /// @param y amount of tokenY need to pay from miner
    /// @param data encoded LimCallbackData
    function payCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        LimCallbackData memory dt = abi.decode(data, (LimCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        if (x > 0) {
            pay(dt.tokenX, dt.payer, msg.sender, x);
        }
        if (y > 0) {
            pay(dt.tokenY, dt.payer, msg.sender, y);
        }
    }

    function limOrderKey(address miner, int24 pt) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(miner, pt));
    }

    function cachePoolKey(address pool, PoolMeta memory meta) private returns (uint128 poolId) {
        poolId = poolIds[pool];
        if (poolId == 0) {
            poolIds[pool] = (poolId = maxPoolId++);
            poolMetas[poolId] = meta;
            poolAddrs[poolId] = pool;
        }
    }

    function getEarnX(address pool, bytes32 key) private view returns(uint128 sellingRemain, uint128 sellingDec, uint128 earnAssign) {
        (, sellingRemain, sellingDec, , , earnAssign) = IiZiSwapPool(pool).userEarnX(key);
    }

    function getEarnX(address pool, address miner, int24 pt) private view returns(uint128 sellingRemain, uint128 sellingDec, uint128 earnAssign) {
        (sellingRemain, sellingDec, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
    }

    function getEarnY(address pool, bytes32 key) private view returns(uint128 sellingRemain, uint128 sellingDec, uint128 earnAssign) {
        (, sellingRemain, sellingDec, , , earnAssign) = IiZiSwapPool(pool).userEarnY(key);
    }

    function getEarnY(address pool, address miner, int24 pt) private view returns(uint128 sellingRemain, uint128 sellingDec, uint128 earnAssign) {
        (sellingRemain, sellingDec, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
    }

    function getEarn(address pool, address miner, int24 pt, bool sellXEarnY) private view returns(uint128 sellingRemain, uint128 sellingDec, uint128 earnAssign) {
        if (sellXEarnY) {
            (sellingRemain, sellingDec, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
        } else {
            (sellingRemain, sellingDec, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
        }
    }

    /// parameters when calling newLimOrder, grouped together to avoid stake too deep
    struct AddLimOrderParam {
        // tokenX of swap pool
        address tokenX;
        // tokenY of swap pool
        address tokenY;
        // fee amount of swap pool
        uint24 fee;
        // on which point to add limit order
        int24 pt;
        // amount of token to sell
        uint128 amount;
        // sell tokenX or sell tokenY
        bool sellXEarnY;

        uint256 deadline;
    }

    function _coreAddLimOrder(
        address pool, AddLimOrderParam memory addLimitOrderParam
    ) private returns (uint128 order, uint128 acquire) {
        if (addLimitOrderParam.sellXEarnY) {
            (order, acquire) = IiZiSwapPool(pool).addLimOrderWithX(
                address(this), addLimitOrderParam.pt, addLimitOrderParam.amount,
                abi.encode(LimCallbackData({tokenX: addLimitOrderParam.tokenX, tokenY: addLimitOrderParam.tokenY, fee: addLimitOrderParam.fee, payer: msg.sender}))
            );
        } else {
            (order, acquire) = IiZiSwapPool(pool).addLimOrderWithY(
                address(this), addLimitOrderParam.pt, addLimitOrderParam.amount,
                abi.encode(LimCallbackData({tokenX: addLimitOrderParam.tokenX, tokenY: addLimitOrderParam.tokenY, fee: addLimitOrderParam.fee, payer: msg.sender}))
            );
        }
    }

    /// @notice assign some amount of earned token from earnings of corresponding limit order in core contract
    ///    to current user (msg.sender)
    ///    corresponding limit order is an aggregated limit order owned by this contract at same point
    /// @param pool swap pool address
    /// @param pt point (price) of limit order
    /// @param isEarnY direction of the limit order (sell Y or sell tokenY)
    /// @return actualAssign actual earned token assgiend from core
    function assignLimOrderEarn(
        address pool, int24 pt, bool isEarnY
    ) private returns(uint128 actualAssign) {
        uint128 maxAmount = type(uint128).max;
        uint128 assignLegacy = 0;
        uint128 assignUnlegacy = 0;
        
        if (isEarnY) {
            assignLegacy = IiZiSwapPool(pool).assignLimOrderEarnY(pt, maxAmount, true);
            assignUnlegacy = IiZiSwapPool(pool).assignLimOrderEarnY(pt, maxAmount, false);
        } else {
            assignLegacy = IiZiSwapPool(pool).assignLimOrderEarnX(pt, maxAmount, true);
            assignUnlegacy = IiZiSwapPool(pool).assignLimOrderEarnX(pt, maxAmount, false);
        }
        return assignLegacy + assignUnlegacy;
    }

    function getExistsIdx(address pool, int24 pt, bool sellX) public view returns (uint128 idx) {
        if (sellX) {
            idx = sellXIdx[pool][pt];
        } else {
            idx = sellYIdx[pool][pt];
        }
    }

    function setExistIdx(address pool, int24 pt, bool sellX, uint128 idx) internal {
        // idx = 0 means cancel
        if (sellX) {
            sellXIdx[pool][pt] = idx;
        } else {
            sellYIdx[pool][pt] = idx;
        }
    }

    /// @notice Create a limit order.
    /// @param idx slot in the addr2ActiveOrder[msg.sender]
    /// @param addLimitOrderParam describe params of added limit order, see AddLimOrderParam for more
    /// @return orderAmount actual amount of token added in limit order
    /// @return acquire amount of tokenY acquired if there is a limit order to sell the other token before adding
    function newLimOrder(
        uint128 idx,
        AddLimOrderParam calldata addLimitOrderParam
    ) external payable onlySeller checkDeadline(addLimitOrderParam.deadline) returns (uint128 orderAmount, uint128 acquire) {
        require(addLimitOrderParam.tokenX < addLimitOrderParam.tokenY, 'x<y');

        address pool = IiZiSwapFactory(factory).pool(addLimitOrderParam.tokenX, addLimitOrderParam.tokenY, addLimitOrderParam.fee);
        require(pool != address(0), "Pool Not Exists!");
        uint128 existsIdx = getExistsIdx(pool, addLimitOrderParam.pt, addLimitOrderParam.sellXEarnY);
        if (existsIdx > 0) {
            existsIdx --;
            SoloLimOrder storage order = activeOrder[existsIdx];
            PoolMeta memory meta = PoolMeta({
                tokenX: addLimitOrderParam.tokenX,
                tokenY: addLimitOrderParam.tokenY,
                fee: addLimitOrderParam.fee
            });
            return _addLimOrder(pool, meta, addLimitOrderParam.amount, order);
        }
        (orderAmount, acquire) = _coreAddLimOrder(pool, addLimitOrderParam);
        uint128 poolId = cachePoolKey(pool, PoolMeta({tokenX: addLimitOrderParam.tokenX, tokenY: addLimitOrderParam.tokenY, fee: addLimitOrderParam.fee}));

        if (idx < activeOrder.length) {
            // replace
            require(activeOrder[idx].active == false, 'active conflict!');
            activeOrder[idx] = SoloLimOrder({
                pt: addLimitOrderParam.pt,
                amount: addLimitOrderParam.amount,
                accSellingDec: 0,
                poolId: poolId,
                sellXEarnY: addLimitOrderParam.sellXEarnY,
                timestamp: uint128(block.timestamp),
                active: true
            });
        } else {
            activeOrder.push(SoloLimOrder({
                pt: addLimitOrderParam.pt,
                amount: addLimitOrderParam.amount,
                accSellingDec: 0,
                poolId: poolId,
                sellXEarnY: addLimitOrderParam.sellXEarnY,
                timestamp: uint128(block.timestamp),
                active: true
            }));
        }
        setExistIdx(pool, addLimitOrderParam.pt, addLimitOrderParam.sellXEarnY, idx + 1);
        emit NewLimitOrder(pool, addLimitOrderParam.pt, msg.sender, addLimitOrderParam.amount, orderAmount, acquire, addLimitOrderParam.sellXEarnY);
    
    }

    function _addLimOrder(
        address pool,
        PoolMeta memory meta,
        uint128 amount,
        SoloLimOrder storage order
    ) internal returns (uint128 orderAmount, uint128 acquire) {
        (uint128 oldSellingRemain,,uint128 oldEarn) = getEarn(pool, address(this), order.pt, order.sellXEarnY);
        (orderAmount, acquire) = _coreAddLimOrder(pool, AddLimOrderParam({
            tokenX: meta.tokenX,
            tokenY: meta.tokenY,
            fee: meta.fee,
            pt: order.pt,
            amount: amount,
            sellXEarnY: order.sellXEarnY,
            deadline: 0xffffffff
        }));
        order.amount += amount;
        assignLimOrderEarn(pool, order.pt, order.sellXEarnY);
        (uint128 sellingRemain, , uint128 earn) = getEarn(pool, address(this), order.pt, order.sellXEarnY);

        uint128 claimedSold = (oldSellingRemain + orderAmount > sellingRemain) ? oldSellingRemain + orderAmount - sellingRemain : 0;
        uint128 claimedEarn = (earn > oldEarn + acquire) ? earn - oldEarn - acquire : 0;

        emit Claim(pool, order.pt, msg.sender, claimedSold, claimedEarn, order.sellXEarnY);
        emit AddLimitOrder(pool, order.pt, msg.sender, amount, sellingRemain, earn, order.sellXEarnY);
    }

    /// @notice add a limit order.
    /// @param orderIdx slot in the addr2ActiveOrder[msg.sender]
    /// @param amount add amount
    /// @param deadline deadline of this txn
    /// @return orderAmount actual amount of token added in limit order
    /// @return acquire amount of tokenY acquired if there is a limit order to sell the other token before adding
    function addLimOrder(
        uint128 orderIdx,
        uint128 amount,
        uint256 deadline
    ) external payable onlySeller checkActive(orderIdx) checkDeadline(deadline) returns (uint128 orderAmount, uint128 acquire) {
        require(amount > 0, "A0");
        SoloLimOrder storage order = activeOrder[orderIdx];
        address pool = poolAddrs[order.poolId];
        PoolMeta memory meta = poolMetas[order.poolId];
        (orderAmount, acquire) = _addLimOrder(pool, meta, amount, order);
    }

    /// @notice Update a limit order to claim earned tokens as much as possible.
    /// @param order the order to update, see LimOrder for more
    /// @param pool address of swap pool
    /// @return actualDec actual decreased amount
    /// @return earn amount of earned token this limit order can claim
    function _decOrder(
        SoloLimOrder storage order,
        address pool,
        uint128 amount
    ) private returns (uint128 actualDec, uint128 earn) {
        (uint128 oldSellingRemain,,uint128 oldEarn) = getEarn(pool, address(this), order.pt, order.sellXEarnY);
        if (order.sellXEarnY) {
            (actualDec,) = IiZiSwapPool(pool).decLimOrderWithX(order.pt, amount);
        } else {
            (actualDec,) = IiZiSwapPool(pool).decLimOrderWithY(order.pt, amount);
        }
        if (actualDec > 0) {
            order.accSellingDec += actualDec;
        }
        assignLimOrderEarn(pool, order.pt, order.sellXEarnY);
        (uint128 sellingRemain, , uint128 currentEarn) = getEarn(pool, address(this), order.pt, order.sellXEarnY);

        uint128 sold = (oldSellingRemain > sellingRemain) ? oldSellingRemain - sellingRemain : 0;
        earn = (currentEarn > oldEarn) ? currentEarn - oldEarn : 0;

        emit Claim(pool, order.pt, msg.sender, sold, earn, order.sellXEarnY);
    }

    /// @notice Update a limit order to claim earned tokens as much as possible.
    /// @param orderIdx idx of order to update
    /// @return earn amount of earned token this limit order can claim
    function updateOrder(
        uint128 orderIdx
    ) external checkActive(orderIdx) onlySeller returns (uint256 earn) {
        SoloLimOrder storage order = activeOrder[orderIdx];
        address pool = poolAddrs[order.poolId];
        (,earn) = _decOrder(order, pool, 0);
    }

    /// @notice Decrease amount of selling-token of a limit order.
    /// @param orderIdx point of seller's limit order
    /// @param amount max amount of selling-token to decrease
    /// @param deadline deadline timestamp of transaction
    /// @return actualDelta actual amount of selling-token decreased
    function decLimOrder(
        uint128 orderIdx,
        uint128 amount,
        uint256 deadline
    ) external checkActive(orderIdx) onlySeller checkDeadline(deadline) returns (uint128 actualDelta) {
        require(amount > 0, "A0");
        SoloLimOrder storage order = activeOrder[orderIdx];
        address pool = poolAddrs[order.poolId];
        (actualDelta, ) = _decOrder(order, pool, amount);
    }

    /// @notice Collect earned or decreased token from a limit order.
    /// @param recipient address to benefit
    /// @param orderIdx idx of limit order
    /// @return actualCollectDec actual amount of decresed selling token collected
    /// @return actualCollectEarn actual amount of earned token collected
    function collectLimOrder(
        address recipient,
        uint128 orderIdx
    ) external onlySeller checkActive(orderIdx) returns (uint128 actualCollectDec, uint128 actualCollectEarn) {
        SoloLimOrder storage order = activeOrder[orderIdx];
        address pool = poolAddrs[order.poolId];
        // update order first
        _decOrder(order, pool, 0);
        (actualCollectDec, actualCollectEarn) = IiZiSwapPool(pool).collectLimOrder(recipient, order.pt, type(uint128).max, type(uint128).max, order.sellXEarnY);
        (uint128 sellingRemain,,) = getEarn(pool, address(this), order.pt, order.sellXEarnY);

        bool noRemain = (sellingRemain == 0);
        if (sellingRemain > 0) {
            noRemain = (order.amount / sellingRemain > 100000);
        }

        if (noRemain) {
            order.active = false;
            deactiveOrder.add(order, DEACTIVE_ORDER_LIM);
            // set 0 means cancel
            setExistIdx(pool, order.pt, order.sellXEarnY, 0);
        }
    }

    /// @notice Returns active orders for the seller.
    /// @return activeIdx list of active order idx
    /// @return activeLimitOrder list of active order
    function getActiveOrders()
        external
        view
        returns (uint128[] memory activeIdx, SoloLimOrderInfo[] memory activeLimitOrder)
    {
        uint128 activeNum = 0;
        uint128 length = uint128(activeOrder.length);
        for (uint128 i = 0; i < length; i ++) {
            if (activeOrder[i].active) {
                activeNum += 1;
            }
        }
        if (activeNum == 0) {
            return (activeIdx, activeLimitOrder);
        }
        activeIdx = new uint128[](activeNum);
        activeLimitOrder = new SoloLimOrderInfo[](activeNum);
        activeNum = 0;
        for (uint128 i = 0; i < length; i ++) {
            if (activeOrder[i].active) {
                activeIdx[activeNum] = i;
                SoloLimOrder memory order = activeOrder[i];
                SoloLimOrderInfo memory orderInfo = SoloLimOrderInfo({
                    amount: order.amount,
                    sellingRemain: 0,
                    accSellingDec: order.accSellingDec,
                    sellingDec: 0,
                    earn: 0,
                    poolId: order.poolId,
                    timestamp: order.timestamp,
                    pt: order.pt,
                    sellXEarnY: order.sellXEarnY,
                    active: order.active
                });
                address pool = poolAddrs[order.poolId];
                (orderInfo.sellingRemain, orderInfo.sellingDec, orderInfo.earn) = getEarn(pool, address(this), orderInfo.pt, orderInfo.sellXEarnY);

                activeLimitOrder[activeNum] = orderInfo;
                activeNum += 1;
            }
        }
        return (activeIdx, activeLimitOrder);
    }

    /// @notice Returns a single active order for the seller.
    /// @param idx index of the active order list
    /// @return orderInfo the target active order
    function getActiveOrder(uint128 idx) external view returns (SoloLimOrderInfo memory orderInfo) {
        require(idx < activeOrder.length, 'Out Of Length');
        
        SoloLimOrder memory order = activeOrder[idx];
        orderInfo = SoloLimOrderInfo({
            amount: order.amount,
            sellingRemain: 0,
            accSellingDec: order.accSellingDec,
            sellingDec: 0,
            earn: 0,
            poolId: order.poolId,
            timestamp: order.timestamp,
            pt: order.pt,
            sellXEarnY: order.sellXEarnY,
            active: order.active
        });
        address pool = poolAddrs[order.poolId];
        (orderInfo.sellingRemain, orderInfo.sellingDec, orderInfo.earn) = getEarn(pool, address(this), orderInfo.pt, orderInfo.sellXEarnY);
    }

    /// @notice Returns a slot in the active order list, which can be replaced with a new order.
    /// @return slotIdx the first available slot index
    function getDeactiveSlot() external view returns (uint128 slotIdx) {
        slotIdx = uint128(activeOrder.length);
        for (uint128 i = 0; i < activeOrder.length; i ++) {
            if (!activeOrder[i].active) {
                return i;
            }
        }
        return slotIdx;
    }

    /// @notice Returns deactived orders for the seller.
    /// @return deactiveLimitOrder list of deactived orders
    function getDeactiveOrders() external view returns (SoloLimOrderInfo[] memory deactiveLimitOrder) {
        SoloLimOrderCircularQueue.Queue storage queue = deactiveOrder;
        if (queue.limOrders.length == 0) {
            return deactiveLimitOrder;
        }
        deactiveLimitOrder = new SoloLimOrderInfo[](queue.limOrders.length);
        uint128 start = queue.start;
        for (uint128 i = 0; i < queue.limOrders.length; i ++) {
            SoloLimOrder memory order = queue.limOrders[(start + i) % queue.limOrders.length];
            SoloLimOrderInfo memory orderInfo = SoloLimOrderInfo({
                amount: order.amount,
                sellingRemain: 0,
                accSellingDec: order.accSellingDec,
                sellingDec: 0,
                earn: 0,
                poolId: order.poolId,
                timestamp: order.timestamp,
                pt: order.pt,
                sellXEarnY: order.sellXEarnY,
                active: order.active
            });
            deactiveLimitOrder[i] = orderInfo;
        }
        return deactiveLimitOrder;
    }

    /// @notice Returns a single deactived order for the seller.
    /// @param idx index of the deactived order list
    /// @return orderInfo the target deactived order
    function getDeactiveOrder(uint128 idx) external view returns (SoloLimOrderInfo memory orderInfo) {
        SoloLimOrderCircularQueue.Queue storage queue = deactiveOrder;
        require(idx < queue.limOrders.length, 'Out Of Length');
        SoloLimOrder memory order = queue.limOrders[(queue.start + idx) % queue.limOrders.length];
        orderInfo = SoloLimOrderInfo({
            amount: order.amount,
            sellingRemain: 0,
            accSellingDec: order.accSellingDec,
            sellingDec: 0,
            earn: 0,
            poolId: order.poolId,
            timestamp: order.timestamp,
            pt: order.pt,
            sellXEarnY: order.sellXEarnY,
            active: order.active
        });
    }

}
