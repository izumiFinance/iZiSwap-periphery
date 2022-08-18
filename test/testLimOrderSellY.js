const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { getPoolParts, getIzumiswapFactory, newLimOrderWithY, decLimOrderWithY } = require("./funcs.js")


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
    var b = BigNumber(num._hex);
    return b;
}
async function getLimorder(userAddress, orderIdx, limorderManager) {
     const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY} = await limorderManager.getActiveOrder(userAddress, orderIdx);
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
    const limorder = await getLimorder(userAddress, orderIdx, limorderManager);
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

async function checkBalance(token, address, value) {
    expect(blockNum2BigNumber(await token.balanceOf(address)).toFixed(0)).to.equal(value.toFixed(0));
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
async function getCoreEarnX(viewLimorder, pool, miner, pt) {
    var lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign;
    [lastAccEarn, sellingRemain, sellingDesc, earn, legacyEarn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, false
    );
    return {
        //lastAccEarn: lastAccEarn.toString(),
        //sellingRemain: sellingRemain.toString(),
        //sellingDesc: sellingDesc.toString(),
        earn: new BigNumber(earn.toString()).plus(legacyEarn.toString()).toFixed(0),
        earnAssign: earnAssign.toString()
    };
}
async function checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    earnX = await getCoreEarnX(viewLimorder, pool, limorderManager.address, pt);
    //expect(earnX.lastAccEarn).to.equal(expectData.lastAccEarn.toFixed(0));
    //expect(earnX.sellingRemain).to.equal(expectData.sellingRemain.toFixed(0));
    //expect(earnX.sellingDesc).to.equal(expectData.sellingDesc.toFixed(0));
    expect(earnX.earn).to.equal(expectData.earn.toFixed(0));
    expect(earnX.earnAssign).to.equal(expectData.earnAssign.toFixed(0));
}
function amountAddFee(amount) {
    return ceil(amount.times(1000).div(997));
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
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, trader2, recipient2, receiver] = await ethers.getSigners();
        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderManager = await getLimorderManager(izumiswapFactory, weth9);
        viewLimorder = await getViewLimorder(izumiswapFactory);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5050);
        rate = BigNumber("1.0001");
        await tokenX.transfer(trader.address, "100000000000000");
        await tokenX.connect(trader).approve(swap.address, "100000000000000");
    });

    
    it("first claim first earn", async function() {
        sellY1 = BigNumber("1000000000");
        await newLimOrderWithY(0, tokenX, tokenY, seller1, limorderManager, sellY1.toFixed(0), 5050);
        sellY2 = BigNumber("2000000000");
        await newLimOrderWithY(0, tokenX, tokenY, seller2, limorderManager, sellY2.toFixed(0), 5050);

        await checkBalance(tokenX, seller1, BigNumber(0));
        await checkBalance(tokenY, seller1, BigNumber(0));
        await checkBalance(tokenX, seller2, BigNumber(0));
        await checkBalance(tokenY, seller2, BigNumber(0));

        acquireYExpect = sellY1.plus(sellY2.div(3));
        costX = getCostX(5050, rate, acquireYExpect);
        acquireYExpect = getAcquireY(5050, rate, costX);
        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader.address,
                amount: amountAddFee(costX).toFixed(0),
                boundaryPt: 5050,
                maxPayed: costX.toFixed(0),
                minAcquired: 0,
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );

        await decLimOrderWithY(seller1, "0", limorderManager, "500000000");
        seller1EarnPhase1 = getAcquireX(5050, rate, sellY1);
        await checkLimOrder(seller1.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDec: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costX,
            sellXEarnY: false
        });
        
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderManager, 5050, {
            // lastAccEarn: costX,
            // sellingRemain: sellY1.plus(sellY2).minus(getCostY(5050, rate, costX)),
            // sellingDesc: BigNumber("0"),
            earn: costX.minus(seller1EarnPhase1),
            earnAssign: seller1EarnPhase1
        });
        sellY2_p2 = BigNumber("1500000000");
        await decLimOrderWithY(seller2, "0", limorderManager, "10000");
        seller2EarnPhase1 = costX.minus(getAcquireX(5050, rate, sellY1));
        seller2RemainPhase1 = sellY2.minus(getCostY(5050, rate, seller2EarnPhase1)).minus("10000");
        await checkLimOrder(seller2.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("10000"),
            earn: seller2EarnPhase1,
            lastAccEarn: costX,
            sellXEarnY: false
        });
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderManager, 5050, {
            earn: costX.minus(seller1EarnPhase1).minus(seller2EarnPhase1),
            earnAssign: seller1EarnPhase1.plus(seller2EarnPhase1)
        });
        // check collect
        await collectLimOrder(seller2, "0", recipient2.address, limorderManager, "1", "1");
        await checkBalance(tokenX, recipient2, BigNumber('1'));
        await checkBalance(tokenY, recipient2, BigNumber("1"));
        // check collect
        await collectLimOrder(seller2, "0", recipient2.address, limorderManager, "100000000000000000", "100000000000000000");

        await checkBalance(tokenX, recipient2, seller2EarnPhase1);
        await checkBalance(tokenY, recipient2, BigNumber("10000"));

        await checkLimOrder(seller2.address, "0", limorderManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDec: BigNumber("0"),
            earn: BigNumber("0"),
            lastAccEarn: costX,
            sellXEarnY: false
        });
        await checkCoreEarnX(tokenX, tokenY, viewLimorder, limorderManager, 5050, {
            earn: costX.minus(seller1EarnPhase1).minus(seller2EarnPhase1),
            earnAssign: seller1EarnPhase1
        });
    });
});