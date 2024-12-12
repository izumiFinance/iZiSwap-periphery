// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.4;

library FeeSwapType {
    uint8 internal constant TYPE_IZISWAP = 0;
    uint8 internal constant TYPE_CLASSIC = 1;
    uint8 internal constant TYPE_V3 = 2;

    function fromFeeSwapType(uint24 feeSwapType) internal pure returns(uint24 fee, uint8 swapType) {
        fee = feeSwapType / 4;
        swapType = uint8(feeSwapType % 4);
    }

    function toFeeSwapType(uint24 fee, uint8 swapType) internal pure returns(uint24 feeSwapType) {
        feeSwapType = fee * 4 + swapType;
    }

}