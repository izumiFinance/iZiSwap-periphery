// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

abstract contract iZiSwapQuoter is IiZiSwapCallback {

    using Path for bytes;

    /// @notice address of iZiSwapFactory
    address public immutable iZiSwapFactory;

    /// @notice Constructor of base.
    /// @param _iZiSwapFactory address of iZiSwapFactory
    constructor(address _iZiSwapFactory) {
        iZiSwapFactory = _iZiSwapFactory;
    }

    uint256 internal amountDesireCached;

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

    function getCurrentPoint(address pool) internal view returns (int24 currentPoint) {
        (
            ,
            currentPoint,
            ,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(pool).state();
    }

    function getUpperBoundaryPoint(uint24 fee, int24 currentPoint, bool limit) internal pure returns (int24 boundaryPoint) {
        if (!limit) {
            return 799999; 
        }
        int256 boundary = currentPoint;
        if (fee <= 100) {
            boundary += 10000;
        } else {
            boundary += 20000;
        }
        if (boundary > 799999) {
            boundary = 799999;
        }
        boundaryPoint = int24(boundary);
    }

    function getLowerBoundaryPoint(uint24 fee, int24 currentPoint, bool limit) internal pure returns (int24 boundaryPoint) {
        if (!limit) {
            return -799999;
        }
        int256 boundary = currentPoint;
        if (fee <= 100) {
            boundary -= 10000;
        } else {
            boundary -= 20000;
        }
        if (boundary < -799999) {
            boundary = -799999;
        }
        boundaryPoint = int24(boundary);
    }

    /// @notice Query pool address from factory by (tokenX, tokenY, fee).
    /// @param tokenX tokenX of swap pool
    /// @param tokenY tokenY of swap pool
    /// @param fee fee amount of swap pool
    function iZiSwapPool(address tokenX, address tokenY, uint24 fee) public view returns(address) {
        return IiZiSwapFactory(iZiSwapFactory).pool(tokenX, tokenY, fee);
    }
    function iZiSwapVerify(address tokenX, address tokenY, uint24 fee) internal view {
        require (msg.sender == iZiSwapPool(tokenX, tokenY, fee), "sp");
    }

    /// @notice Callback for swapY2X and swapY2XDesireX, in order to mark computed-amount of token and point after exchange.
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param path encoded SwapCallbackData
    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata path
    ) external view override {
        (address token0, address token1, uint24 fee) = path.decodeFirstPool();
        iZiSwapVerify(token0, token1, fee);
        
        address poolAddr = iZiSwapPool(token0, token1, fee);
        (
            ,
            int24 currPt,
            ,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(poolAddr).state();

        if (token0 < token1) {
            // token1 is y, amount of token1 is calculated
            // called from swapY2XDesireX(...)
            require(x >= amountDesireCached, 'x Pool Not Enough');
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

    /// @notice Callback for swapX2Y and swapX2YDesireY in order to mark computed-amount of token and point after exchange.
    /// @param x amount of tokenX need to pay from trader
    /// @param y amount of tokenY trader acquired
    /// @param path encoded SwapCallbackData
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata path
    ) external view override {
        (address token0, address token1, uint24 fee) = path.decodeFirstPool();
        iZiSwapVerify(token0, token1, fee);

        address poolAddr = iZiSwapPool(token0, token1, fee);
        (
            ,
            int24 currPt,
            ,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(poolAddr).state();

        if (token0 < token1) {
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
            require(y >= amountDesireCached, 'y Pool Not Enough');
            assembly {  
                let ptr := mload(0x40)
                mstore(ptr, x)
                mstore(add(ptr, 0x20), currPt)
                revert(ptr, 64)
            }
        }
    }
    struct iZiSwapQuoteSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint128 amount;
        bool limit;
    }
    function iZiSwapAmountSingleInternal(
        iZiSwapQuoteSingleParams memory params
    ) internal returns (uint256 acquire, int24 currPt) {
        address poolAddr = iZiSwapPool(params.tokenOut, params.tokenIn, params.fee);
        int24 currentPoint = getCurrentPoint(poolAddr);
        if (params.tokenIn < params.tokenOut) {
            int24 boundaryPoint = getLowerBoundaryPoint(params.fee, currentPoint, params.limit);
            try
                IiZiSwapPool(poolAddr).swapX2Y(
                    address(this), params.amount, boundaryPoint,
                    abi.encodePacked(params.tokenIn, params.fee, params.tokenOut)
                )
            {} catch (bytes memory reason) {
                return parseRevertReason(reason);
            }
        } else {
            int24 boundaryPoint = getUpperBoundaryPoint(params.fee, currentPoint, params.limit);
            try
                IiZiSwapPool(poolAddr).swapY2X(
                    address(this), params.amount, boundaryPoint,
                    abi.encodePacked(params.tokenIn, params.fee, params.tokenOut)
                )
            {} catch (bytes memory reason) {
                return parseRevertReason(reason);
            }
        }
    }
    function iZiSwapDesireSingleInternal(
        iZiSwapQuoteSingleParams memory params
    ) internal returns (uint256 cost, int24 currPt) {
        address poolAddr = iZiSwapPool(params.tokenOut, params.tokenIn, params.fee);
        amountDesireCached = params.amount;
        int24 currentPoint = getCurrentPoint(poolAddr);
        if (params.tokenIn < params.tokenOut) {
            int24 boundaryPoint = getLowerBoundaryPoint(params.fee, currentPoint, params.limit);
            try
                IiZiSwapPool(poolAddr).swapX2YDesireY(
                    address(this), params.amount + 1, boundaryPoint,
                    abi.encodePacked(params.tokenOut, params.fee, params.tokenIn)
                )
            {} catch (bytes memory reason) {
                return parseRevertReason(reason);
            }
        } else {
            int24 boundaryPoint = getUpperBoundaryPoint(params.fee, currentPoint, params.limit);
            try
                IiZiSwapPool(poolAddr).swapY2XDesireX(
                    address(this), params.amount + 1, boundaryPoint,
                    abi.encodePacked(params.tokenOut, params.fee, params.tokenIn)
                )
            {} catch (bytes memory reason) {
                return parseRevertReason(reason);
            }
        }
    }

}