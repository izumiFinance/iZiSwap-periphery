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
    uint128 maxPoolId = 1;
    struct LimOrder {
        int24 pt;
        uint256 amount;
        uint256 sellingRemain;
        uint256 accSellingDec;
        uint256 sellingDec;
        uint256 earn;
        uint256 lastAccEarn;
        uint128 poolId;
        bool sellXEarnY;
        uint256 timestamp;
    }

    event NewLimitOrder(uint256 indexed limitOrderId, uint256 amount, bool sellXEarnY, uint128 indexed poolId);
    event CancelLimitOrder(uint256 indexed limitOrderId);

    mapping(uint256 =>LimOrder) public limOrders;
    uint256 public sellNum = 0;
    
    mapping(uint256 =>address) public sellers;
    
    struct PoolMeta {
        address tokenX;
        address tokenY;
        uint24 fee;
    }
    mapping(uint128 =>PoolMeta) public poolMetas;
    mapping(uint128 =>address) public poolAddrs;
    mapping(address =>uint128) public poolIds;

    mapping(address => EnumerableSet.UintSet) private addr2ActiveOrderID;
    mapping(address => EnumerableSet.UintSet) private addr2DeactiveOrderID;

    uint256 public immutable ACTIVE_ORDER_LIM = 300;

    struct LimCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
        address payer;
    }
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

    constructor(
        address fac,
        address weth
    ) Base(fac, weth) {
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
        (uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) = IiZiSwapPool(pool).userEarnX(key);
        return (lastAccEarn, earn);
    }
    function getEarnX(address pool, address miner, int24 pt) private view returns(uint256 accEarn, uint256 earn) {
        (accEarn, earn) = getEarnX(pool, limOrderKey(miner, pt));
    }
    function getEarnY(address pool, bytes32 key) private view returns(uint256, uint256) {
        (uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) = IiZiSwapPool(pool).userEarnY(key);
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
    struct AddLimOrderParam {
        address tokenX;
        address tokenY;
        uint24 fee;
        int24 pt;
        uint128 amount;
        bool sellXEarnY;
    }
    function _addLimOrder(
        address pool, AddLimOrderParam memory ap
    ) private returns (uint128 order, uint256 acquire) {
        if (ap.sellXEarnY) {
            (order, acquire) = IiZiSwapPool(pool).addLimOrderWithX(
                address(this), ap.pt, ap.amount,
                abi.encode(LimCallbackData({tokenX: ap.tokenX, tokenY: ap.tokenY, fee: ap.fee, payer: msg.sender}))
            );
        } else {
            (order, acquire) = IiZiSwapPool(pool).addLimOrderWithY(
                address(this), ap.pt, ap.amount,
                abi.encode(LimCallbackData({tokenX: ap.tokenX, tokenY: ap.tokenY, fee: ap.fee, payer: msg.sender}))
            );
        }
    }
    function newLimOrder(
        address recipient,
        AddLimOrderParam calldata ap
    ) external payable returns (uint256 sellId, uint128 order, uint256 acquire) {
        require(ap.tokenX < ap.tokenY, 'x<y');
        require(addr2ActiveOrderID[recipient].length() < ACTIVE_ORDER_LIM, "Active Limit");
        address pool = IiZiSwapFactory(factory).pool(ap.tokenX, ap.tokenY, ap.fee);
        (order, acquire) = _addLimOrder(pool, ap);
        sellId = sellNum ++;
        (uint256 accEarn, uint256 earn) = getEarn(pool, address(this), ap.pt, ap.sellXEarnY);
        uint128 poolId = cachePoolKey(pool, PoolMeta({tokenX: ap.tokenX, tokenY: ap.tokenY, fee: ap.fee}));
        limOrders[sellId] = LimOrder({
            pt: ap.pt,
            amount: ap.amount,
            sellingRemain: order,
            accSellingDec: 0,
            sellingDec: 0,
            earn: acquire,
            lastAccEarn: accEarn,
            poolId: poolId,
            sellXEarnY: ap.sellXEarnY,
            timestamp: block.timestamp
        });
        addr2ActiveOrderID[recipient].add(sellId);
        sellers[sellId] = recipient;
        emit NewLimitOrder(sellId, ap.amount, ap.sellXEarnY, poolId);
    }
    function getEarnLim(uint256 lastAccEarn, uint256 accEarn, uint256 earnRemain) private pure returns(uint256 earnLim) {
        require(accEarn >= lastAccEarn, "AEO");
        earnLim = accEarn - lastAccEarn;
        if (earnLim > earnRemain) {
            earnLim = earnRemain;
        }
    }
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
        (uint256 earn, uint256 sold) = getEarnSold(sqrtPrice_96, earnLim, order.sellingRemain, order.sellXEarnY);
        earn = assignLimOrderEarn(pool, order.pt, earn, order.sellXEarnY);
        order.earn = order.earn + earn;
        order.sellingRemain = order.sellingRemain - sold;
        order.lastAccEarn = accEarn;
    }
    function updateOrder(
        uint256 sellId
    ) external checkAuth(sellId) checkActive(sellId) returns (uint256 earn) {
        LimOrder storage order = limOrders[sellId];
        address pool = poolAddrs[order.poolId];
        earn = _updateOrder(order, pool);
    }
    function decLimOrder(
        uint256 sellId,
        uint128 amount
    ) external checkAuth(sellId) checkActive(sellId) returns (uint128 actualDelta) {
        require(amount > 0, "A0");
        LimOrder storage order = limOrders[sellId];
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
    function collectLimOrder(
        address recipient,
        uint256 sellId,
        uint256 collectDec,
        uint256 collectEarn
    ) external checkAuth(sellId) checkActive(sellId) returns (uint256 actualCollectDec, uint256 actualCollectEarn) {
        LimOrder storage order = limOrders[sellId];
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
            addr2ActiveOrderID[msg.sender].remove(sellId);
            addr2DeactiveOrderID[msg.sender].add(sellId);

            emit CancelLimitOrder(sellId);
        }
    }

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