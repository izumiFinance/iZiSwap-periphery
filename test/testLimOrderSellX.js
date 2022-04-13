const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');

async function getToken(dx, dy) {

    // deploy token
    const tokenFactory = await ethers.getContractFactory("Token")
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

async function newLimOrderWithX(tokenX, tokenY, seller, limorderManager, amountX, point) {
    await tokenX.transfer(seller.address, amountX);
    await tokenX.connect(seller).approve(limorderManager.address, amountX);
    await limorderManager.connect(seller).newLimOrder(
        seller.address,
        {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: point,
            amount: amountX,
            sellXEarnY: true
        }
    );
}

async function decLimOrderWithX(seller, sellId, limorderManager, amountX) {
    await limorderManager.connect(seller).decLimOrder(
        sellId,
        amountX
    );
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
async function getLimorder(sellId, limorderManager) {
     var pt, amount, sellingRemain, accSellingDec, sellingDesc, earn, lastAccEarn, poolId, sellXEarnY;
     [pt, amount, sellingRemain, accSellingDec, sellingDesc, earn, lastAccEarn, poolId, sellXEarnY] = await limorderManager.limOrders(sellId);
     return {
         pt: pt,
         sellingRemain: blockNum2BigNumber(sellingRemain),
         sellingDesc: blockNum2BigNumber(sellingDesc),
         earn: blockNum2BigNumber(earn),
         lastAccEarn: blockNum2BigNumber(lastAccEarn),
         poolId: blockNum2BigNumber(poolId),
         sellXEarnY: sellXEarnY
     };
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

async function getPoolParts(signer) {
    const swapX2YModuleJson = getContractJson(__dirname + '/core/SwapX2YModule.json');
    const SwapX2YModuleFactory = await ethers.getContractFactory(swapX2YModuleJson.abi, swapX2YModuleJson.bytecode, signer);
    const swapX2YModule = await SwapX2YModuleFactory.deploy();
    await swapX2YModule.deployed();
    
    const swapY2XModuleJson = getContractJson(__dirname + '/core/SwapY2XModule.json');
    const SwapY2XModuleFactory = await ethers.getContractFactory(swapY2XModuleJson.abi, swapY2XModuleJson.bytecode, signer);
    const swapY2XModule = await SwapY2XModuleFactory.deploy();
    await swapY2XModule.deployed();
  
    const mintModuleJson = getContractJson(__dirname + '/core/MintModule.json');
    const MintModuleFactory = await ethers.getContractFactory(mintModuleJson.abi, mintModuleJson.bytecode, signer);
    const mintModule = await MintModuleFactory.deploy();
    await mintModule.deployed();
  
    const limitOrderModuleJson = getContractJson(__dirname + '/core/LimitOrderModule.json');
    const LimitOrderModuleFactory = await ethers.getContractFactory(limitOrderModuleJson.abi, limitOrderModuleJson.bytecode, signer);
    const limitOrderModule = await LimitOrderModuleFactory.deploy();
    await limitOrderModule.deployed();
    return {
      swapX2YModule: swapX2YModule.address,
      swapY2XModule: swapY2XModule.address,
      mintModule: mintModule.address,
      limitOrderModule: limitOrderModule.address,
    };
  }

  async function getIzumiswapFactory(receiverAddr, swapX2YModule, swapY2XModule, mintModule, limitOrderModule, signer) {
    const iZiSwapJson = getContractJson(__dirname + '/core/iZiSwapFactory.json');
    
    const iZiSwapFactory = await ethers.getContractFactory(iZiSwapJson.abi, iZiSwapJson.bytecode, signer);

    const factory = await iZiSwapFactory.deploy(receiverAddr, swapX2YModule, swapY2XModule, mintModule, limitOrderModule);
    await factory.deployed();
    return factory;
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
async function checkpoolid(orderId, nflomAddr) {

    const LimitOrderManager = await ethers.getContractFactory("LimitOrderManager");
    var nflom = LimitOrderManager.attach(nflomAddr);

    var pt;
    var amount;
    var sellingRemain;
    var accSellingDec;
    var sellingDec;
    var earn;
    var lastAccEarn;
    var poolId;
    var sellXEarnY;
    [pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY] = await nflom.limOrders(orderId);

    console.log("-----------pt: ", pt);
    console.log("-----------selling remain: ", sellingRemain.toString());
    console.log("-----------poolId: ", poolId);
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
        [signer, seller1, seller2, seller3, trader, trader2, recipient1, recipient2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, mintModule, limitOrderModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, mintModule, limitOrderModule, signer);
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
        await tokenY.transfer(trader.address, "100000000000000");
        await tokenY.connect(trader).approve(swap.address, "100000000000000");
    });

    
    it("first claim first earn", async function() {
        sellX1 = BigNumber("1000000000");
        await newLimOrderWithX(tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), 5050);
        await checkpoolid("0", limorderManager.address);
        sellX2 = BigNumber("2000000000");
        await newLimOrderWithX(tokenX, tokenY, seller2, limorderManager, sellX2.toFixed(0), 5050);
        await checkpoolid("1", limorderManager.address);

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
                minAcquired: 0
            }
        );

        await decLimOrderWithX(seller1, "0", limorderManager, "500000000");
        seller1EarnPhase1 = getAcquireY(5050, rate, sellX1);
        await checkLimOrder("0", limorderManager, {
            pt: 5050,
            sellingRemain: BigNumber("0"),
            sellingDesc: BigNumber("0"),
            earn: seller1EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, 5050, {
            earn: costY.minus(seller1EarnPhase1),
            earnAssign: seller1EarnPhase1
        });
        
        await decLimOrderWithX(seller2, "1", limorderManager, "10000");
        seller2EarnPhase1 = costY.minus(getAcquireY(5050, rate, sellX1));
        seller2RemainPhase1 = sellX2.minus(getCostX(5050, rate, seller2EarnPhase1)).minus("10000");
        await checkLimOrder("1", limorderManager, {
            pt: 5050,
            sellingRemain: seller2RemainPhase1,
            sellingDesc: BigNumber("10000"),
            earn: seller2EarnPhase1,
            lastAccEarn: costY,
            sellXEarnY: true
        });
        await checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, 5050, {
            earn: costY.minus(seller1EarnPhase1).minus(seller2EarnPhase1),
            earnAssign: seller1EarnPhase1.plus(seller2EarnPhase1)
        });
    });
});