pragma solidity ^0.8.4;

import "./base/base.sol";

import "./core/interfaces/IIzumiswapCallback.sol";
import "./core/interfaces/IIzumiswapFactory.sol";
import "./core/interfaces/IIzumiswapPool.sol";

contract Swap is Base, IIzumiswapSwapCallback {

    struct SwapCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
        address payer;
    }

    function swapY2XCallback(
        uint256 y,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        if (y > 0) {
            safeTransferFrom(dt.tokenY, dt.payer, msg.sender, y);
        }
    }
    function swapX2YCallback(
        uint256 x,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        if (x > 0) {
            safeTransferFrom(dt.tokenX, dt.payer, msg.sender, x);
        }
    }
    constructor(address _factory, address _weth) Base(_factory, _weth) {
    }

    function swapY2X(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 amount,
        int24 highPt
    ) external payable {
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        IIzumiswapPool(poolAddr).swapY2X(
            payer, amount, highPt,
            abi.encode(SwapCallbackData({tokenX: tokenX, tokenY:tokenY, fee: fee, payer: payer}))
        );
    }
    function swapY2XDesireX(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 desireX,
        int24 highPt
    ) external payable {
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        IIzumiswapPool(poolAddr).swapY2XDesireX(
            payer, desireX, highPt,
            abi.encode(SwapCallbackData({tokenX: tokenX, tokenY:tokenY, fee: fee, payer: payer}))
        );
    }
    function swapX2Y(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 amount,
        int24 lowPt
    ) external payable {
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        IIzumiswapPool(poolAddr).swapX2Y(
            payer, amount, lowPt,
            abi.encode(SwapCallbackData({tokenX: tokenX, tokenY:tokenY, fee: fee, payer: payer}))
        );
    }
    function swapX2YDesireY(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 desireY,
        int24 highPt
    ) external payable {
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        IIzumiswapPool(poolAddr).swapX2YDesireY(
            payer, desireY, highPt,
            abi.encode(SwapCallbackData({tokenX: tokenX, tokenY:tokenY, fee: fee, payer: payer}))
        );
    }
}