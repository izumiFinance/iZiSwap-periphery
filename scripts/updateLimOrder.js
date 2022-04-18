const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    console.log(signer.address);
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    var nflom = NonfungibleLOrderManager.attach(settings.nfLimOrderAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    // var activeIdList = await nflom.getActiveOrderIDs(signer.address);
    // console.log(activeIdList);

    // var tx = await nflom.updateOrder("0");
    
    // console.log("tx 0: ", tx);
    // var tx = await nflom.updateOrder("1");
    
    // console.log("tx 1: ", tx);
    // var tx = await nflom.updateOrder("2");
    
    // console.log("tx 2: ", tx);
    // var tx = await nflom.updateOrder("3" );
    
    // console.log("tx 3: ", tx);
    // var tx = await nflom.updateOrder(
    //     "4"
    // );
    
    // console.log("tx 4: ", tx);
    var tx = await nflom.updateOrder("0");
    console.log('tx: ', tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})