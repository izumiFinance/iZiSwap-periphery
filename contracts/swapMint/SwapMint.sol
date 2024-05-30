// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../core/interfaces/IiZiSwapCallback.sol";
import "../core/interfaces/IiZiSwapFactory.sol";
import "../core/interfaces/IiZiSwapPool.sol";

import "../libraries/MulDivMath.sol";
import "../libraries/TwoPower.sol";
import "../libraries/LogPowMath.sol";
import "../libraries/Converter.sol";

import "../base/base.sol";

interface IiZiSwapPoolPair {
    function tokenX() external view returns(address);
    function tokenY() external view returns(address);
    function fee() external view returns(uint24);
}

interface IiZiSwapLiquidityManager {
    /// @return Returns the address of the Uniswap V3 factory
    function factory() external view returns (address);

    /// @return Returns the address of WETH9
    function WETH9() external view returns (address);
    
    struct MintParam {
        // miner address
        address miner;
        // tokenX of swap pool
        address tokenX;
        // tokenY of swap pool
        address tokenY;
        // fee amount of swap pool
        uint24 fee;
        // left point of added liquidity
        int24 pl;
        // right point of added liquidity
        int24 pr;
        // amount limit of tokenX miner willing to deposit
        uint128 xLim;
        // amount limit tokenY miner willing to deposit
        uint128 yLim;
        // minimum amount of tokenX miner willing to deposit
        uint128 amountXMin;
        // minimum amount of tokenY miner willing to deposit
        uint128 amountYMin;

        uint256 deadline;
    }
    
    /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
    /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
    /// that use ether for the input amount
    function refundETH() external payable;

    function mint(MintParam calldata params)
        external
        payable
        returns (
            uint256 lid,
            uint128 liquidity,
            uint256 amountX,
            uint256 amountY
        );
}

contract SwapMint is Base, IiZiSwapCallback {

    using SafeERC20 for IERC20;

    address public liquidityManager;
    /// @notice Constructor to create this contract.
    /// @param _liquidityManager address of liquidty manager
    constructor(address _liquidityManager)
    Base(
        IiZiSwapLiquidityManager(_liquidityManager).factory(), 
        IiZiSwapLiquidityManager(_liquidityManager).WETH9()
    ) {
        liquidityManager = _liquidityManager;
    }


    struct SwapCallbackData {
        address tokenX;
        address tokenY;
        uint24 fee;
        address payer;
    }

    struct PairInfo {
        address tokenX;
        address tokenY;
        uint24 fee;
    }

    struct MintResult {
        uint256 nftId;
        uint256 liquidity;
        uint256 amountX;
        uint256 amountY;
    }

    struct SwapMintParams {
        address poolAddress;
        int24 targetPt;
        int24 leftPt;
        int24 rightPt;
        uint128 amountX;
        uint128 amountY;
        uint128 minAmountX;
        uint128 minAmountY;
        uint128 swapAmountX;
        uint128 swapAmountY;
        uint128 swapMinAcquireX;
        uint128 swapMinAcquireY;
        uint256 deadline;
    }

    /// @notice Callback for swapY2X and swapY2XDesireX, in order to pay tokenY from trader.
    /// @param x amount of tokenX trader acquired
    /// @param y amount of tokenY need to pay from trader
    /// @param data encoded SwapCallbackData
    function swapY2XCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        pay(dt.tokenY, dt.payer, msg.sender, y);
    }

    /// @notice Callback for swapX2Y and swapX2YDesireY, in order to pay tokenX from trader.
    /// @param x amount of tokenX need to pay from trader
    /// @param y amount of tokenY trader acquired
    /// @param data encoded SwapCallbackData
    function swapX2YCallback(
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        SwapCallbackData memory dt = abi.decode(data, (SwapCallbackData));
        verify(dt.tokenX, dt.tokenY, dt.fee);
        pay(dt.tokenX, dt.payer, msg.sender, x);
    }


    function getPair(address pool) private view returns(PairInfo memory) {
        PairInfo memory info;
        info.tokenX = IiZiSwapPoolPair(pool).tokenX();
        info.tokenY = IiZiSwapPoolPair(pool).tokenY();
        info.fee = IiZiSwapPoolPair(pool).fee();
        return info;
    }

    function getCurrentPt(address pool) private view returns(int24) {
        (
            ,
            int24 currentPt,
            ,
            ,
            ,
            ,
            ,
        ) = IiZiSwapPool(pool).state();
        return currentPt;
    }

    function _swapBefore(SwapMintParams memory params, PairInfo memory pairInfo) private {
        int24 currentPt = getCurrentPt(params.poolAddress);
        if (params.targetPt < currentPt) {
            // x2y
            if (params.swapAmountX > 0) {
                (uint256 costX, uint256 acquireY) = IiZiSwapPool(params.poolAddress).swapX2Y(
                    msg.sender, params.swapAmountX, params.targetPt,
                    abi.encode(SwapCallbackData({
                        tokenX: pairInfo.tokenX, 
                        fee: pairInfo.fee, 
                        tokenY: pairInfo.tokenY, 
                        payer: msg.sender
                    }))
                );
                require(acquireY >= params.swapMinAcquireY, "acquireY too little");
                require(costX <= params.swapAmountX, "costX too much");
                currentPt = getCurrentPt(params.poolAddress);
            }
            require(params.targetPt == currentPt || params.targetPt == currentPt - 1 || params.targetPt == currentPt + 1, "targetPt not reach");
        } else if (params.targetPt > currentPt) {
            // y2x
            if (params.swapAmountY > 0) {
                (uint256 acquireX, uint256 costY) = IiZiSwapPool(params.poolAddress).swapY2X(
                    msg.sender, params.swapAmountY, params.targetPt,
                    abi.encode(SwapCallbackData({
                        tokenX: pairInfo.tokenX, 
                        fee: pairInfo.fee, 
                        tokenY: pairInfo.tokenY, 
                        payer: msg.sender
                    }))
                );
                require(acquireX >= params.swapMinAcquireX, "acquireX too little");
                require(costY <= params.swapAmountY, "costY too much");
                currentPt = getCurrentPt(params.poolAddress);
            }
            require(params.targetPt == currentPt || params.targetPt == currentPt - 1 || params.targetPt == currentPt + 1, "targetPt not reach");
        }
    }

    function _recvTokenFromUser(address token, address user, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        if (token == WETH9 && address(this).balance >= amount) {
            // user send weth via native (msg.value)
            // do nothing here
        } else {
            // receive token(not weth) from user
            IERC20(token).safeTransferFrom(
                user,
                address(this),
                amount
            );
        }
    }

    function _refundTokenToUser(address token, address user) private {
        uint256 amount = IERC20(token).balanceOf(address(this));
        if (amount > 0) {
            IERC20(token).safeTransfer(user, amount);
        }
    }

    function swapMint(SwapMintParams calldata params) external payable {
        require(block.timestamp >= params.deadline, "out of time");
        PairInfo memory pairInfo = getPair(params.poolAddress);
        _swapBefore(params, pairInfo);
        // recv token from user for mint
        _recvTokenFromUser(pairInfo.tokenX, msg.sender, params.amountX);
        _recvTokenFromUser(pairInfo.tokenY, msg.sender, params.amountY);
        // approve token
        IERC20(pairInfo.tokenX).safeApprove(liquidityManager, type(uint256).max);
        IERC20(pairInfo.tokenY).safeApprove(liquidityManager, type(uint256).max);
        // mint params
        IiZiSwapLiquidityManager.MintParam memory mintParam = IiZiSwapLiquidityManager.MintParam({
            miner: msg.sender,
            tokenX: pairInfo.tokenX,
            tokenY: pairInfo.tokenY,
            fee: pairInfo.fee,
            pl: params.leftPt,
            pr: params.rightPt,
            xLim: params.amountX,
            yLim: params.amountY,
            amountXMin: params.minAmountX,
            amountYMin: params.minAmountY,
            deadline: params.deadline
        });
        // mint
        MintResult memory mintResult;
        (
            mintResult.nftId,
            mintResult.liquidity,
            mintResult.amountX,
            mintResult.amountY
        ) = IiZiSwapLiquidityManager(liquidityManager).mint{
            value: address(this).balance
        }(mintParam);
        IiZiSwapLiquidityManager(liquidityManager).refundETH();
        // refund all tokens
        _refundTokenToUser(pairInfo.tokenX, msg.sender);
        _refundTokenToUser(pairInfo.tokenY, msg.sender);
        safeTransferETH(msg.sender, address(this).balance);
        // clear approve
        IERC20(pairInfo.tokenX).safeApprove(liquidityManager, 0);
        IERC20(pairInfo.tokenY).safeApprove(liquidityManager, 0);
    }

}