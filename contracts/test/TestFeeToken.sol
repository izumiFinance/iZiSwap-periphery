// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestFeeToken is ERC20, Ownable {
    uint8 decimal;
    uint8 feePercent;

    constructor(string memory _name, string memory _symbol, uint8 _decimal, uint8 _feePercent)
        ERC20(_name, _symbol)
    {
        _mint(msg.sender, 10000000000000000000000000000);
        decimal = _decimal;
        feePercent = _feePercent;
        require(feePercent < 100, "f100");
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function decimals() public view override returns (uint8) {
        return decimal;
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        if (to == address(0) || from == address(0)) {
            return;
        }
        uint256 feeAmount = amount / 100 * feePercent;
        _burn(to, feeAmount);
    }
}
