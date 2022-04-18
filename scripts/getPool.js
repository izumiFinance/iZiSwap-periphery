const { ethers, waffle} = require("hardhat");

const hardhat = require("hardhat");
const contracts = require("./deployed.js");


// example
// HARDHAT_NETWORK='izumiTest' \
//     node getPool.js iZi WETH9 3000
const v = process.argv
const net = process.env.HARDHAT_NETWORK

const para = {
  tokenXAddress: contracts[net][v[2]],
  tokenYAddress: contracts[net][v[3]],
  fee: v[4]
}




async function main() {
    for ( var i in para) { console.log("    " + i + ": " + para[i]); }
    // deploy nft
    const LiquidityManagerFactory = await ethers.getContractFactory("LiquidityManager");
    const liquidityManager = LiquidityManagerFactory.attach(contracts[net].liquidityManager);
    
    const pool = await liquidityManager.pool(para.tokenXAddress, para.tokenYAddress, para.fee);

    console.log('pool: ', pool)
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})