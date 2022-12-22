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
    getCostYFromXAt,
    getEarnXFromYAt
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

describe("limorderWithSwapSwitch Y2X undesire", function () {
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

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5020);
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

    
    it("add limorder y2x undesire no offset not enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const tailLiquidity = stringDiv(liquidity, 10)

        const costY5021_5030 = yInRange(liquidity, 5021, 5030, rate, true)
        const sqrtPrice_96_at_5030 = (await logPowMath.getSqrtPrice(5030)).toString()
        const costYAt5030 = l2y(tailLiquidity, sqrtPrice_96_at_5030, true)

        const totCostYWithFee = amountAddFee(
            new BigNumber(costY5021_5030).plus(costYAt5030)
        )
        console.log(totCostYWithFee)


        const acquireX5021_5030 = xInRange(liquidity, 5021, 5030, rate, false)
        const acquireXAt5030 = l2x(tailLiquidity, sqrtPrice_96_at_5030, false)
        const totAcquireX = getSum([acquireX5021_5030, acquireXAt5030])

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            isDesireMode: false,
            amount: totCostYWithFee,
            swapMinAcquired: '0',
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenY, tokenX
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totCostYWithFee)
        expect(limOrder1.amountOut).to.equal(totAcquireX)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(0)
        expect(activeLimitOrder.length).to.equal(0)
    });

    it("add limorder y2x undesire no offset enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)


        const costY5021_5051 = yInRange(liquidity, 5021, 5051, rate, true)

        const remainYAt5050 = '1000000000000000'

        const totCostYWithFee = getSum(
            [
            amountAddFee(new BigNumber(costY5021_5051)),
            remainYAt5050
            ]
        )
        console.log(totCostYWithFee)


        const acquireX5021_5051 = xInRange(liquidity, 5021, 5051, rate, false)
        const totAcquireX = acquireX5021_5051

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            isDesireMode: false,
            amount: totCostYWithFee,
            swapMinAcquired: '0',
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenY, tokenX
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totCostYWithFee)
        expect(limOrder1.amountOut).to.equal(totAcquireX)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(1)
        activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        const limOrder = activeLimitOrder[0]
        expect(limOrder.initSellingAmount).to.equal(totCostYWithFee)
        expect(limOrder.sellingRemain).to.equal(remainYAt5050)
        expect(limOrder.earn).to.equal(limOrder1.amountOut)
    });

    it("add limorder y2x undesire offset not enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const costY5021_5050 = yInRange(liquidity, 5021, 5050, rate, true)

        const costY5021_5050_WithFee = amountAddFee(
            new BigNumber(costY5021_5050)
        )

        const amountXAt5050 = "10000000000000000"

        const preAddLimOrderX2Y = {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            amount: amountXAt5050,
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller2.address, aBigAmount)
        await tokenX.connect(seller2).approve(limorderManager.address, aBigAmount)
        const preLimOrderX2Y = await newLimOrder(
            limorderManager, seller2, 0, preAddLimOrderX2Y,
            tokenY, tokenX
        )
        expect(preLimOrderX2Y.ok).to.equal(true)

        const costYForAllAt5050 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), amountXAt5050)

        const costYAt5050 = stringDiv(costYForAllAt5050, '3')
        const acquireXAt5050 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5050)).toString(), costYAt5050)

        const costYAt5050_WithFee = amountAddFee(new BigNumber(costYAt5050))

        const totAmountY = stringAdd(costY5021_5050_WithFee, costYAt5050_WithFee)

        const acquireX5021_5050 = xInRange(liquidity, 5021, 5050, rate, false)

        const totAmountX = stringAdd(acquireXAt5050, acquireX5021_5050)

        // const totAcquireY = stringAdd(acquireYAt5000, acquireY5000_5051)

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            isDesireMode: false,
            amount: totAmountY,
            swapMinAcquired: '0',
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenY, tokenX
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totAmountY)
        expect(limOrder1.amountOut).to.equal(totAmountX)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(0)
        expect(activeLimitOrder.length).to.equal(0)
    });

    it("add limorder y2x undesire offset enough", async function() {
        const nft = await nflm.liquidities('0')
        const liquidity = nft.liquidity.toString()
        console.log('liquidity: ', liquidity)

        const costY5021_5050 = yInRange(liquidity, 5021, 5050, rate, true)
        const costY5021_5050_WithFee = amountAddFee(
            new BigNumber(costY5021_5050)
        )
        const acquireX5021_5050 = xInRange(liquidity, 5021, 5050, rate, false)

        const amountXAt5050 = "10000000000000000"
        const costYAt5050 = getCostYFromXAt((await logPowMath.getSqrtPrice(5050)).toString(), amountXAt5050)
        const costYAt5050_WithFee = amountAddFee(new BigNumber(costYAt5050))

        const acquireX5050_5051 = l2x(liquidity, (await logPowMath.getSqrtPrice(5050)).toString(), false)
        const costY5050_5051 = l2y(liquidity, (await logPowMath.getSqrtPrice(5050)).toString(), true)
        const costY5050_5051_WithFee = amountAddFee(new BigNumber(costY5050_5051))

        const remainAmountYAt5050 = '20000000000000000'

        const preAddLimOrderX2Y = {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            amount: amountXAt5050,
            sellXEarnY: true,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller2.address, aBigAmount)
        await tokenX.connect(seller2).approve(limorderManager.address, aBigAmount)
        const preLimOrderX2Y = await newLimOrder(
            limorderManager, seller2, 0, preAddLimOrderX2Y,
            tokenX, tokenY
        )
        expect(preLimOrderX2Y.ok).to.equal(true)

        const totAmountX = getSum([
            acquireX5021_5050,
            amountXAt5050,
            acquireX5050_5051
        ])

        const totAmountY = getSum([
            costY5021_5050_WithFee,
            costYAt5050_WithFee,
            costY5050_5051_WithFee,
            remainAmountYAt5050
        ])

        // const totAcquireY = stringAdd(acquireYAt5000, acquireY5000_5051)

        const addLimOrderParam = {
            recipient: seller1.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: 5050,
            isDesireMode: false,
            amount: totAmountY,
            swapMinAcquired: '0',
            sellXEarnY: false,
            deadline: '0xffffffff'
        }

        await tokenX.transfer(seller1.address, aBigAmount)
        await tokenY.transfer(seller1.address, aBigAmount)
        await tokenX.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        await tokenY.connect(seller1).approve(limorderWithSwapManager.address, aBigAmount)
        const limOrder1 = await newLimOrder(
            limorderWithSwapManager, seller1, 0, addLimOrderParam,
            tokenY, tokenX
        )

        expect(limOrder1.ok).to.equal(true)
        expect(limOrder1.amountIn).to.equal(totAmountY)
        expect(limOrder1.amountOut).to.equal(totAmountX)

        let {activeIdx, activeLimitOrder} = await limorderWithSwapManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        expect(activeIdx.length).to.equal(1)
        activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        const limOrder = activeLimitOrder[0]
        expect(limOrder.initSellingAmount).to.equal(totAmountY)
        expect(limOrder.sellingRemain).to.equal(remainAmountYAt5050)
        expect(limOrder.earn).to.equal(limOrder1.amountOut)
    });
});