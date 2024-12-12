// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import './pool/IiZiSwapV3PoolImmutables.sol';
import './pool/IiZiSwapV3PoolState.sol';
import './pool/IiZiSwapV3PoolDerivedState.sol';
import './pool/IiZiSwapV3PoolActions.sol';
import './pool/IiZiSwapV3PoolOwnerActions.sol';
import './pool/IiZiSwapV3PoolEvents.sol';

/// @title The interface for a iZiSwap V3 Pool
/// @notice A iZiSwap pool facilitates swapping and automated market making between any two assets that strictly conform
/// to the ERC20 specification
/// @dev The pool interface is broken up into many smaller pieces
interface IiZiSwapV3Pool is
    IiZiSwapV3PoolImmutables,
    IiZiSwapV3PoolState,
    IiZiSwapV3PoolDerivedState,
    IiZiSwapV3PoolActions,
    IiZiSwapV3PoolOwnerActions,
    IiZiSwapV3PoolEvents
{

}
