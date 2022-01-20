// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./base/base.sol";

import "./core/interfaces/IiZiSwapCallback.sol";
import "./core/interfaces/IiZiSwapFactory.sol";
import "./core/interfaces/IiZiSwapPool.sol";

contract Quoter is Base, IiZiSwapCallback {

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
    ) external view override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.token0, dt.token1, dt.fee);
        
        address poolAddr = pool(dt.token0, dt.token1, dt.fee);
        (
            ,
            int24 currPt,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(poolAddr).state();

        if (dt.token0 < dt.token1) {
            // token1 is y, amount of token1 is calculated
            // called from swapY2XDesireX(...)
            assembly {  
                let ptr := mload(0x40)
                mstore(ptr, y)
                mstore(add(ptr, 0x20), currPt)
                revert(ptr, 64)
            }
        } else {
            // token0 is y, amount of token0 is input param
            // called from swapY2X(...)
            assembly {  
                let ptr := mload(0x40)
                mstore(ptr, x)
                mstore(add(ptr, 0x20), currPt)
                revert(ptr, 64)
            }
        }
    }
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external view override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.token0, dt.token1, dt.fee);

        address poolAddr = pool(dt.token0, dt.token1, dt.fee);
        (
            ,
            int24 currPt,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(poolAddr).state();

        if (dt.token0 < dt.token1) {
            // token0 is x, amount of token0 is input param
            // called from swapX2Y(...)
            assembly {  
                let ptr := mload(0x40)
                mstore(ptr, y)
                mstore(add(ptr, 0x20), currPt)
                revert(ptr, 64)
            }
        } else {
            // token1 is x, amount of token1 is calculated param
            // called from swapX2YDesireY(...)
            assembly {  
                let ptr := mload(0x40)
                mstore(ptr, x)
                mstore(add(ptr, 0x20), currPt)
                revert(ptr, 64)
            }
        }
    }
    constructor(address _factory, address _weth) Base(_factory, _weth) {
    }

    function parseRevertReason(bytes memory reason)
        private
        pure
        returns (
            uint256 amount,
            int24 currPt
        )
    {
        if (reason.length != 64) {
            if (reason.length < 68) revert('Unexpected error');
            assembly {
                reason := add(reason, 0x04)
            }
            revert(abi.decode(reason, (string)));
        }
        return abi.decode(reason, (uint256, int24));
    }


    function swapY2X(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 amount,
        int24 highPt
    ) public returns (uint256, int24) {
        require(tokenX < tokenY, "x<y");
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        try
            IiZiSwapPool(poolAddr).swapY2X(
                payer, amount, highPt,
                abi.encode(SwapCallbackData({token0: tokenY, token1:tokenX, fee: fee, payer: payer}))
            )
        {} catch (bytes memory reason) {
            return parseRevertReason(reason);
        }
    }
    function swapY2XDesireX(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 desireX,
        int24 highPt
    ) public returns (uint256, int24) {
        require(tokenX < tokenY, "x<y");
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        try
            IiZiSwapPool(poolAddr).swapY2XDesireX(
                payer, desireX, highPt,
                abi.encode(SwapCallbackData({token0: tokenX, token1:tokenY, fee: fee, payer: payer}))
            )
        {} catch (bytes memory reason) {
            return parseRevertReason(reason);
        }
    }
    function swapX2Y(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 amount,
        int24 lowPt
    ) public returns (uint256, int24) {
        require(tokenX < tokenY, "x<y");
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        try
            IiZiSwapPool(poolAddr).swapX2Y(
                payer, amount, lowPt,
                abi.encode(SwapCallbackData({token0: tokenX, token1:tokenY, fee: fee, payer: payer}))
            )
        {} catch (bytes memory reason) {
            return parseRevertReason(reason);
        }
    }
    function swapX2YDesireY(
        address tokenX,
        address tokenY,
        uint24 fee,
        uint128 desireY,
        int24 highPt
    ) public returns (uint256, int24) {
        require(tokenX < tokenY, "x<y");
        address poolAddr = pool(tokenX, tokenY, fee);
        address payer = msg.sender;
        try 
            IiZiSwapPool(poolAddr).swapX2YDesireY(
                payer, desireY, highPt,
                abi.encode(SwapCallbackData({token0: tokenY, token1:tokenX, fee: fee, payer: payer}))
            )
        {} catch (bytes memory reason) {
            return parseRevertReason(reason);
        }
    }
}