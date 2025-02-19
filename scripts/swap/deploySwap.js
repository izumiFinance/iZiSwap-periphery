const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const net = process.env.HARDHAT_NETWORK
const v = process.argv
async function main() {

    const factory = deployed[net].iZiSwapFactory;

    // deploy swap
    const Swap = await ethers.getContractFactory("Swap");
    const weth = deployed[net].wrappedNative
    const swap = await Swap.deploy(factory, weth);
    await swap.deployed();
    console.log("Swap: ", swap.address);
    console.log("constructor args:")
    console.log("module.exports =", [factory, weth])
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})