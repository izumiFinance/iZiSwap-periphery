// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./interfaces/ILiquidityManager.sol";
import "./interfaces/IBase.sol";

/// @title Interface for WETH9
interface IWETH9 is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}

/// @title Locker contract for Swap LiquidityManager NFT
contract Locker is Ownable, ReentrancyGuard, IERC721Receiver {
    // using Math for int24;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    
    event Lock(
        uint256 indexed nftId,
        address indexed user,
        uint256 unlockTime
    );
    event ExtendLockTime(
        uint256 indexed nftId,
        address indexed user,
        uint256 originUnlockTime,
        uint256 newUnlocktime
    );
    event Withdraw(
        uint256 indexed nftId,
        address indexed user
    );

    /// @dev Contract of the Swap Nonfungible Position Manager.
    address public immutable SwapLiquidityManager;
    address public immutable weth;

    uint256 public immutable WEEK;
    uint256 public maxCnt;

    /// @dev Store the owner of the NFT token
    mapping(uint256 => address) public owners;
    /// @dev Record info for a certain token
    struct TokenInfo {
        uint256 unlockTime;
        address tokenX;
        address tokenY;
        uint24 fee;
    }
    mapping(uint256 => TokenInfo) public tokenInfos;
    /// @dev The inverse mapping of owners.
    mapping(address => EnumerableSet.UintSet) internal tokenIds;

    receive() external payable {}

    /// @notice Used for ERC721 safeTransferFrom
    function onERC721Received(address, address, uint256, bytes memory) 
        public 
        virtual 
        override 
        returns (bytes4) 
    {
        return this.onERC721Received.selector;
    }

    constructor(address _liquidityManager, uint256 _maxCnt) {
        SwapLiquidityManager = _liquidityManager;
        weth = IBase(_liquidityManager).WETH9();
        WEEK = 7 * 24 * 60 * 60;
        maxCnt = _maxCnt;
    }

    function setMaxCnt(uint256 _maxCnt) external onlyOwner {
        maxCnt = _maxCnt;
    }

    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "STE");
    }

    function getPoolInfo(uint256 nftId) internal view returns(address tokenX, address tokenY, uint24 fee) {
        (,,,,,,,uint128 poolId) = ILiquidityManager(SwapLiquidityManager).liquidities(nftId);
        (tokenX, tokenY, fee) = ILiquidityManager(SwapLiquidityManager).poolMetas(poolId);
    }

    /// @notice View function to get position ids staked here for an user.
    /// @param _user The related address.
    /// @return list of tokenId
    function getTokenIds(address _user)
        external
        view
        returns (uint256[] memory) {
        EnumerableSet.UintSet storage ids = tokenIds[_user];
        // push could not be used in memory array
        // we set the tokenIdList into a fixed-length array rather than dynamic
        uint256[] memory tokenIdList = new uint256[](ids.length());
        for (uint256 i = 0; i < ids.length(); i++) {
            tokenIdList[i] = ids.at(i);
        }
        return tokenIdList;
    }

    function lock(uint256 tokenId, uint256 lockTime) external nonReentrant {
        require(lockTime >= WEEK, "LOCKTIME MUST >= 1 WEEK");
        uint256 unlockTime = block.timestamp + lockTime;

        address nftOwner = IERC721(SwapLiquidityManager).ownerOf(tokenId);
        require(nftOwner == msg.sender, "NFT NOT OWNER");

        IERC721(SwapLiquidityManager).safeTransferFrom(msg.sender, address(this), tokenId);
        owners[tokenId] = msg.sender;

        EnumerableSet.UintSet storage ids = tokenIds[msg.sender];
        require(ids.length() < maxCnt, "NFT NUM EXCEEDS LIMIT");
        bool res = ids.add(tokenId);
        require(res, "LIST ADD FAIL");

        (address tokenX, address tokenY, uint24 fee) = getPoolInfo(tokenId);
        tokenInfos[tokenId] = TokenInfo({
            unlockTime: unlockTime,
            tokenX: tokenX,
            tokenY: tokenY,
            fee: fee
        });

        emit Lock(tokenId, msg.sender, unlockTime);
    }

    function extendLockTime(uint256 tokenId, uint256 unlockTime) external nonReentrant {
        require(owners[tokenId] == msg.sender, "NOT OWNER OR NOT EXIST");
        require(unlockTime > block.timestamp, "UNLOCKTIME MUST > CURRENT TIME");
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        uint256 originUnlockTime = tokenInfo.unlockTime;
        require(unlockTime > originUnlockTime, "UNLOCKTIME MUST > ORIGIN UNLOCKTIME");
        tokenInfos[tokenId].unlockTime = unlockTime;
        emit ExtendLockTime(tokenId, msg.sender, originUnlockTime, unlockTime);
    }

    /// @notice Withdraw a single nft.
    /// @param tokenId The related position id.
    function withdraw(uint256 tokenId) external nonReentrant {
        require(owners[tokenId] == msg.sender, "NOT OWNER OR NOT EXIST");
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        require(tokenInfo.unlockTime <= block.timestamp, "NOT TIME YET");
        IERC721(SwapLiquidityManager).safeTransferFrom(address(this), msg.sender, tokenId);
        owners[tokenId] = address(0);
        bool res = tokenIds[msg.sender].remove(tokenId);
        require(res, "LIST REMOVE FAIL");
        emit Withdraw(tokenId, msg.sender);
    }

    /// @notice Withdraw a single nft.
    /// @param tokenId The related position id.
    function adminWithdraw(uint256 tokenId) external onlyOwner nonReentrant {
        address nftOwner = owners[tokenId];
        require(nftOwner != address(0), "WITHDRAWED OR NOT EXIST");
        IERC721(SwapLiquidityManager).safeTransferFrom(address(this), nftOwner, tokenId);
        owners[tokenId] = address(0);
        bool res = tokenIds[nftOwner].remove(tokenId);
        require(res, "LIST REMOVE FAIL");
    }
    function _safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "STE");
    }

    function _safeTransferToken(address token, address to, uint256 value) internal {
        if (value > 0) {
            if (token == address(weth)) {
                IWETH9(token).withdraw(value);
                _safeTransferETH(to, value);
            } else {
                IERC20(token).safeTransfer(to, value);
            }
        }
    }

    function _collect(uint256 tokenId) internal {

        uint256 amountX;
        uint256 amountY;

        try
            ILiquidityManager(
                SwapLiquidityManager
            ).collect(
                address(this),
                tokenId,
                type(uint128).max,
                type(uint128).max
            ) returns(uint256 ax, uint256 ay)
        {
            amountX = ax;
            amountY = ay;
        } catch (bytes memory) {
            // if revert, 
            amountX = 0;
            amountY = 0;
        }
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        _safeTransferToken(tokenInfo.tokenX, msg.sender, amountX);
        _safeTransferToken(tokenInfo.tokenY, msg.sender, amountY);
    }

    /// @notice Collect pending fees for a single position.
    /// @param tokenId The related position id.
    function collect(uint256 tokenId) external nonReentrant {
        require(owners[tokenId] == msg.sender, "NOT OWNER OR NOT EXIST");
        _collect(tokenId);
    }

    /// @notice Collect all pending fees.
    function collectAll() external nonReentrant {
        EnumerableSet.UintSet storage ids = tokenIds[msg.sender];
        for (uint256 i = 0; i < ids.length(); i++) {
            uint256 tokenId = ids.at(i);
            require(owners[tokenId] == msg.sender, "NOT OWNER");
            _collect(tokenId);
        }
    }

}
