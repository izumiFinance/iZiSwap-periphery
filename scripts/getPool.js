const settings = require("../.settings.js");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

async function main() {
    [signer] = await ethers.getSigners();
    // deploy nft
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    nflm = NonfungibleLiquidityManager.attach(settings.nflmAddr);
    // get pool
    pool_usdc_usdt = await nflm.pool(settings.usdc, settings.usdt, 3000);
    pool_usdc_weth = await nflm.pool(settings.usdc, settings.weth, 3000);

    console.log("pool_usdc_usdt: ", pool_usdc_usdt);
    console.log("pool_usdc_weth: ", pool_usdc_weth);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})