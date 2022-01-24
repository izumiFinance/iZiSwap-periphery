// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./base/base.sol";

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

contract Swap is Base, IiZiSwapCallback {

    // callback data passed through swap interfaces to the callback
    struct SwapCallbackData {
        // amount of token0 is input param
        address token0;
        // amount of token1 is calculated param
        address token1;
        // address to pay token
        address payer;
        // fee amount of swap
        uint24 fee;
    }

    /// @notice callback for swapY2X and swapY2XDesireX, in order to pay tokenY from trader
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param data encoded SwapCallbackData
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

    /// @notice callback for swapX2Y and swapX2YDesireY, in order to pay tokenX from trader
    /// @param x amount of tokenX need to pay from trader
    /// @param y amount of tokenY trader acquired
    /// @param data encoded SwapCallbackData
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

    /// @notice constructor to create this contract
    /// @param _factory address of iZiSwapFactory
    /// @param _weth address of weth token
    constructor(address _factory, address _weth) Base(_factory, _weth) {
    }

    /// parameters when calling Swap.swap..., grouped together to avoid stake too deep
    struct SwapParams {
        // tokenX of swap pool
        address tokenX;
        // tokenY of swap pool
        address tokenY;
        // fee amount of swap pool
        uint24 fee;
        // highPt for y2x, lowPt for x2y
        // here y2X is calling swapY2X or swapY2XDesireX
        int24 boundaryPt; 
        // who will receive acquired token
        address recipient;
        // desired amount for desired mode, paid amount for non-desired mode
        // here, desire mode is calling swapX2YDesireY or swapY2XDesireX
        uint128 amount;
        // max amount of paid token trader willing to pay
        // only used in desire mode
        uint256 maxPayed;
        // min amount of received token trader wanted
        uint256 minAcquired;
    }

    // amount of exchanged tokens
    struct ExchangeAmount {
        // amount of tokenX paid or acquired
        uint256 amountX;
        // amount of tokenY acquired or paid
        uint256 amountY;
    }

    /// @notice Swap tokenY for tokenX， given max amount of tokenY user willing to pay
    /// @param swapParams params(for example: max amount in above line), see SwapParams for more
    function swapY2X(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        (uint256 amountX, ) = IiZiSwapPool(poolAddr).swapY2X(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenY, token1:swapParams.tokenX, fee: swapParams.fee, payer: payer}))
        );
        require(amountX >= swapParams.minAcquired, "XMIN");
    }

    /// @notice Swap tokenY for tokenX， given user's desired amount of tokenX
    /// @param swapParams params(for example: desired amount in above line), see SwapParams for more
    function swapY2XDesireX(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        ExchangeAmount memory amount;
        (amount.amountX, amount.amountY) = IiZiSwapPool(poolAddr).swapY2XDesireX(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenX, token1:swapParams.tokenY, fee: swapParams.fee, payer: payer}))
        );
        require(amount.amountX >= swapParams.minAcquired, "XMIN");
        require(amount.amountY <= swapParams.maxPayed, "YMAX");
    }

    /// @notice Swap tokenX for tokenY， given max amount of tokenX user willing to pay
    /// @param swapParams params(for example: max amount in above line), see SwapParams for more
    function swapX2Y(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        (, uint256 amountY) = IiZiSwapPool(poolAddr).swapX2Y(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenX, token1:swapParams.tokenY, fee: swapParams.fee, payer: payer}))
        );
        require(amountY >= swapParams.minAcquired, "YMIN");
    }

    /// @notice Swap tokenX for tokenY， given amount of tokenY user desires
    /// @param swapParams params(for example: desired amount in above line), see SwapParams for more
    function swapX2YDesireY(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        ExchangeAmount memory amount;
        (amount.amountX, amount.amountY) = IiZiSwapPool(poolAddr).swapX2YDesireY(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenY, token1:swapParams.tokenX, fee: swapParams.fee, payer: payer}))
        );
        require(amount.amountX <= swapParams.maxPayed, "XMAX");
        require(amount.amountY >= swapParams.minAcquired, "YMIN");
    }
}