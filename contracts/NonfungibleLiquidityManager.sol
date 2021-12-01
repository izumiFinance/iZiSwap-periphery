pragma solidity ^0.8.4;

import "./core/interfaces/IIzumiswapCallback.sol";
import "./core/interfaces/IIzumiswapFactory.sol";
import "./core/interfaces/IIzumiswapPool.sol";

import "./libraries/MintMath.sol";
import "./libraries/LiquidityMath.sol";
import "./libraries/FixedPoint128.sol";
import "./base/base.sol";

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';


contract NonfungibleLiquidityManager is Base, ERC721Enumerable, IIzumiswapMintCallback {

    event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amountX, uint256 amountY);

    event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amountX, uint256 amountY);

    event Collect(uint256 indexed tokenId, address recipient, uint256 amountX, uint256 amountY);
    using LiquidityMath for uint128;

    struct MintCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
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
    mapping(uint256 =>Liquidity) public liquidities;
    uint256 public liquidityNum = 0;
    struct PoolMeta {
        address tokenX;
        address tokenY;
        uint24 fee;
    }
    mapping(uint128 =>PoolMeta) public poolMetas;
    mapping(address =>uint128) public poolIds;

    function mintDepositCallback(
        uint256 x, uint256 y, bytes calldata data
    ) external override {
        MintCallbackData memory dt = abi.decode(data, (MintCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
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
            abi.encode(MintCallbackData({tokenX: mp.tokenX, tokenY: mp.tokenY, fee: mp.fee, payer: msg.sender})));
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
        (uint256 lastFeeScaleX_128, uint256 lastFeeScaleY_128) = getLastFeeScale(
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
        emit IncreaseLiquidity(lid, liquidity, amountX, amountY);
    }
    struct AddLiquidityParam {
        uint256 lid;
        uint128 xLim;
        uint128 yLim;
    }
    function updateLiquidity(
        Liquidity storage liquid,
        address pool,
        uint128 newLiquidity,
        uint256 amountX,
        uint256 amountY
    ) private {
        (uint256 lastFeeScaleX_128, uint256 lastFeeScaleY_128) = getLastFeeScale(
            pool, liquidityKey(address(this), liquid.leftPt, liquid.rightPt)
        );
        (uint256 deltaScaleX, uint256 deltaScaleY) = (liquid.lastFeeScaleX_128, liquid.lastFeeScaleY_128);
        assembly {
            deltaScaleX := sub(lastFeeScaleX_128, deltaScaleX)
            deltaScaleY := sub(lastFeeScaleY_128, deltaScaleY)
        }
        liquid.remainTokenX += amountX + MulDivMath.mulDivFloor(deltaScaleX, liquid.liquidity, FixedPoint128.Q128);
        liquid.remainTokenY += amountY + MulDivMath.mulDivFloor(deltaScaleY, liquid.liquidity, FixedPoint128.Q128);
        liquid.lastFeeScaleX_128 = lastFeeScaleX_128;
        liquid.lastFeeScaleY_128 = lastFeeScaleY_128;
        liquid.liquidity = newLiquidity;
    }
    function addLiquidity(
        AddLiquidityParam calldata mp
    ) external payable checkAuth(mp.lid) returns(
        uint128 liquidityDelta,
        uint256 amountX,
        uint256 amountY
    ) {
        require(mp.lid < liquidityNum, "LN");
        Liquidity storage liquid = liquidities[mp.lid];
        PoolMeta memory poolMeta = poolMetas[liquid.poolId];
        int24 currPt;
        uint160 sqrtPrice_96;
        address pool = IIzumiswapFactory(factory).pool(poolMeta.tokenX, poolMeta.tokenY, poolMeta.fee);
        uint160 sqrtRate_96 = IIzumiswapPool(pool).sqrtRate_96();
        require(pool != address(0), "P0");
        (sqrtPrice_96, currPt) = getPoolPrice(pool);
        uint128 liquidityDelta = MintMath.computeLiquidity(
            MintMath.MintMathParam({
                pl: liquid.leftPt,
                pr: liquid.rightPt,
                xLim: mp.xLim,
                yLim: mp.yLim
            }),
            currPt,
            sqrtPrice_96,
            sqrtRate_96
        );
        require(int128(liquid.liquidity) == int256(uint256(liquid.liquidity)), "LO");
        uint128 newLiquidity = liquidityDelta.addDelta(int128(liquid.liquidity));
        (amountX, amountY) = IIzumiswapPool(pool).mint(address(this), liquid.leftPt, liquid.rightPt, liquidityDelta, 
            abi.encode(MintCallbackData({tokenX: poolMeta.tokenX, tokenY: poolMeta.tokenY, fee: poolMeta.fee, payer: msg.sender})));
        updateLiquidity(liquid, pool, newLiquidity, 0, 0);
        emit IncreaseLiquidity(mp.lid, liquidityDelta, amountX, amountY);
    }

    function decLiquidity(
        uint256 lid,
        uint128 liquidDelta
    ) external checkAuth(lid) returns(
        uint256 amountX,
        uint256 amountY
    ) {
        require(lid < liquidityNum, "LN");
        Liquidity storage liquidity = liquidities[lid];
        if (liquidDelta > liquidity.liquidity) {
            liquidDelta = liquidity.liquidity;
        }
        PoolMeta memory poolMeta = poolMetas[liquidity.poolId];
        address pool = IIzumiswapFactory(factory).pool(poolMeta.tokenX, poolMeta.tokenY, poolMeta.fee);
        require(pool != address(0), "P0");
        int128 ll = int128(liquidDelta);
        require(ll == int256(uint256(liquidDelta)), "LO");
        uint128 newLiquidity = liquidity.liquidity.addDelta(-ll);
        (amountX, amountY) = IIzumiswapPool(pool).burn(liquidity.leftPt, liquidity.rightPt, liquidDelta);
        updateLiquidity(liquidity, pool, newLiquidity, amountX, amountY);
        emit DecreaseLiquidity(lid, liquidDelta, amountX, amountY);
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
            updateLiquidity(liquidity, pool, liquidity.liquidity, 0, 0);
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
        emit Collect(lid, miner, amountXLim, amountYLim);
    }
}