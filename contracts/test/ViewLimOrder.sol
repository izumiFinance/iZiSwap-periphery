// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../core/interfaces/IiZiSwapPool.sol';
import '../core/interfaces/IiZiSwapFactory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ViewLimOrder  {

    address public factory;
    
    constructor(address fac) { factory = fac; }
    function pool(address tokenX, address tokenY, uint24 fee) public view returns(address) {
        return IiZiSwapFactory(factory).pool(tokenX, tokenY, fee);
    }
    function limOrderKey(address miner, int24 pt) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(miner, pt));
    }

    function getEarnX(address pool, bytes32 key) private view returns(uint256 lastAccEarn, uint128 sellingRemain, uint128 sellingDesc, uint128 earn, uint128 legacyEarn, uint128 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = IiZiSwapPool(pool).userEarnX(key);
    }
    function getEarnX(address pool, address miner, int24 pt) public view returns(uint256 lastAccEarn, uint128 sellingRemain, uint128 sellingDesc, uint128 earn, uint128 legacyEarn, uint128 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
    }
    function getEarnY(address pool, bytes32 key) private view returns(uint256 lastAccEarn, uint128 sellingRemain, uint128 sellingDesc, uint128 earn, uint128 legacyEarn, uint128 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = IiZiSwapPool(pool).userEarnY(key);
    }
    function getEarnY(address pool, address miner, int24 pt) public view returns(uint256 lastAccEarn, uint128 sellingRemain, uint128 sellingDesc, uint128 earn, uint128 legacyEarn, uint128 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
    }
    
    function getEarn(address pool, address miner, int24 pt, bool sellXEarnY) public view returns(uint256 lastAccEarn, uint128 sellingRemain, uint128 sellingDesc, uint128 earn, uint128 legacyEarn, uint128 earnAssign) {
        if (sellXEarnY) {
            (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
        } else {
            (lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
        }
    }
}