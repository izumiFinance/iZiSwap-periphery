const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const usdc = tokenContract.attach(settings.usdc);
    await usdc.approve(settings.nflmAddr, '10000000000000000000000');

    const usdt = tokenContract.attach(settings.usdt);
    await usdt.approve(settings.nflmAddr, '10000000000000000000000');
    console.log(await usdt.allowance(signer.address, settings.nflmAddr));
    
    tx = await nflm.mint({
        miner: signer.address,
        tokenX: usdc.address,
        tokenY: usdt.address,
        fee: 3000,
        pl: 3500,
        pr: 6000,
        xLim: "100000000000000",
        yLim: "100000000000000"
    });
    console.log("mint tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})