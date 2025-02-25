const { ethers } = require("hardhat");
const deployed = require('../deployed.js');


const net = process.env.HARDHAT_NETWORK
const v = process.argv

async function main() {

    const zero = '0x0000000000000000000000000000000000000000'
    const iZiSwapFactory = deployed[net].iZiSwapFactory ?? zero;
    const iZiClassicFactory = deployed[net].iZiClassicFactory ?? zero;
    const iZiSwapV3Factory = deployed[net].iZiSwapV3Factory ?? zero;
    const wrappedNative = deployed[net].wrappedNative;
    const charger = v[2];

    const args = [
        iZiSwapFactory,
        iZiClassicFactory,
        iZiSwapV3Factory,
        wrappedNative,
        charger
    ]
    console.log('args: ', args)
    // deploy swap
    const SwapRouter = await ethers.getContractFactory("UniversalV3SwapRouter");
    const router = await SwapRouter.deploy(
        ...args
    );
    await router.deployed();
    console.log("router: ", router.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
