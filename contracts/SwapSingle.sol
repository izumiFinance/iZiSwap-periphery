// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

import "./libraries/Converter.sol";

import "./base/base.sol";
import "./base/Switch.sol";

contract SwapSingle is Switch, Base, IiZiSwapCallback {

    /// @notice Emitted when user preswap AND SWAP OUT or do market swap before adding limit order
    /// @param tokenIn address of tokenIn (user payed to swap pool)
    /// @param tokenOut address of tokenOut (user acquired from swap pool)
    /// @param fee fee amount of swap pool
    /// @param amountIn amount of tokenIn during swap
    /// @param amountOut amount of tokenOut during swap
    event MarketSwap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint128 amountIn,
        uint128 amountOut
    );
    
    struct SwapCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
        address payer;
    }
    /// @notice Constructor to create this contract.
    /// @param factory address of iZiSwapFactory
    /// @param weth address of WETH token
    constructor( address factory, address weth ) Base(factory, weth) {}

    /// @notice Callback for swapY2X and swapY2XDesireX, in order to pay tokenY from trader.
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param data encoded SwapCallbackData
    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override notPause {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        pay(dt.tokenY, dt.payer, msg.sender, y);
    }

    /// @notice Callback for swapX2Y and swapX2YDesireY, in order to pay tokenX from trader.
    /// @param x amount of tokenX need to pay from trader
    /// @param y amount of tokenY trader acquired
    /// @param data encoded SwapCallbackData
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override notPause {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        pay(dt.tokenX, dt.payer, msg.sender, x);
    }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint128 amount;
        uint128 minAcquiredOrMaxPayed;
        address recipient;
        uint256 deadline;
    }
    
    function swapDesireSingle(
        SwapParams calldata params
    ) external payable notPause checkDeadline(params.deadline) {
        // allow swapping to the router address with address 0
        address recipient = params.recipient == address(0) ? address(this) : params.recipient;
        address poolAddr = pool(params.tokenOut, params.tokenIn, params.fee);
        uint256 amountIn;
        uint256 amountOut;
        if (params.tokenOut < params.tokenIn) {
            // tokenOut is tokenX, tokenIn is tokenY
            // we should call y2XDesireX
            (amountOut, amountIn) = IiZiSwapPool(poolAddr).swapY2XDesireX(
                recipient, params.amount, 799999,
                abi.encode(SwapCallbackData({
                    tokenX: params.tokenOut, 
                    fee: params.fee, 
                    tokenY: params.tokenIn, 
                    payer: msg.sender
                }))
            );
            require (amountIn <= params.minAcquiredOrMaxPayed, "swapY2XDesireX payed too much");
        } else {
            // tokenOut is tokenY
            // tokenIn is tokenX
            (amountIn, amountOut) = IiZiSwapPool(poolAddr).swapX2YDesireY(
                recipient, params.amount, -799999,
                abi.encode(SwapCallbackData({
                    tokenX: params.tokenIn, 
                    fee: params.fee, 
                    tokenY: params.tokenOut, 
                    payer: msg.sender
                }))
            );
            require (amountIn <= params.minAcquiredOrMaxPayed, "swapX2YDesireY payed too much");
        }
        emit MarketSwap(params.tokenIn, params.tokenOut, params.fee, Converter.toUint128(amountIn), Converter.toUint128(amountOut));
    }

    function swapAmountSingle(
        SwapParams calldata params
    ) external payable notPause checkDeadline(params.deadline) {
        // allow swapping to the router address with address 0
        address recipient = params.recipient == address(0) ? address(this) : params.recipient;
        address poolAddr = pool(params.tokenOut, params.tokenIn, params.fee);
        uint256 amountIn;
        uint256 amountOut;
        if (params.tokenIn < params.tokenOut) {
            // swapX2Y
            (amountIn, amountOut) = IiZiSwapPool(poolAddr).swapX2Y(
                recipient, params.amount, -799999,
                abi.encode(SwapCallbackData({
                    tokenX: params.tokenIn, 
                    fee: params.fee, 
                    tokenY: params.tokenOut, 
                    payer: msg.sender
                }))
            );
            require (amountOut >= params.minAcquiredOrMaxPayed, "swapX2Y acquire too little");
        } else {
            // swapY2X
            (amountOut, amountIn) = IiZiSwapPool(poolAddr).swapY2X(
                recipient, params.amount, 799999,
                abi.encode(SwapCallbackData({
                    tokenX: params.tokenOut, 
                    fee: params.fee, 
                    tokenY: params.tokenIn, 
                    payer: msg.sender
                }))
            );
            require (amountOut >= params.minAcquiredOrMaxPayed, "swapY2X acquire too little");
        }
        emit MarketSwap(params.tokenIn, params.tokenOut, params.fee, Converter.toUint128(amountIn), Converter.toUint128(amountOut));
    }

}