const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    
    var nflm = await NonfungibleLiquidityManager.attach(settings.nflmAddr);
    [l,r,liquid, sx,sy,rx,ry,p] = await nflm.liquidities("0");
    console.log("l: ", l);
    console.log("r: ", r);
    console.log("liquid: ", liquid.toString());
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})