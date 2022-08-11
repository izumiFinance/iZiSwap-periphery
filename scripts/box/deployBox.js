const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nfLimOrderManager/deployNfLimOrder.js

*/

const net = process.env.HARDHAT_NETWORK

async function main() {
    // deploy box
    const BoxManager = await ethers.getContractFactory("Box");
    const liquidityManager = deployed[net].liquidityManager;
    const swap = deployed[net].swap;
    const wrapChainToken = deployed[net].wrapChainToken;
    const args = [{
        weth: wrapChainToken,
        liquidityManager: liquidityManager,
        swap: swap
    }]
    const box = await BoxManager.deploy(...args);
    console.log('args: ', args)
    console.log("box: ", box.address);
    await box.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
