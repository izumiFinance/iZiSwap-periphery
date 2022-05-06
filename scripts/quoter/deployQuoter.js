const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/swap/deploySwap.js

*/

const net = process.env.HARDHAT_NETWORK
const v = process.argv
const weth = v[2];

async function main() {

    const factory = deployed[net].iZiSwapFactory;
    // deploy Quoter
    const Quoter = await ethers.getContractFactory("Quoter");
    const quoter = await Quoter.deploy(factory, weth);
    await quoter.deployed();
    console.log("quoter: ", quoter.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})