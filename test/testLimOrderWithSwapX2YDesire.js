const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getIzumiswapFactory, 
    collectLimOrderWithX, 
    getRevertString, 
    addLiquidity, 
    xInRange, 
    stringDiv, 
    l2x, 
    l2y,
    getSum, 
    yInRange, 
    stringMinus,
    stringAdd,
    ceil,
    floor,
    getCostXFromYAt,
    getEarnYFromXAt,
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


async function newLimOrderWithSwapWithX(slotIdx, tokenX, tokenY, seller, limorderWithSwapManager, amountX, point) {
    await tokenX.transfer(seller.address, amountX);
    await tokenX.connect(seller).approve(limorderWithSwapManager.address, amountX);
    let ok = true;
    let error = undefined
    try {
    await limorderWithSwapManager.connect(seller).newLimOrder(
        slotIdx,
        {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: point,
            isDesireMode: false,
            amount: amountX,
            swapMinAcquired: '0',
            sellXEarnY: true,
            earnWrapETH: false,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
    } catch(err) {
        error = err
        ok = false;
    }
    return {ok, error};
}


async function decLimOrderWithSwapWithX(seller, orderIdx, limorderWithSwapManager, amountX) {
    let ok = true;
    let error = undefined
    try {
    await limorderWithSwapManager.connect(seller).decLimOrder(
        orderIdx,
        amountX,
        BigNumber("10000000000").toFixed(0)
    );
    } catch (err) {
        error = err
        ok = false
    }
    return {ok, error};
}

async function updateLimOrderWithSwap(seller, orderIdx, limorderWithSwapManager) {
    let ok = true;
    let error = undefined
    try {
    await limorderWithSwapManager.connect(seller).updateOrder(
        orderIdx
    )
    } catch (err) {
        error = err
        ok = false
    }
    return {ok, error};
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
    return ceil(amount.times(1000).div(997));
}

async function newLimOrder(
    limitOrderManager, seller, idx, addLimOrderParam,
    tokenIn, tokenOut
) {
    const tokenInAmountBefore = (await tokenIn.balanceOf(seller.address)).toString()
    const tokenOutAmountBefore = (await tokenOut.balanceOf(seller.address)).toString()
    let ok = true
    let error = undefined
    try {
        await limitOrderManager.connect(seller).newLimOrder(idx, addLimOrderParam)
    } catch (err) {
        error = err
        ok = false
    }
    const tokenInAmountAfter = (await tokenIn.balanceOf(seller.address)).toString()
    const tokenOutAmountAfter = (await tokenOut.balanceOf(seller.address)).toString()

    const amountIn = stringMinus(tokenInAmountBefore, tokenInAmountAfter)
    const amountOut = stringMinus(tokenOutAmountAfter, tokenOutAmountBefore)
    return {
        ok,
        error,
        amountIn,
        amountOut
    }
}

function translateLimOrder(limOrder) {
    return {
        pt: limOrder.pt,
        initSellingAmount: limOrder.initSellingAmount.toString(),
        sellingRemain: limOrder.sellingRemain.toString(),
        earn: limOrder.earn.toString(),
        lastAccEarn: limOrder.lastAccEarn.toString(),
        poolId: limOrder.poolId.toString(),
        sellXEarnY: limOrder.sellXEarnY
    }
}

describe("limorderWithSwapSwitch x2y desire", function () {
    var signer, seller1, seller2, seller3, trader, fakeOwner;
    var poolPart, poolPartDesire;
    var izumiswapFactory;
    var viewLimorder;
    var weth9;
    var nflm;
    var swap;
    var limorderWithSwapManager;
    var limorderManager;
    var tokenX, tokenY;
    var rate;
    var aBigAmount;
    var rate;
    var logPowMath;
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, miner, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderWithSwapManager = await getLimorderWithSwapManager(izumiswapFactory, weth9);
        limorderManager = await getLimorderManager(izumiswapFactory, weth9)
        viewLimorder = await getViewLimorder(izumiswapFactory);


        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();


        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        aBigAmount = '10000000000000000000000'

        await tokenX.transfer(miner.address, aBigAmount)
        await tokenX.connect(miner).approve(nflm.address, aBigAmount)

        await tokenY.transfer(miner.address, aBigAmount)
        await tokenY.connect(miner).approve(nflm.address, aBigAmount)

        const liquidityTokenAmount = '100000000000000'

        await addLiquidity(nflm, miner, tokenX, tokenY, 3000, 4900, 5200, liquidityTokenAmount, liquidityTokenAmount)
        rate = 1.0001
    });

    
    it("add limorder x2y desire no offset not enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const tailLiquidity = stringDiv(liquidity, 10)

        const costX4999_5051 = xInRange(liquidity, 4999, 5051, rate, true)
        const sqrtPrice_96_at_4998 = (await logPowMath.getSqrtPrice(4998)).toString()
        const costX4998 = l2x(tailLiquidity, sqrtPrice_96_at_4998, true)

        const totCostXWithFee = amountAddFee(
            new BigNumber(costX4999_5051).plus(costX4998)
        )
        console.log(totCostXWithFee)


        const acquireY4999_5051 = yInRange(liquidity, 4999, 5051, rate, false)
        const acquireY4998 = l2y(tailLiquidity, sqrtPrice_96_at_4998, false)
        const totAcquireY = getSum([acquireY4999_5051, acquireY4998])

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 4950,
            isDesireMode: true,
            amount: totAcquireY,
            swapMinAcquired: '0',
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenX, tokenY
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totCostXWithFee)
        expect(limOrder1.amountOut).to.equal(totAcquireY)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(0)
        expect(activeLimitOrder.length).to.equal(0)
    });

    it("add limorder x2y desire no offset enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const costX5000_5051 = xInRange(liquidity, 5000, 5051, rate, true)

        const costX5000_5051_WithFee = amountAddFee(
            new BigNumber(costX5000_5051)
        )

        const acquireY5000_5051 = yInRange(liquidity, 5000, 5051, rate, false)
        const desireYAt5000 = '10000000000'
        const totAmountY = stringAdd(acquireY5000_5051, desireYAt5000)
        const costXAt5000 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), desireYAt5000)
        const totAmountX = stringAdd(costX5000_5051_WithFee, costXAt5000)

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5000,
            isDesireMode: true,
            amount: totAmountY,
            swapMinAcquired: '0',
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenX, tokenY
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totAmountX)
        expect(limOrder1.amountOut).to.equal(acquireY5000_5051)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(1)
        activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        const limOrder = activeLimitOrder[0]
        expect(limOrder.initSellingAmount).to.equal(totAmountX)
        expect(limOrder.sellingRemain).to.equal(costXAt5000)
        expect(limOrder.earn).to.equal(limOrder1.amountOut)
    });

    it("add limorder x2y desire offset not enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const costX5000_5051 = xInRange(liquidity, 5000, 5051, rate, true)

        const costX5000_5051_WithFee = amountAddFee(
            new BigNumber(costX5000_5051)
        )

        const amountYAt5000 = "10000000000000000"

        const preAddLimOrderY2X = {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5000,
            amount: amountYAt5000,
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenY.transfer(seller2.address, aBigAmount)
        await tokenY.connect(seller2).approve(limorderManager.address, aBigAmount)
        const preLimorderY2X = await newLimOrder(
            limorderManager, seller2, 0, preAddLimOrderY2X,
            tokenX, tokenY
        )

        const originAcquireYAt5000 = stringDiv(amountYAt5000, '6')
        const costXAt5000 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), originAcquireYAt5000)
        const acquireYAt5000 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), costXAt5000)

        const totAmountX = stringAdd(costX5000_5051_WithFee, costXAt5000)

        const acquireY5000_5051 = yInRange(liquidity, 5000, 5051, rate, false)
        const totAmountY = stringAdd(acquireY5000_5051, acquireYAt5000)

        // const totAcquireY = stringAdd(acquireYAt5000, acquireY5000_5051)

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5000,
            isDesireMode: true,
            amount: totAmountY,
            swapMinAcquired: '0',
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenX, tokenY
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totAmountX)
        expect(limOrder1.amountOut).to.equal(stringAdd(acquireY5000_5051, acquireYAt5000))

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(0)
        // activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        // const limOrder = activeLimitOrder[0]
        // expect(limOrder.initSellingAmount).to.equal(totAmountX)
        // expect(limOrder.sellingRemain).to.equal('0')
        // expect(limOrder.earn).to.equal(limOrder1.amountOut)
    });

    it("add limorder x2y desire offset enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const costX5000_5051 = xInRange(liquidity, 5000, 5051, rate, true)

        const costX5000_5051_WithFee = amountAddFee(
            new BigNumber(costX5000_5051)
        )

        const amountYAt5000 = "10000000000000000"

        const preAddLimOrderY2X = {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5000,
            amount: amountYAt5000,
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenY.transfer(seller2.address, aBigAmount)
        await tokenY.connect(seller2).approve(limorderManager.address, aBigAmount)
        const preLimorderY2X = await newLimOrder(
            limorderManager, seller2, 0, preAddLimOrderY2X,
            tokenX, tokenY
        )

        const costXAt5000 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), amountYAt5000)
        const remainDesireYAt5000 = '100000000000000000'
        const totDesireYAt5000 = stringAdd(amountYAt5000, remainDesireYAt5000)
        const totCostXAt5000 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), totDesireYAt5000)
        const remainCostXAt5000 = stringMinus(totCostXAt5000, costXAt5000)

        const totAmountX = getSum([costX5000_5051_WithFee, costXAt5000, remainCostXAt5000])

        const acquireY5000_5051 = yInRange(liquidity, 5000, 5051, rate, false)
        const acquireYAt5000 = amountYAt5000
        const totAmountY = getSum([acquireY5000_5051, acquireYAt5000, remainDesireYAt5000])

        // const totAcquireY = stringAdd(acquireYAt5000, acquireY5000_5051)

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5000,
            isDesireMode: true,
            amount: totAmountY,
            swapMinAcquired: '0',
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenX, tokenY
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totAmountX)
        expect(limOrder1.amountOut).to.equal(stringAdd(acquireY5000_5051, acquireYAt5000))

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(1)
        activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        const limOrder = activeLimitOrder[0]
        expect(limOrder.initSellingAmount).to.equal(totAmountX)
        expect(limOrder.sellingRemain).to.equal(remainCostXAt5000)
        expect(limOrder.earn).to.equal(limOrder1.amountOut)
    });
});