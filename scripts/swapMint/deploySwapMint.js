const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const net = process.env.HARDHAT_NETWORK
const v = process.argv
const liquidityManager = v[2];

async function main() {

    // deploy SwapMint
    const SwapMint = await ethers.getContractFactory("SwapMint");
    const swapMint = await SwapMint.deploy(liquidityManager);
    await swapMint.deployed();
    console.log("swapMint: ", swapMint.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})