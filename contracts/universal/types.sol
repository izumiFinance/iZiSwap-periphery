// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

struct SwapCallbackData {
    bytes path;
    address payer;
}

struct SwapSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    uint256 amount;
    address recipient;
}