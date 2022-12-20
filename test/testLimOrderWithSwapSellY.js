const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const {
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderWithSwap, 
    collectLimOrderWithSwap, 
    cancelLimOrderWithSwap, 
    getCostYFromXAt, 
    getEarnXFromYAt, 
    getEarnYFromXAt, 
    getSum,
    getCostXFromYAt,
    stringDiv,
    stringAdd,
    stringMinus,
    stringMul,
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
    return b.toFixed(0, 2);
}

function floor(b) {
    return b.toFixed(0, 3);
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
    expect(amount.toString()).to.equal(expectAmount);
}

async function getCoreEarnX(viewLimorder, pool, miner, pt) {
    var lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign;
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, false
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
    earnX = await getCoreEarnX(viewLimorder, pool, limorderManager.address, pt);
    expect(earnX.lastAccEarn).to.equal(expectData.lastAccEarn);
    expect(earnX.sellingRemain).to.equal(expectData.sellingRemain);
    expect(earnX.sellingDesc).to.equal(expectData.sellingDesc);
    expect(earnX.earn).to.equal(expectData.earn);
    expect(earnX.earnAssign).to.equal(expectData.earnAssign);
}
async function checkpoolid(nflomAddr, userAddress, orderIdx) {

    const LimitOrderManager = await ethers.getContractFactory("LimitOrderWithSwapManager");
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

function amountAddFee(amount) {
    return ceil(new BigNumber(amount).times(1000).div(997));
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
        [signer, seller1, seller2, seller3, seller4, seller5, trader, receiver] = await ethers.getSigners();

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

    });

    
    it("first claim first earn", async function() {
        const sellY1 = "1000000000"
        const seller1SellY_1 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller1,
            limorderWithSwapManager,
            sellY1,
            5050,
            false
        )
        expect(seller1SellY_1.ok).to.equal(true)
        expect(seller1SellY_1.deltaX).to.equal('0')
        expect(seller1SellY_1.deltaY).to.equal(sellY1)

        const sellY2 = "2000000000"
        const seller2SellY_1 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller2,
            limorderWithSwapManager,
            sellY2,
            5050,
            false
        )
        expect(seller2SellY_1.ok).to.equal(true)
        expect(seller2SellY_1.deltaX).to.equal('0')
        expect(seller2SellY_1.deltaY).to.equal(sellY2)

        const sellY3 = '3000000000'
        const seller3SellY_1 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller3,
            limorderWithSwapManager,
            sellY3,
            5050,
            false
        )
        expect(seller3SellY_1.ok).to.equal(true)
        expect(seller3SellY_1.deltaX).to.equal('0')
        expect(seller3SellY_1.deltaY).to.equal(sellY3)

        const sellY4 = '4000000000'
        const seller4SellY_1 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller4,
            limorderWithSwapManager,
            sellY4,
            5050,
            false
        )
        expect(seller4SellY_1.ok).to.equal(true)
        expect(seller4SellY_1.deltaX).to.equal('0')
        expect(seller4SellY_1.deltaY).to.equal(sellY4)

        let acquireYExpectAt5050 = getSum([
            sellY1,
            sellY2,
            stringDiv(sellY3, '30')
        ])

        const costXAt5050 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireYExpectAt5050)
        acquireYExpectAt5050 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)

        const costXAt5050_WithFee = amountAddFee(costXAt5050)
        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: costXAt5050_WithFee,
                boundaryPt: 5050,
                maxPayed: costXAt5050_WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const sellY5 = '5000000000'
        const seller5SellY_1 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller5,
            limorderWithSwapManager,
            sellY5,
            5050,
            false
        )
        
        expect(seller5SellY_1.ok).to.equal(true)
        expect(seller5SellY_1.deltaX).to.equal('0')
        expect(seller5SellY_1.deltaY).to.equal(sellY5)

        // first, collect 5
        const collet5_1_1 = await collectLimOrderWithSwap(
            seller5,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collet5_1_1.ok).to.equal(true)
        expect(collet5_1_1.deltaX).to.equal('0')
        expect(collet5_1_1.deltaY).to.equal('0')
        const collet5_1_2 = await cancelLimOrderWithSwap(
            seller5,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collet5_1_2.ok).to.equal(true)
        expect(collet5_1_2.deltaX).to.equal('0')
        expect(collet5_1_2.deltaY).to.equal(sellY5)

        const totSellingYAt5050 = getSum([sellY1, sellY2, sellY3, sellY4])

        const sqrtPriceAt5050 = (await logPowMath.getSqrtPrice(5050)).toString()
        const seller1EarnPhase1 = getEarnXFromYAt(sqrtPriceAt5050, sellY1)
        const seller1SoldPhase1 = sellY1
        const seller2EarnPhase1 = getEarnXFromYAt(sqrtPriceAt5050, sellY2)
        const seller2SoldPhase1 = sellY2
        const seller3EarnPhase1 = stringMinus(costXAt5050, stringAdd(seller1EarnPhase1, seller2EarnPhase1))
        const seller3SoldPhase1 = getCostYFromXAt(sqrtPriceAt5050, seller3EarnPhase1)

        // collect 1
        const collect1_1_1 = await collectLimOrderWithSwap(
            seller1,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect1_1_1.ok).to.equal(true)
        expect(collect1_1_1.deltaX).to.equal(seller1EarnPhase1)
        expect(collect1_1_1.deltaY).to.equal('0')

        const limitOrder1 = await getLimorderFromManager(seller1.address, '0', limorderWithSwapManager)

        expect(limitOrder1.pt).to.equal(5050)
        expect(limitOrder1.initSellingAmount).to.equal(sellY1)
        expect(limitOrder1.sellingRemain).to.equal('0')
        expect(limitOrder1.lastAccEarn).to.equal(costXAt5050)
        expect(limitOrder1.sellXEarnY).to.equal(false)
        expect(limitOrder1.earn).to.equal(seller1EarnPhase1)
        expect(limitOrder1.active).to.equal(false)

        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: stringMinus(costXAt5050, seller1EarnPhase1),
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)),
            sellingDesc: '0',
            lastAccEarn: costXAt5050
        });

        const collect1_1_2 = await collectLimOrderWithSwap(
            seller1,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect1_1_2.ok).to.equal(false)
        expect(collect1_1_2.deltaX).to.equal('0')
        expect(collect1_1_2.deltaY).to.equal('0')
        const collect1_1_3 = await cancelLimOrderWithSwap(
            seller1,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect1_1_3.ok).to.equal(false)
        expect(collect1_1_3.deltaX).to.equal('0')
        expect(collect1_1_3.deltaY).to.equal('0')


        const collect2_1_1 = await cancelLimOrderWithSwap(
            seller2,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect2_1_1.ok).to.equal(true)
        expect(collect2_1_1.deltaX).to.equal(seller2EarnPhase1)
        expect(collect2_1_1.deltaY).to.equal('0')

        const limitOrder2 = await getLimorderFromManager(seller2.address, '0', limorderWithSwapManager)

        expect(limitOrder2.pt).to.equal(5050)
        expect(limitOrder2.initSellingAmount).to.equal(sellY2)
        expect(limitOrder2.sellingRemain).to.equal('0')
        expect(limitOrder2.lastAccEarn).to.equal(costXAt5050)
        expect(limitOrder2.sellXEarnY).to.equal(false)
        expect(limitOrder2.earn).to.equal(seller2EarnPhase1)
        expect(limitOrder2.active).to.equal(false)

        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: stringMinus(costXAt5050, getSum([seller1EarnPhase1, seller2EarnPhase1])),
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)),
            sellingDesc: '0',
            lastAccEarn: costXAt5050
        });

        // collect 2
        const collect2_1_2 = await collectLimOrderWithSwap(
            seller2,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect2_1_2.ok).to.equal(false)
        expect(collect2_1_2.deltaX).to.equal('0')
        expect(collect2_1_2.deltaY).to.equal('0')
        const collect2_1_3 = await cancelLimOrderWithSwap(
            seller2,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect2_1_3.ok).to.equal(false)
        expect(collect2_1_3.deltaX).to.equal('0')
        expect(collect2_1_3.deltaY).to.equal('0')
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: stringMinus(costXAt5050, getSum([seller1EarnPhase1, seller2EarnPhase1])),
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)),
            sellingDesc: '0',
            lastAccEarn: costXAt5050
        });

        // collect 3
        const collect3_1_1 = await collectLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_1_1.ok).to.equal(true)
        expect(collect3_1_1.deltaX).to.equal(seller3EarnPhase1)
        expect(collect3_1_1.deltaY).to.equal('0')
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: '0',
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)),
            sellingDesc: '0',
            lastAccEarn: costXAt5050
        });

        const limitOrder3 = await getLimorderFromManager(seller3.address, '0', limorderWithSwapManager)

        expect(limitOrder3.pt).to.equal(5050)
        expect(limitOrder3.initSellingAmount).to.equal(sellY3)
        expect(limitOrder3.sellingRemain).to.equal(stringMinus(sellY3, seller3SoldPhase1))
        expect(limitOrder3.lastAccEarn).to.equal(costXAt5050)
        expect(limitOrder3.sellXEarnY).to.equal(false)
        expect(limitOrder3.earn).to.equal(seller3EarnPhase1)
        expect(limitOrder3.active).to.equal(true)

        const costXAt5050_phase2_1 = getCostXFromYAt(sqrtPriceAt5050, stringDiv(sellY3, '200'))
        const costXAt5050_phase2_2 = getCostXFromYAt(sqrtPriceAt5050, stringDiv(sellY3, '300'))

        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costXAt5050_phase2_1),
                boundaryPt: 5050,
                maxPayed: amountAddFee(costXAt5050_phase2_1),
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );
        
        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costXAt5050_phase2_2),
                boundaryPt: 5050,
                maxPayed: amountAddFee(costXAt5050_phase2_2),
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );
        // seller5 add after swap again
        const seller5SellY_2 = await newLimOrderWithSwap(
            0,
            tokenX,
            tokenY,
            seller5,
            limorderWithSwapManager,
            sellY5,
            5050,
            false
        )

        
        expect(seller5SellY_2.ok).to.equal(true)
        expect(seller5SellY_2.deltaX).to.equal('0')
        expect(seller5SellY_2.deltaY).to.equal(sellY5)

        // cancel 5
        const collet5_2_1 = await cancelLimOrderWithSwap(
            seller5,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collet5_2_1.ok).to.equal(true)
        expect(collet5_2_1.deltaX).to.equal('0')
        expect(collet5_2_1.deltaY).to.equal(sellY5)
        const collet5_2_2 = await collectLimOrderWithSwap(
            seller5,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collet5_2_2.ok).to.equal(false)
        expect(collet5_2_2.deltaX).to.equal('0')
        expect(collet5_2_2.deltaY).to.equal('0')
        const collet5_2_3 = await cancelLimOrderWithSwap(
            seller5,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collet5_2_3.ok).to.equal(false)
        expect(collet5_2_3.deltaX).to.equal('0')
        expect(collet5_2_3.deltaY).to.equal('0')

        const seller3EarnPhase2 = stringAdd(costXAt5050_phase2_1, costXAt5050_phase2_2)

        const accEarnPhase2 = stringAdd(costXAt5050, seller3EarnPhase2)

        // collect 3
        const collect3_2_1 = await collectLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_2_1.ok).to.equal(true)
        expect(collect3_2_1.deltaX).to.equal(seller3EarnPhase2)
        expect(collect3_2_1.deltaY).to.equal('0')

        const collect3_2_2 = await collectLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_2_2.ok).to.equal(true)
        expect(collect3_2_2.deltaX).to.equal('0')
        expect(collect3_2_2.deltaY).to.equal('0')

        const soldPhase1 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), costXAt5050)
        const soldPhase2 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), seller3EarnPhase2)
        const seller3SoldPhase2 = soldPhase2
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: '0',
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getSum([soldPhase1, soldPhase2])),
            sellingDesc: '0',
            lastAccEarn: accEarnPhase2
        });

        const limitOrder3_2 = await getLimorderFromManager(seller3.address, '0', limorderWithSwapManager)

        expect(limitOrder3_2.pt).to.equal(5050)
        expect(limitOrder3_2.initSellingAmount).to.equal(sellY3)
        expect(limitOrder3_2.sellingRemain).to.equal(stringMinus(sellY3, getSum([seller3SoldPhase1, seller3SoldPhase2])))
        expect(limitOrder3_2.lastAccEarn).to.equal(accEarnPhase2)
        expect(limitOrder3_2.sellXEarnY).to.equal(false)
        expect(limitOrder3_2.earn).to.equal(stringAdd(seller3EarnPhase1, seller3EarnPhase2))
        expect(limitOrder3_2.active).to.equal(true)

        
        const costXAt5050_phase3 = getCostXFromYAt(sqrtPriceAt5050, stringDiv(sellY3, '1000'))

        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costXAt5050_phase3),
                boundaryPt: 5050,
                maxPayed: amountAddFee(costXAt5050_phase3),
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );
        const seller3EarnPhase3 = costXAt5050_phase3
        const seller3SoldPhase3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), seller3EarnPhase3)
        const soldPhase3 = seller3SoldPhase3
        const accEarnPhase3 = stringAdd(accEarnPhase2, seller3EarnPhase3)
        const seller3SellingRemain = stringMinus(
            sellY3,
            getSum([seller3SoldPhase1, seller3SoldPhase2, seller3SoldPhase3])
        )
        // collect 3
        const collect3_3_1 = await cancelLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_3_1.ok).to.equal(true)
        expect(collect3_3_1.deltaX).to.equal(costXAt5050_phase3)
        expect(collect3_3_1.deltaY).to.equal(seller3SellingRemain)

        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: '0',
            earnAssign: '0',
            sellingRemain: stringMinus(totSellingYAt5050, getSum([soldPhase1, soldPhase2, soldPhase3, seller3SellingRemain])),
            sellingDesc: '0',
            lastAccEarn: accEarnPhase3
        });
        const limitOrder3_3 = await getLimorderFromManager(seller3.address, '0', limorderWithSwapManager)

        expect(limitOrder3_3.pt).to.equal(5050)
        expect(limitOrder3_3.initSellingAmount).to.equal(sellY3)
        // selling remain will not clear
        expect(limitOrder3_3.sellingRemain).to.equal(stringMinus(sellY3, getSum([seller3SoldPhase1, seller3SoldPhase2, seller3SoldPhase3])))
        expect(limitOrder3_3.lastAccEarn).to.equal(accEarnPhase3)
        expect(limitOrder3_3.sellXEarnY).to.equal(false)
        expect(limitOrder3_3.earn).to.equal(getSum([seller3EarnPhase1, seller3EarnPhase2, seller3EarnPhase3]))
        // active is false
        expect(limitOrder3_3.active).to.equal(false)

        // collect 3 after cancel
        const collect3_3_2 = await collectLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_3_2.ok).to.equal(false)
        expect(collect3_3_2.deltaX).to.equal('0')
        expect(collect3_3_2.deltaY).to.equal('0')
        const collect3_3_3 = await cancelLimOrderWithSwap(
            seller3,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect3_3_3.ok).to.equal(false)
        expect(collect3_3_3.deltaX).to.equal('0')
        expect(collect3_3_3.deltaY).to.equal('0')


        // collect 4
        const collect4_3_1 = await collectLimOrderWithSwap(
            seller4,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect4_3_1.ok).to.equal(true)
        expect(collect4_3_1.deltaX).to.equal('0')
        expect(collect4_3_1.deltaY).to.equal('0')
        
        const collect4_3_2 = await cancelLimOrderWithSwap(
            seller4,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect4_3_2.ok).to.equal(true)
        expect(collect4_3_2.deltaX).to.equal('0')
        expect(collect4_3_2.deltaY).to.equal(sellY4)

        const collect4_3_3 = await collectLimOrderWithSwap(
            seller4,
            tokenX,
            tokenY,
            '0',
            limorderWithSwapManager
        )
        expect(collect4_3_3.ok).to.equal(false)
        expect(collect4_3_3.deltaX).to.equal('0')
        expect(collect4_3_3.deltaY).to.equal('0')
    });
});