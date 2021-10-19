const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    factory = settings.izumiswapfactory;
    weth = settings.weth;
    nflm = await NonfungibleLiquidityManager.deploy(factory, weth);
    console.log("NonfungibleLiquidityManager: ", nflm.address);
    await nflm.deployed();

    const Swap = await ethers.getContractFactory("Swap");
    swap = await Swap.deploy(factory, weth);
    await swap.deployed();
    console.log("Swap: ", swap.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})