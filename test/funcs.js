const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
const { createCipheriv } = require("crypto");
const { expect } = require("chai");

function stringMinus(a, b) {
    return BigNumber(a).minus(b).toFixed(0);
}

function stringMul(a, b) {
    const mul = BigNumber(a).times(b).toFixed(0);
    return mul;
}

function stringDiv(a, b) {
    let an = BigNumber(a);
    an = an.minus(an.mod(b));
    return an.div(b).toFixed(0);
}

function stringMod(a, b) {
    let an = BigNumber(a);
    an = an.mod(b);
    return an.toFixed(0);
}

function stringDivCeil(a, b) {
    const div = stringDiv(a, b);
    if (stringMod(a, b) === '0') {
        return div;
    }
    return stringAdd(div, '1');
}

function stringAdd(a, b) {
    return BigNumber(a).plus(b).toFixed(0);
}

function getSum(a) {
    let sum = '0'
    for (const aa of a) {
        sum = stringAdd(sum, aa)
    }
    return sum
}

function stringLess(a, b) {
    return BigNumber(a).lt(b);
}

async function getIzumiswapFactory(receiverAddr, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer) {
    const iZiSwapJson = getContractJson(__dirname + '/core/iZiSwapFactory.json');
    
    const iZiSwapFactory = await ethers.getContractFactory(iZiSwapJson.abi, iZiSwapJson.bytecode, signer);

    const factory = await iZiSwapFactory.deploy(receiverAddr, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, 50);
    await factory.deployed();

    await factory.enableFeeAmount(3000, 50);
    return factory;
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
  
    const liquidityModuleJson = getContractJson(__dirname + '/core/LiquidityModule.json');
    const LiquidityModuleFactory = await ethers.getContractFactory(liquidityModuleJson.abi, liquidityModuleJson.bytecode, signer);
    const liquidityModule = await LiquidityModuleFactory.deploy();
    await liquidityModule.deployed();
  
    const limitOrderModuleJson = getContractJson(__dirname + '/core/LimitOrderModule.json');
    const LimitOrderModuleFactory = await ethers.getContractFactory(limitOrderModuleJson.abi, limitOrderModuleJson.bytecode, signer);
    const limitOrderModule = await LimitOrderModuleFactory.deploy();
    await limitOrderModule.deployed();

    const flashModuleJson = getContractJson(__dirname + '/core/FlashModule.json');
    const FlashModuleFactory = await ethers.getContractFactory(flashModuleJson.abi, flashModuleJson.bytecode, signer);
    const flashModule = await FlashModuleFactory.deploy();
    await flashModule.deployed();

    return {
      swapX2YModule: swapX2YModule.address,
      swapY2XModule: swapY2XModule.address,
      liquidityModule: liquidityModule.address,
      limitOrderModule: limitOrderModule.address,
      flashModule: flashModule.address,
    };
  }


async function getLimOrder(poolAddr, pt) {
    const iZiSwapPool = await ethers.getContractFactory("iZiSwapPool");
    pool = await iZiSwapPool.attach(poolAddr);
    const {sellingX, accEarnX, sellingY, accEarnY, earnX, earnY} = await pool.limitOrderData(pt);
    return {
        sellingX: BigNumber(sellingX._hex),
        accEarnX: BigNumber(accEarnX._hex),
        sellingY: BigNumber(sellingY._hex),
        accEarnY: BigNumber(accEarnY._hex),
        earnX: BigNumber(earnX._hex),
        earnY: BigNumber(earnY._hex)
    }
}

function floor(a) {
    return a.toFixed(0, 3);
}
function ceil(b) {
    return b.toFixed(0, 2);
}
function getAcquiredFee(amount, chargePercent = 50) {
    const originFee = ceil(BigNumber(amount).times(3).div(997));
    const charged = floor(BigNumber(originFee).times(chargePercent).div(100));
    return BigNumber(originFee).minus(charged).toFixed(0);
}

function getFeeCharge(fee, chargePercent = 50) {
    return floor(BigNumber(fee).times(chargePercent).div('100'));
}

function yInRange(liquidity, pl, pr, rate, up) {
    let amountY = BigNumber("0");
    let price = BigNumber(rate).pow(pl);
    for (var i = pl; i < pr; i ++) {
        amountY = amountY.plus(BigNumber(liquidity).times(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountY);
    } else {
        return floor(amountY);
    }
}
function xInRange(liquidity, pl, pr, rate, up) {
    let amountX = BigNumber("0");
    let price = BigNumber(rate).pow(pl);
    for (var i = pl; i < pr; i ++) {
        amountX = amountX.plus(BigNumber(liquidity).div(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountX);
    } else {
        return floor(amountX);
    }
}

function getYRangeList(rangeList, rate, up) {
    const amountY = [];
    for (const range of rangeList) {
        amountY.push(yInRange(range.liquidity, range.pl, range.pr, rate, up));
    }
    return amountY;
}
function getXRangeList(rangeList, rate, up) {
    const amountX = [];
    for (const range of rangeList) {
        amountX.push(xInRange(range.liquidity, range.pl, range.pr, rate, up));
    }
    return amountX;
}

function y2xAt(point, rate, amountY) {
    const sp = rate.pow(point).sqrt();
    const liquidity = floor(BigNumber(amountY).div(sp));
    const acquireX = floor(BigNumber(liquidity).div(sp));
    const liquidity1 = ceil(BigNumber(acquireX).times(sp));
    const costY = ceil(BigNumber(liquidity1).times(sp));
    return [acquireX, costY];
}

async function newLimOrderWithSwap(slotIdx, tokenX, tokenY, seller, limorderManager, amount, point, sellXEarnY, fee=3000) {

    let ok = true
    const amountXBefore = (await tokenX.balanceOf(seller.address)).toString()
    const amountYBefore = (await tokenY.balanceOf(seller.address)).toString()
    let error = undefined
    try {
        await limorderManager.connect(seller).newLimOrder(
            slotIdx,
            {
                recipient: seller.address,
                tokenX: tokenX.address,
                tokenY: tokenY.address,
                fee: fee,
                pt: point,
                isDesireMode: false,
                amount,
                swapMinAcquired: '0',
                sellXEarnY,
                deadline: '0xffffffff'
            }
        )
    } catch (err) {
        error = err
        ok = false
    }
    const amountXAfter = (await tokenX.balanceOf(seller.address)).toString()
    const amountYAfter = (await tokenY.balanceOf(seller.address)).toString()

    const deltaX = stringMinus(amountXBefore, amountXAfter)
    const deltaY = stringMinus(amountYBefore, amountYAfter)

    return {ok, deltaX, deltaY, error}
}

async function cancelLimOrderWithSwap(seller, tokenX, tokenY, orderIdx, limorderManager) {
    const tokenXBalanceBefore = await tokenX.balanceOf(seller.address)
    const tokenYBalanceBefore = await tokenY.balanceOf(seller.address)
    let ok = true
    let error = undefined
    try {
        await limorderManager.connect(seller).cancel(
            seller.address,
            orderIdx,
            '0xffffffff'
        )
    } catch (err) {
        ok = false
        error = err
    }

    const tokenXBalanceAfter = await tokenX.balanceOf(seller.address)
    const tokenYBalanceAfter = await tokenY.balanceOf(seller.address)
    return {
        ok,
        error,
        deltaX: stringMinus(tokenXBalanceAfter.toString(), tokenXBalanceBefore.toString()),
        deltaY: stringMinus(tokenYBalanceAfter.toString(), tokenYBalanceBefore.toString())
    }
}

async function collectLimOrderWithSwap(seller, tokenX, tokenY, orderIdx, limorderManager) {
    const tokenXBalanceBefore = await tokenX.balanceOf(seller.address)
    const tokenYBalanceBefore = await tokenY.balanceOf(seller.address)
    let ok = true
    let error = undefined
    try {
        await limorderManager.connect(seller).collect(
            seller.address,
            orderIdx
        )
    } catch (err) {
        ok = false
        error = err
    }

    const tokenXBalanceAfter = await tokenX.balanceOf(seller.address)
    const tokenYBalanceAfter = await tokenY.balanceOf(seller.address)
    return {
        ok,
        error,
        deltaX: stringMinus(tokenXBalanceAfter.toString(), tokenXBalanceBefore.toString()),
        deltaY: stringMinus(tokenYBalanceAfter.toString(), tokenYBalanceBefore.toString())
    }
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

function acquiredFeeLiquidity(amount, feeTier=3000, chargePercent=50) {

    const fee = stringDivCeil(stringMul(amount, feeTier), stringMinus(1e6, feeTier));
    return stringMinus(fee, getFeeCharge(fee, chargePercent));
}

function amountAddFee(amount, feeTier=3000) {
    const fee = stringDivCeil(stringMul(amount, feeTier), stringMinus(1e6, feeTier));
    return stringAdd(amount, fee);
}


function l2x(liquidity, sqrtPrice_96, up) {
    const q96 = BigNumber(2).pow(96).toFixed(0);
    if (up) {
        return stringDivCeil(stringMul(liquidity, q96), sqrtPrice_96)
    } else {
        return stringDiv(stringMul(liquidity, q96), sqrtPrice_96)
    }
}

function l2y(liquidity, sqrtPrice_96, up) {
    const q96 = BigNumber(2).pow(96).toFixed(0);
    if (up) {
        return stringDivCeil(stringMul(liquidity, sqrtPrice_96), q96)
    } else {
        return stringDiv(stringMul(liquidity, sqrtPrice_96), q96)
    }
}

async function newLimOrderSolo(slotIdx, tokenX, tokenY, seller, limorderManagerSolo, amount, point, sellXEarnY, fee=2000) {
    let ok = true;
    try {
    await limorderManagerSolo.connect(seller).newLimOrder(
        slotIdx,
        {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee,
            pt: point,
            amount,
            sellXEarnY,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
    } catch(err) {
        ok = false;
    }
    return ok;
}

async function addLimOrderSolo(slotIdx, seller, limorderManagerSolo, amount, fee=2000) {
    let ok = true;
    try {
    await limorderManagerSolo.connect(seller).addLimOrder(
        slotIdx,
        amount,
        '0xffffffff'
    );
    } catch(err) {
        ok = false;
    }
    return ok;
}

async function getLimOrderSolo(limitOrderManagerSolo, orderIdx) {
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

async function newLimOrderSoloWithX(slotIdx, tokenX, tokenY, seller, limorderManagerSolo, amountX, point, fee=2000) {
    return newLimOrderSolo(slotIdx, tokenX, tokenY, seller, limorderManagerSolo, amountX, point, true, fee)
}

async function newLimOrderSoloWithY(slotIdx, tokenX, tokenY, seller, limorderManagerSolo, amountY, point, fee=2000) {
    return newLimOrderSolo(slotIdx, tokenX, tokenY, seller, limorderManagerSolo, amountY, point, false, fee)
}

async function newLimOrderWithX(slotIdx, tokenX, tokenY, seller, limorderManager, amountX, point) {
    await tokenX.transfer(seller.address, amountX);
    await tokenX.connect(seller).approve(limorderManager.address, amountX);
    let ok = true;
    try {
    await limorderManager.connect(seller).newLimOrder(
        slotIdx,
        {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: point,
            amount: amountX,
            sellXEarnY: true,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
    } catch(err) {
        ok = false;
    }
    return ok;
}

async function updateOrderSolo(seller, orderIdx, limorderManager) {
    try {
        await limorderManager.connect(seller).updateOrder(
            orderIdx
        ); 
        return true;
    } catch (err) {
    }
    return false;
}

async function decLimOrderWithX(seller, orderIdx, limorderManager, amountX) {
    try {
        await limorderManager.connect(seller).decLimOrder(
            orderIdx,
            amountX,
            BigNumber("10000000000").toFixed(0)
        ); 
        return true;
    } catch (err) {
    }
    return false;
}

async function updateOrder(seller, orderIdx, limorderManager) {
    await limorderManager.connect(seller).updateOrder(
        orderIdx
    )
}

async function collectLimOrderWithX(seller, tokenX, tokenY, recipientAddress, orderIdx, limorderManager, collectDec, collectEarn) {
    const amountXBefore = (await tokenX.balanceOf(recipientAddress)).toString();
    const amountYBefore = (await tokenY.balanceOf(recipientAddress)).toString();
    let ok = true
    let error = undefined
    try {
    await limorderManager.connect(seller).collectLimOrder(recipientAddress, orderIdx, collectDec, collectEarn)
    } catch (err) {
        ok = false
        error = err
    }
    const amountXAfter = (await tokenX.balanceOf(recipientAddress)).toString();
    const amountYAfter = (await tokenY.balanceOf(recipientAddress)).toString();
    return {
        ok,
        error,
        collectDec: stringMinus(amountXAfter, amountXBefore),
        collectEarn: stringMinus(amountYAfter, amountYBefore)
    }
}

async function newLimOrderWithY(slotIdx, tokenX, tokenY, seller, limorderManager, amountY, point) {
    await tokenY.transfer(seller.address, amountY);
    await tokenY.connect(seller).approve(limorderManager.address, amountY);
    let ok = true;
    try {
    await limorderManager.connect(seller).newLimOrder(
        slotIdx,
        {
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: 3000,
            pt: point,
            amount: amountY,
            sellXEarnY: false,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
    } catch(err) {
        ok = false;
    }
    return ok;
}

async function decLimOrderWithY(seller, sellId, limorderManager, amountY) {
    try {
        await limorderManager.connect(seller).decLimOrder(
            sellId,
            amountY,
            BigNumber("10000000000").toFixed(0)
        );
        return true
    } catch (err) {
        return false
    }
}

async function collectLimOrderWithY(seller, tokenX, tokenY, recipientAddress, orderIdx, limorderManager, collectDec, collectEarn) {
    const amountXBefore = (await tokenX.balanceOf(recipientAddress)).toString();
    const amountYBefore = (await tokenY.balanceOf(recipientAddress)).toString();
    try {
    await limorderManager.connect(seller).collectLimOrder(recipientAddress, orderIdx, collectDec, collectEarn)
    } catch(err) {
        
    }
    const amountXAfter = (await tokenX.balanceOf(recipientAddress)).toString();
    const amountYAfter = (await tokenY.balanceOf(recipientAddress)).toString();
    return {
        collectDec: stringMinus(amountYAfter, amountYBefore),
        collectEarn: stringMinus(amountXAfter, amountXBefore)
    }
}

async function collectSoloLimOrder(limorderManager, tokenX, tokenY, seller, orderIdx) {
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

async function addLiquidity(nflm, miner, tokenX, tokenY, fee, pl, pr, amountX, amountY) {
    if (tokenX.address.toLowerCase() > tokenY.address.toLowerCase()) {
        let tmp = tokenX;
        tokenX = tokenY;
        tokenY = tmp;

        let amount = amountX;
        amountX = amountY;
        amountY = amount;
    }
    await nflm.connect(miner).mint(
        {
            miner: miner.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: fee,
            pl: pl,
            pr: pr,
            xLim: amountX,
            yLim: amountY,
            amountXMin: 0,
            amountYMin: 0,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
}

function getRevertString(originStr) {
    const substr = 'reverted with reason string '
    const start = originStr.indexOf(substr) + substr.length + 1
    const end = originStr.indexOf("'", start)
    return originStr.slice(start, end)
}

function checkArrEqual(arr1, arr2) {
    expect(arr1.length).to.equal(arr2.length);
    arr1Sort = arr1.slice(0, arr1.length).sort()
    arr2Sort = arr2.slice(0, arr2.length).sort()
    for (let idx = 0; idx < arr1Sort.length; idx ++) {
        expect(arr1Sort[idx]).to.equal(arr2Sort[idx])
    }
}

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

async function getLimitOrderManagerSoloFactory(factory, weth) {
    const LimitOrderManagerSoloFactory = await ethers.getContractFactory('LimitOrderManagerSoloFactory')
    var limitOrderManagerFactory = await LimitOrderManagerSoloFactory.deploy(factory.address, weth.address)
    await limitOrderManagerFactory.deployed();
    return limitOrderManagerFactory;
}

module.exports ={
    getPoolParts,
    getIzumiswapFactory,
    getLimOrder,
    getAcquiredFee,
    getFeeCharge,
    getYRangeList,
    getXRangeList,
    xInRange,
    yInRange,
    y2xAt,
    newLimOrderWithSwap,
    cancelLimOrderWithSwap,
    collectLimOrderWithSwap,
    getCostYFromXAt,
    getCostXFromYAt,
    getEarnYFromXAt,
    getEarnXFromYAt,
    acquiredFeeLiquidity,
    amountAddFee,
    l2x,
    l2y,
    newLimOrderSoloWithX,
    newLimOrderSoloWithY,
    addLimOrderSolo,
    getLimOrderSolo,
    newLimOrderWithX,
    decLimOrderWithX,
    newLimOrderWithY,
    updateOrder,
    updateOrderSolo,
    decLimOrderWithY,
    addLiquidity,
    collectLimOrderWithX,
    collectLimOrderWithY,
    collectSoloLimOrder,
    stringAdd,
    stringMinus,
    stringMul,
    stringDivCeil,
    stringDiv,
    getSum,
    getRevertString,
    ceil,
    floor,
    checkArrEqual,
    getWETH9,
    getNFTLiquidityManager,
    getSwap,
    getLimitOrderManagerSoloFactory,
}