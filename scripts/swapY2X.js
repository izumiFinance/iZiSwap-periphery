const { ethers } = require("hardhat");
const settings = require("../.settings.js");
const BigNumber = require('bignumber.js');
function blockNum2BigNumber(blockNum) {
  return BigNumber(blockNum._hex);
}
async function main() {
    [signer] = await ethers.getSigners();
    
    const Swap = await ethers.getContractFactory("Swap");
    swap = Swap.attach(settings.swapAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const BIT = tokenContract.attach(settings.BIT);
    await BIT.approve(settings.swapAddr, '300000000000000000000000');

    const USDC = tokenContract.attach(settings.USDC);
    await USDC.approve(settings.swapAddr, '300000000000000000000000');

    console.log(await USDC.allowance(signer.address, settings.nflmAddr));
    var BitOrigin = blockNum2BigNumber(await BIT.balanceOf(signer.address));
    var UsdcOrigin = blockNum2BigNumber(await USDC.balanceOf(signer.address));
    tx = await swap.swapY2X(
        BIT.address, USDC.address, 3000, "150000000000000000000000", 100000
    );
    
    var BitCurr = blockNum2BigNumber(await BIT.balanceOf(signer.address));
    var UsdcCurr = blockNum2BigNumber(await USDC.balanceOf(signer.address));
    console.log("swap tx: ", tx);

    console.log("delta bit: ", BitCurr.minus(BitOrigin).toFixed(0));
    console.log("delta usdc: ", UsdcCurr.minus(UsdcOrigin).toFixed(0));
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})