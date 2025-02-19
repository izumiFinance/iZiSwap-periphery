const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

const net = process.env.HARDHAT_NETWORK
const v = process.argv

const iZiSwapFactory = deployed[net].iZiSwapFactory
const weth = deployed[net].wrappedNative

const pancakeSwapRouter = deployed[net].pancakeSwapRouter ?? "0x0000000000000000000000000000000000000000"
const uniswapRouter = deployed[net].uniswapRouter ?? "0x0000000000000000000000000000000000000000"

const lockerMaxCnt = v[2]

async function deployLiquidityManager() {
    console.log('-- deploying LiquidityManager...')
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    const nflm = await LiquidityManager.deploy(iZiSwapFactory, weth);
    await nflm.deployed();
    console.log("-- LiquidityManager: ", nflm.address);
    return nflm.address
}

async function deployLimitOrderManager() {
    console.log('-- deploying LimitOrderManager...')
    const LimitOrderManager = await ethers.getContractFactory("LimitOrderManager");
    const nflom = await LimitOrderManager.deploy(iZiSwapFactory, weth);
    await nflom.deployed();
    console.log("-- LimitOrderManager: ", nflom.address);
    return nflom.address
}


async function deployLimitOrderWithSwapManager() {
    console.log('-- deploying LimitOrderWithSwapManager...')
    const LimitOrderWithSwapManager = await ethers.getContractFactory("LimitOrderWithSwapManager");
    const manager = await LimitOrderWithSwapManager.deploy(iZiSwapFactory, weth);
    await manager.deployed();
    console.log("-- LimitOrderWithSwapManager: ", manager.address);
    return manager.address;
}

async function deployQuoter() {
    console.log('-- deploying quoter...')
    // deploy Quoter
    const Quoter = await ethers.getContractFactory("Quoter");
    const quoter = await Quoter.deploy(iZiSwapFactory, weth);
    await quoter.deployed();
    console.log("-- quoter: ", quoter.address);
    return quoter.address
}

async function deployQuoterWithLim() {
    console.log('-- deploying quoterWithLim...')
    // deploy Quoter With Limit
    const QuoterWithLim = await ethers.getContractFactory("QuoterWithLim");
    const quoterWithLim = await QuoterWithLim.deploy(iZiSwapFactory, weth);
    await quoterWithLim.deployed();
    console.log("-- quoterWithLim: ", quoterWithLim.address);
    return quoterWithLim.address
}

async function deploySwap() {
    console.log('-- deploying Swap...')
    const Swap = await ethers.getContractFactory("Swap");
    const swap = await Swap.deploy(iZiSwapFactory, weth);
    await swap.deployed();
    console.log("-- Swap: ", swap.address);
    return swap.address
}

async function deployLocker(liquidityManager) {
    console.log('-- deploying Locker...')
    // deploy locker
    const Locker = await ethers.getContractFactory("Locker");
    const locker = await Locker.deploy(liquidityManager, lockerMaxCnt);
    await locker.deployed();
    console.log("-- locker: ", locker.address);
    return locker.address
}

async function deployOracle() {
    console.log('-- deploying Oracle...')
    const OracleFactory = await ethers.getContractFactory("Oracle");
    const oracle = await OracleFactory.deploy();
    await oracle.deployed();
    console.log("-- oracle: ", oracle.address);
    return oracle.address
}

async function deployMulticall() {
    console.log('-- deploying Multicall...')
    const MulticallFactory = await ethers.getContractFactory("MultiContractCall");
    const multicall = await MulticallFactory.deploy();
    await multicall.deployed();
    console.log("-- Multicall: ", multicall.address);
    return multicall.address
}

async function deployTapProxy(iZiSwapRouter, iZiSwapLiquidityManager) {
    console.log('-- deploying TapProxy...')
    
    const factory = await ethers.getContractFactory("TapProxy");
    console.log("Deploying .....")
    console.log('pancake: ', pancakeSwapRouter);
    console.log('uniswap: ', uniswapRouter);
    console.log('iZiSwapRouter: ', iZiSwapRouter)
    console.log('iZiSwapLiquidityManager: ', iZiSwapLiquidityManager)
    const tapProxy = await factory.deploy(pancakeSwapRouter, uniswapRouter, iZiSwapRouter, iZiSwapLiquidityManager);
    console.log("tapProxy Contract Address: " , tapProxy.address);
    console.log("-- TapProxy: ", tapProxy.address);
    return tapProxy.address
}

async function main() {
    console.log('locker max cnt: ', lockerMaxCnt)
    console.log('iZiSwapFactory: ', iZiSwapFactory)
    console.log('WETH9: ', weth)
    console.log('pancakeSwapRouter: ', pancakeSwapRouter)
    console.log('uniswapRouter: ', uniswapRouter)
    console.log('==============================')
    const liquidityManager = await deployLiquidityManager()
    const limitOrderManager = await deployLimitOrderManager()
    const limitOrderWithSwapManager = await deployLimitOrderWithSwapManager()
    const quoter = await deployQuoter()
    const quoterWithLim = await deployQuoterWithLim()
    const swap = await deploySwap()
    const locker = await deployLocker(liquidityManager)
    const oracle = await deployOracle()
    const tapProxy = await deployTapProxy(swap, liquidityManager)
    const multicall = await deployMulticall()
    console.log("==============================")
    console.log("deployed: ")
    console.log("liquidityManager: ", liquidityManager)
    console.log("limitOrderManager: ", limitOrderManager)
    console.log("limitOrderWithSwapManager: ", limitOrderWithSwapManager)
    console.log("quoter: ", quoter)
    console.log("quoterWithLim: ", quoterWithLim)
    console.log("swap: ", swap)
    console.log("locker: ", locker)
    console.log("oracle: ", oracle)
    console.log("tapProxy: ", tapProxy)
    console.log("multicall: ", multicall)
    console.log("==============================")
    console.log("constructor args for locker: ")
    console.log('\n')
    const lockerArgs = [liquidityManager, lockerMaxCnt]
    console.log("module.exports =", lockerArgs)
    console.log('\n')
    console.log("constructor args for tapProxy: ")
    console.log('\n')
    const tapProxyArgs = [pancakeSwapRouter, uniswapRouter, swap, liquidityManager]
    console.log("module.exports =", tapProxyArgs)
    console.log('\n')
    console.log("constructor args for liquidityManager, limitOrderManager, limitOrderWithSwap, quoter, quoterWithLim, swap: ")
    console.log('\n')
    const commonArgs = [iZiSwapFactory, weth]
    console.log("module.exports =", commonArgs)
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})