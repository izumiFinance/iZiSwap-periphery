const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const net = process.env.HARDHAT_NETWORK
const v = process.argv
const liquidityManager = v[2];
const maxCnt = v[3];
async function main() {

    // deploy swap
    const Locker = await ethers.getContractFactory("Locker");
    const locker = await Locker.deploy(liquidityManager, maxCnt);
    await locker.deployed();
    console.log("locker: ", locker.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
