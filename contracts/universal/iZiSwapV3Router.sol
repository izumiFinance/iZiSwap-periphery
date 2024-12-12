// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.4;

import '../libraries/Path.sol';

import './libraries/TickMathV3.sol';

import './interfaces/iZiSwapV3/IiZiSwapV3SwapCallback.sol';
import './interfaces/iZiSwapV3/IiZiSwapV3Factory.sol';
import './interfaces/iZiSwapV3/IiZiSwapV3Pool.sol';

import "./libraries/FeeSwapType.sol";

import "./types.sol";

contract iZiSwapV3Router is IiZiSwapV3SwapCallback {
    using Path for bytes;

    /// @notice address of iZiSwapV3Factory
    address public immutable iZiSwapV3Factory;

    constructor(address _iZiSwapV3Factory) {
        iZiSwapV3Factory = _iZiSwapV3Factory;
    }

    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) private view returns (address) {
        return IiZiSwapV3Factory(iZiSwapV3Factory).getPool(tokenA, tokenB, fee);
    }

    struct PoolParam {
        address tokenIn;
        address tokenOut;
        uint24 feeSwapType;
        uint24 fee;
    }

    /// @inheritdoc IiZiSwapV3SwapCallback
    function iZiSwapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external override {
        require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        PoolParam memory poolParam;
        (poolParam.tokenIn, poolParam.tokenOut, poolParam.feeSwapType) = data.path.decodeFirstPool();
        (poolParam.fee,) = FeeSwapType.fromFeeSwapType(poolParam.feeSwapType);
        require(getPool(poolParam.tokenIn, poolParam.tokenOut, poolParam.fee) == msg.sender, "spV3");
        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (poolParam.tokenIn < poolParam.tokenOut, uint256(amount0Delta))
                : (poolParam.tokenOut < poolParam.tokenIn, uint256(amount1Delta));
        if (isExactInput) {
            pay(poolParam.tokenIn, data.payer, msg.sender, amountToPay);
        } else {
            // either initiate the next swap or pay
            if (data.path.hasMultiplePools()) {
                data.path = data.path.skipToken();
                swapDesireInternal(amountToPay, msg.sender, data);
            } else {
                poolParam.tokenIn = poolParam.tokenOut; // swap in/out because exact output swaps are reversed
                pay(poolParam.tokenIn, data.payer, msg.sender, amountToPay);
            }
        }
    }

    function iZiSwapV3DesireSingleInternal(
        SwapSingleParams memory params,
        SwapCallbackData memory data
    ) internal returns (uint256 acquire) {
        
        bool zeroForOne = params.tokenIn < params.tokenOut;

        (int256 amount0Delta, int256 amount1Delta) =
            IiZiSwapV3Pool(getPool(params.tokenIn, params.tokenOut, params.fee)).swap(
                params.recipient,
                zeroForOne,
                -int256(params.amount),
                zeroForOne ? TickMathV3.MIN_SQRT_RATIO + 1 : TickMathV3.MAX_SQRT_RATIO - 1,
                abi.encode(data)
            );

        acquire = zeroForOne
            ? uint256(-amount1Delta)
            : uint256(-amount0Delta);
    }

    struct SwapAmount {
        int256 amount0;
        int256 amount1;
    }

    function iZiSwapV3AmountSingleInternal(
        SwapSingleParams memory params,
        address payer
    ) internal returns (uint256 cost, uint256 acquire) {
        
        bool zeroForOne = params.tokenIn < params.tokenOut;
        SwapAmount memory swapAmount;
        (swapAmount.amount0, swapAmount.amount1) =
            IiZiSwapV3Pool(getPool(params.tokenIn, params.tokenOut, params.fee)).swap(
                params.recipient,
                zeroForOne,
                int256(params.amount),
                zeroForOne ? TickMathV3.MIN_SQRT_RATIO + 1 : TickMathV3.MAX_SQRT_RATIO - 1,
                abi.encode(
                    SwapCallbackData({
                        path: abi.encodePacked(
                            params.tokenIn, 
                            FeeSwapType.toFeeSwapType(params.fee, FeeSwapType.TYPE_V3), 
                            params.tokenOut
                        ), 
                        payer: payer
                }))
            );
        
        (cost, acquire) = zeroForOne
            ? (uint256(swapAmount.amount0), uint256(-swapAmount.amount1))
            : (uint256(swapAmount.amount1), uint256(-swapAmount.amount0));

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
