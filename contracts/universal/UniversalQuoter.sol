// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

import "./iZiClassicQuoter.sol";
import "./iZiSwapQuoter.sol";

interface IUniversalSwapRouter {
    function outFee() external view returns(uint16);
    function charger() external view returns(address);
}

contract UniversalQuoter is iZiClassicQuoter, iZiSwapQuoter {

    using Path for bytes;

    struct Price {
        bool usePoint;
        int24 point;
        uint256 reserveIn;
        uint256 reserveOut;
    }

    address swapRouter;

    /// @notice Construct this contract.
    /// @param _iZiSwapFactory address iZiSwap factory
    /// @param _iZiClassicFactory address iZiSwap classic factory
    /// @param _swapRouter address iZiSwap classic universal router
    constructor(address _iZiSwapFactory, address _iZiClassicFactory, address _swapRouter) 
    iZiClassicQuoter(_iZiClassicFactory) 
    iZiSwapQuoter(_iZiSwapFactory)
    {
        swapRouter = _swapRouter;
    }


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

    function getOutFee() internal view returns(uint16 outFee) {
        address charger = IUniversalSwapRouter(swapRouter).charger();
        if (charger == address(0)) {
            return 0;
        }
        outFee = IUniversalSwapRouter(swapRouter).outFee();
        return outFee;
    }

    function desireAddFee(uint256 originDesire) internal view returns(uint256 desire) {
        uint16 outFee = getOutFee();
        desire = originDesire * 10000 / (10000 - outFee);
        return desire;
    }

    function chargeFee(uint256 originAcquire) internal view returns(uint256 acquire) {
        uint16 outFee = getOutFee();
        uint256 tokenFee = originAcquire * outFee / 10000;
        acquire = originAcquire - tokenFee;
        return acquire;
    }

    struct QuoteParams {
        uint128 amount;
        bytes path;
        bool limit;
        bool fee;
    }

    function swapAmount(
        QuoteParams memory params
    ) public returns (uint256 acquire, Price[] memory price, uint16 outFee) {
        // allow swapping to the router address with address 0

        uint256 i = 0;
        price = new Price[](params.path.numPools());

        while (true) {
            bool hasMultiplePools = params.path.hasMultiplePools();
            (address tokenIn, address tokenOut, uint24 fee) = params.path.decodeFirstPool();
            Price memory poolPrice;
            if (fee != 0) {
                // iZiSwap
                int24 finalPt;
                (acquire, finalPt) = iZiSwapAmountSingleInternal(
                    iZiSwapQuoteSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        amount: params.amount,
                        limit: params.limit
                    })
                );
                poolPrice.usePoint = true;
                poolPrice.point = finalPt;
            } else {
                // iZiSwap classic
                uint256 reserveIn;
                uint256 reserveOut;
                (acquire, reserveIn, reserveOut) = classicGetAmountOut(tokenIn, tokenOut, params.amount);
                poolPrice.usePoint = false;
                poolPrice.reserveIn = reserveIn;
                poolPrice.reserveOut = reserveOut;
            }
            price[i] = poolPrice;
            i ++;

            // decide whether to continue or terminate
            if (hasMultiplePools) {
                params.path = params.path.skipToken();
                params.amount = uint128(acquire);
            } else {
                break;
            }
        }
        if (params.fee) {
            acquire = uint128(chargeFee(acquire));
            outFee = getOutFee();
        } else {
            outFee = 0;
        }
    }

    function swapDesire(
        QuoteParams memory params
    ) public returns (uint256 cost, Price[] memory price, uint16 outFee) {
        // allow swapping to the router address with address 0

        uint256 i = 0;
        price = new Price[](params.path.numPools());
        uint128 desire = params.amount;
        if (params.fee) {
            desire = uint128(desireAddFee(desire));
        }
        while (true) {
            bool hasMultiplePools = params.path.hasMultiplePools();
            (address tokenOut, address tokenIn, uint24 fee) = params.path.decodeFirstPool();
            Price memory poolPrice;
            if (fee != 0) {
                // iZiSwap
                int24 finalPt;
                (cost, finalPt) = iZiSwapDesireSingleInternal(
                    iZiSwapQuoteSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        amount: desire,
                        limit: params.limit
                    })
                );
                poolPrice.usePoint = true;
                poolPrice.point = finalPt;
            } else {
                // iZiSwap classic
                uint256 reserveIn;
                uint256 reserveOut;
                (cost, reserveIn, reserveOut) = classicGetAmountIn(tokenIn, tokenOut, desire);
                poolPrice.usePoint = false;
                poolPrice.reserveIn = reserveIn;
                poolPrice.reserveOut = reserveOut;
            }
            price[i] = poolPrice;
            i ++;

            // decide whether to continue or terminate
            if (hasMultiplePools) {
                params.path = params.path.skipToken();
                desire = uint128(cost);
            } else {
                break;
            }
        }
        if (params.fee) {
            outFee = getOutFee();
        } else {
            outFee = 0;
        }
    }

}