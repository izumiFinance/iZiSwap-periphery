// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./base/base.sol";

import "./core/interfaces/IIzumiswapCallback.sol";
import "./core/interfaces/IIzumiswapFactory.sol";
import "./core/interfaces/IIzumiswapPool.sol";

contract Swap is Base, IIzumiswapSwapCallback {

    struct SwapCallbackData {
        // amount of token0 is input param
        address token0;
        // amount of token1 is calculated param
        address token1;
        address payer;
        uint24 fee;
    }

    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.token0, dt.token1, dt.fee);
        if (dt.token0 < dt.token1) {
            // token1 is y, amount of token1 is calculated
            // called from swapY2XDesireX(...)
            pay(dt.token1, dt.payer, msg.sender, y);
        } else {
            // token0 is y, amount of token0 is input param
            // called from swapY2X(...)
            pay(dt.token0, dt.payer, msg.sender, y);
        }
    }
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.token0, dt.token1, dt.fee);
        if (dt.token0 < dt.token1) {
            // token0 is x, amount of token0 is input param
            // called from swapX2Y(...)
            pay(dt.token0, dt.payer, msg.sender, x);
        } else {
            // token1 is x, amount of token1 is calculated param
            // called from swapX2YDesireY(...)
            pay(dt.token1, dt.payer, msg.sender, x);
        }
    }
    constructor(address _factory, address _weth) Base(_factory, _weth) {
    }

    function getCurrTick(address poolAddr) public view returns(int24 currPt) {
        (
            ,
            currPt,
            ,
            ,
            ,
            ,
            
        ) = IIzumiswapPool(poolAddr).state();
    }

    struct PoolParams {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    function swapY2X(
        PoolParams calldata poolParams,
        uint128 amount,
        int24 highPt,
        uint256 amountXMin
    ) external payable returns(int24 currPt) {
        require(poolParams.tokenX < poolParams.tokenY, "x<y");
        address poolAddr = pool(poolParams.tokenX, poolParams.tokenY, poolParams.fee);
        address payer = msg.sender;
        (uint256 amountX, ) = IIzumiswapPool(poolAddr).swapY2X(
            payer, amount, highPt,
            abi.encode(SwapCallbackData({token0: poolParams.tokenY, token1:poolParams.tokenX, fee: poolParams.fee, payer: payer}))
        );
        require(amountX >= amountXMin, "XMIN");
        return getCurrTick(poolAddr);
    }
    function swapY2XDesireX(
        PoolParams calldata poolParams,
        uint128 desireX,
        int24 highPt,
        uint256 amountYMax
    ) external payable returns(int24 currPt) {
        require(poolParams.tokenX < poolParams.tokenY, "x<y");
        address poolAddr = pool(poolParams.tokenX, poolParams.tokenY, poolParams.fee);
        address payer = msg.sender;
        (, uint256 amountY) = IIzumiswapPool(poolAddr).swapY2XDesireX(
            payer, desireX, highPt,
            abi.encode(SwapCallbackData({token0: poolParams.tokenX, token1:poolParams.tokenY, fee: poolParams.fee, payer: payer}))
        );
        require(amountY <= amountYMax, "YMAX");
        return getCurrTick(poolAddr);
    }
    function swapX2Y(
        PoolParams calldata poolParams,
        uint128 amount,
        int24 lowPt,
        uint256 amountYMin
    ) external payable returns(int24 currPt) {
        require(poolParams.tokenX < poolParams.tokenY, "x<y");
        address poolAddr = pool(poolParams.tokenX, poolParams.tokenY, poolParams.fee);
        address payer = msg.sender;
        (, uint256 amountY) = IIzumiswapPool(poolAddr).swapX2Y(
            payer, amount, lowPt,
            abi.encode(SwapCallbackData({token0: poolParams.tokenX, token1:poolParams.tokenY, fee: poolParams.fee, payer: payer}))
        );
        require(amountY >= amountYMin, "YMIN");
        return getCurrTick(poolAddr);
    }
    function swapX2YDesireY(
        PoolParams calldata poolParams,
        uint128 desireY,
        int24 highPt,
        uint256 amountXMax
    ) external payable returns(int24 currPt) {
        require(poolParams.tokenX < poolParams.tokenY, "x<y");
        address poolAddr = pool(poolParams.tokenX, poolParams.tokenY, poolParams.fee);
        address payer = msg.sender;
        (uint256 amountX,) = IIzumiswapPool(poolAddr).swapX2YDesireY(
            payer, desireY, highPt,
            abi.encode(SwapCallbackData({token0: poolParams.tokenY, token1:poolParams.tokenX, fee: poolParams.fee, payer: payer}))
        );
        require(amountX <= amountXMax, "XMAX");
        return getCurrTick(poolAddr);
    }
}