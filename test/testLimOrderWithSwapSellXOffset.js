const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderWithSwap, 
    getCostXFromYAt, 
    getEarnYFromXAt, 
    getCostYFromXAt, 
    collectLimOrderWithSwap,
    stringMinus,
    stringAdd,
    getEarnXFromYAt,
    getRevertString,
 } = require("./funcs.js")

async function getToken(dx, dy) {

    // deploy token
    const tokenFactory = await ethers.getContractFactory("TestToken")
    tokenX = await tokenFactory.deploy('a', 'a', dx);
    await tokenX.deployed();
    tokenY = await tokenFactory.deploy('b', 'b', dy);
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

function ceil(b) {
    return BigNumber(b.toFixed(0, 2));
}

function floor(b) {
    return BigNumber(b.toFixed(0, 3));
}

function getAmountX(l, r, rate, liquidity, up) {
    amountX = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
        amountX = amountX.plus(liquidity.div(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountX);
    }
    return floor(amountX);
}

function getAmountY(l, r, rate, liquidity, up) {
    var amountY = BigNumber('0');
    var price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
        amountY = amountY.plus(liquidity.times(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountY);
    }
    return floor(amountY);
}

async function collectLimOrder(seller, sellId, recipient, limorderManager, amountX, amountY) {
    await limorderManager.connect(seller).collectLimOrder(
        recipient, sellId, amountX, amountY
    );
}
function blockNum2BigNumber(num) {
    var b = BigNumber(num);
    return b;
}
async function getLimorder(userAddress, orderIdx, limorderManager) {
     const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY} = await limorderManager.getActiveOrder(userAddress, orderIdx);
     console.log('selling dec: ', sellingDec);
     return {
         pt: pt,
         sellingRemain: blockNum2BigNumber(sellingRemain),
         sellingDec: blockNum2BigNumber(sellingDec),
         earn: blockNum2BigNumber(earn),
         lastAccEarn: blockNum2BigNumber(lastAccEarn),
         poolId: blockNum2BigNumber(poolId),
         sellXEarnY: sellXEarnY
     };
}
async function checkLimOrder(userAddress, orderIdx, limorderManager, limorderExpect) {
    limorder = await getLimorder(userAddress, orderIdx, limorderManager);
    expect(limorder.sellingRemain.toFixed(0)).to.equal(limorderExpect.sellingRemain.toFixed(0));
    expect(limorder.sellingDec.toFixed(0)).to.equal(limorderExpect.sellingDec.toFixed(0));
    expect(limorder.earn.toFixed(0)).to.equal(limorderExpect.earn.toFixed(0));
    expect(limorder.lastAccEarn.toFixed(0)).to.equal(limorderExpect.lastAccEarn.toFixed(0));
    expect(limorder.sellXEarnY).to.equal(limorderExpect.sellXEarnY);
}

function getCostY(point, rate, amountX) {
    var sp = rate.pow(point).sqrt();
    var liquidity = ceil(amountX.times(sp));
    var costY = ceil(liquidity.times(sp));
    return costY;
}
function getCostX(point, rate, amountY) {
    var sp = rate.pow(point).sqrt();
    var liquidity = ceil(amountY.div(sp));
    var costX = ceil(liquidity.div(sp));
    return costX;
}
function getAcquireY(point, rate, amountX) {
    var sp = rate.pow(point).sqrt();
    var liquidity = floor(amountX.times(sp));
    var acquireY = floor(liquidity.times(sp));
    return acquireY;
}
function getAcquireX(point, rate, amountY) {
    var sp = rate.pow(point).sqrt();
    var liquidity = floor(amountY.div(sp));
    var acquireX = floor(liquidity.div(sp));
    return acquireX;
}
function blockNum2BigNumber(blc) {
    return BigNumber(blc._hex);
}

function getContractJson(path) {
    const fs = require('fs');
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    return data;
}

async function getWETH9(signer) {
    var WETH9Json = getContractJson(__dirname + '/core/WETH9.json');
    var WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode, signer);
    var WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}
async function getNFTLiquidityManager(factory, weth) {
    const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
    var nflm = await LiquidityManager.deploy(factory.address, weth.address);
    await nflm.deployed();
    return nflm;
}
async function getSwap(factory, weth) {
    const SwapManager = await ethers.getContractFactory("Swap");
    var swap = await SwapManager.deploy(factory.address, weth.address);
    await swap.deployed();
    return swap;
}
async function getLimorderWithSwapManager(factory, weth) {
    const LimorderWithSwapManager = await ethers.getContractFactory("LimitOrderWithSwapManager");
    var limorderWithSwapManager = await LimorderWithSwapManager.deploy(factory.address, weth.address);
    await limorderWithSwapManager.deployed();
    return limorderWithSwapManager;
}

async function getViewLimorder(factory) {
    const ViewLimorderManager = await ethers.getContractFactory("ViewLimOrder");
    var viewLimorder = await ViewLimorderManager.deploy(factory.address);
    await viewLimorder.deployed();
    return viewLimorder;
}
async function checkBalance(token, miner, expectAmount) {
    var amount = await token.balanceOf(miner.address);
    expect(amount.toString()).to.equal(expectAmount.toFixed(0));
}

async function getCoreEarnY(viewLimorder, pool, miner, pt) {
    var lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign;
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, true
    );
    return {
        lastAccEarn: lastAccEarn.toString(),
        sellingRemain: sellingRemain.toString(),
        sellingDesc: sellingDesc.toString(),
        earn: earn.toString(),
        earnAssign: earnAssign.toString()
    };
}
async function checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    earnY = await getCoreEarnY(viewLimorder, pool, limorderManager.address, pt);
    expect(earnY.lastAccEarn).to.equal(expectData.lastAccEarn);
    expect(earnY.sellingRemain).to.equal(expectData.sellingRemain);
    expect(earnY.sellingDesc).to.equal(expectData.sellingDesc);
    expect(earnY.earn).to.equal(expectData.earn);
    expect(earnY.earnAssign).to.equal(expectData.earnAssign);
}

async function getCoreEarn(viewLimorder, pool, miner, pt, sellXEarnY) {
    var lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign;
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, sellXEarnY
    );
    return {
        lastAccEarn: lastAccEarn.toString(),
        sellingRemain: sellingRemain.toString(),
        sellingDesc: sellingDesc.toString(),
        earn: earn.toString(),
        earnAssign: earnAssign.toString()
    };
}
async function checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    const earnX = await getCoreEarn(viewLimorder, pool, limorderManager.address, pt, false);
    expect(earnX.lastAccEarn).to.equal(expectData.lastAccEarn);
    expect(earnX.sellingRemain).to.equal(expectData.sellingRemain);
    expect(earnX.sellingDesc).to.equal(expectData.sellingDesc);
    expect(earnX.earn).to.equal(expectData.earn);
    expect(earnX.earnAssign).to.equal(expectData.earnAssign);
}

async function checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    const earnY = await getCoreEarn(viewLimorder, pool, limorderManager.address, pt, true);
    expect(earnY.lastAccEarn).to.equal(expectData.lastAccEarn);
    expect(earnY.sellingRemain).to.equal(expectData.sellingRemain);
    expect(earnY.sellingDesc).to.equal(expectData.sellingDesc);
    expect(earnY.earn).to.equal(expectData.earn);
    expect(earnY.earnAssign).to.equal(expectData.earnAssign);
}

async function getLimorderFromManager(userAddress, orderIdx, limorderWithSwapManager) {
    const {
        pt, 
        initSellingAmount, 
        sellingRemain, 
        lastAccEarn, 
        earn, 
        poolId, 
        sellXEarnY,
        active
    } = await limorderWithSwapManager.getActiveOrder(userAddress, orderIdx);
    return {
        pt: pt,
        initSellingAmount: initSellingAmount.toString(),
        sellingRemain: sellingRemain.toString(),
        lastAccEarn: lastAccEarn.toString(),
        earn: earn.toString(),
        poolId: poolId.toString(),
        sellXEarnY,
        active
    };
}

function amountAddFee(amount) {
    return ceil(amount.times(1000).div(997));
}
describe("limorder", function () {
    var signer, seller1, seller2, seller3, trader, trader2;
    var poolPart, poolPartDesire;
    var izumiswapFactory;
    var viewLimorder;
    var weth9;
    var nflm;
    var swap;
    var limorderWithSwapManager;
    var tokenX, tokenY;
    var rate;
    var logPowMath;
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, trader2, recipient1, recipient2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderWithSwapManager = await getLimorderWithSwapManager(izumiswapFactory, weth9)
        viewLimorder = await getViewLimorder(izumiswapFactory);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        
        const aBigNumber = '1000000000000000000000'

        await tokenX.transfer(seller1.address, aBigNumber)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenX.transfer(seller2.address, aBigNumber)
        await tokenX.connect(seller2).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenX.transfer(seller3.address, aBigNumber)
        await tokenX.connect(seller3).approve(limorderWithSwapManager.address, aBigNumber);

        await tokenY.transfer(seller1.address, aBigNumber)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller2.address, aBigNumber)
        await tokenY.connect(seller2).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller3.address, aBigNumber)
        await tokenY.connect(seller3).approve(limorderWithSwapManager.address, aBigNumber);

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();
    });

    
    it("first claim first earn", async function() {
        const sellY1 = "1000000000"
        const seller1SellY_1 = await newLimOrderWithSwap('0', tokenX, tokenY, seller1, limorderWithSwapManager, sellY1, 5050, false)
        expect(seller1SellY_1.ok).to.equal(true)
        expect(seller1SellY_1.deltaX).to.equal('0')
        expect(seller1SellY_1.deltaY).to.equal(sellY1)

        const sqrtPriceAt5050 = (await logPowMath.getSqrtPrice(5050)).toString()
        let acquireYExpectAt5050_1 = '300000000'
        const costXAt5050_1 = getCostXFromYAt(sqrtPriceAt5050, acquireYExpectAt5050_1)
        acquireYExpectAt5050_1 = getEarnYFromXAt(sqrtPriceAt5050, costXAt5050_1)
        
        const seller1CostY_1 = getCostYFromXAt(sqrtPriceAt5050, costXAt5050_1)

        const seller2X_1 = costXAt5050_1

        const seller2SellX_1 = await newLimOrderWithSwap('0', tokenX, tokenY, seller2, limorderWithSwapManager, seller2X_1, 5050, true)
        expect(seller2SellX_1.ok).to.equal(true)
        expect(seller2SellX_1.deltaX).to.equal(seller2X_1)
        expect(seller2SellX_1.deltaY).to.equal('-' + acquireYExpectAt5050_1)

        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            lastAccEarn: '0',
            sellingRemain: sellY1,
            sellingDesc: '0',
            earn: '0',
            earnAssign: '0',
        })
        const limitorder1_1 = await getLimorderFromManager(seller1.address, '0', limorderWithSwapManager)
        expect(limitorder1_1.active).to.equal(true)
        expect(limitorder1_1.earn).to.equal('0')
        expect(limitorder1_1.sellingRemain).to.equal(sellY1)

        const collect1_1 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, '0', limorderWithSwapManager)
        expect(collect1_1.ok).to.equal(true)
        expect(collect1_1.deltaX).to.equal(costXAt5050_1)

        const seller1SellYRemain_1 = stringMinus(sellY1, seller1CostY_1)
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            lastAccEarn: costXAt5050_1,
            sellingRemain: seller1SellYRemain_1,
            sellingDesc: '0',
            earn: '0',
            earnAssign: '0',
        })

        const limitorder1_2 = await getLimorderFromManager(seller1.address, '0', limorderWithSwapManager)
        expect(limitorder1_2.active).to.equal(true)
        expect(limitorder1_2.earn).to.equal(costXAt5050_1)
        expect(limitorder1_2.sellingRemain).to.equal(seller1SellYRemain_1)

        const acquireYExpectAt5050_2 = stringMinus(sellY1, acquireYExpectAt5050_1)

        console.log('acquireYExpectAt5050_2: ', acquireYExpectAt5050_2)
        console.log('seller1SellYRemain_1: ', seller1SellYRemain_1)

        const earnX2ForSeller1Remain_1 = getEarnXFromYAt(sqrtPriceAt5050, seller1SellYRemain_1)
        const seller1SellYReduce_2 = getCostYFromXAt(sqrtPriceAt5050, earnX2ForSeller1Remain_1)
        const seller1SellYRemain_2 = stringMinus(seller1SellYRemain_1, seller1SellYReduce_2)
        const costX2ForSeller1Remain_1 = getCostXFromYAt(sqrtPriceAt5050, acquireYExpectAt5050_2)

        console.log('costX2ForSeller1Remain_1: ', costX2ForSeller1Remain_1)
        console.log('earnX2ForSeller1Remain_1: ', earnX2ForSeller1Remain_1)

        const seller2XRemain_2 = '100000000000'

        const seller2X_2 = stringAdd(costX2ForSeller1Remain_1, seller2XRemain_2)

        const seller2SellX_2 = await newLimOrderWithSwap('0', tokenX, tokenY, seller2, limorderWithSwapManager, seller2X_2, 5050, true)
        expect(seller2SellX_2.ok).to.equal(true)
        expect(seller2SellX_2.deltaX).to.equal(seller2X_2)
        expect(seller2SellX_2.deltaY).to.equal('-' + acquireYExpectAt5050_2)


        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            lastAccEarn: '0',
            sellingRemain: seller2XRemain_2,
            sellingDesc: '0',
            earn: '0',
            earnAssign: '0',
        })

        const limitorder2_2_1 = await getLimorderFromManager(seller2.address, '0', limorderWithSwapManager)
        expect(limitorder2_2_1.active).to.equal(true)
        expect(limitorder2_2_1.earn).to.equal(acquireYExpectAt5050_2)
        expect(limitorder2_2_1.sellingRemain).to.equal(seller2XRemain_2)

        const collect2_2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, '0', limorderWithSwapManager)
        expect(collect2_2.ok).to.equal(true)
        expect(collect2_2.deltaY).to.equal('0')
        expect(collect2_2.deltaX).to.equal('0')

        const limitorder2_2_2 = await getLimorderFromManager(seller2.address, '0', limorderWithSwapManager)
        expect(limitorder2_2_2.active).to.equal(true)
        expect(limitorder2_2_2.earn).to.equal(acquireYExpectAt5050_2)
        expect(limitorder2_2_2.sellingRemain).to.equal(seller2XRemain_2)

        const seller2SellX_2_2 = await newLimOrderWithSwap('0', tokenX, tokenY, seller2, limorderWithSwapManager, '1000000000', 5050, true)

        expect(seller2SellX_2_2.ok).to.equal(false)
        expect(seller2SellX_2_2.deltaX).to.equal('0')
        expect(seller2SellX_2_2.deltaY).to.equal('0')
        expect(getRevertString(seller2SellX_2_2.error.toString())).to.equal('active conflict!')

        const limitorder1_2_1 = await getLimorderFromManager(seller1.address, '0', limorderWithSwapManager)
        expect(limitorder1_2_1.active).to.equal(true)
        expect(limitorder1_2_1.earn).to.equal(costXAt5050_1)
        expect(limitorder1_2_1.sellingRemain).to.equal(seller1SellYRemain_1)

        const collect1_2_1 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, '0', limorderWithSwapManager)
        expect(collect1_2_1.ok).to.equal(true)
        expect(collect1_2_1.deltaY).to.equal('0')
        expect(collect1_2_1.deltaX).to.equal(earnX2ForSeller1Remain_1)

        const limitorder1_2_2 = await getLimorderFromManager(seller1.address, '0', limorderWithSwapManager)
        expect(limitorder1_2_2.active).to.equal(false)
        expect(limitorder1_2_2.earn).to.equal(stringAdd(costXAt5050_1, earnX2ForSeller1Remain_1))

        // await decLimOrderWithY(seller1, "0", limorderManager, "1000000000000000000");
        // seller2EarnPhase1 = acquireYExpect
        // await checkLimOrder(seller1.address, "0", limorderManager, {
        //     pt: 5050,
        //     sellingRemain: BigNumber('0'),
        //     sellingDec: BigNumber("1"),
        //     earn: costX.plus(earnX2),
        //     lastAccEarn: costX.plus(costX2),
        //     sellXEarnY: false
        // });


        // await decLimOrderWithX(seller2, "1", limorderManager, "1");
        // seller2EarnPhase1 = acquireYExpect2
        // await checkLimOrder(seller2.address, "1", limorderManager, {
        //     pt: 5050,
        //     sellingRemain: BigNumber("19999999999"),
        //     sellingDec: BigNumber("1"),
        //     earn: seller2EarnPhase1,
        //     lastAccEarn: BigNumber('0'),
        //     sellXEarnY: true
        // });
    });
});