// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IOracle {
    function getTWAPoint(address pool, uint256 delta)
        external
        view
        returns (bool enough, int24 avgPoint, uint256 oldestTime);
}

contract TestOracle {

    address public oracleAddress;

    constructor(address _oracleAddress) {
        oracleAddress = _oracleAddress;
    }

    function testOracle(address pool, uint256 delta)
        external
        view
        returns (bool enough, int24 avgPoint, uint256 oldestTime)
    {
        (enough, avgPoint, oldestTime) = IOracle(oracleAddress).getTWAPoint(pool, delta);
    }
}
