const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/swap/deploySwap.js

*/

const net = process.env.HARDHAT_NETWORK
const v = process.argv

async function main() {

    const factory = deployed[net].iZiSwapFactory;
    // deploy Quoter
    const Quoter = await ethers.getContractFactory("QuoterWithLim");
    const weth = deployed[net].wrappedNative
    const quoter = await Quoter.deploy(factory, weth);
    await quoter.deployed();
    console.log("quoter: ", quoter.address);
    console.log("constructor args:")
    console.log("module.exports =", [factory, weth])
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})