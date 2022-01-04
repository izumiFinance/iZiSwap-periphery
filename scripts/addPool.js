const settings = require("../.settings.js");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

async function main() {

    var token0 = settings.IZI;
    var token1 = settings.USDC;
    var fee = 3000;

    if (token0.toUpperCase() > token1.toUpperCase()) {
      var tmp = token0;
      token0 = token1;
      token1 = tmp;
    }
    [signer] = await ethers.getSigners();
    // deploy nft
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);
    // add pool
    poolTx = await nflm.createPool(token0, token1, fee, 9164);
    console.log("create pool: ", poolTx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})