const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderWithSwap, 
    collectLimOrderWithSwap, 
    cancelLimOrderWithSwap, 
    getRevertString,
    getCostYFromXAt, 
    getEarnXFromYAt, 
    getEarnYFromXAt, 
    getSum,
    getCostXFromYAt,
    stringDiv,
    stringAdd,
    stringMinus,
    stringMul,
    ceil,
    floor,
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

async function setPauseValue(operator, limorderWithSwapManager, value) {
    let ok = true;
    let error = undefined
    try {
    await limorderWithSwapManager.connect(operator).setPause(value);
    } catch (err) {
        error = err
        ok = false
    }
    return {ok, error};
}

function blockNum2BigNumber(num) {
    var b = BigNumber(num);
    return b;
}
async function getLimorder(userAddress, orderIdx, limorderWithSwapManager) {
     const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY} = await limorderWithSwapManager.getActiveOrder(userAddress, orderIdx);
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
async function checkLimOrder(userAddress, orderIdx, limorderWithSwapManager, limorderExpect) {
    limorder = await getLimorder(userAddress, orderIdx, limorderWithSwapManager);
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
    const LimorderManager = await ethers.getContractFactory("LimitOrderWithSwapManager");
    var limorderWithSwapManager = await LimorderManager.deploy(factory.address, weth.address);
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
async function checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    earnY = await getCoreEarnY(viewLimorder, pool, limorderWithSwapManager.address, pt);
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

async function checkPaused(limorderWithSwapManager, value) {

    const pause = await limorderWithSwapManager.pause();
    expect(value).to.equal(pause)

}

function amountAddFee(amount) {
    return ceil(new BigNumber(amount).times(1000).div(997));
}
describe("limorderWithSwapSwitch", function () {
    var signer, seller1, seller2, seller3, trader, fakeOwner;
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
        [signer, seller1, seller2, seller3, trader, fakeOwner, recipient1, recipient2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderWithSwapManager = await getLimorderWithSwapManager(izumiswapFactory, weth9);
        viewLimorder = await getViewLimorder(izumiswapFactory);

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();
        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        const aBigNumebr = '10000000000000000000'
        await tokenY.transfer(trader.address, aBigNumebr);
        await tokenY.connect(trader).approve(swap.address, aBigNumebr);
        await tokenX.transfer(trader.address, aBigNumebr);
        await tokenX.connect(trader).approve(swap.address, aBigNumebr);

        await tokenY.transfer(seller1.address, aBigNumebr);
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigNumebr);
        await tokenX.transfer(seller1.address, aBigNumebr);
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigNumebr);

        await tokenY.transfer(seller2.address, aBigNumebr);
        await tokenY.connect(seller2).approve(limorderWithSwapManager.address, aBigNumebr);
        await tokenX.transfer(seller2.address, aBigNumebr);
        await tokenX.connect(seller2).approve(limorderWithSwapManager.address, aBigNumebr);
    });


    it("paused", async function() {
        await checkPaused(limorderWithSwapManager, false)
        const fakeSet1 = await setPauseValue(fakeOwner, limorderWithSwapManager, true)
        expect(fakeSet1.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, false)

        const sellX1 = "1000000000"
        const newOrder1 = await newLimOrderWithSwap(0, tokenX, tokenY, seller1, limorderWithSwapManager, sellX1, 5050, true)
        expect(newOrder1.ok).to.equal(true)

        const sellX2 = "2000000000"
        // real pause
        const ownerSet2_1 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerSet2_1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)

        const newOrder2_1 = await newLimOrderWithSwap(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2, 5050, true)
        expect(newOrder2_1.ok).to.equal(false)
        expect(getRevertString(newOrder2_1.error.toString())).to.equal("paused")

        // fake open
        const fakeSet2_2 = await setPauseValue(fakeOwner, limorderWithSwapManager, false)
        expect(fakeSet2_2.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, true)
        const newOrder2_2 = await newLimOrderWithSwap(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2, 5050, true)
        expect(newOrder2_2.ok).to.equal(false)
        expect(getRevertString(newOrder2_2.error.toString())).to.equal("paused")

        // real open
        const ownerSet2_2 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerSet2_2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const newOrder2_3 = await newLimOrderWithSwap(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2, 5050, true)
        expect(newOrder2_3.ok).to.equal(true)

        let acquireXExpect = stringAdd(sellX1, stringDiv(sellX2, 3));
        const costY = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), acquireXExpect)
        const costYAddFee = amountAddFee(costY)
        acquireXExpect = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), costY)
        const earnYS1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), sellX1)
        const earnYS2 = stringMinus(costY, earnYS1)
        const soldXS2 = getCostXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), earnYS2)
        const remainXS2 = stringMinus(sellX2, soldXS2)
        await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: costYAddFee,
                boundaryPt: 5051,
                maxPayed: costYAddFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const cancel1 = await cancelLimOrderWithSwap(seller1, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(cancel1.ok).to.equal(true)
        expect(cancel1.deltaX).to.equal('0')
        expect(cancel1.deltaY).to.equal(earnYS1)

        // real pause
        const ownerPauseBeforeUpdate1 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerPauseBeforeUpdate1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)
        const collect2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect2.ok).to.equal(false)
        expect(collect2.deltaX).to.equal('0')
        expect(collect2.deltaY).to.equal('0')
        expect(getRevertString(collect2.error.toString())).to.equal("paused")
        const cancel2 = await cancelLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(cancel2.ok).to.equal(false)
        expect(cancel2.deltaX).to.equal('0')
        expect(cancel2.deltaY).to.equal('0')
        expect(getRevertString(cancel2.error.toString())).to.equal("paused")

        // fake open
        const fakeOwnerOpenBeforeUpdate = await setPauseValue(fakeOwner, limorderWithSwapManager, true)
        expect(fakeOwnerOpenBeforeUpdate.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, true)
        const fakeOwnerOpenBeforeUpdate_2 = await setPauseValue(fakeOwner, limorderWithSwapManager, false)
        expect(fakeOwnerOpenBeforeUpdate_2.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, true)

        const collect2_2 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect2_2.ok).to.equal(false)
        expect(collect2_2.deltaX).to.equal('0')
        expect(collect2_2.deltaY).to.equal('0')
        expect(getRevertString(collect2_2.error.toString())).to.equal("paused")
        const cancel2_2 = await cancelLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(cancel2_2.ok).to.equal(false)
        expect(cancel2_2.deltaX).to.equal('0')
        expect(cancel2_2.deltaY).to.equal('0')
        expect(getRevertString(cancel2_2.error.toString())).to.equal("paused")

        // real open
        const ownerOpenBeforeUpdate1 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerOpenBeforeUpdate1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const collect2_3 = await collectLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(collect2_3.ok).to.equal(true)
        expect(collect2_3.deltaX).to.equal('0')
        expect(collect2_3.deltaY).to.equal(earnYS2)

        const cancel2_3 = await cancelLimOrderWithSwap(seller2, tokenX, tokenY, 0, limorderWithSwapManager)
        expect(cancel2_3.ok).to.equal(true)
        expect(cancel2_3.deltaX).to.equal(remainXS2)
        expect(cancel2_3.deltaY).to.equal('0')

    });
});