const { ethers } = require("hardhat");
const settings = require("../.settings.js");

async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    var nflom = NonfungibleLOrderManager.attach(settings.nfLimOrderAddr);

    const tokenContract = await ethers.getContractFactory("Token");

    const BIT = tokenContract.attach(settings.BIT);
    await BIT.approve(settings.nfLimOrderAddr, '10000000000000000000000');

    const USDC = tokenContract.attach(settings.USDC);
    await USDC.approve(settings.nfLimOrderAddr, '10000000000000000000000');
    console.log(await USDC.allowance(signer.address, settings.nfLimOrderAddr));

    var tx = await nflom.newLimOrder(
        signer.address,
        {
            tokenX: settings.BIT,
            tokenY: settings.USDC,
            fee: 3000,
            pt: -115100,
            amount: "10000000000000000000000",
            sellXEarnY: false
        }
    );
    
    console.log("addLimOrderSellY tx: ", tx);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})