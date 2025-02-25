const { ethers } = require("hardhat");
const deployed = require('../deployed.js');


const net = process.env.HARDHAT_NETWORK
const v = process.argv

async function main() {
    const zero = '0x0000000000000000000000000000000000000000'
    const iZiSwapFactory = deployed[net].iZiSwapFactory ?? zero;
    const iZiClassicFactory = deployed[net].iZiClassicFactory ?? zero;
    const iZiSwapV3Factory = deployed[net].iZiSwapV3Factory ?? zero;

    const args = [
        iZiSwapFactory,
        iZiClassicFactory,
        iZiSwapV3Factory
    ]

    console.log('args: ', args)

    // deploy quoter
    const Quoter = await ethers.getContractFactory("UniversalV3Quoter");
    const quoter = await Quoter.deploy(
        ...args
    );
    await quoter.deployed();
    console.log("quoter: ", quoter.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
