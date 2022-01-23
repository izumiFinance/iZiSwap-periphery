// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./base/base.sol";

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

contract Swap is Base, IiZiSwapCallback {

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

    struct SwapParams {
        address tokenX;
        address tokenY;
        uint24 fee;
        /// @notice highPt for y2x, lowPt for x2y
        int24 boundaryPt; 
        address recipient;
        /// @notice desired amount for desired mode, payed amount for non-desired mode
        uint128 amount;
        uint256 maxPayed;
        uint256 minAcquired;
    }

    struct SwapAmount {
        uint256 amountX;
        uint256 amountY;
    }

    event SwapEvent(address indexed tokenA, address indexed tokenB, uint24 fee, uint256 amountA, uint256 amountB);


    function swapY2X(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        (uint256 amountX, uint256 amountY) = IiZiSwapPool(poolAddr).swapY2X(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenY, token1:swapParams.tokenX, fee: swapParams.fee, payer: payer}))
        );
        require(amountX >= swapParams.minAcquired, "XMIN");
        emit SwapEvent(swapParams.tokenY, swapParams.tokenX, swapParams.fee, amountY, amountX);
    }
    function swapY2XDesireX(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        SwapAmount memory amount;
        (amount.amountX, amount.amountY) = IiZiSwapPool(poolAddr).swapY2XDesireX(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenX, token1:swapParams.tokenY, fee: swapParams.fee, payer: payer}))
        );
        require(amount.amountX >= swapParams.minAcquired, "XMIN");
        require(amount.amountY <= swapParams.maxPayed, "YMAX");
        emit SwapEvent(swapParams.tokenY, swapParams.tokenX, swapParams.fee, amount.amountY, amount.amountX);
    }
    function swapX2Y(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        (uint256 amountX, uint256 amountY) = IiZiSwapPool(poolAddr).swapX2Y(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenX, token1:swapParams.tokenY, fee: swapParams.fee, payer: payer}))
        );
        require(amountY >= swapParams.minAcquired, "YMIN");
        emit SwapEvent(swapParams.tokenX, swapParams.tokenY, swapParams.fee, amountX, amountY);
    }
    function swapX2YDesireY(
        SwapParams calldata swapParams
    ) external payable {
        require(swapParams.tokenX < swapParams.tokenY, "x<y");
        address poolAddr = pool(swapParams.tokenX, swapParams.tokenY, swapParams.fee);
        address payer = msg.sender;
        address recipient = (swapParams.recipient == address(0)) ? address(this): swapParams.recipient;
        SwapAmount memory amount;
        (amount.amountX, amount.amountY) = IiZiSwapPool(poolAddr).swapX2YDesireY(
            recipient, swapParams.amount, swapParams.boundaryPt,
            abi.encode(SwapCallbackData({token0: swapParams.tokenY, token1:swapParams.tokenX, fee: swapParams.fee, payer: payer}))
        );
        require(amount.amountX <= swapParams.maxPayed, "XMAX");
        require(amount.amountY >= swapParams.minAcquired, "YMIN");
        emit SwapEvent(swapParams.tokenX, swapParams.tokenY, swapParams.fee, amount.amountX, amount.amountY);
    }
}