// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.4;

import '../libraries/Path.sol';

import './libraries/TickMathV3.sol';

import './interfaces/iZiSwapV3/IiZiSwapV3SwapCallback.sol';
import './interfaces/iZiSwapV3/IiZiSwapV3Factory.sol';
import './interfaces/iZiSwapV3/IiZiSwapV3Pool.sol';

contract iZiSwapV3Quoter is IiZiSwapV3SwapCallback {
    using Path for bytes;

    /// @notice address of iZiSwapV3Factory
    address public immutable iZiSwapV3Factory;

    /// @dev Transient storage variable used to check a safety condition in exact output swaps.
    uint256 private amountOutCached;

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

    /// @inheritdoc IiZiSwapV3SwapCallback
    function iZiSwapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes memory path
    ) external view override {
        require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
        (address tokenIn, address tokenOut, uint24 fee) = path.decodeFirstPool();
        address pool = getPool(tokenIn, tokenOut, fee);
        require(msg.sender == pool, "sp");

        (bool isExactInput, uint256 amountToPay, uint256 amountReceived) =
            amount0Delta > 0
                ? (tokenIn < tokenOut, uint256(amount0Delta), uint256(-amount1Delta))
                : (tokenOut < tokenIn, uint256(amount1Delta), uint256(-amount0Delta));

        (uint160 sqrtPriceX96After, int24 tickAfter, , , , , ) = IiZiSwapV3Pool(pool).slot0();

        if (isExactInput) {
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, amountReceived)
                mstore(add(ptr, 0x20), sqrtPriceX96After)
                mstore(add(ptr, 0x40), tickAfter)
                revert(ptr, 96)
            }
        } else {
            // if the cache has been populated, ensure that the full output amount has been received
            if (amountOutCached != 0) require(amountReceived >= amountOutCached, "Received Not Enough");
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, amountToPay)
                mstore(add(ptr, 0x20), sqrtPriceX96After)
                mstore(add(ptr, 0x40), tickAfter)
                revert(ptr, 96)
            }
        }
    }

    /// @dev Parses a revert reason that should contain the numeric quote
    function parseRevertReasonV3(bytes memory reason)
        private
        pure
        returns (
            uint256 amount,
            uint160 sqrtPriceX96After,
            int24 tickAfter
        )
    {
        if (reason.length != 96) {
            if (reason.length < 68) revert('Unexpected error');
            assembly {
                reason := add(reason, 0x04)
            }
            revert(abi.decode(reason, (string)));
        }
        return abi.decode(reason, (uint256, uint160, int24));
    }

    function handleRevert(
        bytes memory reason
    )
        private
        pure
        returns (
            uint256 amount,
            uint160 sqrtPriceX96After
        )
    {
        (amount, sqrtPriceX96After,) = parseRevertReasonV3(reason);
        return (amount, sqrtPriceX96After);
    }

    struct iZiSwapV3QuoteSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amount;
        uint24 fee;
        bool limit;
    }

    function getSqrtPriceLimitX96(address pool, bool zeroForOne, bool limit) internal view returns(uint160 sqrtPriceLimitX96) {
        uint256 sqrtPrice = 0;
        if (limit) {
            (uint160 currentSqrtPrice, , , , , , ) = IiZiSwapV3Pool(pool).slot0();
            if (zeroForOne) {
                // 1.7 roughly equals to sqrt(3)
                sqrtPrice = uint256(currentSqrtPrice) * 10 / 17;
                if (sqrtPrice < TickMathV3.MIN_SQRT_RATIO + 1) {
                    sqrtPrice = TickMathV3.MIN_SQRT_RATIO + 1;
                }
            } else {
                sqrtPrice = uint256(currentSqrtPrice) * 17 / 10;
                if (sqrtPrice > TickMathV3.MAX_SQRT_RATIO - 1) {
                    sqrtPrice = TickMathV3.MAX_SQRT_RATIO - 1;
                }
            }
        } else {
            if (zeroForOne) {
                sqrtPrice = TickMathV3.MIN_SQRT_RATIO + 1;
            } else {
                sqrtPrice = TickMathV3.MAX_SQRT_RATIO - 1;
            }
        }
        return uint160(sqrtPrice);
    }

    function iZiSwapV3AmountSingleInternal(iZiSwapV3QuoteSingleParams memory params)
        internal
        returns (
            uint256 acquire,
            uint160 sqrtPriceX96After
        )
    {
        bool zeroForOne = params.tokenIn < params.tokenOut;
        address pool = getPool(params.tokenIn, params.tokenOut, params.fee);
        uint160 sqrtPriceLimitX96 = getSqrtPriceLimitX96(pool, zeroForOne, params.limit);

        try
            IiZiSwapV3Pool(pool).swap(
                address(this), // address(0) might cause issues with some tokens
                zeroForOne,
                int256(params.amount),
                sqrtPriceLimitX96,
                abi.encodePacked(params.tokenIn, params.fee, params.tokenOut)
            )
        {} catch (bytes memory reason) {
            return handleRevert(reason);
        }
    }

    function iZiSwapV3DesireSingleInternal(iZiSwapV3QuoteSingleParams memory params)
        internal
        returns (
            uint256 cost,
            uint160 sqrtPriceX96After
        )
    {
        bool zeroForOne = params.tokenIn < params.tokenOut;
        address pool = getPool(params.tokenIn, params.tokenOut, params.fee);
        uint160 sqrtPriceLimitX96 = getSqrtPriceLimitX96(pool, zeroForOne, params.limit);

        // if no price limit has been specified, cache the output amount for comparison in the swap callback
        if (!params.limit) amountOutCached = params.amount;
        try
            IiZiSwapV3Pool(pool).swap(
                address(this), // address(0) might cause issues with some tokens
                zeroForOne,
                -int256(params.amount),
                sqrtPriceLimitX96,
                abi.encodePacked(params.tokenOut, params.fee, params.tokenIn)
            )
        {} catch (bytes memory reason) {
            if (!params.limit) delete amountOutCached; // clear cache
            return handleRevert(reason);
        }
    }
}
