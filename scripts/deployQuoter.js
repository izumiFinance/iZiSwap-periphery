const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {

    var factory = settings.izumiswapfactory;
    var weth = settings.weth;
    // deploy Quoter
    const Quoter = await ethers.getContractFactory("Quoter");
    var quoter = await Quoter.deploy(factory, weth);
    await quoter.deployed();
    console.log("quoter: ", quoter.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})