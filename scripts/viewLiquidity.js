const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
    
    var nflm = await NonfungibleLiquidityManager.attach(settings.nflmAddr);
    [l,r,liquid, sx,sy,rx,ry,p] = await nflm.liquidities("0");
    console.log("l: ", l);
    console.log("r: ", r);
    console.log("liquid: ", liquid.toString());
    console.log("sx: ", sx.toString());
    console.log("sy: ", sy.toString());
    console.log("rx: ", rx.toString());
    console.log("ry: ", ry.toString());
    console.log('p: ', p.toString());

    console.log('nftnum: ', await nflm.liquidityNum());
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})