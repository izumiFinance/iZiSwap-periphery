const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer, trader] = await ethers.getSigners();
    console.log("trader: ", trader.address);
    const Swap = await ethers.getContractFactory("Swap");
    swap = Swap.attach(settings.swapAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const usdc = tokenContract.attach(settings.usdc);
    await usdc.connect(trader).approve(settings.swapAddr, '10000000000000000000000');

    const usdt = tokenContract.attach(settings.usdt);
    await usdt.connect(trader).approve(settings.swapAddr, '10000000000000000000000');
    console.log(await usdt.allowance(trader.address, settings.swapAddr));

    tx = await swap.connect(trader).swapX2Y(
        usdc.address, usdt.address, 3000, "100000000000000", 2500
    );
    
    console.log("swap tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})