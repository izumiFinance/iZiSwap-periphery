pragma solidity ^0.8.4;

import "./AmountMath.sol";

library MintMath {
    struct MintMathParam {
        int24 pl;
        int24 pr;
        uint128 xLim;
        uint128 yLim;
    }

    function _computeDepositYcPerUnit(
        uint160 sqrtPrice_96
    ) private pure returns (uint256 y) {
        if ((sqrtPrice_96 & (FixedPoint96.Q96 - 1)) > 0) {
            y = (sqrtPrice_96 >> 96) + 1;
        } else {
            y = sqrtPrice_96 >> 96;
        }
    }

    /// @dev [pl, pr)
    function _computeDepositXYPerUnit(
        int24 pl,
        int24 pr,
        int24 pc,
        uint160 sqrtPrice_96,
        uint160 sqrtRate_96
    ) private pure returns (uint256 x, uint256 y) {
        x = 0;
        y = 0;
        uint160 sqrtPriceR_96 = LogPowMath.getSqrtPrice(pr);
        uint160 _sqrtRate_96 = sqrtRate_96;
        if (pl < pc) {
            uint160 sqrtPriceL_96 = LogPowMath.getSqrtPrice(pl);
            if (pr < pc) {
                y += AmountMath.getAmountY(1, sqrtPriceL_96, sqrtPriceR_96, _sqrtRate_96, true);
            } else {
                y += AmountMath.getAmountY(1, sqrtPriceL_96, sqrtPrice_96, _sqrtRate_96, true);
            }
        }
        if (pr > pc) {
            // we need compute XR
            int24 xrLeft = (pl > pc) ? pl : pc + 1;
            x = AmountMath.getAmountX(
                1,
                xrLeft,
                pr,
                sqrtPriceR_96,
                _sqrtRate_96,
                true
            );
        }
        if (pl <= pc && pr > pc) {
            // we nned compute yc at point of current price
            y += _computeDepositYcPerUnit(
                sqrtPrice_96
            );
        }
    }
    function computeLiquidity(
        MintMathParam memory mp, int24 currPt, uint160 sqrtPrice_96, uint160 sqrtRate_96
    ) internal pure returns(uint128 liquidity) {
        liquidity = type(uint128).max;
        (uint256 x, uint256 y) = _computeDepositXYPerUnit(mp.pl, mp.pr, currPt, sqrtPrice_96, sqrtRate_96);
        if (x > 0) {
            uint256 xl = uint256(mp.xLim) / x;
            if (liquidity > xl) {
                liquidity = uint128(xl);
            }
        }
        if (y > 0) {
            uint256 yl = uint256(mp.yLim) / y;
            if (liquidity > yl) {
                liquidity = uint128(yl);
            }
        }
    }

}