const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    // deploy nft
    factory = settings.izumiswapfactory;
    weth = settings.weth;

    // deploy swap
    const Swap = await ethers.getContractFactory("Swap");
    var swap = await Swap.deploy(factory, weth);
    await swap.deployed();
    console.log("Swap: ", swap.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})