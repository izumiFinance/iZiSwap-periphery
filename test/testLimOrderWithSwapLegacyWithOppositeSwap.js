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

async function priceMoveUp(slotIdx, tokenX, tokenY, seller, swap, limorderWithSwapManager, trader, targetPoint) {

    await newLimOrderWithSwap(slotIdx, tokenX, tokenY, seller, limorderWithSwapManager, 
        '1000000000000', targetPoint, true)

    await swap.connect(trader).swapY2X(
        {
            tokenX: tokenX.address, 
            tokenY: tokenY.address, 
            fee: 3000,
            recipient: trader.address,
            amount: '100000000000000000',
            boundaryPt: targetPoint + 1,
            maxPayed: '100000000000000000',
            minAcquired: 0,
            deadline: "1000000000000"
        }
    );
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
        [signer, seller1, seller2, seller3, seller4, seller5, seller6, trader, receiver] = await ethers.getSigners();

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
        await tokenX.transfer(seller4.address, aBigNumber)
        await tokenX.connect(seller4).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenX.transfer(seller5.address, aBigNumber)
        await tokenX.connect(seller5).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenX.transfer(seller6.address, aBigNumber)
        await tokenX.connect(seller6).approve(limorderWithSwapManager.address, aBigNumber);

        await tokenY.transfer(seller1.address, aBigNumber)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller2.address, aBigNumber)
        await tokenY.connect(seller2).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller3.address, aBigNumber)
        await tokenY.connect(seller3).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller4.address, aBigNumber)
        await tokenY.connect(seller4).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller5.address, aBigNumber)
        await tokenY.connect(seller5).approve(limorderWithSwapManager.address, aBigNumber);
        await tokenY.transfer(seller6.address, aBigNumber)
        await tokenY.connect(seller6).approve(limorderWithSwapManager.address, aBigNumber);
    });

    
    it("first claim first earn", async function() {
        const sellY1 = '1000000000'
        await newLimOrderWithSwap(
            0, tokenX, tokenY, seller1, limorderWithSwapManager,
            sellY1, 5050, false
        )
        
        const costX1 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY1)
        const earnX1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY1)
        const costX1WithFee = amountAddFee(costX1, 3000)
        const swap1 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 5049,
                maxPayed: costX1WithFee,
                minAcquired: 0,
                deadline: "0xffffffff"
            }
        );

        await priceMoveUp(0, tokenX, tokenY, seller6, swap, limorderWithSwapManager, trader, 5100)
        const sellY2S1 = '1000000000'
        const sellY2S2 = '1000000000'
        await newLimOrderWithSwap(
            1, tokenX, tokenY, seller1, limorderWithSwapManager,
            sellY2S1, 5050, false
        )
        await newLimOrderWithSwap(
            0, tokenX, tokenY, seller2, limorderWithSwapManager,
            sellY2S2, 5050, false
        )
        const swap2 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 5049,
                maxPayed: '100000000000000000',
                minAcquired: 0,
                deadline: "0xffffffff"
            }
        );

        await priceMoveUp(1, tokenX, tokenY, seller6, swap, limorderWithSwapManager, trader, 5100)

        const sellY3S3 = '1000000000'
        const sellY3S4 = '1000000000'
        await newLimOrderWithSwap(0, tokenX, tokenY, seller3, limorderWithSwapManager, sellY3S3, 5050, false)
        await newLimOrderWithSwap(0, tokenX, tokenY, seller4, limorderWithSwapManager, sellY3S4, 5050, false)

        const acquireY3_least = '1000000000'
        const costX3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY3_least)
        const acquireY3 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costX3)
        const remainY3 = stringMinus('2000000000', acquireY3)
        // console.log('acquireY3_modify: ', acquireY3_modify)
        const costX3WithFee = amountAddFee(costX3, 3000)

        const swap3 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: costX3WithFee,
                boundaryPt: 5049,
                maxPayed: costX3WithFee,
                minAcquired: 0,
                deadline: "0xffffffff"
            }
        );

        const collect3_S3 = await collectLimOrderWithSwap(seller3, tokenX, tokenY, 0, limorderWithSwapManager)
        const earnX3S3 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY3S3)
        const earnX3S4 = stringMinus(costX3, earnX3S3)
        const soldY3S4 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), earnX3S4)
        expect(collect3_S3.deltaX).to.equal(earnX3S3)
        expect(collect3_S3.deltaY).to.equal('0')
        const collect3_S4 = await collectLimOrderWithSwap(seller4, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect3_S4.deltaX).to.equal(earnX3S4)
        expect(collect3_S4.deltaY).to.equal('0')
        const limitOrderS3_0 = await getLimorderFromManager(seller3.address, 0, limorderWithSwapManager)
        expect(limitOrderS3_0.active).to.equal(false)
        expect(limitOrderS3_0.earn).to.equal(earnX3S3)
        expect(limitOrderS3_0.sellingRemain).to.equal('0')
        expect(limitOrderS3_0.initSellingAmount).to.equal(sellY3S3)
        const limitOrderS4_0 = await getLimorderFromManager(seller4.address, 0, limorderWithSwapManager)
        expect(limitOrderS4_0.active).to.equal(true)
        expect(limitOrderS4_0.earn).to.equal(earnX3S4)
        expect(limitOrderS4_0.sellingRemain).to.equal(stringMinus(sellY3S4, soldY3S4))
        expect(limitOrderS4_0.initSellingAmount).to.equal(sellY3S4)


        const sellX4_S1 = '1000000000'
        const offsetXForSellY = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), remainY3)
        await newLimOrderWithSwap(2, tokenX, tokenY, seller1, limorderWithSwapManager, stringAdd(sellX4_S1, offsetXForSellY), 5050, true)

        const collect3_S1_0 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 0, limorderWithSwapManager)
        const collect3_S1_1 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 1, limorderWithSwapManager)
        const collect3_S2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)

        const earnY1S1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY1)
        const earnY2S1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY2S1)
        const earnY2S2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), sellY2S2)
        expect(collect3_S1_0.deltaX).to.equal(earnY1S1)
        expect(collect3_S1_1.deltaX).to.equal(earnY2S1)
        expect(collect3_S2.deltaX).to.equal(earnY2S2)


        const limitOrderS1_2 = await getLimorderFromManager(seller1.address, 2, limorderWithSwapManager)
        expect(limitOrderS1_2.active).to.equal(true)
        expect(limitOrderS1_2.earn).to.equal(remainY3)
        expect(limitOrderS1_2.sellingRemain).to.equal(sellX4_S1)
        expect(limitOrderS1_2.initSellingAmount).to.equal(stringAdd(sellX4_S1, offsetXForSellY))

        const earnXForRemainY3ForS4 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), limitOrderS4_0.sellingRemain)

        const collect3_S4_2 = await collectLimOrderWithSwap(seller4, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect3_S4_2.deltaX).to.equal(earnXForRemainY3ForS4)
        expect(collect3_S4_2.deltaY).to.equal('0')
        const limitOrderS4_0_2 = await getLimorderFromManager(seller4.address, 0, limorderWithSwapManager)
        expect(limitOrderS4_0_2.active).to.equal(false)
        expect(limitOrderS4_0_2.earn).to.equal(stringAdd(earnX3S4, earnXForRemainY3ForS4))
        expect(limitOrderS4_0_2.sellingRemain).to.equal('0')
        expect(limitOrderS4_0_2.initSellingAmount).to.equal(sellY3S4)


        const sellX4_S2 = '1000000000'
        await newLimOrderWithSwap(1, tokenX, tokenY, seller2, limorderWithSwapManager, sellX4_S2, 5050, true)

        const acquireX4_least = '2000000000'
        const costY4 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX4_least)
        const earnY4S1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX4_S1)
        const earnY4S2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX4_S2)
        const swap4 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costY4),
                boundaryPt: 5051,
                maxPayed: amountAddFee(costY4),
                minAcquired: 0,
                deadline: "1000000000000"
            }
        );


        const sellX5S3 = '1000000000'
        const sellX5S4 = '1000000000'

        await newLimOrderWithSwap(1, tokenX, tokenY, seller3, limorderWithSwapManager, sellX5S3, 5050, true)
        await newLimOrderWithSwap(1, tokenX, tokenY, seller4, limorderWithSwapManager, sellX5S4, 5050, true)

        const acquireX5_least = '1500000000'
        const costY5 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX5_least)
        const acquireX5 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), costY5)

        const swap5 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costY5),
                boundaryPt: 5051,
                maxPayed: amountAddFee(costY5),
                minAcquired: 0,
                deadline: "1000000000000"
            }
        );
        const earnY5S3 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX5S3)

        const collect5_S3 = await collectLimOrderWithSwap(seller3, tokenX, tokenY, 1, limorderWithSwapManager)
        expect(collect5_S3.ok).to.equal(true)
        expect(collect5_S3.deltaY).to.equal(earnY5S3)
        expect(collect5_S3.deltaX).to.equal('0')
        const limitOrderS3_1 = await getLimorderFromManager(seller3.address, 1, limorderWithSwapManager)
        expect(limitOrderS3_1.active).to.equal(false)
        expect(limitOrderS3_1.earn).to.equal(earnY5S3)
        expect(limitOrderS3_1.sellingRemain).to.equal('0')
        expect(limitOrderS3_1.initSellingAmount).to.equal(sellX5S3)
        
        const earnY5S4 = stringMinus(costY5, earnY5S3)
        const soldX5S4 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), earnY5S4)
        const collect5_S4 = await cancelLimOrderWithSwap(seller4, tokenX, tokenY, 1, limorderWithSwapManager)
        expect(collect5_S4.ok).to.equal(true)
        expect(collect5_S4.deltaY).to.equal(earnY5S4)
        expect(collect5_S4.deltaX).to.equal(stringMinus(sellX5S3, soldX5S4))

        const limitOrderS4_1 = await getLimorderFromManager(seller4.address, 1, limorderWithSwapManager)
        expect(limitOrderS4_1.active).to.equal(false)
        expect(limitOrderS4_1.earn).to.equal(earnY5S4)
        expect(limitOrderS4_1.sellingRemain).to.equal(stringMinus(sellX5S3, soldX5S4))
        expect(limitOrderS4_1.initSellingAmount).to.equal(sellX5S3)


        const collect5_S1 = await collectLimOrderWithSwap(seller1, tokenX, tokenY, 2, limorderWithSwapManager)
        expect(collect5_S1.ok).to.equal(true)
        expect(collect5_S1.deltaY).to.equal(earnY4S1)
        expect(collect5_S1.deltaX).to.equal('0')

        const collect5_S2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 1, limorderWithSwapManager)
        expect(collect5_S2.ok).to.equal(true)
        expect(collect5_S2.deltaY).to.equal(earnY4S2)
        expect(collect5_S2.deltaX).to.equal('0')
    });
});