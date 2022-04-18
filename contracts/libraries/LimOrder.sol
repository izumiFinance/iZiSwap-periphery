// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.4;

// infomation of a limit order
struct LimOrder {
    // point (price) of limit order
    int24 pt;
    // initial amount of token on sale
    uint256 amount;
    // remaing amount of token on sale
    uint256 sellingRemain;
    // accumulated decreased token
    uint256 accSellingDec;
    // uncollected decreased token
    uint256 sellingDec;
    // uncollected earned token
    uint256 earn;
    // total amount of earned token by all users at this point 
    // with same direction (sell x or sell y) as of the last update(add/dec)
    uint256 lastAccEarn;
    // id of pool in which this liquidity is added
    uint128 poolId;
    // direction of limit order (sellx or sell y)
    bool sellXEarnY;
    // block.timestamp when add a limit order
    uint256 timestamp;
    // active or not
    bool active;
}