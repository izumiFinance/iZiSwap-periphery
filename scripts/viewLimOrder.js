const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    var nflom = NonfungibleLOrderManager.attach(settings.nfLimOrderAddr);

    var pt;
    var amount;
    var sellingRemain;
    var sellingDec;
    var earn;
    var lastAccEarn;
    var poolId;
    var sellXEarnY;
    [pt, amount, sellingRemain, sellingDec, earn, lastAccEarn, poolId, sellXEarnY] = await nflom.limOrders("5");

    console.log("pt: ", pt);
    console.log("selling remain: ", sellingRemain.toString());
    console.log("selling dec: ", sellingDec.toString());
    console.log("poolId: ", poolId);

}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})