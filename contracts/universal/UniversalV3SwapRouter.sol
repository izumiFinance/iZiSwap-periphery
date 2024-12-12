// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/Path.sol";

import "./interfaces/IiZiSwapClassicPair.sol";
import "./interfaces/IiZiSwapClassicFactory.sol";

import "./UniversalBase.sol";
import "./iZiSwapRouterFeeSwapType.sol";
import "./ClassicSwapRouter.sol";
import "./iZiSwapV3Router.sol";
import "./types.sol";

contract UniversalV3SwapRouter is 
    Ownable,
    UniversalBase,
    iZiSwapRouterFeeSwapType,
    ClassicSwapRouter,
    iZiSwapV3Router {
    
    using Path for bytes;

    uint256 private constant DEFAULT_PAYED_CACHED = type(uint256).max;
    uint256 private payedCached = DEFAULT_PAYED_CACHED;

    address public charger;

    /// @notice constructor to create this contract
    /// @param _iZiSwapFactory address of iZiSwap factory
    /// @param _iZiClassicFactory address of iZiSwap classic factory
    /// @param _iZiSwapV3Factory address of iZiSwap V3 factory
    /// @param _weth address of weth token
    /// @param _charger address of fee charger
    constructor(address _iZiSwapFactory, address _iZiClassicFactory, address _iZiSwapV3Factory, address _weth, address _charger)
        UniversalBase(_weth)
        iZiSwapRouterFeeSwapType(_iZiSwapFactory)
        ClassicSwapRouter(_iZiClassicFactory)
        iZiSwapV3Router(_iZiSwapV3Factory)
    {
        charger = _charger;
    }

    /// @param token The token to pay
    /// @param payer The entity that must pay
    /// @param recipient The entity that will receive payment
    /// @param value The amount to pay
    function pay(
        address token,
        address payer,
        address recipient,
        uint256 value
    ) internal override(ClassicSwapRouter, iZiSwapRouterFeeSwapType, iZiSwapV3Router) {
        if (token == WETH9 && address(this).balance >= value) {
            // pay with WETH9
            IWETH9(WETH9).deposit{value: value}(); // wrap only what is needed to pay
            IWETH9(WETH9).transfer(recipient, value);
            payedCached = value;
        } else if (payer == address(this)) {
            // pay with tokens already in the contract (for the exact input multihop case)
            safeTransfer(token, recipient, value);
        } else {
            // pull payment
            safeTransferFrom(token, payer, recipient, value);
            payedCached = value;
        }
    }

    function swapDesireInternal(
        uint256 desire,
        address recipient,
        SwapCallbackData memory data
    ) internal override(iZiSwapRouterFeeSwapType, ClassicSwapRouter, iZiSwapV3Router) returns (uint256 acquire, address tokenOut) {

        address tokenIn;
        uint24 feeSwapType;

        (tokenOut, tokenIn, feeSwapType) = data.path.decodeFirstPool();

        (uint24 poolFee, uint8 swapType) = FeeSwapType.fromFeeSwapType(feeSwapType);

        if (swapType == FeeSwapType.TYPE_IZISWAP) {
            // iZiSwap
            acquire = iZiSwapDesireSingleInternal(
                SwapSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: poolFee,
                    amount: desire,
                    recipient: recipient
                }),
                data
            );
        } else if (swapType == FeeSwapType.TYPE_V3) {
            require(iZiSwapV3Factory != address(0), "v3 not supported!");
            acquire = iZiSwapV3DesireSingleInternal(
                SwapSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: poolFee,
                    amount: desire,
                    recipient: recipient
                }),
                data
            );
        } else {
            // iZiSwap classic
            require(iZiClassicFactory != address(0), "classic not supported!");
            acquire = classicDesireSingleInternal(
                SwapSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: poolFee,
                    amount: desire,
                    recipient: recipient
                }),
                data
            );
        }

    }

    function swapAmountInternal(
        uint128 amount,
        SwapCallbackData memory data
    ) private returns (uint256 cost, uint256 acquire, address tokenOut) {

        address payer = msg.sender; // msg.sender pays for the first hop

        bool firstHop = true;

        while (true) {
            bool hasMultiplePools = data.path.hasMultiplePools();
            address tokenIn;
            uint24 feeSwapType;
            (tokenIn, tokenOut, feeSwapType) = data.path.decodeFirstPool();
            (uint24 poolFee, uint8 swapType) = FeeSwapType.fromFeeSwapType(feeSwapType);

            SwapSingleParams memory params = SwapSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                amount: amount,
                recipient: address(this)
            });

            uint256 _cost;
            
            if (swapType == FeeSwapType.TYPE_IZISWAP) {
                // iZiSwap
                (_cost, acquire) = iZiSwapAmountSingleInternal(
                    params,
                    payer
                );
            } else if (swapType == FeeSwapType.TYPE_V3) {
                // iZiSwapV3
                require(iZiSwapV3Factory != address(0), "v3 not supported!");
                (_cost, acquire) = iZiSwapV3AmountSingleInternal(
                    params,
                    payer
                );
            } else {
                // iZiSwap classic
                require(iZiClassicFactory != address(0), "classic not supported!");
                (_cost, acquire) = classicAmountSingleInternal(
                    params,
                    payer
                );
            }
            if (firstHop) {
                cost = _cost;
            }
            firstHop = false;

            // decide whether to continue or terminate
            if (hasMultiplePools) {
                payer = address(this); // at this point, the caller has paid
                data.path = data.path.skipToken();
                amount = uint128(acquire);
            } else {
                break;
            }
        }
    }

    function desireAddFee(uint256 originDesire, uint16 outFee) internal view returns(uint256 desire) {
        if (charger == address(0) || outFee == 0) {
            return originDesire;
        }
        desire = originDesire * 10000 / (10000 - outFee) + 1;
        return desire;
    }

    function chargeFee(address token, uint256 originAcquire, uint16 outFee) internal returns(uint256 acquire) {
        if (charger == address(0)) {
            return originAcquire;
        }
        uint256 tokenFee = originAcquire * outFee / 10000;
        acquire = originAcquire - tokenFee;
        if (tokenFee > 0) {
            safeTransfer(token, charger, tokenFee);
        }
        return acquire;
    }

    struct SwapDesireParams {
        bytes path;
        address recipient;
        uint128 desire;
        uint256 maxPayed;
        // outFee / 10000 is feeTier
        // outFee must <= 500
        uint16 outFee;
        uint256 deadline;
    }


    /// @notice Swap given amount of target token, usually used in multi-hop case.
    function swapDesire(SwapDesireParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 cost, uint256 acquire)
    {
        require(params.outFee <= 500, "outFee too much!");
        address recipient = params.recipient;
        if (recipient == address(0)) {
            recipient = address(this);
        }
        address tokenOut;
        uint256 desire = params.desire;
        if (params.outFee > 0) {
            desire = desireAddFee(params.desire, params.outFee);
        }
        (acquire, tokenOut) = swapDesireInternal(
            desire,
            address(this),
            SwapCallbackData({path: params.path, payer: msg.sender})
        );
        if (params.outFee > 0) {
            acquire = chargeFee(tokenOut, acquire, params.outFee);
        }
        if (recipient != address(this)) {
            safeTransfer(tokenOut, recipient, acquire);
        }
        cost = payedCached;
        require(cost <= params.maxPayed, 'Too much payed in swapDesire');
        require(acquire >= params.desire, 'Too much requested in swapDesire');
        payedCached = DEFAULT_PAYED_CACHED;
    }

    struct SwapAmountParams {
        bytes path;
        address recipient;
        uint128 amount;
        uint256 minAcquired;
        // outFee / 10000 is feeTier
        // outFee must <= 500
        uint16 outFee;
        uint256 deadline;
    }

    /// @notice Swap given amount of input token, usually used in multi-hop case.
    function swapAmount(SwapAmountParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 cost, uint256 acquire) 
    {
        require(params.outFee <= 500, "outFee too much!");
        address recipient = params.recipient;
        if (recipient == address(0)) {
            recipient = address(this);
        }
        address tokenOut;
        (cost, acquire, tokenOut) = swapAmountInternal(
            params.amount,
            SwapCallbackData({path: params.path, payer: msg.sender})
        );
        if (params.outFee > 0) {
            acquire = chargeFee(tokenOut, acquire, params.outFee);
        }
        if (recipient != address(this)) {
            safeTransfer(tokenOut, recipient, acquire);
        }
        require(acquire >= params.minAcquired, 'Too much requested in swapAmount');
    }

    function setCharger(address _charger) external onlyOwner {
        charger = _charger;
    }

}