// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IBase {
    function WETH9() external returns(address);
    function factory() external returns(address);
    function refundETH() external payable;
}