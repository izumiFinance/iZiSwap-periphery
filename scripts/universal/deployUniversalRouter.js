const { ethers } = require("hardhat");
const deployed = require('../deployed.js');


const net = process.env.HARDHAT_NETWORK
const v = process.argv

const para = {
    classicFactory: v[2],
    weth: v[3],
    charger: v[4],
}

async function main() {

    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    console.log("Paramters: ");
    console.log('iZiSwapFactory: ', iZiSwapFactory)
    for ( var i in para) { console.log("    " + i + ": " + para[i]); }
  
    console.log('=====================');
    // deploy swap
    const SwapRouter = await ethers.getContractFactory("UniversalSwapRouter");
    const router = await SwapRouter.deploy(
        iZiSwapFactory,
        para.classicFactory,
        para.weth,
        para.charger,
    );
    await router.deployed();
    console.log("router: ", router.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})