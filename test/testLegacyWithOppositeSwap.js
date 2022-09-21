const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    updateOrder, 
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderWithX, 
    decLimOrderWithX, 
    decLimOrderWithY,
    collectLimOrderWithX, 
    newLimOrderWithY, 
    stringAdd, stringDivCeil, stringMinus, stringMul,stringDiv, getSum } = require("./funcs.js")

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

async function collectLimOrder(seller, sellId, recipient, limorderManager, amountX, amountY, tokenX, tokenY) {
    const balanceXBefore = (await tokenX.balanceOf(recipient)).toString()
    const balanceYBefore = (await tokenY.balanceOf(recipient)).toString()
    let ok = true
    try {
    await limorderManager.connect(seller).collectLimOrder(
        recipient, sellId, amountX, amountY
    );
    } catch (err) {
        ok = false
    }
    const balanceXAfter = (await tokenX.balanceOf(recipient)).toString()
    const balanceYAfter = (await tokenY.balanceOf(recipient)).toString()
    return {
        ok,
        amountX: stringMinus(balanceXAfter, balanceXBefore),
        amountY: stringMinus(balanceYAfter, balanceYBefore)
    }
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

async function priceMoveUp(slotIdx, tokenX, tokenY, seller, swap, limorderManager, trader, targetPoint) {

    await newLimOrderWithX(1, tokenX, tokenY, seller, limorderManager, '1000000000000', targetPoint)

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

async function priceMoveDown(slotIdx, tokenX, tokenY, seller, swap, limorderManager, trader, targetPoint) {

    await newLimOrderWithY(slotIdx, tokenX, tokenY, seller, limorderManager, '1000000000000', targetPoint)

    await swap.connect(trader).swapX2Y(
        {
            tokenX: tokenX.address, 
            tokenY: tokenY.address, 
            fee: 3000,
            recipient: trader.address,
            amount: '100000000000000000',
            boundaryPt: targetPoint - 1,
            maxPayed: '100000000000000000',
            minAcquired: 0,
            deadline: "1000000000000"
        }
    );
}
describe("limorder", function () {
    var signer, seller1, seller2, seller3, seller4, trader, trader2;
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
        [signer, seller1, seller2, seller3, seller4, seller5, trader, trader2, recipient1, recipient2, receiver] = await ethers.getSigners();

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
        const sellY1 = BigNumber("1000000000");
        await newLimOrderWithY(0, tokenX, tokenY, seller1, limorderManager, sellY1.toFixed(0), 5050);

        const acquireY1 = '1000000000'
        const costX1 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY1)
        const earnX1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY1)
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
                deadline: "1000000000000"
            }
        );

        const s1Collect1 = await collectLimOrder(
            seller1, '0', seller1.address, limorderManager, 
            '100000000000000000', '100000000000000000', tokenX, tokenY
        )

        expect(s1Collect1.ok).to.equal(true)
        expect(s1Collect1.amountX).to.equal(earnX1)
        expect(s1Collect1.amountY).to.equal('0')

        const s1Collect1_2 = await collectLimOrder(
            seller1, '0', seller1.address, limorderManager, 
            '100000000000000000', '100000000000000000', tokenX, tokenY
        )

        expect(s1Collect1_2.ok).to.equal(false)
        expect(s1Collect1_2.amountX).to.equal('0')
        expect(s1Collect1_2.amountY).to.equal('0')

        await priceMoveUp(0, tokenX, tokenY, seller5, swap, limorderManager, trader, 5100)

        const sellY2 = "1000000000";
        await newLimOrderWithY(0, tokenX, tokenY, seller1, limorderManager, sellY2, 5050)

        const acquireY2 = '1000000000'
        const costX2 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY2)
        const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY2)
        const costX2WithFee = amountAddFee(costX2, 3000)
        const swap2 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 5049,
                maxPayed: costX2WithFee,
                minAcquired: 0,
                deadline: "1000000000000"
            }
        );

        await priceMoveUp(1, tokenX, tokenY, seller5, swap, limorderManager, trader, 5100)

        const sellY3_s2 = "1000000000"
        await newLimOrderWithY(0, tokenX, tokenY, seller2, limorderManager, sellY3_s2, 5050);

        const sellY3_s3 = '1000000000'
        await newLimOrderWithY(0, tokenX, tokenY, seller3, limorderManager, sellY3_s3, 5050);

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
                deadline: "1000000000000"
            }
        );

        await decLimOrderWithY(seller2, '0', limorderManager, '1000000000')
        const earnX3 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY3)
        
        await checkLimOrder(seller2.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnX3,
            lastAccEarn: getSum([costX1, costX2, costX3]),
            sellXEarnY: false
        }); 

        await updateOrder(seller3, '0', limorderManager)

        const earnX3ForS3 = stringMinus(costX3, earnX3)
        const soldY3ForS3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), earnX3ForS3)
        const remainY3ForS3 = stringMinus('1000000000', soldY3ForS3)

        await checkLimOrder(seller3.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: remainY3ForS3,
            sellingDec: '0',
            earn: earnX3ForS3,
            lastAccEarn: getSum([costX1, costX2, costX3]),
            sellXEarnY: false
        }); 

        await decLimOrderWithY(seller1, '0', limorderManager, '1000000000')
        // const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireY1)
        await checkLimOrder(seller1.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnX2,
            lastAccEarn: getSum([costX1, costX2, costX3]),
            sellXEarnY: false
        }); 

        const sellX4_s1 = '1000000000'
        const offsetXForSellY = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), remainY3)
        await newLimOrderWithX(1, tokenX, tokenY, seller1, limorderManager, stringAdd(sellX4_s1, offsetXForSellY), 5050);

        await checkLimOrder(seller1.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: "0",
            sellingDec: "0",
            earn: earnX1,
            lastAccEarn: getSum([costX1, costX2, costX3]),
            sellXEarnY: false
        }); 

        await checkLimOrder(seller1.address, "1", limorderManager, {
            pt: 5050,
            sellingRemain: "1000000000",
            sellingDec: "0",
            earn: remainY3,
            lastAccEarn: '0',
            sellXEarnY: true
        }); 

        await updateOrder(seller3, '0', limorderManager)

        const earnXForRemainY3ForS3 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), remainY3ForS3)

        await checkLimOrder(seller3.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: '0',
            sellingDec: '0',
            earn: stringAdd(earnX3ForS3, earnXForRemainY3ForS3),
            lastAccEarn: getSum([costX1, costX2, costX3, offsetXForSellY]),
            sellXEarnY: false
        }); 


        const sellX4_s2 = '1000000000'
        await newLimOrderWithX(1, tokenX, tokenY, seller2, limorderManager, sellX4_s2, 5050);

        const acquireX4_least = '2000000000'
        const costY4 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireX4_least)
        const earnY4_s1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX4_s1)
        const earnY4_s2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX4_s2)
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

        const sellX5_s3 = '1000000000'
        const sellX5_s4 = '1000000000'
        await newLimOrderWithX(1, tokenX, tokenY, seller3, limorderManager, sellX5_s3, 5050);
        await newLimOrderWithX(0, tokenX, tokenY, seller4, limorderManager, sellX5_s4, 5050);

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

        const earnY5_s3 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX5_s3)

        const collect5_s3 = await collectLimOrder(seller3, '1', seller3.address, limorderManager, '10000000000000', '10000', tokenX, tokenY)
        expect(collect5_s3.ok).to.equal(true)
        expect(collect5_s3.amountX, '0')
        expect(collect5_s3.amountY, '10000')


        // await updateOrder(seller3, '1', limorderManager)
        // await updateOrder(seller4, '0', limorderManager)
        const collect5_s4 = await collectLimOrder(seller4, '0', seller4.address, limorderManager, '2', '1', tokenX, tokenY)
        expect(collect5_s4.ok).to.equal(true)
        expect(collect5_s4.amountX, '0')
        expect(collect5_s4.amountY, '1')


        await checkLimOrder(seller3.address, "1", limorderManager, {
            pt: 5050,
            sellingRemain: '0',
            sellingDec: '0',
            earn: stringMinus(earnY5_s3, '10000'),
            lastAccEarn: stringAdd(costY4, costY5),
            sellXEarnY: true
        }); 
        const earnY5_s4 = stringMinus(costY5, earnY5_s3)
        const soldX5_s4 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), earnY5_s4)
        await checkLimOrder(seller4.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: stringMinus(sellX5_s4, soldX5_s4),
            sellingDec: '0',
            earn: stringMinus(earnY5_s4, '1'),
            lastAccEarn: stringAdd(costY4, costY5),
            sellXEarnY: true
        }); 

        await updateOrder(seller1, '1', limorderManager)
        await updateOrder(seller2, '1', limorderManager)
        await checkLimOrder(seller1.address, "1", limorderManager, {
            pt: 5050,
            sellingRemain: '0',
            sellingDec: '0',
            earn: stringAdd(remainY3, earnY4_s1),
            lastAccEarn: stringAdd(costY4, costY5),
            sellXEarnY: true
        }); 

        await checkLimOrder(seller2.address, "1", limorderManager, {
            pt: 5050,
            sellingRemain: '0',
            sellingDec: '0',
            earn: earnY4_s2,
            lastAccEarn: stringAdd(costY4, costY5),
            sellXEarnY: true
        }); 

    });
});