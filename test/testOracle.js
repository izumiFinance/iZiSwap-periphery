
const { BigNumber } = require("bignumber.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getPoolParts, getIzumiswapFactory, attachiZiSwapPool } = require("./funcs.js")

async function getToken() {

  // deploy token
  const tokenFactory = await ethers.getContractFactory("TestToken")
  tokenX = await tokenFactory.deploy('a', 'a', 18);
  await tokenX.deployed();
  tokenY = await tokenFactory.deploy('b', 'b', 18);
  await tokenY.deployed();

  txAddr = tokenX.address.toLowerCase();
  tyAddr = tokenY.address.toLowerCase();

  if (txAddr > tyAddr) {
    tmpAddr = tyAddr;
    tyAddr = txAddr;
    txAddr = tmpAddr;

    tmpToken = tokenY;
    tokenY = tokenX;
    tokenX = tmpToken;
  }
  return [tokenX, tokenY];
}

function getFix96(a) {
    var b = BigNumber(a).times(BigNumber(2).pow(96));
    return b.toFixed(0);
}

function fix962Float(a) {
    let aa = BigNumber(a);
    let div = BigNumber(2).pow(96);
    return Number(aa.div(div).toFixed(10));
}

/*

        // the current price
        uint160 sqrtPriceX96;
        // the current tick
        int24 tick;
        // the most-recently updated index of the observations array
        uint16 observationIndex;
        // the current maximum number of observations that are being stored
        uint16 observationCardinality;
        */

async function getState(pool) {

        // uint160 sqrtPrice_96,
        // int24 currentPoint,
        // uint16 observationCurrentIndex,
        // uint16 observationQueueLen,
        // uint16 observationNextQueueLen,
        // bool locked,
        // uint128 liquidity,
        // uint128 liquidityX
    const {sqrtPrice_96, currentPoint, observationCurrentIndex, observationQueueLen, observationNextQueueLen} = await pool.state()
    
    return {
        sqrtPrice_96: sqrtPrice_96.toString(),
        currentPoint,
        observationCurrentIndex,
        observationQueueLen,
        observationNextQueueLen
    }
}

async function getOracle(oracle, poolAddr, deltaTime) {
    const {enough, avgPoint, oldestTime} = await oracle.getTWAPoint(poolAddr, deltaTime);
    return {
        enough, avgPoint, oldestTime
    };
}

async function getTestOracle(testOracle, poolAddr, deltaTime) {
    const {enough, avgPoint, oldestTime} = await testOracle.testOracle(poolAddr, deltaTime);
    return {
        enough, avgPoint, oldestTime
    };
}

/*

        // the block timestamp of the observation
        uint32 blockTimestamp;
        // the tick accumulator, i.e. tick * time elapsed since the pool was first initialized
        int56 tickCumulative;
        // the seconds per liquidity, i.e. seconds elapsed / max(1, liquidity) since the pool was first initialized
        uint160 secondsPerLiquidityCumulativeX128;
        // whether or not the observation is initialized
        bool initialized;
        */
async function getObservation(pool, idx) {

    // uint32 timestamp,
    // int56 accPoint,
    // bool init
    const {timestamp, accPoint, init} = await pool.observations(idx);
    // console.log('{timestamp, accPoint, init}', {timestamp, accPoint.toSt, init})
    return {timestamp, accPoint: accPoint.toString(), init}
}

function getAvgTick(obs0, obs1) {
    var blockDelta = BigNumber(obs1.timestamp).minus(obs0.timestamp);
    var tickDelta = BigNumber(obs1.accPoint).minus(obs0.accPoint);
    console.log('avg tick: ', Number(tickDelta.div(blockDelta).toFixed(10)))
    const avg = tickDelta.div(blockDelta)
    if (avg.gt(0)) {
        return Number(avg.toFixed(0, 3))
    } else {
        return Number(avg.toFixed(0, 2))
    }
    // return Number(tickDelta.div(blockDelta).toFixed(0, 3));
}

function getAvgTick(obs0, obs1) {
    var blockDelta = BigNumber(obs1.timestamp).minus(obs0.timestamp);
    var tickDelta = BigNumber(obs1.accPoint).minus(obs0.accPoint);
    console.log('avg tick: ', Number(tickDelta.div(blockDelta).toFixed(10)))
    const avg = tickDelta.div(blockDelta)
    if (avg.gt(0)) {
        return Number(avg.toFixed(0, 3))
    } else {
        return Number(avg.toFixed(0, 2))
    }
}

function getTarget(obs0, obs1, targetTime) {
    const rate = BigNumber(obs1.accPoint).minus(obs0.accPoint).div(BigNumber(obs1.timestamp).minus(obs0.timestamp))
    const delta = BigNumber(targetTime).minus(obs0.timestamp)
    let avg = rate.times(delta)
    if (avg.gt(0)) {
        avg = avg.toFixed(0, 3)
    } else {
        avg = avg.toFixed(0, 2)
    }
    const targetAccPoint = BigNumber(obs0.accPoint).plus(avg).toFixed(0)
    return {
        timestamp: targetTime,
        accPoint: targetAccPoint
    }
}

async function movePriceDown(swap, trader, tokenX, tokenY, boundaryPt) {

    await swap.connect(trader).swapX2Y({
        tokenX: tokenX.address,
        tokenY: tokenY.address,
        fee: 2000,
        boundaryPt,
        recipient: trader.address,
        amount: '1000000000000000000000000000',
        maxPayed: '1000000000000000000000000000',
        minAcquired: '1',
        deadline: '0xffffffff',
    });

}

async function movePriceUp(swap, trader, tokenX, tokenY, boundaryPt) {

    await swap.connect(trader).swapY2X({
        tokenX: tokenX.address,
        tokenY: tokenY.address,
        fee: 2000,
        boundaryPt,
        recipient: trader.address,
        amount: '1000000000000000000000000000',
        maxPayed: '1000000000000000000000000000',
        minAcquired: '1',
        deadline: '0xffffffff',
    });
}

async function getSwap(factoryAddress, wethAddress) {
    const SwapManager = await ethers.getContractFactory("Swap");
    var swap = await SwapManager.deploy(factoryAddress, wethAddress);
    await swap.deployed();
    return swap;
}

async function getNFTLiquidityManager(factoryAddress, wethAddress) {
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    var nflm = await LiquidityManager.deploy(factoryAddress, wethAddress);
    await nflm.deployed();
    return nflm;
}

async function getCurrentTime() {
    const blockNumStart = await ethers.provider.getBlockNumber();
    const blockStart = await ethers.provider.getBlock(blockNumStart);
    return blockStart.timestamp;
}

function getTWAPoint(timeList, pointList) {
    let sum = 0;
    let timeDelta = 0;
    for (let idx = 0; idx < pointList.length; idx ++) {
        sum += (timeList[idx + 1] - timeList[idx]) * pointList[idx];
        timeDelta += timeList[idx + 1] - timeList[idx];
    }
    if (sum > 0) {
        return Math.floor(sum / timeDelta);
    }
    return Math.ceil(sum / timeDelta);
}

describe("test uniswap price oracle", function () {
    var signer, miner1, miner2, trader, tokenAProvider, tokenBProvider, recipient1, recipient2;

    var weth;
    var wethAddr;

    var uniFactory;
    var uniSwapRouter;
    var uniPositionManager;

    var tokenX;
    var tokenY;

    var rewardInfoA = {
      rewardtoken: undefined,
      provider: undefined,
      rewardPerBlock: undefined,
      accRewardPerShare: undefined,
    };
    var rewardInfoB = {
      token: undefined,
      provider: undefined,
      rewardPerBlock: undefined,
      accRewardPerShare: undefined,
    };

    var rewardLowerTick;
    var rewardUpperTick;

    var startBlock;
    var endBlock;

    var poolXYAddr;
    var pool;
    var sqrtPriceX_96;

    var mining2RewardNoBoost;

    var q96;

    var oracle, testOracle;

    var createPoolTime;
    
    beforeEach(async function() {
      
        [signer, miner, trader, receiver] = await ethers.getSigners();

        // a fake weth
        const tokenFactory = await ethers.getContractFactory("TestToken");
        weth = await tokenFactory.deploy('weth', 'weth', 18);
        wethAddr = weth.address;

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory.address, wethAddr);
        console.log("get nflm");
        swap = await getSwap(izumiswapFactory.address, wethAddr);

        console.log("get swp");

        [tokenX, tokenY] = await getToken();

        const blockNumStart = await ethers.provider.getBlockNumber();
        const blockStart = await ethers.provider.getBlock(blockNumStart);
        createPoolTime = blockStart.timestamp + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [createPoolTime]);

        await nflm.createPool(tokenX.address, tokenY.address, '2000', 8000)
        
        await tokenX.mint(miner.address, "100000000000000000000000");
        await tokenY.mint(miner.address, "100000000000000000000000");

        await tokenX.connect(miner).approve(nflm.address, "100000000000000000000000");
        await tokenY.connect(miner).approve(nflm.address, "100000000000000000000000");

        console.log("get xy");
        await nflm.connect(miner).mint({
            miner: miner.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: '2000',
            pl: -30000,
            pr: 30000,
            xLim: '100000000000000000000000',
            yLim: '100000000000000000000000',
            amountXMin: 0,
            amountYMin: 0,
            deadline: '0xffffffff',
        });

        console.log('bbbbb')
        await tokenX.mint(trader.address, "1000000000000000000000000000");
        await tokenY.mint(trader.address, "1000000000000000000000000000");

        await tokenX.connect(trader).approve(swap.address, "1000000000000000000000000000");
        await tokenY.connect(trader).approve(swap.address, "1000000000000000000000000000");

        const Oracle = await ethers.getContractFactory('Oracle');
        oracle = await Oracle.deploy();
        await oracle.deployed();

        const TestOracle = await ethers.getContractFactory('TestOracle');
        testOracle = await TestOracle.deploy(oracle.address);
        await testOracle.deployed();

        q96 = BigNumber(2).pow(96);

        poolXYAddr = await nflm.pool(tokenX.address, tokenY.address, 2000);
        pool = await attachiZiSwapPool(poolXYAddr)

        console.log('aaaaa')
    });
    
    it("no swap", async function () {
        // var tick, sqrtPriceX96, currTick, currSqrtPriceX96;
        // [tick, sqrtPriceX96, currTick, currSqrtPriceX96] = await testOracle.getTWAPointPriceWithin2Hour(poolXYAddr);

        const res = await getOracle(oracle, poolXYAddr, 7200);
        expect(res.avgPoint).to.equal(8000);
        expect(res.enough).to.equal(false);
        expect(res.oldestTime).to.equal(createPoolTime);
    });

    it("after 1 swap, cardinality is only 1", async function() {
        const swapTime = await getCurrentTime() + 5;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime]);

        await swap.connect(trader).swapX2Y({
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 2000,
            boundaryPt: -2000,
            recipient: trader.address,
            amount: '1000000000000000000000000000',
            maxPayed: '1000000000000000000000000000',
            minAcquired: '1',
            deadline: '0xffffffff',
        });

        const queryTime = await getCurrentTime() + 15;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        // just used to generate a new block
        await tokenX.mint(trader.address, "1");

        const res = await getOracle(oracle, poolXYAddr, 7200);
        const stdAvgPoint = getTWAPoint([swapTime, queryTime], [-2000]);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.enough).to.equal(false);
        expect(res.oldestTime).to.equal(swapTime);

    });


    it("num of observations does not reach cardinality, oldest within 2h", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, 0);  // 4 obs

        const swapTime4 = await getCurrentTime() + 20;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 5 obs

        const swapTime5 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 5000); // 6 obs

        const queryTime = await getCurrentTime() + 21;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(12);

        const state = await getState(pool);
        expect(state.observationCurrentIndex).to.equal(5);
        expect(state.observationQueueLen).to.equal(8);
        const res = await getOracle(oracle, poolXYAddr, 7200);

        const stdAvgPoint = getTWAPoint(
            [createPoolTime, swapTime1, swapTime2, swapTime3, swapTime4, swapTime5, queryTime], 
            [8000, 6000, 3000, 0, 2000, 5000]
        );

        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.enough).to.equal(false);
        expect(res.oldestTime).to.equal(createPoolTime);

        // check testOracle
        const resTestOracle = await getTestOracle(testOracle, poolXYAddr, 7200);

        expect(resTestOracle.avgPoint).to.equal(res.avgPoint);
        expect(resTestOracle.enough).to.equal(res.enough);
        expect(resTestOracle.oldestTime).to.equal(res.oldestTime);

    }); 

    it("num of observations reach cardinality, oldest within 2h", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 4 obs

        const swapTime4 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, -1000); // 5 obs

        const swapTime5 = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 6 obs

        const swapTime6 = await getCurrentTime() + 12;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime6]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 7 obs

        const swapTime7 = await getCurrentTime() + 2;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime7]);
        await movePriceDown(swap, trader, tokenX, tokenY, 5000);  // 8 obs

        const swapTime8 = await getCurrentTime() + 22;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime8]);
        await movePriceDown(swap, trader, tokenX, tokenY, 4000);  // 9 obs

        const swapTime9 = await getCurrentTime() + 39;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime9]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3700);  // 10 obs

        const swapTime10 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime10]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3500);  // 11 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(12);

        const res = await getOracle(oracle, poolXYAddr, 7200);

        const stdAvgPoint = getTWAPoint(
            [swapTime3, swapTime4, swapTime5, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [-3000, -1000, 2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res.enough).to.equal(false);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.oldestTime).to.equal(swapTime3);

        // check testOracle
        const resTestOracle = await getTestOracle(testOracle, poolXYAddr, 7200);

        expect(resTestOracle.avgPoint).to.equal(res.avgPoint);
        expect(resTestOracle.enough).to.equal(res.enough);
        expect(resTestOracle.oldestTime).to.equal(res.oldestTime);

    }); 
    it("num of observations does not reach cardinality, oldest is enough", async function() {

        await pool.expandObservationQueue(10);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 2 obs, idx=1

        const swapTime2 = await getCurrentTime() + 7;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6500); // 3 obs, idx=2

        const swapTime3 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, 1500); // 4 obs, idx=3
        
        const swapTime4 = await getCurrentTime() + 9;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 5 obs, idx=4

        const swapTime5 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 0); // 6 obs, idx=5

        const queryTime = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(20);

        const targetTime = swapTime2 + 2;
        const res = await getOracle(oracle, poolXYAddr, queryTime - targetTime);

        const stdAvgPoint = getTWAPoint(
            [targetTime, swapTime3, swapTime4, swapTime5, queryTime], 
            [6500, 1500, -3000, 0]
        );

        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.enough).to.equal(true);
        expect(res.oldestTime).to.equal(createPoolTime);

        // check testOracle
        const resTestOracle = await getTestOracle(testOracle, poolXYAddr, queryTime - targetTime);

        expect(resTestOracle.avgPoint).to.equal(res.avgPoint);
        expect(resTestOracle.enough).to.equal(res.enough);
        expect(resTestOracle.oldestTime).to.equal(res.oldestTime);

    }); 

    it("num of observations reach cardinality, oldest enough", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 4 obs

        const swapTime4 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, -1000); // 5 obs

        const swapTime5 = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 6 obs

        const swapTime6 = await getCurrentTime() + 12;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime6]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 7 obs

        const swapTime7 = await getCurrentTime() + 2;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime7]);
        await movePriceDown(swap, trader, tokenX, tokenY, 5000);  // 8 obs

        const swapTime8 = await getCurrentTime() + 22;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime8]);
        await movePriceDown(swap, trader, tokenX, tokenY, 4000);  // 9 obs

        const swapTime9 = await getCurrentTime() + 39;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime9]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3700);  // 10 obs

        const swapTime10 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime10]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3500);  // 11 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(12);
        const targetTime = swapTime5 + 2;
        const deltaTime = queryTime - targetTime;

        const res = await getOracle(oracle, poolXYAddr, deltaTime);

        const stdAvgPoint = getTWAPoint(
            [targetTime, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res.enough).to.equal(true);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.oldestTime).to.equal(swapTime3);

        // check testOracle
        const resTestOracle = await getTestOracle(testOracle, poolXYAddr, deltaTime);

        expect(resTestOracle.avgPoint).to.equal(res.avgPoint);
        expect(resTestOracle.enough).to.equal(res.enough);
        expect(resTestOracle.oldestTime).to.equal(res.oldestTime);

    }); 

    it("num of observations reach cardinality, oldest not enough, but swap before oldest is enough", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 4 obs

        const swapTime4 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, -1000); // 5 obs

        const swapTime5 = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 6 obs

        const swapTime6 = await getCurrentTime() + 12;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime6]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 7 obs

        const swapTime7 = await getCurrentTime() + 2;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime7]);
        await movePriceDown(swap, trader, tokenX, tokenY, 5000);  // 8 obs

        const swapTime8 = await getCurrentTime() + 22;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime8]);
        await movePriceDown(swap, trader, tokenX, tokenY, 4000);  // 9 obs

        const swapTime9 = await getCurrentTime() + 39;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime9]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3700);  // 10 obs

        const swapTime10 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime10]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3500);  // 11 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(12);
        const targetTime = swapTime2 + 2;
        const deltaTime = queryTime - targetTime;

        const res = await getOracle(oracle, poolXYAddr, deltaTime);

        const stdAvgPoint = getTWAPoint(
            [swapTime3, swapTime4, swapTime5, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [-3000, -1000, 2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res.enough).to.equal(false);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.oldestTime).to.equal(swapTime3);
    
        // check testOracle
        const resTestOracle = await getTestOracle(testOracle, poolXYAddr, deltaTime);

        expect(resTestOracle.avgPoint).to.equal(res.avgPoint);
        expect(resTestOracle.enough).to.equal(res.enough);
        expect(resTestOracle.oldestTime).to.equal(res.oldestTime);

    }); 

    it("queue expand before last 2 swaps, num of observations reach cardinality", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 4 obs

        const swapTime4 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, -1000); // 5 obs

        const swapTime5 = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 6 obs

        const swapTime6 = await getCurrentTime() + 12;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime6]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 7 obs

        const swapTime7 = await getCurrentTime() + 2;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime7]);
        await movePriceDown(swap, trader, tokenX, tokenY, 5000);  // 8 obs

        const swapTime8 = await getCurrentTime() + 22;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime8]);
        await movePriceDown(swap, trader, tokenX, tokenY, 4000);  // 9 obs
        
        await pool.expandObservationQueue(20);

        const swapTime9 = await getCurrentTime() + 39;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime9]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3700);  // 10 obs

        const swapTime10 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime10]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3500);  // 11 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(21);
        const targetTime = swapTime2 + 2;
        const deltaTime = queryTime - targetTime;

        const res = await getOracle(oracle, poolXYAddr, deltaTime);

        const stdAvgPoint = getTWAPoint(
            [swapTime3, swapTime4, swapTime5, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [-3000, -1000, 2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res.enough).to.equal(false);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.oldestTime).to.equal(swapTime3);
    }); 


    it("queue expand before last 3 swaps, num of observations does not reach cardinality", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const swapTime3 = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime3]);
        await movePriceDown(swap, trader, tokenX, tokenY, -3000);  // 4 obs

        const swapTime4 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime4]);
        await movePriceUp(swap, trader, tokenX, tokenY, -1000); // 5 obs

        const swapTime5 = await getCurrentTime() + 11;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime5]);
        await movePriceUp(swap, trader, tokenX, tokenY, 2000); // 6 obs

        const swapTime6 = await getCurrentTime() + 12;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime6]);
        await movePriceUp(swap, trader, tokenX, tokenY, 10000); // 7 obs

        const swapTime7 = await getCurrentTime() + 2;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime7]);
        await movePriceDown(swap, trader, tokenX, tokenY, 5000);  // 8 obs

        await pool.expandObservationQueue(20);

        const swapTime8 = await getCurrentTime() + 22;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime8]);
        await movePriceDown(swap, trader, tokenX, tokenY, 4000);  // 9 obs

        const swapTime9 = await getCurrentTime() + 39;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime9]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3700);  // 10 obs

        const swapTime10 = await getCurrentTime() + 8;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime10]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3500);  // 11 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(21);
        const targetTime = swapTime2 + 2;
        const deltaTime = queryTime - targetTime;

        const res = await getOracle(oracle, poolXYAddr, deltaTime);

        const stdAvgPoint = getTWAPoint(
            [targetTime, swapTime3, swapTime4, swapTime5, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [3000, -3000, -1000, 2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res.enough).to.equal(true);
        expect(res.avgPoint).to.equal(stdAvgPoint);
        expect(res.oldestTime).to.equal(createPoolTime);


        const res2 = await getOracle(oracle, poolXYAddr, queryTime - swapTime2);

        const stdAvgPoint2 = getTWAPoint(
            [swapTime2, swapTime3, swapTime4, swapTime5, swapTime6, swapTime7, swapTime8, swapTime9, swapTime10, queryTime], 
            [3000, -3000, -1000, 2000, 10000, 5000, 4000, 3700, 3500]
        );
        expect(res2.enough).to.equal(true);
        expect(res2.avgPoint).to.equal(stdAvgPoint2);
        expect(res2.oldestTime).to.equal(createPoolTime);
    }); 

    it("delta is zero", async function() {

        await pool.expandObservationQueue(8);

        const swapTime1 = await getCurrentTime() + 6;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime1]);
        await movePriceDown(swap, trader, tokenX, tokenY, 6000); // 2 obs

        const swapTime2 = await getCurrentTime() + 10;
        await ethers.provider.send('evm_setNextBlockTimestamp', [swapTime2]);
        await movePriceDown(swap, trader, tokenX, tokenY, 3000); // 3 obs

        const queryTime = await getCurrentTime() + 18;
        await ethers.provider.send('evm_setNextBlockTimestamp', [queryTime]);
        await pool.expandObservationQueue(20);

        const res = await getOracle(oracle, poolXYAddr, 0);

        expect(res.enough).to.equal(true);
        expect(res.avgPoint).to.equal(3000);
        expect(res.oldestTime).to.equal(createPoolTime);

    }); 
});