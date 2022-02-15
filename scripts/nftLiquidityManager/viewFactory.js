const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const { getNftLiquidityManager } = require('../libraries/getNfLiquidityManager');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nftLiquidityManager/viewFactory.js 

*/

const v = process.argv
const net = process.env.HARDHAT_NETWORK

const para = {
  nftId: v[2]
}

async function main() {
    console.log('address: ', deployed[net].nftLiquidityManager);
    const nfLiquidityManager = getNftLiquidityManager(deployed[net].nftLiquidityManager);
    const factroy = await nfLiquidityManager.methods.factory().call();
    console.log('factory: ', factroy);
    
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})