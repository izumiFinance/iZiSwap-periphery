const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { getPoolParts, getIzumiswapFactory, collectLimOrderWithX, getRevertString} = require("./funcs.js")

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
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, fakeOwner, recipient1, recipient2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderWithSwapManager = await getLimorderWithSwapManager(izumiswapFactory, weth9);
        viewLimorder = await getViewLimorder(izumiswapFactory);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        await tokenY.transfer(trader.address, "100000000000000");
        await tokenY.connect(trader).approve(swap.address, "100000000000000");
    });

    
    it("normal", async function() {
        sellX1 = BigNumber("1000000000");
        const newOrder1 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller1, limorderWithSwapManager, sellX1.toFixed(0), 5050);
        expect(newOrder1.ok).to.equal(true)
        await checkpoolid(limorderWithSwapManager.address, seller1.address, 0);
        sellX2 = BigNumber("2000000000");
        const newOrder2 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2.toFixed(0), 5050);
        expect(newOrder2.ok).to.equal(true)

        await checkpoolid(limorderWithSwapManager.address, seller2.address, 0);

        await checkBalance(tokenX, seller1, BigNumber(0));
        await checkBalance(tokenY, seller1, BigNumber(0));
        await checkBalance(tokenX, seller2, BigNumber(0));
        await checkBalance(tokenY, seller2, BigNumber(0));

        acquireXExpect = sellX1.plus(sellX2.div(3));
        costY = getCostY(5050, rate, acquireXExpect);
        acquireXExpect = getAcquireX(5050, rate, costY);
        await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costY).toFixed(0),
                boundaryPt: 5051,
                maxPayed: costY.toFixed(0),
                minAcquired: 0,
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        const dec1 = await decLimOrderWithSwapWithX(seller1, "0", limorderWithSwapManager, "500000000");
        expect(dec1.ok).to.equal(true)
        seller1EarnPhase1 = getAcquireY(5050, rate, sellX1);
        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: costY.minus(seller1EarnPhase1),
            earnAssign: seller1EarnPhase1
        });
        
        const dec2 = await decLimOrderWithSwapWithX(seller2, "0", limorderWithSwapManager, "10000");
        expect(dec2.ok).to.equal(true)
        seller2EarnPhase1 = costY.minus(getAcquireY(5050, rate, sellX1));
        seller2RemainPhase1 = sellX2.minus(getCostX(5050, rate, seller2EarnPhase1)).minus("10000");
        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("10000"),
            earn: seller2EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: costY.minus(seller1EarnPhase1).minus(seller2EarnPhase1),
            earnAssign: seller1EarnPhase1.plus(seller2EarnPhase1)
        });

        const collect2_1 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '1', '1')
        console.log('collect2_1: ', collect2_1);
        expect(collect2_1.collectDec).to.equal('1')
        expect(collect2_1.collectEarn).to.equal('1')
        expect(collect2_1.ok).to.equal(true)

        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("9999"),
            earn: seller2EarnPhase1.minus('1'),
            lastAccEarn: costY,
            sellXEarnY: true
        });
        const collect2_2 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '100000000000000000', '100000000000000000000')

        expect(collect2_2.collectDec).to.equal('9999')
        expect(collect2_2.collectEarn).to.equal(seller2EarnPhase1.minus('1').toFixed(0))
        expect(collect2_2.ok).to.equal(true)

        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("0"),
            earn: BigNumber('0'),
            lastAccEarn: costY,
            sellXEarnY: true
        });
        const collect2_3 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '100000000000000000', '100000000000000000000')
        expect(collect2_3.collectDec).to.equal('0')
        expect(collect2_3.collectEarn).to.equal('0')
        expect(collect2_3.ok).to.equal(true)
        // order of seller1 not influenced
        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });


        const collect1_1 = await collectLimOrderWithX(
            seller1, tokenX, tokenY, recipient1.address, 1, limorderWithSwapManager, '1', '1')
        expect(collect1_1.collectDec).to.equal('0')
        expect(collect1_1.collectEarn).to.equal('0')
        expect(collect1_1.ok).to.equal(false)
        expect(getRevertString(collect1_1.error.toString())).to.equal('Out Of Length!')

        const collect1_2 = await collectLimOrderWithX(
            seller1, tokenX, tokenY, recipient1.address, 10000, limorderWithSwapManager, '1', '1')
        expect(collect1_2.collectDec).to.equal('0')
        expect(collect1_2.collectEarn).to.equal('0')
        expect(collect1_2.ok).to.equal(false)
        expect(getRevertString(collect1_2.error.toString())).to.equal('Out Of Length!')

        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
    });

    it("paused", async function() {
        await checkPaused(limorderWithSwapManager, false)
        const fakeSet1 = await setPauseValue(fakeOwner, limorderWithSwapManager, true)
        expect(fakeSet1.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, false)
        sellX1 = BigNumber("1000000000");
        const newOrder1 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller1, limorderWithSwapManager, sellX1.toFixed(0), 5050);
        expect(newOrder1.ok).to.equal(true)
        await checkpoolid(limorderWithSwapManager.address, seller1.address, 0);

        sellX2 = BigNumber("2000000000");
        // real pause
        const ownerSet2_1 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerSet2_1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)

        const newOrder2_1 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2.toFixed(0), 5050);
        expect(newOrder2_1.ok).to.equal(false)
        expect(getRevertString(newOrder2_1.error.toString())).to.equal("paused")

        // fake open
        const fakeSet2_2 = await setPauseValue(fakeOwner, limorderWithSwapManager, false)
        expect(fakeSet2_2.ok).to.equal(false)
        await checkPaused(limorderWithSwapManager, true)
        const newOrder2_2 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2.toFixed(0), 5050);
        expect(newOrder2_2.ok).to.equal(false)
        expect(getRevertString(newOrder2_2.error.toString())).to.equal("paused")

        // real open
        const ownerSet2_2 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerSet2_2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const newOrder2_3 = await newLimOrderWithSwapWithX(0, tokenX, tokenY, seller2, limorderWithSwapManager, sellX2.toFixed(0), 5050);
        expect(newOrder2_3.ok).to.equal(true)

        await checkpoolid(limorderWithSwapManager.address, seller2.address, 0);

        await checkBalance(tokenX, seller1, BigNumber(0));
        await checkBalance(tokenY, seller1, BigNumber(0));
        await checkBalance(tokenX, seller2, BigNumber("4000000000"));
        await checkBalance(tokenY, seller2, BigNumber(0));

        acquireXExpect = sellX1.plus(sellX2.div(3));
        costY = getCostY(5050, rate, acquireXExpect);
        acquireXExpect = getAcquireX(5050, rate, costY);
        await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costY).toFixed(0),
                boundaryPt: 5051,
                maxPayed: costY.toFixed(0),
                minAcquired: 0,
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        const dec1 = await decLimOrderWithSwapWithX(seller1, "0", limorderWithSwapManager, "500000000");
        expect(dec1.ok).to.equal(true)
        seller1EarnPhase1 = getAcquireY(5050, rate, sellX1);
        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: costY.minus(seller1EarnPhase1),
            earnAssign: seller1EarnPhase1
        });

        // real pause
        const ownerPauseBeforeUpdate1 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerPauseBeforeUpdate1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)
        const update1_1 = await updateLimOrderWithSwap(seller1, "0", limorderWithSwapManager)
        expect(update1_1.ok).to.equal(false)
        expect(getRevertString(update1_1.error.toString())).to.equal("paused")

        // real open
        const ownerOpenBeforeUpdate1 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerOpenBeforeUpdate1.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const update1_2 = await updateLimOrderWithSwap(seller1, "0", limorderWithSwapManager)
        expect(update1_2.ok).to.equal(true)

        // real pause
        const ownerPauseBeforeDec2 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerPauseBeforeDec2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)

        const dec2_1 = await decLimOrderWithSwapWithX(seller2, "0", limorderWithSwapManager, "10000");
        expect(dec2_1.ok).to.equal(false)
        expect(getRevertString(dec2_1.error.toString())).to.equal("paused")

        // real open
        const ownerOpenBeforeDec2 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerOpenBeforeDec2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const dec2_2 = await decLimOrderWithSwapWithX(seller2, "0", limorderWithSwapManager, "10000");
        expect(dec2_2.ok).to.equal(true)
        seller2EarnPhase1 = costY.minus(getAcquireY(5050, rate, sellX1));
        seller2RemainPhase1 = sellX2.minus(getCostX(5050, rate, seller2EarnPhase1)).minus("10000");
        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("10000"),
            earn: seller2EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderWithSwapManager, 5050, {
            earn: costY.minus(seller1EarnPhase1).minus(seller2EarnPhase1),
            earnAssign: seller1EarnPhase1.plus(seller2EarnPhase1)
        });

        const collect2_1 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '1', '1')
        console.log('collect2_1: ', collect2_1);
        expect(collect2_1.collectDec).to.equal('1')
        expect(collect2_1.collectEarn).to.equal('1')
        expect(collect2_1.ok).to.equal(true)

        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("9999"),
            earn: seller2EarnPhase1.minus('1'),
            lastAccEarn: costY,
            sellXEarnY: true
        });

        // real pause
        const ownerPauseBeforeCollect2_2 = await setPauseValue(signer, limorderWithSwapManager, true)
        expect(ownerPauseBeforeCollect2_2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, true)

        const collect2_2_1 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '100000000000000000', '100000000000000000000')
        expect(getRevertString(collect2_2_1.error.toString())).to.equal("paused")
        expect(collect2_2_1.collectDec).to.equal('0')
        expect(collect2_2_1.collectEarn).to.equal('0')
        expect(collect2_2_1.ok).to.equal(false)

        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("9999"),
            earn: seller2EarnPhase1.minus('1'),
            lastAccEarn: costY,
            sellXEarnY: true
        });

        // real open
        const ownerOpenBeforeCollect2_2 = await setPauseValue(signer, limorderWithSwapManager, false)
        expect(ownerOpenBeforeCollect2_2.ok).to.equal(true)
        await checkPaused(limorderWithSwapManager, false)

        const collect2_2 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '100000000000000000', '100000000000000000000')

        expect(collect2_2.collectDec).to.equal('9999')
        expect(collect2_2.collectEarn).to.equal(seller2EarnPhase1.minus('1').toFixed(0))
        expect(collect2_2.ok).to.equal(true)

        await checkLimOrder(seller2.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("0"),
            earn: BigNumber('0'),
            lastAccEarn: costY,
            sellXEarnY: true
        });
        const collect2_3 = await collectLimOrderWithX(
            seller2, tokenX, tokenY, recipient1.address, 0, limorderWithSwapManager, '100000000000000000', '100000000000000000000')
        expect(collect2_3.collectDec).to.equal('0')
        expect(collect2_3.collectEarn).to.equal('0')
        expect(collect2_3.ok).to.equal(true)
        // order of seller1 not influenced
        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });


        const collect1_1 = await collectLimOrderWithX(
            seller1, tokenX, tokenY, recipient1.address, 1, limorderWithSwapManager, '1', '1')
        expect(collect1_1.collectDec).to.equal('0')
        expect(collect1_1.collectEarn).to.equal('0')
        expect(collect1_1.ok).to.equal(false)
        expect(getRevertString(collect1_1.error.toString())).to.equal('Out Of Length!')

        const collect1_2 = await collectLimOrderWithX(
            seller1, tokenX, tokenY, recipient1.address, 10000, limorderWithSwapManager, '1', '1')
        expect(collect1_2.collectDec).to.equal('0')
        expect(collect1_2.collectEarn).to.equal('0')
        expect(collect1_2.ok).to.equal(false)
        expect(getRevertString(collect1_2.error.toString())).to.equal('Out Of Length!')

        await checkLimOrder(seller1.address, "0", limorderWithSwapManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
    });
});