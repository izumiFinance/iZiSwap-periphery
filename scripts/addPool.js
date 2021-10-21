const settings = require("../.settings.js");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

async function main() {
    [signer] = await ethers.getSigners();
    // deploy nft
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);
    // add pool
    poolAddr = await nflm.createPool(settings.usdc, settings.weth, 3000, -83000);
    console.log("create pool: ", poolAddr);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})