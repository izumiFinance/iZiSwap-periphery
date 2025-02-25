const { ethers } = require("hardhat");
const deployed = require('../deployed.js');


const net = process.env.HARDHAT_NETWORK
const v = process.argv

async function main() {

    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const iZiClassicFactory = deployed[net].iZiClassicFactory ?? '0x0000000000000000000000000000000000000000';
    console.log("Paramters: ");
    console.log('iZiSwapFactory: ', iZiSwapFactory)
    console.log('iZiClassicFactory: ', iZiClassicFactory)
  
    console.log('=====================');
    // deploy swap
    const Quoter = await ethers.getContractFactory("UniversalQuoter");
    const quoter = await Quoter.deploy(
        iZiSwapFactory,
        iZiClassicFactory,
    );
    await quoter.deployed();
    console.log("quoter: ", quoter.address);

    console.log("\nconstructor args:")
    console.log("module.exports =", [
        iZiSwapFactory,
        iZiClassicFactory,
    ])
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})