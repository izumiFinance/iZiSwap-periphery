const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { sign } = require("crypto");
const { getPoolParts, getIzumiswapFactory, newLimOrderSoloWithX, newLimOrderSoloWithY, addLimOrderSolo, decLimOrderWithX, checkArrEqual, stringMinus, stringAdd, decLimOrderWithY } = require("../funcs.js")

async function getToken(decimalx, decimaly) {

    // deploy token
    const tokenFactory = await ethers.getContractFactory("TestToken")
    tokenX = await tokenFactory.deploy('a', 'a', decimalx);
    await tokenX.deployed();
    tokenY = await tokenFactory.deploy('b', 'b', decimaly);
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

async function collectLimOrder(limorderManager, tokenX, tokenY, seller, orderIdx) {
    const xBefore = (await tokenX.balanceOf(seller.address)).toString()
    const yBefore = (await tokenY.balanceOf(seller.address)).toString()
    try {

        await limorderManager.connect(seller).collectLimOrder(
            seller.address,
            orderIdx
        );
    } catch {

    }
    const xAfter = (await tokenX.balanceOf(seller.address)).toString()
    const yAfter = (await tokenY.balanceOf(seller.address)).toString()
    const amountX = stringMinus(xAfter, xBefore)
    const amountY = stringMinus(yAfter, yBefore)
    return {amountX, amountY}
}

function blockNum2BigNumber(num) {
    var b = BigNumber(num);
    return b;
}
async function checkLimOrder(sellId, limorderManager, limorderExpect) {
    limorder = await getLimorder(sellId, limorderManager);
    expect(limorder.sellingRemain.toFixed(0)).to.equal(limorderExpect.sellingRemain.toFixed(0));
    expect(limorder.sellingDesc.toFixed(0)).to.equal(limorderExpect.sellingDesc.toFixed(0));
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
    var WETH9Json = getContractJson(__dirname + '/../core/WETH9.json');
    var WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode, signer);
    var WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}
async function getNFTLiquidityManager(factory, weth) {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("LiquidityManager");
    var nflm = await NonfungibleLiquidityManager.deploy(factory.address, weth.address);
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

async function getLimitOrderManagerSoloFactory(factory, weth) {
    const LimitOrderManagerSoloFactory = await ethers.getContractFactory('LimitOrderManagerSoloFactory')
    var limitOrderManagerFactory = await LimitOrderManagerSoloFactory.deploy(factory.address, weth.address)
    await limitOrderManagerFactory.deployed();
    return limitOrderManagerFactory;
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
        //lastAccEarn: lastAccEarn.toString(),
        //sellingRemain: sellingRemain.toString(),
        //sellingDesc: sellingDesc.toString(),
        earn: earn.toString(),
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
async function getLimOrder(limitOrderManagerSolo, orderIdx) {

    try {
        const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, sellXEarnY} = await limitOrderManagerSolo.getActiveOrder(orderIdx);
        return {
            pt, 
            amount: amount.toString(), 
            sellingRemain: sellingRemain.toString(), 
            accSellingDec: accSellingDec.toString(), 
            sellingDec: sellingDec.toString(), 
            earn: earn.toString(), 
            sellXEarnY
        }
    } catch (err) {
        // console.log(err);
    }
    return undefined;
}

function translateLimOrder(limOrder) {
    return {
        pt: limOrder.pt,
        amount: limOrder.amount.toString(),
        sellingRemain: limOrder.sellingRemain.toString(),
        accSellingDec: limOrder.accSellingDec.toString(),
        sellingDec: limOrder.sellingDec.toString(),
        earn: limOrder.earn.toString(),
        active: limOrder.active,
        sellXEarnY: limOrder.sellXEarnY
    }
}

describe("limordermanagersolo slot idx", function () {
    var signer, seller1, seller2;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var managerAddr1, managerAddr2;
    var limitOrderManager1, limitOrderManager2;
    var limitOrderManagerSoloFactory;
    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, seller1, seller2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);

        swap = await getSwap(izumiswapFactory, weth9);
        limitOrderManagerSoloFactory = await getLimitOrderManagerSoloFactory(izumiswapFactory, weth9);

        await limitOrderManagerSoloFactory.connect(seller1).createManager();
        await limitOrderManagerSoloFactory.connect(seller2).createManager();
        managerAddr1 = await limitOrderManagerSoloFactory.limitOrderManager(seller1.address);
        managerAddr2 = await limitOrderManagerSoloFactory.limitOrderManager(seller2.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManager1 = LimitOrderManagerSolo.attach(managerAddr1);
        limitOrderManager2 = LimitOrderManagerSolo.attach(managerAddr2);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, -350000);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'
        await tokenX.mint(seller1.address, aBigNumber);
        await tokenX.mint(seller2.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.mint(seller1.address, aBigNumber);
        await tokenY.mint(seller2.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
    });

    
    it("check single slot and seller", async function() {
        sellX1 = "1000000000"
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -230200);
        let limorder1 = await getLimOrder(limitOrderManager1, 0)
        // try to get data of other's manager
        let limorder1_2 = await getLimOrder(limitOrderManager2, 0)

        expect(limorder1.sellingRemain).to.equal("1000000000")
        expect(limorder1_2).to.equal(undefined)

        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("2000000000")

        // other try to operate
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller2, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("2000000000")

        // try to create at another slot
        // but add to slot 0
        await newLimOrderSoloWithX(2, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("3000000000")
        let limorder2 = await getLimOrder(limitOrderManager1, 1)
        expect(limorder2).to.equal(undefined)
        let limorder3 = await getLimOrder(limitOrderManager1, 2)
        expect(limorder3).to.equal(undefined)

        await addLimOrderSolo(0, seller1, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("4000000000")

        await addLimOrderSolo(0, seller1, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("5000000000")

        // other try to operate
        await addLimOrderSolo(0, seller2, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("5000000000")

        // add to an inactive slot
        const ok6 = await addLimOrderSolo(1, seller1, limitOrderManager1, sellX1, -230200);
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(ok6).to.equal(false)
        expect(limorder1.sellingRemain).to.equal("5000000000")
        limorder2 = await getLimOrder(limitOrderManager1, 1)
        expect(limorder2).to.equal(undefined)
        limorder3 = await getLimOrder(limitOrderManager1, 2)
        expect(limorder3).to.equal(undefined)

        let {activeIdx: activeIdx1, activeLimitOrder: orders1} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1 = activeIdx1.map((e)=>e.toString());
        checkArrEqual(activeIdx1, ['0'])
        expect(orders1.length).to.equal(1)
        expect(orders1[0].sellingRemain).to.equal("5000000000")
        expect(orders1[0].earn).to.equal("0")
        expect(orders1[0].sellingDec).to.equal("0")
        // expect(activeIdx1).to.equal(['0'])

        // check other try to operator
        const okDec2 = await decLimOrderWithX(seller2, 0, limitOrderManager1, "50000000000000000");
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(okDec2).to.equal(false)
        expect(limorder1.sellingRemain).to.equal("5000000000")

        await decLimOrderWithX(seller1, 0, limitOrderManager1, "50000000000000000");
        limorder1 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1.sellingRemain).to.equal("0")
        expect(limorder1.sellingDec).to.equal("5000000000");

        let {activeIdx: activeIdx2, activeLimitOrder: orders2} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx2 = activeIdx2.map((e)=>e.toString());
        checkArrEqual(activeIdx2, ['0'])
        expect(orders2.length).to.equal(1)
        expect(orders2[0].sellingRemain).to.equal("0")
        expect(orders2[0].earn).to.equal("0")
        expect(orders2[0].sellingDec).to.equal("5000000000")

        // try to get data of other's manager
        limorder1_2 = await getLimOrder(limitOrderManager2, 0)
        expect(limorder1_2).to.equal(undefined)

        // other try to collect but fail
        const collect2 = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller2, 0);
        expect(collect2.amountX).to.equal('0')
        expect(collect2.amountY).to.equal('0')

        let {activeIdx: activeIdx3, activeLimitOrder: orders3} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx3 = activeIdx3.map((e)=>e.toString());
        checkArrEqual(activeIdx3, ['0'])
        expect(orders3.length).to.equal(1)
        expect(orders3[0].sellingRemain).to.equal("0")
        expect(orders3[0].earn).to.equal("0")
        expect(orders3[0].sellingDec).to.equal("5000000000")

        // owner try to collect and succeed
        const collect1 = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0);
        expect(collect1.amountX).to.equal('5000000000')
        expect(collect1.amountY).to.equal('0')

        let {activeIdx: activeIdx4, activeLimitOrder: orders4} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        
        expect(activeIdx4.length).to.equal(0)
        expect(orders4.length).to.equal(0)

    });


    it("check x and y map and active order data", async function() {
        const sell = '1000000000'
        const sell2 = '2000000000'
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sell, -270000);
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller1, limitOrderManager1, sell, -271000);
        await newLimOrderSoloWithX(2, tokenX, tokenY, seller1, limitOrderManager1, sell, -272000);
        await newLimOrderSoloWithX(3, tokenX, tokenY, seller1, limitOrderManager1, sell, -273000);
        await newLimOrderSoloWithX(4, tokenX, tokenY, seller1, limitOrderManager1, sell, -274000);
        await newLimOrderSoloWithX(5, tokenX, tokenY, seller1, limitOrderManager1, sell, -275000);
        let {activeIdx: activeIdx1_1, activeLimitOrder: orders1_1} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_1 = activeIdx1_1.map(e=>e.toString())
        checkArrEqual(activeIdx1_1, ['0', '1', '2', '3', '4', '5'])
        for (let i = 0; i < 6; i ++) {
            expect(orders1_1[i].sellingRemain).to.equal(sell)
            expect(orders1_1[i].earn).to.equal('0')
            expect(orders1_1[i].sellingDec).to.equal('0')
            expect(orders1_1[i].sellXEarnY).to.equal(true)
        }

        await newLimOrderSoloWithY(6, tokenX, tokenY, seller1, limitOrderManager1, sell, -370000);
        await newLimOrderSoloWithY(7, tokenX, tokenY, seller1, limitOrderManager1, sell, -371000);
        await newLimOrderSoloWithY(8, tokenX, tokenY, seller1, limitOrderManager1, sell, -372000);
        await newLimOrderSoloWithY(9, tokenX, tokenY, seller1, limitOrderManager1, sell, -373000);
        await newLimOrderSoloWithY(10, tokenX, tokenY, seller1, limitOrderManager1, sell, -374000);
        await newLimOrderSoloWithY(11, tokenX, tokenY, seller1, limitOrderManager1, sell, -375000);
        let {activeIdx: activeIdx1_2, activeLimitOrder: orders1_2} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));

        activeIdx1_2 = activeIdx1_2.map(e=>e.toString())
        checkArrEqual(activeIdx1_2, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
        for (let i = 0; i < 6; i ++) {
            expect(orders1_2[i].sellingRemain).to.equal(sell)
            expect(orders1_2[i].earn).to.equal('0')
            expect(orders1_2[i].sellingDec).to.equal('0')
            expect(orders1_2[i].sellXEarnY).to.equal(true)
        }
        for (let i = 6; i < 12; i ++) {
            expect(orders1_2[i].sellingRemain).to.equal(sell)
            expect(orders1_2[i].earn).to.equal('0')
            expect(orders1_2[i].sellingDec).to.equal('0')
            expect(orders1_2[i].sellXEarnY).to.equal(false)
        }

        // try to deactive 3 and 9
        // try to dec 2 and 8
        await decLimOrderWithX(seller1, 3, limitOrderManager1, aBigNumber)
        await decLimOrderWithY(seller1, 9, limitOrderManager1, aBigNumber)
        await decLimOrderWithX(seller1, 2, limitOrderManager1, aBigNumber)
        await decLimOrderWithY(seller1, 8, limitOrderManager1, aBigNumber)
        await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 3)
        await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 9)
        let {activeIdx: activeIdx1_3, activeLimitOrder: orders1_3} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));

        activeIdx1_3 = activeIdx1_3.map(e=>e.toString())
        checkArrEqual(activeIdx1_3, ['0', '1', '2', '4', '5', '6', '7', '8', '10', '11'])
        for (let i = 0; i < 10; i ++) {
            const isSellX = Number(activeIdx1_3[i]) < 6
            const isDec = activeIdx1_3[i] === '2' || activeIdx1_3[i] === '8'
            if (isDec) {
                expect(orders1_3[i].sellingRemain).to.equal('0')
                expect(orders1_3[i].earn).to.equal('0')
                expect(orders1_3[i].sellingDec).to.equal(sell)
                expect(orders1_3[i].sellXEarnY).to.equal(isSellX)
            } else {
                expect(orders1_3[i].sellingRemain).to.equal(sell)
                expect(orders1_3[i].earn).to.equal('0')
                expect(orders1_3[i].sellingDec).to.equal('0')
                expect(orders1_3[i].sellXEarnY).to.equal(isSellX)
            }
        }
        let ok = await addLimOrderSolo(3, seller1, limitOrderManager1, sell)
        expect(ok).to.equal(false)
        ok = await addLimOrderSolo(9, seller1, limitOrderManager1, sell)
        expect(ok).to.equal(false)

        // try to create with same point with 0/2/3 and 6/8/9
        await newLimOrderSoloWithX(9, tokenX, tokenY, seller1, limitOrderManager1, sell, -270000);
        await newLimOrderSoloWithX(9, tokenX, tokenY, seller1, limitOrderManager1, sell, -272000);
        await newLimOrderSoloWithX(9, tokenX, tokenY, seller1, limitOrderManager1, sell, -273000);
        let sellXSet = new Set([0,1,2,4,5,9])
        let {activeIdx: activeIdx1_4, activeLimitOrder: orders1_4} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));

        activeIdx1_4 = activeIdx1_4.map(e=>e.toString())
        checkArrEqual(activeIdx1_4, ['0', '1', '2', '4', '5', '6', '7', '8', '9', '10', '11'])
        for (let i = 0; i < activeIdx1_4.length; i ++) {
            const idx = Number(activeIdx1_4[i])
            let sellingRemain = sell
            let sellingDec = '0'
            if (idx === 0) {
                sellingRemain = sell2
            }
            if (idx === 8) {
                sellingRemain = '0'
                sellingDec = sell
            }
            if (idx === 2) {
                sellingDec = sell
            }
            expect(orders1_4[i].sellingRemain).to.equal(sellingRemain)
            expect(orders1_4[i].earn).to.equal('0')
            expect(orders1_4[i].sellingDec).to.equal(sellingDec)
            expect(orders1_4[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }


        // try to create with same point with 0/2/3 and 6/8/9
        await newLimOrderSoloWithY(3, tokenX, tokenY, seller1, limitOrderManager1, sell, -370000);
        await newLimOrderSoloWithY(3, tokenX, tokenY, seller1, limitOrderManager1, sell, -372000);
        await addLimOrderSolo(8, seller1, limitOrderManager1, sell);
        await newLimOrderSoloWithY(3, tokenX, tokenY, seller1, limitOrderManager1, sell, -373000);
    
        sellXSet = new Set([0,1,2,4,5,9])
        let {activeIdx: activeIdx1_5, activeLimitOrder: orders1_5} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));

        activeIdx1_5 = activeIdx1_5.map(e=>e.toString())
        checkArrEqual(activeIdx1_5, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
        for (let i = 0; i < activeIdx1_5.length; i ++) {
            const idx = Number(activeIdx1_5[i])
            let sellingRemain = sell
            let sellingDec = '0'
            if (idx === 0 || idx === 6) {
                sellingRemain = sell2
            }
            if (idx === 8) {
                sellingRemain = sell2
                sellingDec = sell
            }
            if (idx === 2) {
                sellingDec = sell
            }
            expect(orders1_5[i].sellingRemain).to.equal(sellingRemain)
            expect(orders1_5[i].earn).to.equal('0')
            expect(orders1_5[i].sellingDec).to.equal(sellingDec)
            expect(orders1_5[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }
        // test add to exist active slot
        await addLimOrderSolo(1, seller1, limitOrderManager1, sell);
        await addLimOrderSolo(9, seller1, limitOrderManager1, sell);
        // fail to add outside slot
        ok = await addLimOrderSolo(12, seller1, limitOrderManager1, sell);
        expect(ok).to.equal(false)
        let {activeIdx: activeIdx1_6, activeLimitOrder: orders1_6} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));

        activeIdx1_6 = activeIdx1_6.map(e=>e.toString())
        checkArrEqual(activeIdx1_6, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
        for (let i = 0; i < activeIdx1_6.length; i ++) {
            const idx = Number(activeIdx1_6[i])
            let sellingRemain = sell
            let sellingDec = '0'
            if (idx === 0 || idx === 6) {
                sellingRemain = sell2
            }
            if (idx === 8) {
                sellingRemain = sell2
                sellingDec = sell
            }
            if (idx === 2) {
                sellingDec = sell
            }
            if (idx === 1 || idx === 9) {
                sellingRemain = sell2
            }
            expect(orders1_6[i].sellingRemain).to.equal(sellingRemain)
            expect(orders1_6[i].earn).to.equal('0')
            expect(orders1_6[i].sellingDec).to.equal(sellingDec)
            expect(orders1_6[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }
    });

    it("check multi slot and multi seller", async function() {
        const sellX1 = "1000000000";
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -210000);
        const limorder1_0 = await getLimOrder(limitOrderManager1, 0)
        expect(limorder1_0.sellingRemain).to.equal(sellX1)
        
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -211000);
        const limorder1_1 = await getLimOrder(limitOrderManager1, 1)
        expect(limorder1_1.sellingRemain).to.equal(sellX1)

        await newLimOrderSoloWithX(0, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -310000);
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -311000);
        await newLimOrderSoloWithX(2, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -312000);        

        await newLimOrderSoloWithX(2, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -212000);

        await newLimOrderSoloWithX(3, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -213000);

        await newLimOrderSoloWithX(4, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -214000);

        await newLimOrderSoloWithX(5, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -215000);
        await newLimOrderSoloWithX(6, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -216000);

        await newLimOrderSoloWithX(3, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -313000);
        await newLimOrderSoloWithX(4, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -314000);
        await newLimOrderSoloWithX(5, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -315000);
        await newLimOrderSoloWithX(6, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -316000);
        await newLimOrderSoloWithX(7, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -317000);

        await newLimOrderSoloWithX(7, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -217000);
        await newLimOrderSoloWithX(8, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -218000);

        await decLimOrderWithX(seller1, 5, limitOrderManager1, "500000000000");
        await decLimOrderWithX(seller1, 2, limitOrderManager1, "500000000000");
        await decLimOrderWithX(seller2, 2, limitOrderManager2, "500000000000");
        await decLimOrderWithX(seller2, 6, limitOrderManager2, "500000000000");

        let {activeIdx: activeIdx1_1} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_1 = activeIdx1_1.map((e)=>e.toString());
        checkArrEqual(activeIdx1_1, ['0', '1', '2', '3', '4', '5', '6', '7', '8'])

        let collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 5);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        let {activeIdx: activeIdx1_2} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_2 = activeIdx1_2.map((e)=>e.toString());
        checkArrEqual(activeIdx1_2, ['0', '1', '2', '3', '4', '6', '7', '8'])

        collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 2);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        let {activeIdx: activeIdx1_3} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_3 = activeIdx1_3.map((e)=>e.toString());
        checkArrEqual(activeIdx1_3, ['0', '1', '3', '4', '6', '7', '8'])

        let deactiveLimitOrder = await limitOrderManager1.getDeactiveOrders();
        deactiveLimitOrder = deactiveLimitOrder.map((e)=>translateLimOrder(e));
        expect(deactiveLimitOrder.length).to.equal(2)
        expect(deactiveLimitOrder[0].sellingRemain).to.equal('0')
        expect(deactiveLimitOrder[0].sellingDec).to.equal('0')
        expect(deactiveLimitOrder[0].earn).to.equal('0')
        expect(deactiveLimitOrder[1].sellingRemain).to.equal('0')
        expect(deactiveLimitOrder[0].sellingDec).to.equal('0')
        expect(deactiveLimitOrder[1].earn).to.equal('0')


        await collectLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 6);
        await decLimOrderWithX(seller2, 7, limitOrderManager2, "500000000000");
        await collectLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 7);
        await decLimOrderWithX(seller2, 4, limitOrderManager2, "500000000000");
        await collectLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 4);

        let {activeIdx: activeIdx2_1} = await limitOrderManager2.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx2_1 = activeIdx2_1.map((e)=>e.toString());
        checkArrEqual(activeIdx2_1, ['0', '1', '2', '3', '5'])

        await newLimOrderSoloWithX(2, tokenX, tokenY, seller1, limitOrderManager1, stringAdd(sellX1, sellX1), -232000);
        let limorder = await getLimOrder(limitOrderManager1, 2)
        expect(limorder.sellingRemain).to.equal(stringAdd(sellX1, sellX1))

        let {activeIdx: activeIdx1_4} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_4 = activeIdx1_4.map((e)=>e.toString());
        checkArrEqual(activeIdx1_4, ['0', '1', '2', '3', '4', '6', '7', '8'])


        await decLimOrderWithX(seller1, 3, limitOrderManager1, "500000000000");
        await decLimOrderWithX(seller1, 0, limitOrderManager1, "500000000000");
        await decLimOrderWithX(seller1, 6, limitOrderManager1, "500000000000");
        collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 6);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        await newLimOrderSoloWithX(6, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -246000);
        limorder = await getLimOrder(limitOrderManager1, 6)
        expect(limorder.sellingRemain).to.equal(sellX1)

        let {activeIdx: activeIdx1_5} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_5 = activeIdx1_5.map((e)=>e.toString());
        checkArrEqual(activeIdx1_5, ['0', '1', '2', '3', '4', '6', '7', '8'])


        await decLimOrderWithX(seller1, 8, limitOrderManager1, "500000000000");
        collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 8);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        let {activeIdx: activeIdx1_6} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_6 = activeIdx1_6.map((e)=>e.toString());
        checkArrEqual(activeIdx1_6, ['0', '1', '2', '3', '4', '6', '7'])

        await newLimOrderSoloWithX(8, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -258000);
        let {activeIdx: activeIdx1_7} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_7 = activeIdx1_7.map((e)=>e.toString());
        checkArrEqual(activeIdx1_7, ['0', '1', '2', '3', '4', '6', '7', '8'])


        await newLimOrderSoloWithX(9, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -269000);
        await newLimOrderSoloWithX(6, tokenX, tokenY, seller2, limitOrderManager2, sellX1, -366000);
        let {activeIdx: activeIdx1_8} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_8 = activeIdx1_8.map((e)=>e.toString());
        checkArrEqual(activeIdx1_8, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])
        
        // new a limit order replicated to slot 0, but try to create it at slot 10
        await newLimOrderSoloWithX(10, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -210000);
        // so the amount is added to limit order at slot 0
        limorder = await getLimOrder(limitOrderManager1, 0)
        expect(limorder.sellingRemain).to.equal(sellX1)
        expect(limorder.sellingDec).to.equal(sellX1)

        let {activeIdx: activeIdx1_9} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_9 = activeIdx1_9.map((e)=>e.toString());
        checkArrEqual(activeIdx1_9, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])
        
        // collect from slot 0
        collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        let {activeIdx: activeIdx1_10} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_10 = activeIdx1_10.map((e)=>e.toString());
        checkArrEqual(activeIdx1_10, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])

        await decLimOrderWithX(seller1, 0, limitOrderManager1, "500000000000");

        let {activeIdx: activeIdx1_11} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_11 = activeIdx1_11.map((e)=>e.toString());
        checkArrEqual(activeIdx1_11, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])

        collect = await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0);
        expect(collect.amountX).to.equal(sellX1)
        expect(collect.amountY).to.equal('0')

        let {activeIdx: activeIdx1_12} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_12 = activeIdx1_12.map((e)=>e.toString());
        checkArrEqual(activeIdx1_12, ['1', '2', '3', '4', '6', '7', '8', '9'])
        // create a new limit order at slot 0
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -270000);
        let {activeIdx: activeIdx1_13} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_13 = activeIdx1_13.map((e)=>e.toString());
        checkArrEqual(activeIdx1_13, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])

        await decLimOrderWithX(seller1, 8, limitOrderManager1, "500000000000");
        await collectLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 8);
        await newLimOrderSoloWithX(8, tokenX, tokenY, seller1, limitOrderManager1, sellX1, -288000);
        limorder = await getLimOrder(limitOrderManager1, 8)
        expect(limorder.sellingRemain).to.equal(sellX1)
        expect(limorder.sellingDec).to.equal('0')

        let {activeIdx: activeIdx1_14} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1_14 = activeIdx1_14.map((e)=>e.toString());
        checkArrEqual(activeIdx1_14, ['0', '1', '2', '3', '4', '6', '7', '8', '9'])

        deactiveLimitOrder = await limitOrderManager1.getDeactiveOrders();
        deactiveLimitOrder = deactiveLimitOrder.map((e)=>translateLimOrder(e));
        expect(deactiveLimitOrder.length).to.equal(6)
        deactiveSlot1 = (await limitOrderManager1.getDeactiveSlot()).toString()
        expect(deactiveSlot1).to.equal('5')
        // console.log('deactive LimitOrder8: ', deactiveLimitOrder8)

        // let deactiveLimitOrder8_2 = await limorderManager.getDeactiveOrders(seller2.address);
        // deactiveLimitOrder8_2 = deactiveLimitOrder8_2.map((e)=>translateLimOrder(e));
        // console.log('deactive LimitOrder 8_2: ', deactiveLimitOrder8_2)
    });
});