pragma solidity >=0.5.0;

interface IiZiSwapClassicFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}
