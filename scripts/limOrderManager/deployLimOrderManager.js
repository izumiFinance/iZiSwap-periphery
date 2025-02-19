const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nfLimOrderManager/deployNfLimOrder.js

*/

const net = process.env.HARDHAT_NETWORK

async function main() {
    const LimitOrderManager = await ethers.getContractFactory("LimitOrderManager");
    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const weth = deployed[net].wrappedNative
    const nflom = await LimitOrderManager.deploy(iZiSwapFactory, weth);
    console.log("LimitOrderManager: ", nflom.address);
    console.log("constructor args:")
    console.log("module.exports =", [iZiSwapFactory, weth])
    await nflom.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})