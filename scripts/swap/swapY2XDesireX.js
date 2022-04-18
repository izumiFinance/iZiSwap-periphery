const { ethers } = require("hardhat");
const deployed = require("../deployed.js");


const net = process.env.HARDHAT_NETWORK

async function main() {

    [signer] = await ethers.getSigners();
    const BIT = deployed[net].BIT;
    const USDC = deployed[net].USDC;
    const swapAddr = deployed[net].swap;
    // deploy Quoter
    const Swap = await ethers.getContractFactory("Swap");
    const swap = Swap.attach(swapAddr);

    const param = {
        tokenX: BIT,
        tokenY: USDC,
        fee: 500,
        boundaryPt: 800000,
        recipient: signer.address,
        amount: '1',
        maxPayed: '50000000000000000000000',
        minAcquired: '0'
    };

    console.log('param: ', param);

    const tx = await swap.swapY2XDesireX(param);
    console.log('tx: ', tx);
    
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
