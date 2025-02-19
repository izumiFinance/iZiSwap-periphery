const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nftLiquidityManager/deployNFLM.js

*/

const net = process.env.HARDHAT_NETWORK
const v = process.argv

async function main() {
    // deploy nft
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const weth = deployed[net].wrappedNative;
    nflm = await LiquidityManager.deploy(iZiSwapFactory, weth);
    console.log("LiquidityManager: ", nflm.address);
    console.log("constructor args:")
    console.log("module.exports =", [iZiSwapFactory, weth])
    await nflm.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})