pragma solidity ^0.8.4;

import "./core/interfaces/IIzumiswapCallback.sol";
import "./core/interfaces/IIzumiswapFactory.sol";
import "./core/interfaces/IIzumiswapPool.sol";

import "./libraries/MintMath.sol";
import "./libraries/LiquidityMath.sol";
import "./libraries/FixedPoint128.sol";
import "./base/base.sol";

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract NonfungibleLiquidityManager is Base, ERC721, IIzumiswapMintCallback {

    using LiquidityMath for uint128;

    struct MintCallbackData {
        address tokenX;
        address tokenY;
        address payer;
    }

    uint128 maxPoolId = 1;
    struct Liquidity {
        int24 leftPt;
        int24 rightPt;
        uint128 liquidity;
        uint256 lastFeeScaleX_128;
        uint256 lastFeeScaleY_128;
        uint256 remainTokenX;
        uint256 remainTokenY;
        uint128 poolId;
    }
    mapping(uint256 =>Liquidity) liquidities;
    uint256 liquidityNum = 0;
    struct PoolMeta {
        address tokenX;
        address tokenY;
        uint24 fee;
    }
    mapping(uint128 =>PoolMeta) poolMetas;
    mapping(address =>uint128) poolIds;

    function mintDepositCallback(
        uint256 x, uint256 y, bytes calldata data
    ) external override {
        MintCallbackData memory dt = abi.decode(data, (MintCallbackData));
        if (x > 0) {
            pay(dt.tokenX, dt.payer, msg.sender, x);
        }
        if (y > 0) {
            pay(dt.tokenY, dt.payer, msg.sender, y);
        }
    }
    modifier checkAuth(uint256 lid) {
        require(_isApprovedOrOwner(msg.sender, lid), 'Not approved');
        _;
    }
    constructor(
        address fac,
        address weth
    ) ERC721("izumiswap Liquidity NFT", "IZUMI-LIQUIDITY-NFT") Base(fac, weth) {
    }

    function createPool(address tokenX, address tokenY, uint24 fee, int24 cp) external returns (address) {
        require(tokenX < tokenY, "x<y");
        address pool = IIzumiswapFactory(factory).pool(tokenX, tokenY, fee);
        if (pool == address(0)) {
            pool = IIzumiswapFactory(factory).newPool(tokenX, tokenY, fee, cp);
            return pool;
        }
        return pool;
    }

    struct MintParam {
        address miner;
        address tokenX;
        address tokenY;
        uint24 fee;
        int24 pl;
        int24 pr;
        uint128 xLim;
        uint128 yLim;
    }
    function liquidityKey(address miner, int24 pl, int24 pr) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(miner, pl, pr));
    }

    function cachePoolKey(address pool, PoolMeta memory meta) private returns (uint128 poolId) {
        poolId = poolIds[pool];
        if (poolId == 0) {
            poolIds[pool] = (poolId = maxPoolId++);
            poolMetas[poolId] = meta;
        }
    }
    function getLastFeeScale(address pool, bytes32 key) private view returns(uint256, uint256) {

        (uint128 liquidity, uint256 lastFeeScaleX_128, uint256 lastFeeScaleY_128, uint256 rx, uint256 ry) = IIzumiswapPool(pool).liquidities(
            key
        );
        return (lastFeeScaleX_128, lastFeeScaleY_128);
    }
    function getPoolPrice(address pool) private returns (uint160, int24) {
        (
            uint160 sqrtPrice_96,
            int24 currPt,
            uint256 currX,
            uint256 currY,
            uint128 liquidity,
            bool allX,
            bool locked
        ) = IIzumiswapPool(pool).state();
        return (sqrtPrice_96, currPt);
    }
    function _addLiquidity(MintParam memory mp) private returns(
        uint128 liquidity, uint256 amountX, uint256 amountY, address pool
    ) {
        int24 currPt;
        uint160 sqrtPrice_96;
        pool = IIzumiswapFactory(factory).pool(mp.tokenX, mp.tokenY, mp.fee);
        uint160 sqrtRate_96 = IIzumiswapPool(pool).sqrtRate_96();
        require(pool != address(0), "P0");
        (sqrtPrice_96, currPt) = getPoolPrice(pool);
        liquidity = MintMath.computeLiquidity(
            MintMath.MintMathParam({
                pl: mp.pl,
                pr: mp.pr,
                xLim: mp.xLim,
                yLim: mp.yLim
            }),
            currPt,
            sqrtPrice_96,
            sqrtRate_96
        );
        (amountX, amountY) = IIzumiswapPool(pool).mint(address(this), mp.pl, mp.pr, liquidity, 
            abi.encode(MintCallbackData({tokenX: mp.tokenX, tokenY: mp.tokenY, payer: msg.sender})));
    }
    function mint(MintParam calldata mp) external payable returns(
        uint256 lid,
        uint128 liquidity,
        uint256 amountX,
        uint256 amountY
    ){
        require(mp.tokenX < mp.tokenY, "x<y");
        address pool;
        (liquidity, amountX, amountY, pool) = _addLiquidity(mp);
        lid = liquidityNum ++;
        uint256 lastFeeScaleX_128;
        uint256 lastFeeScaleY_128;
        (lastFeeScaleX_128, lastFeeScaleY_128) = getLastFeeScale(
            pool, liquidityKey(address(this), mp.pl, mp.pr)
        );
        liquidities[lid] = Liquidity({
            leftPt: mp.pl,
            rightPt: mp.pr,
            liquidity: liquidity,
            lastFeeScaleX_128: lastFeeScaleX_128,
            lastFeeScaleY_128: lastFeeScaleY_128,
            remainTokenX: 0,
            remainTokenY: 0,
            poolId: cachePoolKey(pool, PoolMeta({tokenX: mp.tokenX, tokenY: mp.tokenY, fee: mp.fee}))
        });
        _mint(mp.miner, lid);
    }
    struct AddLiquidityParam {
        uint256 lid;
        uint128 xLim;
        uint128 yLim;
    }
    function addLiquidity(
        AddLiquidityParam calldata mp
    ) external payable checkAuth(mp.lid) returns(
        uint128 liquidity,
        uint256 amountX,
        uint256 amountY
    ) {
        require(mp.lid < liquidityNum, "LN");
        Liquidity storage liquidity = liquidities[mp.lid];
        PoolMeta memory poolMeta = poolMetas[liquidity.poolId];
        int24 currPt;
        uint160 sqrtPrice_96;
        address pool = IIzumiswapFactory(factory).pool(poolMeta.tokenX, poolMeta.tokenY, poolMeta.fee);
        uint160 sqrtRate_96 = IIzumiswapPool(pool).sqrtRate_96();
        require(pool != address(0), "P0");
        (sqrtPrice_96, currPt) = getPoolPrice(pool);
        uint128 l = MintMath.computeLiquidity(
            MintMath.MintMathParam({
                pl: liquidity.leftPt,
                pr: liquidity.rightPt,
                xLim: mp.xLim,
                yLim: mp.yLim
            }),
            currPt,
            sqrtPrice_96,
            sqrtRate_96
        );
        int128 ll = int128(liquidity.liquidity);
        require(ll == int256(uint256(liquidity.liquidity)), "LO");
        uint128 newLiquidity = l.addDelta(ll);
        (amountX, amountY) = IIzumiswapPool(pool).mint(address(this), liquidity.leftPt, liquidity.rightPt, l, 
            abi.encode(MintCallbackData({tokenX: poolMeta.tokenX, tokenY: poolMeta.tokenY, payer: msg.sender})));
        uint256 lastFeeScaleX_128;
        uint256 lastFeeScaleY_128;
        (lastFeeScaleX_128, lastFeeScaleY_128) = getLastFeeScale(
            pool, liquidityKey(address(this), liquidity.leftPt, liquidity.rightPt)
        );
        liquidity.remainTokenX += FullMath.mulDiv(lastFeeScaleX_128 - liquidity.lastFeeScaleX_128, liquidity.liquidity, FixedPoint128.Q128);
        liquidity.remainTokenY += FullMath.mulDiv(lastFeeScaleY_128 - liquidity.lastFeeScaleY_128, liquidity.liquidity, FixedPoint128.Q128);
        liquidity.lastFeeScaleX_128 = lastFeeScaleX_128;
        liquidity.lastFeeScaleY_128 = lastFeeScaleY_128;
        liquidity.liquidity = newLiquidity;
    }

    function decLiquidity(
        uint256 lid,
        uint128 liquidDelta
    ) external payable checkAuth(lid) returns(
        uint256 amountX,
        uint256 amountY
    ) {
        require(lid < liquidityNum, "LN");
        Liquidity storage liquidity = liquidities[lid];
        PoolMeta memory poolMeta = poolMetas[liquidity.poolId];
        address pool = IIzumiswapFactory(factory).pool(poolMeta.tokenX, poolMeta.tokenY, poolMeta.fee);
        require(pool != address(0), "P0");
        int128 ll = int128(liquidDelta);
        require(ll == int256(uint256(liquidDelta)), "LO");
        uint128 newLiquidity = liquidity.liquidity.addDelta(-ll);
        (amountX, amountY) = IIzumiswapPool(pool).burn(liquidity.leftPt, liquidity.rightPt, liquidDelta);
        uint256 lastFeeScaleX_128;
        uint256 lastFeeScaleY_128;
        (lastFeeScaleX_128, lastFeeScaleY_128) = getLastFeeScale(
            pool, liquidityKey(address(this), liquidity.leftPt, liquidity.rightPt)
        );
        liquidity.remainTokenX += amountX +
            FullMath.mulDiv(lastFeeScaleX_128 - liquidity.lastFeeScaleX_128, liquidity.liquidity, FixedPoint128.Q128);
        liquidity.remainTokenY += amountY +
            FullMath.mulDiv(lastFeeScaleY_128 - liquidity.lastFeeScaleY_128, liquidity.liquidity, FixedPoint128.Q128);
        liquidity.lastFeeScaleX_128 = lastFeeScaleX_128;
        liquidity.lastFeeScaleY_128 = lastFeeScaleY_128;
        liquidity.liquidity = newLiquidity;
    }
    function collect(
        address miner,
        uint256 lid,
        uint128 amountXLim,
        uint128 amountYLim
    ) external payable checkAuth(lid) returns(
        uint256 amountX,
        uint256 amountY
    ) {
        if (miner == address(0)) {
            miner = address(this);
        }
        require(lid < liquidityNum, "LN");
        Liquidity storage liquidity = liquidities[lid];
        PoolMeta memory poolMeta = poolMetas[liquidity.poolId];
        address pool = IIzumiswapFactory(factory).pool(poolMeta.tokenX, poolMeta.tokenY, poolMeta.fee);
        require(pool != address(0), "P0");
        if (liquidity.liquidity > 0) {
            IIzumiswapPool(pool).burn(liquidity.leftPt, liquidity.rightPt, 0);
            uint256 lastFeeScaleX_128;
            uint256 lastFeeScaleY_128;
            (lastFeeScaleX_128, lastFeeScaleY_128) = getLastFeeScale(
                pool, liquidityKey(address(this), liquidity.leftPt, liquidity.rightPt)
            );
            liquidity.remainTokenX += amountX +
                FullMath.mulDiv(lastFeeScaleX_128 - liquidity.lastFeeScaleX_128, liquidity.liquidity, FixedPoint128.Q128);
            liquidity.remainTokenY += amountY +
                FullMath.mulDiv(lastFeeScaleY_128 - liquidity.lastFeeScaleY_128, liquidity.liquidity, FixedPoint128.Q128);
            liquidity.lastFeeScaleX_128 = lastFeeScaleX_128;
            liquidity.lastFeeScaleY_128 = lastFeeScaleY_128;
        }
        if (amountXLim > liquidity.remainTokenX) {
            amountXLim = uint128(liquidity.remainTokenX);
        }
        if (amountYLim > liquidity.remainTokenY) {
            amountYLim = uint128(liquidity.remainTokenY);
        }
        IIzumiswapPool(pool).collect(miner, liquidity.leftPt, liquidity.rightPt, amountXLim, amountYLim);
        // amountX(Y)Lim may be a little greater than actual value
        liquidity.remainTokenX -= amountXLim;
        liquidity.remainTokenY -= amountYLim;
    }
}