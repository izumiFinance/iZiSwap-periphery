pragma solidity =0.8.4;

import '../core/interfaces/IIzumiswapPool.sol';
import '../core/interfaces/IIzumiswapFactory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ViewLimOrder  {

    address public factory;
    
    constructor(address fac) { factory = fac; }
    function pool(address tokenX, address tokenY, uint24 fee) public view returns(address) {
        return IIzumiswapFactory(factory).pool(tokenX, tokenY, fee);
    }
    function limOrderKey(address miner, int24 pt) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(miner, pt));
    }

    function getEarnX(address pool, bytes32 key) private view returns(uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = IIzumiswapPool(pool).userEarnX(key);
    }
    function getEarnX(address pool, address miner, int24 pt) public view returns(uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
    }
    function getEarnY(address pool, bytes32 key) private view returns(uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = IIzumiswapPool(pool).userEarnY(key);
    }
    function getEarnY(address pool, address miner, int24 pt) public view returns(uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) {
        (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
    }
    
    function getEarn(address pool, address miner, int24 pt, bool sellXEarnY) public view returns(uint256 lastAccEarn, uint256 sellingRemain, uint256 sellingDesc, uint256 earn, uint256 earnAssign) {
        if (sellXEarnY) {
            (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = getEarnY(pool, limOrderKey(miner, pt));
        } else {
            (lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign) = getEarnX(pool, limOrderKey(miner, pt));
        }
    }
}