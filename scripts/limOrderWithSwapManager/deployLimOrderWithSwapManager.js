const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nfLimOrderManager/deployNfLimOrder.js

*/

const net = process.env.HARDHAT_NETWORK

async function main() {
    // deploy nft
    const LimitOrderWithSwapManager = await ethers.getContractFactory("LimitOrderWithSwapManager");
    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const weth = deployed[net].wrappedNative
    const manager = await LimitOrderWithSwapManager.deploy(iZiSwapFactory, weth);
    console.log("LimitOrderWithSwapManager: ", manager.address);
    console.log("constructor args:")
    console.log("module.exports =", [iZiSwapFactory, weth])
    await manager.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})