const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const net = process.env.HARDHAT_NETWORK
const v = process.argv
const weth = v[2];

async function main() {

    const factory = deployed[net].iZiSwapFactory;
    // deploy QuoterSwapMint
    const QuoterSwapMint = await ethers.getContractFactory("QuoterSwapMint");
    const quoterSwapMint = await QuoterSwapMint.deploy(factory, weth);
    await quoterSwapMint.deployed();
    console.log("quoterSwapMint: ", quoterSwapMint.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})