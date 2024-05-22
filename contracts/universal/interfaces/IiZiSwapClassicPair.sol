pragma solidity >=0.5.0;

interface IiZiSwapClassicPair {
    function getPairState() external view returns (uint112 reserve0, uint112 reserve1, uint16 fee, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}
