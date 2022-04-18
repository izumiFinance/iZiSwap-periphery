const { ethers } = require("hardhat");
const settings = require("../.settings.js");

var nflmAddr = settings.nfLimOrderAddr

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    var nflom = NonfungibleLOrderManager.attach(nflmAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const BIT = tokenContract.attach(settings.BIT);
    await BIT.approve(nflmAddr, '1000000000000000000000000000000');

    const USDC = tokenContract.attach(settings.USDC);
    await USDC.approve(nflmAddr, '1000000000000000000000000000000');
    console.log(await USDC.allowance(signer.address, nflmAddr));

    var tx = await nflom.newLimOrder(
        signer.address,
        {
            tokenX: settings.BIT,
            tokenY: settings.USDC,
            fee: 3000,
            pt: -269200,
            amount: "100000000000000000000",
            sellXEarnY: true
        }
    );
    
    console.log("addLimOrderSellX tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})