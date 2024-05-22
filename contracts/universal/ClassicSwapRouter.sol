// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

import "./interfaces/IiZiSwapClassicPair.sol";
import "./interfaces/IiZiSwapClassicFactory.sol";

import "./types.sol";

abstract contract ClassicSwapRouter {

    using Path for bytes;

    address public iZiClassicFactory;

    /// @notice constructor to create this contract
    /// @param _iZiClassicFactory address of iZiSwap classic factory
    constructor(address _iZiClassicFactory) {
        iZiClassicFactory = _iZiClassicFactory;
    }

    function iZiClassicPair(address tokenA, address tokenB) public view returns(address) {
        return IiZiSwapClassicFactory(iZiClassicFactory).getPair(tokenA, tokenB);
    }

    function getPairState(address tokenA, address tokenB) public view returns(uint256 reserveA, uint256 reserveB, uint16 fee, address pair) {
        pair = iZiClassicPair(tokenA, tokenB);
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, fee, ) = IiZiSwapClassicPair(pair).getPairState();
        address token0 = IiZiSwapClassicPair(pair).token0();
        (reserveA, reserveB) = (tokenA == token0) ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint16 fee) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'iZiSwapClassicLibrary: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'iZiSwapClassicLibrary: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * (10000 - fee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 10000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut, uint16 fee) internal pure returns (uint amountIn) {
        require(amountOut > 0, 'iZiSwapClassicLibrary: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'iZiSwapClassicLibrary: INSUFFICIENT_LIQUIDITY');
        uint256 numerator = reserveIn * amountOut * 10000;
        uint256 denominator = (reserveOut - amountOut) * (10000 - fee);
        amountIn = numerator / denominator + 1;
    }

    function classicGetAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 amountOut, address pair) {
        (uint256 reserveIn, uint256 reserveOut, uint16 fee, address _pair) = getPairState(tokenIn, tokenOut);
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut, fee);
        pair = _pair;
    }

    function classicGetAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) internal view returns (uint256 amountIn, address pair) {
        (uint256 reserveIn, uint256 reserveOut, uint16 fee, address _pair) = getPairState(tokenIn, tokenOut);
        amountIn = getAmountIn(amountOut, reserveIn, reserveOut, fee);
        pair = _pair;
    }

    function _classicSwap(address pair, address tokenIn, address tokenOut, uint256 amountOut, address recipient) internal virtual returns(uint256 acquire){
        (uint256 amount0Out, uint256 amount1Out) = tokenIn < tokenOut ? (uint256(0), amountOut) : (amountOut, uint256(0));
        uint256 amountBefore = IERC20(tokenOut).balanceOf(recipient);
        IiZiSwapClassicPair(pair).swap(
            amount0Out, amount1Out, recipient, new bytes(0)
        );
        uint256 amountAfter = IERC20(tokenOut).balanceOf(recipient);
        acquire = amountAfter - amountBefore;
    }

    function classicAmountSingleInternal(
        SwapSingleParams memory params,
        address payer
    ) internal returns (uint256 cost, uint256 acquire) {
        (uint256 _acquire, address pair) = classicGetAmountOut(params.tokenIn, params.tokenOut, params.amount);
        // pay from payer
        pay(params.tokenIn, payer, pair, params.amount);
        cost = params.amount;
        acquire = _classicSwap(pair, params.tokenIn, params.tokenOut, _acquire, params.recipient);
    }

    function classicDesireSingleInternal(
        SwapSingleParams memory params,
        SwapCallbackData memory data
    ) internal returns (uint256 acquire) {
        (uint256 cost, address pair) = classicGetAmountIn(params.tokenIn, params.tokenOut, params.amount);
        if (data.path.hasMultiplePools()) {
            // call classicDesireInternalCallback(...)
            data.path = data.path.skipToken();
            swapDesireInternal(cost, pair, data);
        } else {
            // pay from payer
            pay(params.tokenIn, data.payer, pair, cost);
        }
        acquire = _classicSwap(pair, params.tokenIn, params.tokenOut, params.amount, params.recipient);
    }

    function swapDesireInternal(
        uint256 desire,
        address recipient,
        SwapCallbackData memory data
    ) internal virtual returns (uint256 acquire, address tokenOut) {}

    function pay(
        address token,
        address payer,
        address recipient,
        uint256 amount
    ) internal virtual {}
}