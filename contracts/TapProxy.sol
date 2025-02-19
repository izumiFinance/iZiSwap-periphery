//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external returns (uint256);
}

interface IiZiSwapPoolPair {
    function tokenX() external view returns(address);
    function tokenY() external view returns(address);
    function fee() external view returns(uint24);
}

interface IiZiSwapPool {

    /// @notice Emitted when miner successfully add liquidity (mint).
    /// @param sender the address that minted the liquidity
    /// @param owner the owner who will benefit from this liquidity
    /// @param leftPoint left endpoint of the liquidity
    /// @param rightPoint right endpoint of the liquidity
    /// @param liquidity the amount of liquidity minted to the range [leftPoint, rightPoint)
    /// @param amountX amount of tokenX deposit
    /// @param amountY amount of tokenY deposit
    event Mint(
        address sender, 
        address indexed owner, 
        int24 indexed leftPoint, 
        int24 indexed rightPoint, 
        uint128 liquidity, 
        uint256 amountX, 
        uint256 amountY
    );

    /// @notice Emitted when miner successfully decrease liquidity (withdraw).
    /// @param owner owner address of liquidity
    /// @param leftPoint left endpoint of liquidity
    /// @param rightPoint right endpoint of liquidity
    /// @param liquidity amount of liquidity decreased
    /// @param amountX amount of tokenX withdrawed
    /// @param amountY amount of tokenY withdrawed
    event Burn(
        address indexed owner, 
        int24 indexed leftPoint,
        int24 indexed rightPoint,
        uint128 liquidity,
        uint256 amountX,
        uint256 amountY
    );

    /// @notice Emitted when fees and withdrawed liquidity are collected 
    /// @param owner The owner of the Liquidity
    /// @param recipient recipient of those token
    /// @param leftPoint The left point of the liquidity
    /// @param rightPoint The right point of the liquidity
    /// @param amountX The amount of tokenX (fees and withdrawed tokenX from liquidity)
    /// @param amountY The amount of tokenY (fees and withdrawed tokenY from liquidity)
    event CollectLiquidity(
        address indexed owner,
        address recipient,
        int24 indexed leftPoint,
        int24 indexed rightPoint,
        uint256 amountX,
        uint256 amountY
    );

    /// @notice Emitted when a trader successfully exchange.
    /// @param tokenX tokenX of pool
    /// @param tokenY tokenY of pool
    /// @param fee fee amount of pool
    /// @param sellXEarnY true for selling tokenX, false for buying tokenX
    /// @param amountX amount of tokenX in this exchange
    /// @param amountY amount of tokenY in this exchange
    event Swap(
        address indexed tokenX,
        address indexed tokenY,
        uint24 indexed fee,
        bool sellXEarnY,
        uint256 amountX,
        uint256 amountY
    );

    /// @notice Emitted by the pool for any flashes of tokenX/tokenY.
    /// @param sender the address that initiated the swap call, and that received the callback
    /// @param recipient the address that received the tokens from flash
    /// @param amountX the amount of tokenX that was flashed
    /// @param amountY the amount of tokenY that was flashed
    /// @param paidX the amount of tokenX paid for the flash, which can exceed the amountX plus the fee
    /// @param paidY the amount of tokenY paid for the flash, which can exceed the amountY plus the fee
    event Flash(
        address indexed sender,
        address indexed recipient,
        uint256 amountX,
        uint256 amountY,
        uint256 paidX,
        uint256 paidY
    );

    /// @notice Emitted when a seller successfully add a limit order.
    /// @param owner owner of limit order
    /// @param addAmount amount of token to sell the seller added
    /// @param acquireAmount amount of earn-token acquired, if there exists some opposite order before 
    /// @param point point of limit order
    /// @param claimSold claimed sold sell-token, if this owner has order with same direction on this point before
    /// @param claimEarn claimed earned earn-token, if this owner has order with same direction on this point before
    /// @param sellXEarnY direction of limit order, etc. sell tokenX or sell tokenY
    event AddLimitOrder(
        address indexed owner,
        uint128 addAmount,
        uint128 acquireAmount,
        int24 indexed point,
        uint128 claimSold,
        uint128 claimEarn,
        bool sellXEarnY
    );

    /// @notice Emitted when a seller successfully decrease a limit order.
    /// @param owner owner of limit order
    /// @param decreaseAmount amount of token to sell the seller decreased
    /// @param point point of limit order
    /// @param claimSold claimed sold sell-token
    /// @param claimEarn claimed earned earn-token
    /// @param sellXEarnY direction of limit order, etc. sell tokenX or sell tokenY
    event DecLimitOrder(
        address indexed owner,
        uint128 decreaseAmount,
        int24 indexed point,
        uint128 claimSold,
        uint128 claimEarn,
        bool sellXEarnY
    );

    /// @notice Emitted when collect from a limit order
    /// @param owner The owner of the Liquidity
    /// @param recipient recipient of those token
    /// @param point The point of the limit order
    /// @param collectDec The amount of decreased sell token collected
    /// @param collectEarn The amount of earn token collected
    /// @param sellXEarnY direction of limit order, etc. sell tokenX or sell tokenY
    event CollectLimitOrder(
        address indexed owner,
        address recipient,
        int24 indexed point,
        uint128 collectDec,
        uint128 collectEarn,
        bool sellXEarnY
    );

    /// @notice Returns the information about a liquidity by the liquidity's key.
    /// @param key the liquidity's key is a hash of a preimage composed by the miner(owner), pointLeft and pointRight
    /// @return liquidity the amount of liquidity,
    /// @return lastFeeScaleX_128 fee growth of tokenX inside the range as of the last mint/burn/collect,
    /// @return lastFeeScaleY_128 fee growth of tokenY inside the range as of the last mint/burn/collect,
    /// @return tokenOwedX the computed amount of tokenX miner can collect as of the last mint/burn/collect,
    /// @return tokenOwedY the computed amount of tokenY miner can collect as of the last mint/burn/collect
    function liquidity(bytes32 key)
        external
        view
        returns (
            uint128 liquidity,
            uint256 lastFeeScaleX_128,
            uint256 lastFeeScaleY_128,
            uint256 tokenOwedX,
            uint256 tokenOwedY
        );
    
    /// @notice Returns the information about a user's limit order (sell tokenY and earn tokenX).
    /// @param key the limit order's key is a hash of a preimage composed by the seller, point
    /// @return lastAccEarn total amount of tokenX earned by all users at this point as of the last add/dec/collect
    /// @return sellingRemain amount of tokenY not selled in this limit order
    /// @return sellingDec amount of tokenY decreased by seller from this limit order
    /// @return earn amount of unlegacy earned tokenX in this limit order not assigned
    /// @return legacyEarn amount of legacy earned tokenX in this limit order not assgined
    /// @return earnAssign assigned amount of tokenX earned (both legacy and unlegacy) in this limit order
    function userEarnX(bytes32 key)
        external
        view
        returns (
            uint256 lastAccEarn,
            uint128 sellingRemain,
            uint128 sellingDec,
            uint128 earn,
            uint128 legacyEarn,
            uint128 earnAssign
        );
    
    /// @notice Returns the information about a user's limit order (sell tokenX and earn tokenY).
    /// @param key the limit order's key is a hash of a preimage composed by the seller, point
    /// @return lastAccEarn total amount of tokenY earned by all users at this point as of the last add/dec/collect
    /// @return sellingRemain amount of tokenX not selled in this limit order
    /// @return sellingDec amount of tokenX decreased by seller from this limit order
    /// @return earn amount of unlegacy earned tokenY in this limit order not assigned
    /// @return legacyEarn amount of legacy earned tokenY in this limit order not assgined
    /// @return earnAssign assigned amount of tokenY earned (both legacy and unlegacy) in this limit order
    function userEarnY(bytes32 key)
        external
        view
        returns (
            uint256 lastAccEarn,
            uint128 sellingRemain,
            uint128 sellingDec,
            uint128 earn,
            uint128 legacyEarn,
            uint128 earnAssign
        );
    
    /// @notice Mark a given amount of tokenY in a limitorder(sellx and earn y) as assigned.
    /// @param point point (log Price) of seller's limit order,be sure to be times of pointDelta
    /// @param assignY max amount of tokenY to mark assigned
    /// @param fromLegacy true for assigning earned token from legacyEarnY
    /// @return actualAssignY actual amount of tokenY marked
    function assignLimOrderEarnY(
        int24 point,
        uint128 assignY,
        bool fromLegacy
    ) external returns(uint128 actualAssignY);
    
    /// @notice Mark a given amount of tokenX in a limitorder(selly and earn x) as assigned.
    /// @param point point (log Price) of seller's limit order,be sure to be times of pointDelta
    /// @param assignX max amount of tokenX to mark assigned
    /// @param fromLegacy true for assigning earned token from legacyEarnX
    /// @return actualAssignX actual amount of tokenX marked
    function assignLimOrderEarnX(
        int24 point,
        uint128 assignX,
        bool fromLegacy
    ) external returns(uint128 actualAssignX);

    /// @notice Decrease limitorder of selling X.
    /// @param point point of seller's limit order, be sure to be times of pointDelta
    /// @param deltaX max amount of tokenX seller wants to decrease
    /// @return actualDeltaX actual amount of tokenX decreased
    /// @return legacyAccEarn legacyAccEarnY of pointOrder at point when calling this interface
    function decLimOrderWithX(
        int24 point,
        uint128 deltaX
    ) external returns (uint128 actualDeltaX, uint256 legacyAccEarn);
    
    /// @notice Decrease limitorder of selling Y.
    /// @param point point of seller's limit order, be sure to be times of pointDelta
    /// @param deltaY max amount of tokenY seller wants to decrease
    /// @return actualDeltaY actual amount of tokenY decreased
    /// @return legacyAccEarn legacyAccEarnX of pointOrder at point when calling this interface
    function decLimOrderWithY(
        int24 point,
        uint128 deltaY
    ) external returns (uint128 actualDeltaY, uint256 legacyAccEarn);
    
    /// @notice Add a limit order (selling x) in the pool.
    /// @param recipient owner of the limit order
    /// @param point point of the order, be sure to be times of pointDelta
    /// @param amountX amount of tokenX to sell
    /// @param data any data that should be passed through to the callback
    /// @return orderX actual added amount of tokenX
    /// @return acquireY amount of tokenY acquired if there is a limit order to sell y before adding
    function addLimOrderWithX(
        address recipient,
        int24 point,
        uint128 amountX,
        bytes calldata data
    ) external returns (uint128 orderX, uint128 acquireY);

    /// @notice Add a limit order (selling y) in the pool.
    /// @param recipient owner of the limit order
    /// @param point point of the order, be sure to be times of pointDelta
    /// @param amountY amount of tokenY to sell
    /// @param data any data that should be passed through to the callback
    /// @return orderY actual added amount of tokenY
    /// @return acquireX amount of tokenX acquired if there exists a limit order to sell x before adding
    function addLimOrderWithY(
        address recipient,
        int24 point,
        uint128 amountY,
        bytes calldata data
    ) external returns (uint128 orderY, uint128 acquireX);

    /// @notice Collect earned or decreased token from limit order.
    /// @param recipient address to benefit
    /// @param point point of limit order, be sure to be times of pointDelta
    /// @param collectDec max amount of decreased selling token to collect
    /// @param collectEarn max amount of earned token to collect
    /// @param isEarnY direction of this limit order, true for sell y, false for sell x
    /// @return actualCollectDec actual amount of decresed selling token collected
    /// @return actualCollectEarn actual amount of earned token collected
    function collectLimOrder(
        address recipient, int24 point, uint128 collectDec, uint128 collectEarn, bool isEarnY
    ) external returns(uint128 actualCollectDec, uint128 actualCollectEarn);

    /// @notice Add liquidity to the pool.
    /// @param recipient newly created liquidity will belong to this address
    /// @param leftPt left endpoint of the liquidity, be sure to be times of pointDelta
    /// @param rightPt right endpoint of the liquidity, be sure to be times of pointDelta
    /// @param liquidDelta amount of liquidity to add
    /// @param data any data that should be passed through to the callback
    /// @return amountX The amount of tokenX that was paid for the liquidity. Matches the value in the callback
    /// @return amountY The amount of tokenY that was paid for the liquidity. Matches the value in the callback
    function mint(
        address recipient,
        int24 leftPt,
        int24 rightPt,
        uint128 liquidDelta,
        bytes calldata data
    ) external returns (uint256 amountX, uint256 amountY);

    /// @notice Decrease a given amount of liquidity from msg.sender's liquidities.
    /// @param leftPt left endpoint of the liquidity
    /// @param rightPt right endpoint of the liquidity
    /// @param liquidDelta amount of liquidity to burn
    /// @return amountX The amount of tokenX should be refund after burn
    /// @return amountY The amount of tokenY should be refund after burn
    function burn(
        int24 leftPt,
        int24 rightPt,
        uint128 liquidDelta
    ) external returns (uint256 amountX, uint256 amountY);

    /// @notice Collect tokens (fee or refunded after burn) from a liquidity.
    /// @param recipient the address which should receive the collected tokens
    /// @param leftPt left endpoint of the liquidity
    /// @param rightPt right endpoint of the liquidity
    /// @param amountXLim max amount of tokenX the owner wants to collect
    /// @param amountYLim max amount of tokenY the owner wants to collect
    /// @return actualAmountX the amount tokenX collected
    /// @return actualAmountY the amount tokenY collected
    function collect(
        address recipient,
        int24 leftPt,
        int24 rightPt,
        uint256 amountXLim,
        uint256 amountYLim
    ) external returns (uint256 actualAmountX, uint256 actualAmountY);

    /// @notice Swap tokenY for tokenX, given max amount of tokenY user willing to pay.
    /// @param recipient the address to receive tokenX
    /// @param amount the max amount of tokenY user willing to pay
    /// @param highPt the highest point(price) of x/y during swap
    /// @param data any data to be passed through to the callback
    /// @return amountX amount of tokenX payed
    /// @return amountY amount of tokenY acquired
    function swapY2X(
        address recipient,
        uint128 amount,
        int24 highPt,
        bytes calldata data
    ) external returns (uint256 amountX, uint256 amountY);
    
    /// @notice Swap tokenY for tokenX, given amount of tokenX user desires.
    /// @param recipient the address to receive tokenX
    /// @param desireX the amount of tokenX user desires
    /// @param highPt the highest point(price) of x/y during swap
    /// @param data any data to be passed through to the callback
    /// @return amountX amount of tokenX payed
    /// @return amountY amount of tokenY acquired
    function swapY2XDesireX(
        address recipient,
        uint128 desireX,
        int24 highPt,
        bytes calldata data
    ) external returns (uint256 amountX, uint256 amountY);
    
    /// @notice Swap tokenX for tokenY, given max amount of tokenX user willing to pay.
    /// @param recipient the address to receive tokenY
    /// @param amount the max amount of tokenX user willing to pay
    /// @param lowPt the lowest point(price) of x/y during swap
    /// @param data any data to be passed through to the callback
    /// @return amountX amount of tokenX acquired
    /// @return amountY amount of tokenY payed
    function swapX2Y(
        address recipient,
        uint128 amount,
        int24 lowPt,
        bytes calldata data
    ) external returns (uint256 amountX, uint256 amountY);
    
    /// @notice Swap tokenX for tokenY, given amount of tokenY user desires.
    /// @param recipient the address to receive tokenY
    /// @param desireY the amount of tokenY user desires
    /// @param lowPt the lowest point(price) of x/y during swap
    /// @param data any data to be passed through to the callback
    /// @return amountX amount of tokenX acquired
    /// @return amountY amount of tokenY payed
    function swapX2YDesireY(
        address recipient,
        uint128 desireY,
        int24 lowPt,
        bytes calldata data
    ) external returns (uint256 amountX, uint256 amountY);

    /// @notice Returns sqrt(1.0001), in 96 bit fixpoint number.
    function sqrtRate_96() external view returns(uint160);
    
    /// @notice State values of pool.
    /// @return sqrtPrice_96 a 96 fixpoing number describe the sqrt value of current price(tokenX/tokenY)
    /// @return currentPoint the current point of the pool, 1.0001 ^ currentPoint = price
    /// @return observationCurrentIndex the index of the last oracle observation that was written,
    /// @return observationQueueLen the current maximum number of observations stored in the pool,
    /// @return observationNextQueueLen the next maximum number of observations, to be updated when the observation.
    /// @return locked whether the pool is locked (only used for checking reentrance)
    /// @return liquidity liquidity on the currentPoint (currX * sqrtPrice + currY / sqrtPrice)
    /// @return liquidityX liquidity of tokenX
    function state()
        external view
        returns(
            uint160 sqrtPrice_96,
            int24 currentPoint,
            uint16 observationCurrentIndex,
            uint16 observationQueueLen,
            uint16 observationNextQueueLen,
            bool locked,
            uint128 liquidity,
            uint128 liquidityX
        );
    
    /// @notice LimitOrder info on a given point.
    /// @param point the given point 
    /// @return sellingX total amount of tokenX selling on the point
    /// @return earnY total amount of unclaimed earned tokenY for unlegacy sellingX
    /// @return accEarnY total amount of earned tokenY(via selling tokenX) by all users at this point as of the last swap
    /// @return legacyAccEarnY latest recorded 'accEarnY' value when sellingX is clear (legacy)
    /// @return legacyEarnY total amount of unclaimed earned tokenY for legacy (cleared during swap) sellingX
    /// @return sellingY total amount of tokenYselling on the point
    /// @return earnX total amount of unclaimed earned tokenX for unlegacy sellingY
    /// @return legacyEarnX total amount of unclaimed earned tokenX for legacy (cleared during swap) sellingY
    /// @return accEarnX total amount of earned tokenX(via selling tokenY) by all users at this point as of the last swap
    /// @return legacyAccEarnX latest recorded 'accEarnX' value when sellingY is clear (legacy)
    function limitOrderData(int24 point)
        external view
        returns(
            uint128 sellingX,
            uint128 earnY,
            uint256 accEarnY,
            uint256 legacyAccEarnY,
            uint128 legacyEarnY,
            uint128 sellingY,
            uint128 earnX,
            uint128 legacyEarnX,
            uint256 accEarnX,
            uint256 legacyAccEarnX
        );
    
    /// @notice Query infomation about a point whether has limit order or is an liquidity's endpoint.
    /// @param point point to query
    /// @return val endpoint for val&1>0 and has limit order for val&2 > 0
    function orderOrEndpoint(int24 point) external returns(int24 val);

    /// @notice Returns observation data about a specific index.
    /// @param index the index of observation array
    /// @return timestamp the timestamp of the observation,
    /// @return accPoint the point multiplied by seconds elapsed for the life of the pool as of the observation timestamp,
    /// @return init whether the observation has been initialized and the above values are safe to use
    function observations(uint256 index)
        external
        view
        returns (
            uint32 timestamp,
            int56 accPoint,
            bool init
        );

    /// @notice Point status in the pool.
    /// @param point the point
    /// @return liquidSum the total amount of liquidity that uses the point either as left endpoint or right endpoint
    /// @return liquidDelta how much liquidity changes when the pool price crosses the point from left to right
    /// @return accFeeXOut_128 the fee growth on the other side of the point from the current point in tokenX
    /// @return accFeeYOut_128 the fee growth on the other side of the point from the current point in tokenY
    /// @return isEndpt whether the point is an endpoint of a some miner's liquidity, true if liquidSum > 0
    function points(int24 point)
        external
        view
        returns (
            uint128 liquidSum,
            int128 liquidDelta,
            uint256 accFeeXOut_128,
            uint256 accFeeYOut_128,
            bool isEndpt
        );

    /// @notice Returns 256 packed point (statusVal>0) boolean values. See PointBitmap for more information.
    function pointBitmap(int16 wordPosition) external view returns (uint256);

    /// @notice Returns the integral value of point(time) and integral value of 1/liquidity(time)
    ///     at some target timestamps (block.timestamp - secondsAgo[i])
    /// @dev Reverts if target timestamp is early than oldest observation in the queue
    /// @dev If you call this method with secondsAgos = [3600, 0]. the average point of this pool during recent hour is 
    /// (accPoints[1] - accPoints[0]) / 3600
    /// @param secondsAgos describe the target timestamp , targetTimestimp[i] = block.timestamp - secondsAgo[i]
    /// @return accPoints integral value of point(time) from 0 to each target timestamp
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory accPoints);
    
    /// @notice Expand max-length of observation queue.
    /// @param newNextQueueLen new value of observationNextQueueLen, which should be greater than current observationNextQueueLen
    function expandObservationQueue(uint16 newNextQueueLen) external;

    /// @notice Borrow tokenX and/or tokenY and pay it back within a block.
    /// @dev The caller needs to implement a IiZiSwapPool#flashCallback callback function
    /// @param recipient the address which will receive the tokenY and/or tokenX
    /// @param amountX the amount of tokenX to borrow
    /// @param amountY the amount of tokenY to borrow
    /// @param data Any data to be passed through to the callback
    function flash(
        address recipient,
        uint256 amountX,
        uint256 amountY,
        bytes calldata data
    ) external;

    /// @notice Returns a snapshot infomation of Liquidity in [leftPoint, rightPoint).
    /// @param leftPoint left endpoint of range, should be times of pointDelta
    /// @param rightPoint right endpoint of range, should be times of pointDelta
    /// @return deltaLiquidities an array of delta liquidity for points in the range
    ///    note 1. delta liquidity here is amount of liquidity changed when cross a point from left to right
    ///    note 2. deltaLiquidities only contains points which are times of pointDelta
    ///    note 3. this function may cost a ENORMOUS amount of gas, be careful to call
    function liquiditySnapshot(int24 leftPoint, int24 rightPoint) external view returns(int128[] memory deltaLiquidities);

    struct LimitOrderStruct {
        uint128 sellingX;
        uint128 earnY;
        uint256 accEarnY;
        uint128 sellingY;
        uint128 earnX;
        uint256 accEarnX;
    }

    /// @notice Returns a snapshot infomation of Limit Order in [leftPoint, rightPoint).
    /// @param leftPoint left endpoint of range, should be times of pointDelta
    /// @param rightPoint right endpoint of range, should be times of pointDelta
    /// @return limitOrders an array of Limit Orders for points in the range
    ///    note 1. this function may cost a HUGE amount of gas, be careful to call
    function limitOrderSnapshot(int24 leftPoint, int24 rightPoint) external view returns(LimitOrderStruct[] memory limitOrders); 

    /// @notice Amount of charged fee on tokenX.
    function totalFeeXCharged() external view returns(uint256);

    /// @notice Amount of charged fee on tokenY.
    function totalFeeYCharged() external view returns(uint256);

    /// @notice Percent to charge from miner's fee.
    function feeChargePercent() external view returns(uint24);

    /// @notice Collect charged fee, only factory's chargeReceiver can call.
    function collectFeeCharged() external;

    /// @notice modify 'feeChargePercent', only owner has authority.
    /// @param newFeeChargePercent new value of feeChargePercent, a nature number range in [0, 100], 
    function modifyFeeChargePercent(uint24 newFeeChargePercent) external;
    
}

interface IiZiSwapFactory {

    function fee2pointDelta(uint24 fee) external view returns (int24 pointDelta);

    function pool(
        address tokenX,
        address tokenY,
        uint24 fee
    ) external view returns(address);

}

interface IiZiSwapCallback {

    /// @notice Called to msg.sender in iZiSwapPool#swapY2X(DesireX) call
    /// @param x Amount of tokenX trader will acquire
    /// @param y Amount of tokenY trader will pay
    /// @param data Any dadta passed though by the msg.sender via the iZiSwapPool#swapY2X(DesireX) call
    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;

    /// @notice Called to msg.sender in iZiSwapPool#swapX2Y(DesireY) call
    /// @param x Amount of tokenX trader will pay
    /// @param y Amount of tokenY trader will require
    /// @param data Any dadta passed though by the msg.sender via the iZiSwapPool#swapX2Y(DesireY) call
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;

}

interface IiZiSwapLiquidityManager {

    /// @return Returns the address of the Uniswap V3 factory
    function factory() external view returns (address);

    /// @return Returns the address of WETH9
    function WETH9() external view returns (address);
    
    // infomation of liquidity provided by miner
    struct Liquidity {
        // left point of liquidity-token, the range is [leftPt, rightPt)
        int24 leftPt;
        // right point of liquidity-token, the range is [leftPt, rightPt)
        int24 rightPt;
        // amount of liquidity on each point in [leftPt, rightPt)
        uint128 liquidity;
        // a 128-fixpoint number, as integral of { fee(pt, t)/L(pt, t) }. 
        // here fee(pt, t) denotes fee generated on point pt at time t
        // L(pt, t) denotes liquidity on point pt at time t
        // pt varies in [leftPt, rightPt)
        // t moves from pool created until miner last modify this liquidity-token (mint/addLiquidity/decreaseLiquidity/create)
        uint256 lastFeeScaleX_128;
        uint256 lastFeeScaleY_128;
        // remained tokenX miner can collect, including fee and withdrawed token
        uint256 remainTokenX;
        uint256 remainTokenY;
        // id of pool in which this liquidity is added
        uint128 poolId;
    }

    function liquidities(uint256 tokenId)
        external
        view
        returns (
            int24 leftPt,
            int24 rightPt,
            uint128 liquidity,
            uint256 lastFeeScaleX_128,
            uint256 lastFeeScaleY_128,
            uint256 remainTokenX,
            uint256 remainTokenY,
            uint128 poolId
        );
    
    struct PoolMeta {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    function poolMetas(uint128 poolId)
        external
        view
        returns (
            address tokenX,
            address tokenY,
            uint24 fee
        );

    struct MintParam {
        // miner address
        address miner;
        // tokenX of swap pool
        address tokenX;
        // tokenY of swap pool
        address tokenY;
        // fee amount of swap pool
        uint24 fee;
        // left point of added liquidity
        int24 pl;
        // right point of added liquidity
        int24 pr;
        // amount limit of tokenX miner willing to deposit
        uint128 xLim;
        // amount limit tokenY miner willing to deposit
        uint128 yLim;
        // minimum amount of tokenX miner willing to deposit
        uint128 amountXMin;
        // minimum amount of tokenY miner willing to deposit
        uint128 amountYMin;

        uint256 deadline;
    }
    
    /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
    /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
    /// that use ether for the input amount
    function refundETH() external payable;

    function mint(MintParam calldata params)
        external
        payable
        returns (
            uint256 lid,
            uint128 liquidity,
            uint256 amountX,
            uint256 amountY
        );
    
    /// parameters when calling addLiquidity, grouped together to avoid stake too deep
    struct AddLiquidityParam {
        // id of nft
        uint256 lid;
        // amount limit of tokenX user willing to deposit
        uint128 xLim;
        // amount limit of tokenY user willing to deposit
        uint128 yLim;
        // min amount of tokenX user willing to deposit
        uint128 amountXMin;
        // min amount of tokenY user willing to deposit
        uint128 amountYMin;

        uint256 deadline;
    }

    /// @notice Add liquidity to a existing nft.
    /// @param addLiquidityParam see AddLiquidityParam for more
    /// @return liquidityDelta amount of added liquidity
    /// @return amountX amount of tokenX deposited
    /// @return amountY amonut of tokenY deposited
    function addLiquidity(
        AddLiquidityParam calldata addLiquidityParam
    ) external payable returns (
        uint128 liquidityDelta,
        uint256 amountX,
        uint256 amountY
    );

    function decLiquidity(
        uint256 lid,
        uint128 liquidDelta,
        uint256 amountXMin,
        uint256 amountYMin,
        uint256 deadline
    ) external returns (
        uint256 amountX,
        uint256 amountY
    );

    function collect(
        address recipient,
        uint256 lid,
        uint128 amountXLim,
        uint128 amountYLim
    ) external payable returns (
        uint256 amountX,
        uint256 amountY
    );

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function ownerOf(uint256 tokenId) external view returns (address);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}
contract TapProxy {

    using SafeERC20 for IERC20;
    receive() external payable {}

    address public pancakeRouter;
    address public uniswapRouter;
    address public iZiSwapRouter;
    address public iZiSwapLiquidityManager;
    address public weth;

    modifier checkNftOwner(uint256 lid) {
        require(IiZiSwapLiquidityManager(iZiSwapLiquidityManager).ownerOf(lid) == msg.sender, 'not owner');
        _;
    }

    constructor(
        address _pancakeRouter, 
        address _uniswapRouter,
        address _iZiSwapRouter,
        address _iZiSwapLiquidityManager
    ) {
        pancakeRouter = _pancakeRouter;
        uniswapRouter = _uniswapRouter;
        iZiSwapRouter = _iZiSwapRouter;
        iZiSwapLiquidityManager = _iZiSwapLiquidityManager;
        weth = IiZiSwapLiquidityManager(iZiSwapLiquidityManager).WETH9();
    }

    function safeTransferETH(address to, uint256 value) private {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'STE');
    }

    function unwrapWETH(address recipient) private {
        uint256 all = IWETH(weth).balanceOf(address(this));
        if (all > 0) {
            IWETH(weth).withdraw(all);
            safeTransferETH(recipient, all);
        }
    }
    
    function refundToken(
        address token,
        address recipient
    ) private {
        if (token == weth) {
            unwrapWETH(recipient);
        } else {
            uint256 all = IERC20(token).balanceOf(address(this));
            if (all > 0) {
                IERC20(token).safeTransfer(recipient, all);
            }
        }
    }

    function approveToken(address token, address spender) private {
        bool ok = IERC20(token).approve(spender, type(uint256).max);
        require(ok, 'approve fail');
    }

    function recvTokenFromUser(address token, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        if (token == weth) {
            // the other token must not be weth
            require(address(this).balance >= amount, "ETHER INSUFFICIENT");
            IWETH(weth).deposit{value: address(this).balance}();
        } else {
            // receive token(not weth) from user
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );
        }
    }
    function strConcat(string memory _a, string memory _b) pure internal returns (string memory ret){
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        ret = new string(_ba.length + _bb.length);
        bytes memory bret = bytes(ret);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++)bret[k++] = _ba[i];
        for (uint i = 0; i < _bb.length; i++) bret[k++] = _bb[i];
    } 
    function tapAndMint(
        address tokenX,
        uint256 amountX,
        address tokenY,
        uint256 amountY,
        address tapSwapContract, 
        bytes calldata tapSwapData,
        bool tapInputIsX,
        IiZiSwapLiquidityManager.MintParam calldata mintParam
    ) external payable {
        if (amountX > 0) {
            recvTokenFromUser(tokenX, amountX);
        }
        if (amountY > 0) {
            recvTokenFromUser(tokenY, amountY);
        }
        if (tapSwapContract != address(0)) {
            require(tapSwapContract == pancakeRouter || tapSwapContract == uniswapRouter || tapSwapContract == iZiSwapRouter, "TARGET ERROR");
            if (tapInputIsX) {
                approveToken(tokenX, tapSwapContract);
            } else {
                approveToken(tokenY, tapSwapContract);
            }
            (bool success, bytes memory result) = tapSwapContract.call(tapSwapData);
            if (!success) {
                // Next 5 lines from https://ethereum.stackexchange.com/a/83577
                if (result.length < 68) revert();
                assembly {
                    result := add(result, 0x04)
                }
                revert(abi.decode(result, (string)));
            }
        }
        if (mintParam.xLim > 0) {
            approveToken(tokenX, iZiSwapLiquidityManager);
        }
        if (mintParam.yLim > 0) {
            approveToken(tokenY, iZiSwapLiquidityManager);
        }
        try
            IiZiSwapLiquidityManager(iZiSwapLiquidityManager).mint(mintParam) returns (
                uint256,
                uint128,
                uint256,
                uint256
            )
        {
            refundToken(tokenX, msg.sender);
            refundToken(tokenY, msg.sender);
        } catch (bytes memory data) {

            assembly {
                data := add(data, 0x04)
            }
            string memory newStr = strConcat("mint", abi.decode(data,(string)));
            revert(newStr);
        }
    }

    function tapAndInc(
        address tokenX,
        uint256 amountX,
        address tokenY,
        uint256 amountY,
        address tapSwapContract, 
        bytes calldata tapSwapData,
        bool tapInputIsX,
        IiZiSwapLiquidityManager.AddLiquidityParam calldata addLiquidityParam
    ) external payable checkNftOwner(addLiquidityParam.lid) {
        if (amountX > 0) {
            recvTokenFromUser(tokenX, amountX);
        }
        if (amountY > 0) {
            recvTokenFromUser(tokenY, amountY);
        }
        if (tapSwapContract != address(0)) {
            require(tapSwapContract == pancakeRouter || tapSwapContract == uniswapRouter || tapSwapContract == iZiSwapRouter, "TARGET ERROR");
            if (tapInputIsX) {
                approveToken(tokenX, tapSwapContract);
            } else {
                approveToken(tokenY, tapSwapContract);
            }
            (bool success, bytes memory result) = tapSwapContract.call(tapSwapData);
            if (!success) {
                // Next 5 lines from https://ethereum.stackexchange.com/a/83577
                if (result.length < 68) revert();
                assembly {
                    result := add(result, 0x04)
                }
                revert(abi.decode(result, (string)));
            }
        }
        if (addLiquidityParam.xLim > 0) {
            approveToken(tokenX, iZiSwapLiquidityManager);
        }
        if (addLiquidityParam.yLim > 0) {
            approveToken(tokenY, iZiSwapLiquidityManager);
        }
        try
            IiZiSwapLiquidityManager(iZiSwapLiquidityManager).addLiquidity(addLiquidityParam) returns (
                uint128,
                uint256,
                uint256
            )
        {
            refundToken(tokenX, msg.sender);
            refundToken(tokenY, msg.sender);
        } catch (bytes memory data) {

            assembly {
                data := add(data, 0x04)
            }
            string memory newStr = strConcat("add", abi.decode(data,(string)));
            revert(newStr);
        }
    }
}