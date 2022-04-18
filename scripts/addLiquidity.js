const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const DAI = tokenContract.attach(settings.DAI);
    await DAI.approve(settings.nflmAddr, '100000000000000');

    const USDC = tokenContract.attach(settings.USDC);
    await USDC.approve(settings.nflmAddr, '100000000000000');
    console.log(await USDC.allowance(signer.address, settings.nflmAddr));

    let tokenX = DAI.address;
    let tokenY = USDC.address;
    if (tokenX.toLowerCase() > tokenY.toLowerCase()) {
      let tmp = tokenX;
      tokenX = tokenY;
      tokenY = tmp;
    }
    
    tx = await nflm.mint({
        miner: signer.address,
        tokenX: tokenX,
        tokenY: tokenY,
        fee: 3000,
        pl: -1000,
        pr: 1050,
        xLim: "104869958",
        yLim: "100000000"
    });
    console.log("mint tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})