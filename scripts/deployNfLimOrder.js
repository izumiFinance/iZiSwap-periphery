const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    // deploy nft
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    factory = settings.izumiswapfactory;
    weth = settings.weth;
    nflom = await NonfungibleLOrderManager.deploy(factory, weth);
    console.log("NonfungibleLOrderManager: ", nflom.address);
    await nflom.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})