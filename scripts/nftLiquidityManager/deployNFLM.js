const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nftLiquidityManager/deployNFLM.js

*/

const net = process.env.HARDHAT_NETWORK

async function main() {
    // deploy nft
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const weth = deployed[net].WETH9
    nflm = await NonfungibleLiquidityManager.deploy(iZiSwapFactory, weth);
    console.log("NonfungibleLiquidityManager: ", nflm.address);
    await nflm.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})