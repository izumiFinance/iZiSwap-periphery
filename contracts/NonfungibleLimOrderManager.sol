// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

import "./libraries/FixedPoint128.sol";
import './libraries/MulDivMath.sol';
import './libraries/FixedPoint96.sol';
import "./base/base.sol";
import "./libraries/LogPowMath.sol";
import "hardhat/console.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

contract NonfungibleLOrderManager is Base, IiZiSwapAddLimOrderCallback {

    using EnumerableSet for EnumerableSet.UintSet;

    // max-poolId in poolIds, poolId starts from 1
    uint128 maxPoolId = 1;

    // infomation of a limit order
    struct LimOrder {
        // point (price) of limit order
        int24 pt;
        // initial amount of token on sale
        uint256 amount;
        // remaing amount of token on sale
        uint256 sellingRemain;
        // accumulated decreased token
        uint256 accSellingDec;
        // uncollected decreased token
        uint256 sellingDec;
        // uncollected earned token
        uint256 earn;
        // total amount of earned token by all users at this point 
        // with same direction (sell x or sell y) as of the last update(add/dec)
        uint256 lastAccEarn;
        // id of pool in which this liquidity is added
        uint128 poolId;
        // direction of limit order (sellx or sell y)
        bool sellXEarnY;
        // block.timestamp when add a limit order
        uint256 timestamp;
    }

    // mapping from limit order id to limit order info
    mapping(uint256 =>LimOrder) public limOrders;

    // number of limit order add via this contract
    uint256 public sellNum = 0;
    
    // owners of limit order
    mapping(uint256 =>address) public sellers;
    
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

    // seller's active order id
    mapping(address => EnumerableSet.UintSet) private addr2ActiveOrderID;
    // seller's canceled or finished order id
    mapping(address => EnumerableSet.UintSet) private addr2DeactiveOrderID;

    // maximum number of active order per user
    uint256 public immutable ACTIVE_ORDER_LIM = 300;

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

    /// @notice callback for add limit order, in order to deposit corresponding tokens
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

    modifier checkAuth(uint256 lid) {
        require(sellers[lid] == msg.sender, "Not approved");
        _;
    }

    modifier checkActive(uint256 lid) {
        EnumerableSet.UintSet storage activeIDs = addr2ActiveOrderID[msg.sender];
        require(activeIDs.contains(lid), "Not Active");
        _;
    }

    /// @notice constructor to create this contract
    /// @param factory address of iZiSwapFactory
    /// @param weth address of WETH token
    constructor(
        address factory,
        address weth
    ) Base(factory, weth) {
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
    function getEarnX(address pool, bytes32 key) private view returns(uint256, uint256) {
        (uint256 lastAccEarn, , , uint256 earn, ) = IiZiSwapPool(pool).userEarnX(key);
        return (lastAccEarn, earn);
    }
    function getEarnX(address pool, address miner, int24 pt) private view returns(uint256 accEarn, uint256 earn) {
        (accEarn, earn) = getEarnX(pool, limOrderKey(miner, pt));
    }
    function getEarnY(address pool, bytes32 key) private view returns(uint256, uint256) {
        (uint256 lastAccEarn, , , uint256 earn, ) = IiZiSwapPool(pool).userEarnY(key);
        return (lastAccEarn, earn);
    }
    function getEarnY(address pool, address miner, int24 pt) private view returns(uint256 accEarn, uint256 earn) {
        (accEarn, earn) = getEarnY(pool, limOrderKey(miner, pt));
    }
    function getEarn(address pool, address miner, int24 pt, bool sellXEarnY) private view returns(uint256 accEarn, uint256 earn) {
        if (sellXEarnY) {
            (accEarn, earn) = getEarnY(pool, limOrderKey(miner, pt));
        } else {
            (accEarn, earn) = getEarnX(pool, limOrderKey(miner, pt));
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
    }

    function _addLimOrder(
        address pool, AddLimOrderParam memory addLimitOrderParam
    ) private returns (uint128 order, uint256 acquire) {
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

    /// @notice add a limit order for recipient
    /// @param recipient owner of the limit order and will benefit from it
    /// @param addLimitOrderParam describe params of added limit order, see AddLimOrderParam for more
    /// @return orderId id of added limit order
    /// @return orderAmount actual amount of token added in limit order
    /// @return acquire amount of tokenY acquired if there is a limit order to sell the other token before adding
    function newLimOrder(
        address recipient,
        AddLimOrderParam calldata addLimitOrderParam
    ) external payable returns (uint256 orderId, uint128 orderAmount, uint256 acquire) {
        require(addLimitOrderParam.tokenX < addLimitOrderParam.tokenY, 'x<y');
        require(addr2ActiveOrderID[recipient].length() < ACTIVE_ORDER_LIM, "Active Limit");
        address pool = IiZiSwapFactory(factory).pool(addLimitOrderParam.tokenX, addLimitOrderParam.tokenY, addLimitOrderParam.fee);
        (orderAmount, acquire) = _addLimOrder(pool, addLimitOrderParam);
        orderId = sellNum ++;
        (uint256 accEarn, ) = getEarn(pool, address(this), addLimitOrderParam.pt, addLimitOrderParam.sellXEarnY);
        uint128 poolId = cachePoolKey(pool, PoolMeta({tokenX: addLimitOrderParam.tokenX, tokenY: addLimitOrderParam.tokenY, fee: addLimitOrderParam.fee}));
        limOrders[orderId] = LimOrder({
            pt: addLimitOrderParam.pt,
            amount: addLimitOrderParam.amount,
            sellingRemain: orderAmount,
            accSellingDec: 0,
            sellingDec: 0,
            earn: acquire,
            lastAccEarn: accEarn,
            poolId: poolId,
            sellXEarnY: addLimitOrderParam.sellXEarnY,
            timestamp: block.timestamp
        });
        addr2ActiveOrderID[recipient].add(orderId);
        sellers[orderId] = recipient;
    }

    /// @notice compute max amount of earned token the seller can claim
    /// @param lastAccEarn total amount of earned token of all users on this point before last update of this limit order
    /// @param accEarn total amount of earned token of all users on this point now
    /// @param earnRemain total amount of unclaimed earned token of all users on this point
    /// @return earnLim max amount of earned token the seller can claim
    function getEarnLim(uint256 lastAccEarn, uint256 accEarn, uint256 earnRemain) private pure returns(uint256 earnLim) {
        require(accEarn >= lastAccEarn, "AEO");
        earnLim = accEarn - lastAccEarn;
        if (earnLim > earnRemain) {
            earnLim = earnRemain;
        }
    }

    /// @notice compute amount of earned token and amount of sold token for a limit order
    ///    we will make amount of earned token as max as possible
    /// @param sqrtPrice_96 a 96 bit fixpoint number to describe sqrt(price) of pool
    /// @param earnLim max amount of earned token computed by getEarnLim(...)
    /// @param sellingRemain amount of token before exchange in the limit order
    /// @param isEarnY direction of the limit order (sell Y or sell tokenY)
    /// @return earn amount of earned token this limit order can claim
    /// @return sold amount of sold token which will be minused from sellingRemain
    function getEarnSold(
        uint160 sqrtPrice_96,
        uint256 earnLim,
        uint256 sellingRemain,
        bool isEarnY
    ) private pure returns (uint256 earn, uint256 sold) {
        earn = earnLim;
        if (isEarnY) {
            uint256 l = MulDivMath.mulDivCeil(earn, FixedPoint96.Q96, sqrtPrice_96);
            sold = MulDivMath.mulDivCeil(l, FixedPoint96.Q96, sqrtPrice_96);
        } else {
            uint256 l = MulDivMath.mulDivCeil(earn, sqrtPrice_96, FixedPoint96.Q96);
            sold = MulDivMath.mulDivCeil(l, sqrtPrice_96, FixedPoint96.Q96);
        }
        if (sold > sellingRemain) {
            sold = sellingRemain;
            if (isEarnY) {
                uint256 l = MulDivMath.mulDivFloor(sold, sqrtPrice_96, FixedPoint96.Q96);
                earn = MulDivMath.mulDivFloor(l, sqrtPrice_96, FixedPoint96.Q96);
            } else {
                uint256 l = MulDivMath.mulDivFloor(sold, FixedPoint96.Q96, sqrtPrice_96);
                earn = MulDivMath.mulDivFloor(l, FixedPoint96.Q96, sqrtPrice_96);
            }
        }
    }

    function assignLimOrderEarn(
        address pool, int24 pt, uint256 amount, bool isEarnY
    ) private returns(uint256 actualAssign) {
        if (isEarnY) {
            actualAssign = IiZiSwapPool(pool).assignLimOrderEarnY(pt, amount);
        } else {
            actualAssign = IiZiSwapPool(pool).assignLimOrderEarnX(pt, amount);
        }
    }

    /// @notice update an limit order
    ///    the principle to update is to make this order claim earned tokens as much as posible
    /// @param order the order to update, see LimOrder for more
    /// @param pool address of swap pool
    /// @return earn amount of earned token this limit order can claim
    function _updateOrder(
        LimOrder storage order,
        address pool
    ) private returns (uint256 earn) {
        if (order.sellXEarnY) {
            IiZiSwapPool(pool).decLimOrderWithX(order.pt, 0);
        } else {
            IiZiSwapPool(pool).decLimOrderWithY(order.pt, 0);
        }
        (uint256 accEarn, uint256 earnLim) = getEarn(pool, address(this), order.pt, order.sellXEarnY);
        earnLim = getEarnLim(order.lastAccEarn, accEarn, earnLim);
        uint160 sqrtPrice_96 = LogPowMath.getSqrtPrice(order.pt);
        uint256 sold;
        (earn, sold) = getEarnSold(sqrtPrice_96, earnLim, order.sellingRemain, order.sellXEarnY);
        earn = assignLimOrderEarn(pool, order.pt, earn, order.sellXEarnY);
        order.earn = order.earn + earn;
        order.sellingRemain = order.sellingRemain - sold;
        order.lastAccEarn = accEarn;
    }

    /// @notice update an limit order
    ///    the principle to update is to make this order claim earned tokens as much as posible
    /// @param orderId id of order to update
    /// @return earn amount of earned token this limit order can claim
    function updateOrder(
        uint256 orderId
    ) external checkAuth(orderId) checkActive(orderId) returns (uint256 earn) {
        LimOrder storage order = limOrders[orderId];
        address pool = poolAddrs[order.poolId];
        earn = _updateOrder(order, pool);
    }

    /// @notice decrease amount of selling-token of a limit order
    /// @param orderId point of seller's limit order
    /// @param amount max amount of selling-token to decrease
    /// @return actualDelta actual amount of selling-token decreased
    function decLimOrder(
        uint256 orderId,
        uint128 amount
    ) external checkAuth(orderId) checkActive(orderId) returns (uint128 actualDelta) {
        require(amount > 0, "A0");
        LimOrder storage order = limOrders[orderId];
        address pool = poolAddrs[order.poolId];
        // update order first
        _updateOrder(order, pool);
        // now dec
        actualDelta = amount;
        if (actualDelta > order.sellingRemain) {
            actualDelta = uint128(order.sellingRemain);
        }
        uint128 actualDeltaRefund;
        if (order.sellXEarnY) {
            actualDeltaRefund = IiZiSwapPool(pool).decLimOrderWithX(order.pt, actualDelta);
        } else {
            actualDeltaRefund = IiZiSwapPool(pool).decLimOrderWithY(order.pt, actualDelta);
        }
        // actualDeltaRefund may be less than actualDelta
        // but we still minus actualDelta in sellingRemain, and only add actualDeltaRefund to sellingDec
        // because if actualDeltaRefund < actualDelta
        // then other users cannot buy from this limit order any more
        // and also, the seller cannot fetch back more than actualDeltaRefund from swap pool >_<
        // but fortunately, actualDeltaRefund < actualDelta only happens after swap on this limit order
        // and also, actualDelta - actualDeltaRefund is a very small deviation
        order.sellingRemain -= actualDelta;
        order.sellingDec += actualDeltaRefund;
        order.accSellingDec += actualDeltaRefund;
    }

    /// @notice collect earned or decreased token from limit order
    /// @param recipient address to benefit
    /// @param orderId id of limit order
    /// @param collectDec max amount of decreased selling token to collect
    /// @param collectEarn max amount of earned token to collect
    /// @return actualCollectDec actual amount of decresed selling token collected
    /// @return actualCollectEarn actual amount of earned token collected
    function collectLimOrder(
        address recipient,
        uint256 orderId,
        uint256 collectDec,
        uint256 collectEarn
    ) external checkAuth(orderId) checkActive(orderId) returns (uint256 actualCollectDec, uint256 actualCollectEarn) {
        LimOrder storage order = limOrders[orderId];
        address pool = poolAddrs[order.poolId];
        // update order first
        _updateOrder(order, pool);
        // now collect
        actualCollectDec = collectDec;
        if (actualCollectDec > order.sellingDec) {
            actualCollectDec = order.sellingDec;
        }
        actualCollectEarn = collectEarn;
        if (actualCollectEarn > order.earn) {
            actualCollectEarn = order.earn;
        }
        if (recipient == address(0)) {
            recipient = address(this);
        }
        IiZiSwapPool(pool).collectLimOrder(recipient, order.pt, actualCollectDec, actualCollectEarn, order.sellXEarnY);
        // collect from core may be less, but we still do not modify actualCollectEarn(Dec)
        order.sellingDec -= actualCollectDec;
        order.earn -= actualCollectEarn;

        bool noRemain = (order.sellingRemain == 0);
        if (order.sellingRemain > 0) {
            noRemain = (order.amount / order.sellingRemain > 100000);
        }

        if (order.sellingDec == 0 && noRemain && order.earn == 0) {
            addr2ActiveOrderID[msg.sender].remove(orderId);
            addr2DeactiveOrderID[msg.sender].add(orderId);
        }
    }

    /// @notice return active order ids for seller
    /// @param _user address of seller
    /// @return list of active order ids
    function getActiveOrderIDs(address _user)
        external
        view
        returns (uint256[] memory)
    {
        EnumerableSet.UintSet storage ids = addr2ActiveOrderID[_user];
        // push could not be used in memory array
        // we set the tokenIdList into a fixed-length array rather than dynamic
        uint256[] memory tokenIdList = new uint256[](ids.length());
        for (uint256 i = 0; i < ids.length(); i++) {
            tokenIdList[i] = ids.at(i);
        }
        return tokenIdList;
    }

    /// @notice return deactive order ids for seller
    /// @param _user address of seller
    /// @return list of deactive order ids
    function getDeactiveOrderIDs(address _user)
        external
        view
        returns (uint256[] memory)
    {
        EnumerableSet.UintSet storage ids = addr2DeactiveOrderID[_user];
        // push could not be used in memory array
        // we set the tokenIdList into a fixed-length array rather than dynamic
        uint256 len = ids.length();
        if (len > ACTIVE_ORDER_LIM) {
            len = ACTIVE_ORDER_LIM;
        }
        uint256[] memory tokenIdList = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            tokenIdList[i] = ids.at(i);
        }
        return tokenIdList;
    }
}