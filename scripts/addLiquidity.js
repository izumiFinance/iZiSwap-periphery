const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const BIT = tokenContract.attach(settings.BIT);
    await BIT.approve(settings.nflmAddr, '10000000000000000000000');

    const USDC = tokenContract.attach(settings.USDC);
    await USDC.approve(settings.nflmAddr, '10000000000000000000000');
    console.log(await USDC.allowance(signer.address, settings.nflmAddr));
    
    tx = await nflm.mint({
        miner: signer.address,
        tokenX: BIT.address,
        tokenY: USDC.address,
        fee: 3000,
        pl: -80000,
        pr: 60000,
        xLim: "10000000000000000000000",
        yLim: "10000000000000000000000"
    });
    console.log("mint tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})