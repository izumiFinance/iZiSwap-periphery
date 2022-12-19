const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getIzumiswapFactory, 
    stringAdd, stringDivCeil, stringMinus, stringMul,stringDiv, 
    newLimOrderWithSwap,
    collectLimOrderWithSwap, 
    cancelLimOrderWithSwap, 
    getSum,
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
async function getLimorderManager(factory, weth) {
    const LimorderManager = await ethers.getContractFactory("LimitOrderManager");
    var limorderManager = await LimorderManager.deploy(factory.address, weth.address);
    await limorderManager.deployed();
    return limorderManager;
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
    [lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, true
    );
    return {
        //lastAccEarn: lastAccEarn.toString(),
        //sellingRemain: sellingRemain.toString(),
        //sellingDesc: sellingDesc.toString(),
        earn: new BigNumber(earn.toString()).plus(legacyEarn.toString()).toFixed(0),
        earnAssign: earnAssign.toString()
    };
}
async function checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    earnY = await getCoreEarnY(viewLimorder, pool, limorderManager.address, pt);
    //expect(earnX.lastAccEarn).to.equal(expectData.lastAccEarn.toFixed(0));
    //expect(earnX.sellingRemain).to.equal(expectData.sellingRemain.toFixed(0));
    //expect(earnX.sellingDesc).to.equal(expectData.sellingDesc.toFixed(0));
    expect(earnY.earn).to.equal(expectData.earn.toFixed(0));
    expect(earnY.earnAssign).to.equal(expectData.earnAssign.toFixed(0));
}
async function checkpoolid(nflomAddr, userAddress, orderIdx) {

    const LimitOrderManager = await ethers.getContractFactory("LimitOrderManager");
    var nflom = LimitOrderManager.attach(nflomAddr);
    try {
        const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY} = await nflom.getActiveOrder(userAddress, orderIdx);

        console.log("-----------pt: ", pt);
        console.log("-----------selling remain: ", sellingRemain.toString());
        console.log("-----------poolId: ", poolId);
    } catch (err) {
        console.log(err);
    }
}

function amountAddFee(amount, feeTier=3000) {
    const fee = stringDivCeil(stringMul(amount, feeTier), stringMinus(1e6, feeTier));
    return stringAdd(amount, fee);
}


function getCostYFromXAt(sqrtPrice_96, acquireX) {
    const q96 = BigNumber(2).pow(96).toFixed(0);

    const liquidity = stringDivCeil(stringMul(acquireX, sqrtPrice_96), q96);
    const costY = stringDivCeil(stringMul(liquidity, sqrtPrice_96), q96);

    return costY;
}

function getEarnYFromXAt(sqrtPrice_96, soldX) {
    const q96 = BigNumber(2).pow(96).toFixed(0);

    const liquidity = stringDiv(stringMul(soldX, sqrtPrice_96), q96);
    const costY = stringDiv(stringMul(liquidity, sqrtPrice_96), q96);

    return costY;
}

function getCostXFromYAt(sqrtPrice_96, acquireY) {
    const q96 = BigNumber(2).pow(96).toFixed(0);

    const liquidity = stringDivCeil(stringMul(acquireY, q96), sqrtPrice_96);
    const costX = stringDivCeil(stringMul(liquidity, q96), sqrtPrice_96);

    return costX;
}

function getEarnXFromYAt(sqrtPrice_96, costY) {
    const q96 = BigNumber(2).pow(96).toFixed(0);

    const liquidity = stringDiv(stringMul(costY, q96), sqrtPrice_96);
    const costX = stringDiv(stringMul(liquidity, q96), sqrtPrice_96);

    return costX;
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

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        
        const aBigNumber = '1000000000000000000000'
        await tokenX.transfer(trader.address, aBigNumber);
        await tokenX.connect(trader).approve(swap.address, aBigNumber);
        await tokenY.transfer(trader.address, aBigNumber);
        await tokenY.connect(trader).approve(swap.address, aBigNumber);

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
    });

    
    it("first claim first earn", async function() {
        const sellX1 = "1000000000"
        await newLimOrderWithSwap(0, tokenX, tokenY, seller1, limorderWithSwapManager, sellX1, 5050, true)

        const acquireX1 = '1000000000'
        const costY1 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX1)
        const costY1WithFee = amountAddFee(costY1, 3000)
        const swap1 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 5051,
                maxPayed: costY1WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await newLimOrderWithSwap(1, tokenX, tokenY, seller1, limorderWithSwapManager, '1000000000000', 5000, false)

        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 4999,
                maxPayed: '100000000000000000',
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const sellX2 = '1000000000'
        await newLimOrderWithSwap(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2, 5050, true)

        const sellX3 = '1000000000'
        await newLimOrderWithSwap(0, tokenX, tokenY, seller3, limorderWithSwapManager, sellX3, 5050, true)

        const acquireX2 = '1000000000'
        const costY2 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX2)
        const earnY2ForS2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX2)
        const costY2WithFee = amountAddFee(costY2, 3000)

        const swap2 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: costY2WithFee,
                boundaryPt: 5051,
                maxPayed: costY2WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const collect2_2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect2_2.ok).to.equal(true)
        expect(collect2_2.deltaX).to.equal('0')
        expect(collect2_2.deltaY).to.equal(earnY2ForS2)

        const limorder2_2 = await getLimorderFromManager(seller2.address, 0, limorderWithSwapManager)
        expect(limorder2_2.initSellingAmount).to.equal(sellX2)
        expect(limorder2_2.sellingRemain).to.equal('0')
        expect(limorder2_2.sellXEarnY).to.equal(true)
        expect(limorder2_2.earn).to.equal(earnY2ForS2)

        const collect3_2 = await collectLimOrderWithSwap(seller3, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect3_2.ok).to.equal(true)
        const earnY2ForS3 = stringMinus(costY2, earnY2ForS2)
        const soldX2ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), earnY2ForS3)
        expect(collect3_2.deltaX).to.equal('0')
        const remainX2ForS3 = stringMinus(sellX3, soldX2ForS3)

        expect(collect3_2.deltaY).to.equal(earnY2ForS3)
        const limorder3_2 = await getLimorderFromManager(seller3.address, 0, limorderWithSwapManager)
        expect(limorder3_2.initSellingAmount).to.equal(sellX3)
        expect(limorder3_2.sellingRemain).to.equal(remainX2ForS3)
        expect(limorder3_2.sellXEarnY).to.equal(true)
        expect(limorder3_2.earn).to.equal(earnY2ForS3)

        const collect1_2 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 0, limorderWithSwapManager)
        const earnY1ForS1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX1)
        expect(collect1_2.ok).to.equal(true)
        expect(collect1_2.deltaX).to.equal('0')
        expect(collect1_2.deltaY).to.equal(earnY1ForS1)

        const limorder1_2 = await getLimorderFromManager(seller1.address, 0, limorderWithSwapManager)
        expect(limorder1_2.initSellingAmount).to.equal(sellX1)
        expect(limorder1_2.sellingRemain).to.equal('0')
        expect(limorder1_2.sellXEarnY).to.equal(true)
        expect(limorder1_2.earn).to.equal(earnY1ForS1)
        expect(limorder1_2.active).to.equal(false)

        const acquireX3 = '500000000'
        const costY3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX3)
        const costY3WithFee = amountAddFee(costY3, 3000)

        const swap3 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: costY3WithFee,
                boundaryPt: 5051,
                maxPayed: costY3WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await newLimOrderWithSwap(2, tokenX, tokenY, seller1, limorderWithSwapManager, '100000000000000', 5050, true)

        const collect1_3_2 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 2, limorderWithSwapManager)
        expect(collect1_3_2.ok).to.equal(true)
        expect(collect1_3_2.deltaX).to.equal('0')
        expect(collect1_3_2.deltaY).to.equal('0')

        const limorder1_3_2 = await getLimorderFromManager(seller1.address, 2, limorderWithSwapManager)
        expect(limorder1_3_2.initSellingAmount).to.equal('100000000000000')
        expect(limorder1_3_2.sellingRemain).to.equal('100000000000000')
        expect(limorder1_3_2.earn).to.equal('0')
        expect(limorder1_3_2.sellXEarnY).to.equal(true)
        expect(limorder1_3_2.lastAccEarn).to.equal(getSum([costY1, costY2, costY3]))
        
        const soldX3ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), costY3)
        const remainX3ForS3 = stringMinus(remainX2ForS3, soldX3ForS3)

        const cancel3_3 = await cancelLimOrderWithSwap(seller3, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(cancel3_3.ok).to.equal(true)
        expect(cancel3_3.deltaX).to.equal(remainX3ForS3)
        const earnY3ForS3 = costY3
        expect(cancel3_3.deltaY).to.equal(earnY3ForS3)
        const limorder3_3 = await getLimorderFromManager(seller3.address, 0, limorderWithSwapManager)
        expect(limorder3_3.initSellingAmount).to.equal(sellX3)
        // cancel donot clear value of sellingRemain, but set active as false to prevent double collect/cancel
        expect(limorder3_3.sellingRemain).to.equal(remainX3ForS3)
        expect(limorder3_3.sellXEarnY).to.equal(true)
        expect(limorder3_3.active).to.equal(false)
        expect(limorder3_3.earn).to.equal(stringAdd(earnY2ForS3, earnY3ForS3))
        expect(limorder3_3.lastAccEarn).to.equal(getSum([costY1, costY2, costY3]))

        const collect3_3_1 = await collectLimOrderWithSwap(seller3, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect3_3_1.ok).to.equal(false)
        expect(collect3_3_1.deltaX).to.equal('0')
        expect(collect3_3_1.deltaY).to.equal('0')

        const limorder3_3_1 = await getLimorderFromManager(seller3.address, 0, limorderWithSwapManager)
        expect(limorder3_3_1.initSellingAmount).to.equal(sellX3)
        // cancel donot clear value of sellingRemain, but set active as false to prevent double collect/cancel
        expect(limorder3_3_1.sellingRemain).to.equal(remainX3ForS3)
        expect(limorder3_3_1.sellXEarnY).to.equal(true)
        expect(limorder3_3_1.active).to.equal(false)
        expect(limorder3_3_1.earn).to.equal(stringAdd(earnY2ForS3, earnY3ForS3))
        expect(limorder3_3_1.lastAccEarn).to.equal(getSum([costY1, costY2, costY3]))


        const collect1_3_0 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect1_3_0.ok).to.equal(false)
        expect(collect1_3_0.deltaX).to.equal('0')
        expect(collect1_3_0.deltaY).to.equal('0')

        const limorder1_3_0 = await getLimorderFromManager(seller1.address, 0, limorderWithSwapManager)
        expect(limorder1_3_0.initSellingAmount).to.equal(sellX1)
        expect(limorder1_3_0.sellingRemain).to.equal('0')
        expect(limorder1_3_0.sellXEarnY).to.equal(true)
        expect(limorder1_3_0.earn).to.equal(earnY1ForS1)
        expect(limorder1_3_0.active).to.equal(false)
        
    });
});