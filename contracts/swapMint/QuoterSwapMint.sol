// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

import "../base/base.sol";

interface IiZiSwapPoolPair {
    function tokenX() external view returns(address);
    function tokenY() external view returns(address);
    function fee() external view returns(uint24);
}

contract QuoterSwapMint is Base, IiZiSwapCallback {

    using Path for bytes;

    struct SwapCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    /// @notice Construct this contract.
    /// @param _factory address iZiSwapFactory
    /// @param _weth address of weth token
    constructor(address _factory, address _weth) Base(_factory, _weth) {}


    /// @notice Make multiple function calls in this contract in a single transaction
    ///     and return the data for each function call, donot revert if any function call fails
    /// @param data The encoded function data for each function call
    /// @return successes whether catch a revert in the function call of data[i]
    /// @return results result of each function call
    function multicallNoRevert(bytes[] calldata data) external payable returns (bool[]memory successes, bytes[] memory results) {
        results = new bytes[](data.length);
        successes = new bool[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);

            successes[i] = success;
            results[i] = result;
        }
    }

    function parseRevertReason(bytes memory reason)
        private
        pure
        returns (
            uint256 amountX,
            uint256 amountY,
            int24 finalPt
        )
    {
        if (reason.length != 96) {
            if (reason.length < 68) revert('Unexpected error');
            assembly {
                reason := add(reason, 0x04)
            }
            revert(abi.decode(reason, (string)));
        }
        return abi.decode(reason, (uint256, uint256, int24));
    }

    function getCurrentPt(address pool) private view returns(int24) {
        (
            ,
            int24 currentPt,
            ,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(pool).state();
        return currentPt;
    }

    /// @notice Callback
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param data encoded SwapCallbackData
    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external view override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        int24 currentPt = getCurrentPt(pool(dt.tokenX, dt.tokenY, dt.fee));
        assembly {  
            let ptr := mload(0x40)
            mstore(ptr, x)
            mstore(add(ptr, 0x20), y)
            mstore(add(ptr, 0x40), currentPt)
            revert(ptr, 96)
        }
    }

    /// @notice Callback
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param data encoded SwapCallbackData
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external view override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        int24 currentPt = getCurrentPt(pool(dt.tokenX, dt.tokenY, dt.fee));
        assembly {  
            let ptr := mload(0x40)
            mstore(ptr, x)
            mstore(add(ptr, 0x20), y)
            mstore(add(ptr, 0x40), currentPt)
            revert(ptr, 96)
        }
    }

    struct QuoteParams {
        address poolAddress;
        int24 targetPt;
        uint128 amount;
    }

    struct PairInfo {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    function getPair(address pool) private view returns(PairInfo memory) {
        PairInfo memory info;
        info.tokenX = IiZiSwapPoolPair(pool).tokenX();
        info.tokenY = IiZiSwapPoolPair(pool).tokenY();
        info.fee = IiZiSwapPoolPair(pool).fee();
        return info;
    }

    /// @notice estimate exchange amount to move price to targetPt.
    /// calling this function will not generate any real exchanges in the pool
    /// @param params params of quote with pool address and target point
    /// @return payAmountX estimated pay amount of tokenX
    /// @return payAmountY estimated pay amount of tokenY
    /// @return acquireAmountX estimated acquire amount of tokenX
    /// @return acquireAmountY estimated acquire amount of tokenY
    function swap(
        QuoteParams memory params
    ) public returns (
        uint256 payAmountX,
        uint256 payAmountY,
        uint256 acquireAmountX,
        uint256 acquireAmountY,
        int24 finalPt
    ) {
        int24 currentPt = getCurrentPt(params.poolAddress);
        if (params.targetPt == currentPt) {
            return (0, 0, 0, 0, currentPt);
        }
        payAmountX = 0;
        payAmountY = 0;
        acquireAmountX = 0;
        acquireAmountY = 0;
        PairInfo memory pairInfo = getPair(params.poolAddress);
        if (params.targetPt > currentPt) {
            try
                IiZiSwapPool(params.poolAddress).swapY2X(
                    address(this), params.amount, params.targetPt,
                    abi.encode(SwapCallbackData({
                        tokenX: pairInfo.tokenX, 
                        fee: pairInfo.fee, 
                        tokenY: pairInfo.tokenY
                    }))
                )
            {} catch (bytes memory reason) {
                (acquireAmountX, payAmountY, finalPt) = parseRevertReason(reason);
            }
        } else {
            try
                IiZiSwapPool(params.poolAddress).swapX2Y(
                    address(this), params.amount, params.targetPt,
                    abi.encode(SwapCallbackData({
                        tokenX: pairInfo.tokenX, 
                        fee: pairInfo.fee, 
                        tokenY: pairInfo.tokenY
                    }))
                )
            {} catch (bytes memory reason) {
                (payAmountX, acquireAmountY, finalPt) = parseRevertReason(reason);
            }
        }
    }
}