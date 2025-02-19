const hardhat = require("hardhat");
const contracts = require('../deployed.js')

const net = process.env.HARDHAT_NETWORK
// example
// HARDHAT_NETWORK='izumiTest' node deployAirdrop.js
// 

const v = process.argv
const para = {
    iZiSwapRouter: v[2],
    iZiSwapLiquidityManager: v[3]
}

async function main() {
    
    const factory = await hardhat.ethers.getContractFactory("TapProxy");

    const pancakeSwapRouter = contracts[net].pancakeSwapRouter ?? "0x0000000000000000000000000000000000000000"
    const uniswapRouter = contracts[net].uniswapRouter ?? "0x0000000000000000000000000000000000000000"
    const iZiSwapRouter = para.iZiSwapRouter
    const iZiSwapLiquidityManager = para.iZiSwapLiquidityManager
    console.log("Deploying .....")
    console.log('pancake: ', pancakeSwapRouter);
    console.log('uniswap: ', uniswapRouter);
    console.log('iZiSwapRouter: ', iZiSwapRouter)
    console.log('iZiSwapLiquidityManager: ', iZiSwapLiquidityManager)
    const tapProxy = await factory.deploy(pancakeSwapRouter, uniswapRouter, iZiSwapRouter, iZiSwapLiquidityManager);
    console.log("tapProxy Contract Address: " , tapProxy.address);

    console.log('constructor args')
    console.log('module.exports =', [pancakeSwapRouter, uniswapRouter, iZiSwapRouter, iZiSwapLiquidityManager])
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  
