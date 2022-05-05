// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

contract TestAddSub {
    function funcAdd(uint256 a, uint256 b) public pure returns(uint256 c) {
        c = a + b;
    }
    function funcSub(uint256 a, uint256 b) public pure returns(uint256 c) {
        c = a - b;
    }
    function funcMul(uint256 a, uint256 b) public pure returns(uint256 c) {
        c = a * b;
    }
    function assemblyAdd(uint256 a, uint256 b) public pure returns(uint256 c) {
        assembly {
            c := add(a, b)
        }
    }
    function assemblySub(uint256 a, uint256 b) public pure returns(uint256 c) {
        assembly {
            c := sub(a, b)
        }
    }
    function assumblyMul(uint256 a, uint256 b) public pure returns(uint256 c) {
        assembly {
            c := mul(a, b)
        }
    }
}