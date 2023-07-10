// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "./LimitOrderManagerSolo.sol";
contract LimitOrderManagerSoloFactory {
    mapping(address=>address) public limitOrderManager;
    address public iZiFactory;
    address public weth;
    constructor( address _iZiFactory, address _weth) {
        iZiFactory = _iZiFactory;
        weth = _weth;
    }
    function createManager() external returns (address manager) {
        address account = msg.sender;
        if (limitOrderManager[account] != address(0)) {
            return limitOrderManager[account];
        }
        manager = address(
            new LimitOrderManagerSolo(iZiFactory, weth, account)
        );
        limitOrderManager[account] = manager;
    }

}