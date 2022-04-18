const { ethers } = require("hardhat");
const settings = require("../.settings.js");
var nflmAddr = settings.nfLimOrderAddr
async function main() {
    [signer] = await ethers.getSigners();
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    var nflom = NonfungibleLOrderManager.attach(nflmAddr);

    console.log(await nflom.getActiveOrderIDs(signer.address));

    var ret = await nflom.limOrders('1');
    console.log(ret);

    console.log(ret.amount.toString());
    console.log(ret.sellingRemain.toString());
    console.log(ret.lastAccEarn.toString());
    console.log(ret.earn.toString());
    console.log('poolid: ', ret.poolId.toString());
    console.log('address: ', await nflom.poolAddrs(ret.poolId.toString()));

    console.log('mark_sqrtPrice_96: ', (await nflom.mark_sqrtPrice_96()).toString());
    console.log('mark_earnLim: ', (await nflom.mark_earnLim()).toString());
    console.log('mark_sellingRemain: ', (await nflom.mark_sellingRemain()).toString());
    console.log('mark_earn1: ', (await nflom.mark_earn1()).toString());
    console.log('mark_sold1: ', (await nflom.mark_sold1()).toString());
    console.log('mark_earn2: ', (await nflom.mark_earn2()).toString());
    console.log('mark_sold2: ', (await nflom.mark_sold2()).toString());
    console.log('mark_l1: ', (await nflom.mark_l1()).toString());
    console.log('mark_l2: ', (await nflom.mark_l2()).toString());
    console.log('mark_accEarn: ', (await nflom.mark_accEarn()).toString());
    console.log('mark_earnLim0: ', (await nflom.mark_earnLim0()).toString());
    console.log('mark_earnLim00: ', (await nflom.mark_earnLim00()).toString());
    console.log('mark_lastAccEarn: ', (await nflom.mark_lastAccEarn()).toString());



    // console.log("pt: ", pt);
    // console.log("selling remain: ", sellingRemain.toString());
    // console.log("selling dec: ", sellingDec.toString());
    // console.log('earn: ', earn.toString());
    // console.log("poolId: ", poolId);

}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})