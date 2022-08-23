const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    updateOrder, 
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderWithX, 
    decLimOrderWithX, 
    collectLimOrderWithX, 
    newLimOrderWithY, 
    stringAdd, stringDivCeil, stringMinus, stringMul,stringDiv } = require("./funcs.js")

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
    expect(limorder.sellingRemain.toFixed(0)).to.equal(limorderExpect.sellingRemain);
    expect(limorder.sellingDec.toFixed(0)).to.equal(limorderExpect.sellingDec);
    expect(limorder.earn.toFixed(0)).to.equal(limorderExpect.earn);
    expect(limorder.lastAccEarn.toFixed(0)).to.equal(limorderExpect.lastAccEarn);
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
async function getLimorderManager(factory, weth) {
    const LimorderManager = await ethers.getContractFactory("LimitOrderManager");
    var limorderManager = await LimorderManager.deploy(factory.address, weth.address);
    await limorderManager.deployed();
    return limorderManager;
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
    var limorderManager;
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
        limorderManager = await getLimorderManager(izumiswapFactory, weth9);
        viewLimorder = await getViewLimorder(izumiswapFactory);

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        await tokenY.transfer(trader.address, "10000000000000000000000");
        await tokenY.connect(trader).approve(swap.address, "10000000000000000000000");
        await tokenX.transfer(trader.address, "10000000000000000000000");
        await tokenX.connect(trader).approve(swap.address, "10000000000000000000000");
    });

    
    it("first claim first earn", async function() {
        sellX1 = BigNumber("1000000000");
        await newLimOrderWithX(0, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), 5050);

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
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        await newLimOrderWithY(1, tokenX, tokenY, seller1, limorderManager, '1000000000000', 5000)

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
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        sellX2 = BigNumber("1000000000");
        await newLimOrderWithX(0, tokenX, tokenY, seller2, limorderManager, sellX2.toFixed(0), 5050);

        sellX3 = BigNumber('1000000000')
        await newLimOrderWithX(0, tokenX, tokenY, seller3, limorderManager, sellX3.toFixed(0), 5050);


        const acquireX2 = '1000000000'
        const costY2 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX2)
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
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        await decLimOrderWithX(seller2, '0', limorderManager, '1000000000')
        const earnY2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX2)
        
        await checkLimOrder(seller2.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnY2,
            lastAccEarn: stringAdd(costY1, costY2),
            sellXEarnY: true
        }); 

        await updateOrder(seller3, '0', limorderManager)

        const earnY2ForS3 = stringMinus(costY2, earnY2)
        const soldX2ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), earnY2ForS3)
        const remainX2ForS3 = stringMinus('1000000000', soldX2ForS3)

        await checkLimOrder(seller3.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: remainX2ForS3,
            sellingDec: '0',
            earn: earnY2ForS3,
            lastAccEarn: stringAdd(costY1, costY2),
            sellXEarnY: true
        }); 

        await decLimOrderWithX(seller1, '0', limorderManager, '1000000000')
        const earnY1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX1)
        await checkLimOrder(seller1.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnY1,
            lastAccEarn: stringAdd(costY1, costY2),
            sellXEarnY: true
        }); 

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
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        await newLimOrderWithX(2, tokenX, tokenY, seller1, limorderManager, '100000000000000', 5050);

        await decLimOrderWithX(seller1, '2', limorderManager, '1000000000')
        
        await checkLimOrder(seller1.address, "2", limorderManager, {
            pt: 5050,
            sellingRemain: stringMinus('100000000000000', '1000000000'),
            sellingDec: "1000000000",
            earn: '0',
            lastAccEarn: stringAdd(stringAdd(costY1, costY2), costY3),
            sellXEarnY: true
        }); 

        const soldX3ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), costY3)
        const remainX3ForS3 = stringMinus(remainX2ForS3, soldX3ForS3)

        await decLimOrderWithX(seller3, '0', limorderManager, '1000000000')

        await checkLimOrder(seller3.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: '0',
            sellingDec: remainX3ForS3,
            earn: stringAdd(earnY2ForS3, costY3),
            lastAccEarn: stringAdd(stringAdd(costY1, costY2), costY3),
            sellXEarnY: true
        }); 

        await decLimOrderWithX(seller1, '0', limorderManager, '1000000000')

        await checkLimOrder(seller1.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnY1,
            lastAccEarn: stringAdd(stringAdd(costY1, costY2), costY3),
            sellXEarnY: true
        }); 
    });
});