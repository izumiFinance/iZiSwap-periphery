const { ethers } = require("hardhat");
const deployed = require('../deployed.js');


const net = process.env.HARDHAT_NETWORK
const v = process.argv

const para = {
    charger: v[2],
}

async function main() {

    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const iZiClassicFactory = deployed[net].iZiClassicFactory ?? '0x0000000000000000000000000000000000000000';
    const weth = deployed[net].wrappedNative;
    console.log("Paramters: ");
    console.log('iZiSwapFactory: ', iZiSwapFactory)
    console.log('iZiClassicFactory: ', iZiClassicFactory)
    console.log('weth: ', weth)
    for ( var i in para) { console.log("    " + i + ": " + para[i]); }
  
    console.log('=====================');
    // deploy swap
    const SwapRouter = await ethers.getContractFactory("UniversalSwapRouter");
    const router = await SwapRouter.deploy(
        iZiSwapFactory,
        iZiClassicFactory,
        weth,
        para.charger,
    );
    await router.deployed();
    console.log("router: ", router.address);
    console.log('\nconstructor args: ')
    console.log('module.exports =', [
        iZiSwapFactory,
        iZiClassicFactory,
        weth,
        para.charger,
    ])
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})