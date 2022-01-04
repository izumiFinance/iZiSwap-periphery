const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    tx = await nflm.decLiquidity("1", "0");
    console.log("mint tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})