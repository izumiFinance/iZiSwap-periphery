// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/IWrapToken.sol";

interface IERC20WithDecimals {
    function decimals() external view returns (uint8);
}

contract WrapToken is IWrapToken, Ownable, ERC20 {
    using SafeERC20 for IERC20;
    
    address public override originToken;
    mapping(address=>mapping(address=>uint256)) public override depositAllowance;

    uint8 private _decimals;

    constructor(address token, string memory name, string memory symbol) ERC20(name, symbol) {
        originToken = token;
        _decimals = IERC20WithDecimals(token).decimals();
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    function depositApprove(address spender, uint256 amount) external override {
        if (spender != msg.sender) {
            depositAllowance[msg.sender][spender] = amount;
        }
    }
    function depositFrom(address from, address to, uint256 amount) external override returns (uint256 actualAmount) {
        if (from != msg.sender) {
            uint256 allow = depositAllowance[msg.sender][from];
            require(allow >= amount, "deposit allowance not enough");
            depositAllowance[msg.sender][from] = allow - amount;
        }
        uint256 balanceBefore = IERC20(originToken).balanceOf(address(this));
        IERC20(originToken).safeTransferFrom(from, address(this), amount);
        uint256 balanceAfter = IERC20(originToken).balanceOf(address(this));
        actualAmount = balanceAfter - balanceBefore;
        _mint(to, actualAmount);
    }
    function withdraw(address to, uint256 amount) external override returns(uint256 actualAmount) {
        _burn(msg.sender, amount);
        uint256 originBalanceBefore = IERC20(originToken).balanceOf(to);
        IERC20(originToken).safeTransferFrom(address(this), to, amount);
        uint256 originBalanceAfter = IERC20(originToken).balanceOf(to);
        actualAmount = originBalanceAfter - originBalanceBefore;
    }
}