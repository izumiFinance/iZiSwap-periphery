// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

import "./libraries/FeeSwapType.sol";

import "./iZiClassicQuoter.sol";
import "./iZiSwapQuoter.sol";
import "./iZiSwapV3Quoter.sol";

contract UniversalV3Quoter is iZiClassicQuoter, iZiSwapQuoter, iZiSwapV3Quoter {

    using Path for bytes;

    struct Price {
        uint8 swapType;
        // iZiSwap
        int24 point;
        // iZiSwap classic
        uint256 reserveIn;
        uint256 reserveOut;
        // iZiSwap V3
        uint160 sqrtPriceX96;
    }

    /// @notice Construct this contract.
    /// @param _iZiSwapFactory address iZiSwap factory
    /// @param _iZiClassicFactory address iZiSwap classic factory
    /// @param _iZiSwapV3Factory address iZiSwap factory
    constructor(
        address _iZiSwapFactory, 
        address _iZiClassicFactory,
        address _iZiSwapV3Factory
    ) 
    iZiClassicQuoter(_iZiClassicFactory) 
    iZiSwapQuoter(_iZiSwapFactory)
    iZiSwapV3Quoter(_iZiSwapV3Factory)
    {}


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

    function desireAddFee(uint256 originDesire, uint16 outFee) internal pure returns(uint256 desire) {
        desire = originDesire * 10000 / (10000 - outFee);
        return desire;
    }

    function chargeFee(uint256 originAcquire, uint16 outFee) internal pure returns(uint256 acquire) {
        uint256 tokenFee = originAcquire * outFee / 10000;
        acquire = originAcquire - tokenFee;
        return acquire;
    }

    struct QuoteParams {
        uint128 amount;
        bytes path;
        bool limit;
        uint16 outFee;
    }

    function swapAmount(
        QuoteParams memory params
    ) public returns (uint256 acquire, Price[] memory price) {
        // allow swapping to the router address with address 0

        uint256 i = 0;
        price = new Price[](params.path.numPools());

        while (true) {
            bool hasMultiplePools = params.path.hasMultiplePools();
            (address tokenIn, address tokenOut, uint24 feeSwapType) = params.path.decodeFirstPool();
            Price memory poolPrice;
            uint24 fee;
            (fee, poolPrice.swapType) = FeeSwapType.fromFeeSwapType(feeSwapType);
            if (poolPrice.swapType == FeeSwapType.TYPE_IZISWAP) {
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
                poolPrice.point = finalPt;
            } else if (poolPrice.swapType == FeeSwapType.TYPE_V3) {
                // iZiSwap V3
                uint160 sqrtPriceX96;
                (acquire, sqrtPriceX96) = iZiSwapV3AmountSingleInternal(
                    iZiSwapV3QuoteSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        amount: params.amount,
                        limit: params.limit
                    })
                );
                poolPrice.sqrtPriceX96 = sqrtPriceX96;
            } else {
                // iZiSwap classic
                require(iZiClassicFactory != address(0), "classic not supported!");
                uint256 reserveIn;
                uint256 reserveOut;
                (acquire, reserveIn, reserveOut) = classicGetAmountOut(tokenIn, tokenOut, params.amount);
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
        if (params.outFee > 0) {
            acquire = uint128(chargeFee(acquire, params.outFee));
        }
    }

    function swapDesire(
        QuoteParams memory params
    ) public returns (uint256 cost, Price[] memory price) {
        // allow swapping to the router address with address 0

        uint256 i = 0;
        price = new Price[](params.path.numPools());
        uint128 desire = params.amount;
        if (params.outFee > 0) {
            desire = uint128(desireAddFee(desire, params.outFee));
        }
        while (true) {
            bool hasMultiplePools = params.path.hasMultiplePools();
            (address tokenOut, address tokenIn, uint24 feeSwapType) = params.path.decodeFirstPool();
            Price memory poolPrice;
            uint24 fee;
            (fee, poolPrice.swapType) = FeeSwapType.fromFeeSwapType(feeSwapType);
            if (poolPrice.swapType == FeeSwapType.TYPE_IZISWAP) {
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
                poolPrice.point = finalPt;
            } else if (poolPrice.swapType == FeeSwapType.TYPE_V3) {
                // iZiSwap V3
                uint160 sqrtPriceX96;
                (cost, sqrtPriceX96) = iZiSwapV3DesireSingleInternal(
                    iZiSwapV3QuoteSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        amount: desire,
                        limit: params.limit
                    })
                );
                poolPrice.sqrtPriceX96 = sqrtPriceX96;
            } else {
                // iZiSwap classic
                require(iZiClassicFactory != address(0), "classic not supported!");
                uint256 reserveIn;
                uint256 reserveOut;
                (cost, reserveIn, reserveOut) = classicGetAmountIn(tokenIn, tokenOut, desire);
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
    }

}
