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
    
    function swapDesireSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint128 amountOfTokenOut,
        uint128 maxPayed,
        address recipient
    ) external notPause {
        // allow swapping to the router address with address 0
        if (recipient == address(0)) recipient = address(this);
        address poolAddr = pool(tokenOut, tokenIn, fee);
        uint256 amountIn;
        uint256 amountOut;
        if (tokenOut < tokenIn) {
            // tokenOut is tokenX, tokenIn is tokenY
            // we should call y2XDesireX
            (amountOut, amountIn) = IiZiSwapPool(poolAddr).swapY2XDesireX(
                recipient, amountOfTokenOut, 799999,
                abi.encode(SwapCallbackData({
                    tokenX: tokenOut, 
                    fee: fee, 
                    tokenY: tokenIn, 
                    payer: msg.sender
                }))
            );
            require (amountIn <= maxPayed, "swapY2XDesireX payed too much");
        } else {
            // tokenOut is tokenY
            // tokenIn is tokenX
            (amountIn, amountOut) = IiZiSwapPool(poolAddr).swapX2YDesireY(
                recipient, amountOfTokenOut, -799999,
                abi.encode(SwapCallbackData({
                    tokenX: tokenIn, 
                    fee: fee, 
                    tokenY: tokenOut, 
                    payer: msg.sender
                }))
            );
            require (amountIn <= maxPayed, "swapX2YDesireY payed too much");
        }
        emit MarketSwap(tokenIn, tokenOut, fee, Converter.toUint128(amountIn), Converter.toUint128(amountOut));
    }

    function swapAmountSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint128 amountOfTokenIn,
        uint128 minAcquired,
        address recipient
    ) external notPause {
        // allow swapping to the router address with address 0
        if (recipient == address(0)) recipient = address(this);
        address poolAddr = pool(tokenOut, tokenIn, fee);
        uint256 amountIn;
        uint256 amountOut;
        if (tokenIn < tokenOut) {
            // swapX2Y
            (amountIn, amountOut) = IiZiSwapPool(poolAddr).swapX2Y(
                recipient, amountOfTokenIn, -799999,
                abi.encode(SwapCallbackData({
                    tokenX: tokenIn, 
                    fee: fee, 
                    tokenY: tokenOut, 
                    payer: msg.sender
                }))
            );
            require (amountOut >= minAcquired, "swapX2Y acquire too little");
        } else {
            // swapY2X
            (amountOut, amountIn) = IiZiSwapPool(poolAddr).swapY2X(
                recipient, amountOfTokenIn, 799999,
                abi.encode(SwapCallbackData({
                    tokenX: tokenOut, 
                    fee: fee, 
                    tokenY: tokenIn, 
                    payer: msg.sender
                }))
            );
            require (amountOut >= minAcquired, "swapY2X acquire too little");
        }
        emit MarketSwap(tokenIn, tokenOut, fee, Converter.toUint128(amountIn), Converter.toUint128(amountOut));
    }

}