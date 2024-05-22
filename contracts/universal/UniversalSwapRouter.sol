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
import "./iZiSwapRouter.sol";
import "./ClassicSwapRouter.sol";
import "./types.sol";

contract UniversalSwapRouter is 
    Ownable,
    UniversalBase,
    iZiSwapRouter,
    ClassicSwapRouter {
    
    using Path for bytes;

    uint256 private constant DEFAULT_PAYED_CACHED = type(uint256).max;
    uint256 private payedCached = DEFAULT_PAYED_CACHED;

    address public charger;
    // outFee / 10000 is outFee rate
    uint16 outFee;

    /// @notice constructor to create this contract
    /// @param _iZiSwapFactory address of iZiSwap factory
    /// @param _iZiClassicFactory address of iZiSwap classic factory
    /// @param _weth address of weth token
    /// @param _charger address of fee charger
    /// @param _outFee _outFee / 10000 is feeRate
    constructor(address _iZiSwapFactory, address _iZiClassicFactory, address _weth, address _charger, uint16 _outFee)
        UniversalBase(_weth)
        iZiSwapRouter(_iZiSwapFactory)
        ClassicSwapRouter(_iZiClassicFactory)
    {
        charger = _charger;
        outFee = _outFee;
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
    ) internal override(ClassicSwapRouter, iZiSwapRouter) {
        if (token == WETH9 && address(this).balance >= value) {
            // pay with WETH9
            IWETH9(WETH9).deposit{value: value}(); // wrap only what is needed to pay
            IWETH9(WETH9).transfer(recipient, value);
        } else if (payer == address(this)) {
            // pay with tokens already in the contract (for the exact input multihop case)
            safeTransfer(token, recipient, value);
        } else {
            // pull payment
            safeTransferFrom(token, payer, recipient, value);
        }
    }

    function swapDesireInternal(
        uint256 desire,
        address recipient,
        SwapCallbackData memory data
    ) internal override(iZiSwapRouter, ClassicSwapRouter) returns (uint256 acquire, address tokenOut) {

        address tokenIn;
        uint24 poolFee;

        (tokenOut, tokenIn, poolFee) = data.path.decodeFirstPool();

        if (poolFee != 0) {
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
        } else {
            // iZiSwap classic
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
            uint24 poolFee;
            
            (tokenIn, tokenOut, poolFee) = data.path.decodeFirstPool();
            SwapSingleParams memory params = SwapSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                amount: amount,
                recipient: address(this)
            });

            uint256 _cost;
            
            if (poolFee != 0) {
                // iZiSwap
                (_cost, acquire) = iZiSwapAmountSingleInternal(
                    params,
                    payer
                );
            } else {
                // iZiSwap classic
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

    function desireAddFee(uint256 originDesire) internal view returns(uint256 desire) {
        if (charger == address(0) || outFee == 0) {
            return originDesire;
        }
        desire = originDesire * 10000 / (10000 - outFee);
        return desire;
    }

    function chargeFee(address token, uint256 originAcquire) internal returns(uint256 acquire) {
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
        uint256 deadline;
    }


    /// @notice Swap given amount of target token, usually used in multi-hop case.
    function swapDesire(SwapDesireParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 cost, uint256 acquire)
    {
        address recipient = params.recipient;
        if (recipient == address(0)) {
            recipient = address(this);
        }
        address tokenOut;
        uint256 desire = desireAddFee(params.desire);
        (acquire, tokenOut) = swapDesireInternal(
            desire,
            address(this),
            SwapCallbackData({path: params.path, payer: msg.sender})
        );
        acquire = chargeFee(tokenOut, acquire);
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
        // uint256 deadline;
        uint128 amount;
        uint256 minAcquired;

        uint256 deadline;
    }

    /// @notice Swap given amount of input token, usually used in multi-hop case.
    function swapAmount(SwapAmountParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 cost, uint256 acquire) 
    {
        address recipient = params.recipient;
        if (recipient == address(0)) {
            recipient = address(this);
        }
        address tokenOut;
        (cost, acquire, tokenOut) = swapAmountInternal(
            params.amount,
            SwapCallbackData({path: params.path, payer: msg.sender})
        );
        acquire = chargeFee(tokenOut, acquire);
        if (recipient != address(this)) {
            safeTransfer(tokenOut, recipient, acquire);
        }
        require(acquire >= params.minAcquired, 'Too much requested in swapAmount');
    }

    function setCharger(address _charger) external onlyOwner {
        charger = _charger;
    }

    function setOutFee(uint16 _outFee) external onlyOwner {
        outFee = _outFee;
    }
}