const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getPool,
    getIzumiswapFactory, 
    stringMinus,
    ceil,
    newLimOrderWithX,
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


function amountAddFee(amount, fee) {
    return ceil(new BigNumber(amount).times(1e6).div(1e6 - fee));
}

async function decLimitOrder(
    limitOrderManager, seller, idx, amount
) {
    await limitOrderManager.connect(seller).decLimOrder(idx, amount, '0xffffffff')
}

async function collectLimOrder(
    limitOrderManager, seller, idx, 
    tokenSell, tokenEarn, tokenSellAmount, tokenEarnAmount
) {
    try {
        const tokenSellAmountBefore = (await tokenSell.balanceOf(seller.address)).toString()
        const tokenEarnAmountBefore = (await tokenEarn.balanceOf(seller.address)).toString()
        await limitOrderManager.connect(seller).collectLimOrder(
            seller.address,
            idx,
            tokenSellAmount,
            tokenEarnAmount
        )
        const tokenSellAmountAfter = (await tokenSell.balanceOf(seller.address)).toString()
        const tokenEarnAmountAfter = (await tokenEarn.balanceOf(seller.address)).toString()
        
        const amountSell = stringMinus(tokenSellAmountAfter, tokenSellAmountBefore)
        const amountEarn = stringMinus(tokenEarnAmountAfter, tokenEarnAmountBefore)

        return {
            amountSell, amountEarn
        }
    } catch (e) {
        return {
            amountSell: '0',
            amountEarn: '0'
        }
    }
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

async function swapY2X(swap, trader, amount, tokenX, tokenY, highPt, ) {
    await swap.connect(trader).swapY2X(
        {
            tokenX: tokenX.address, 
            tokenY: tokenY.address, 
            fee: 2000,
            recipient: trader.address,
            amount: amountAddFee(amount, 2000),
            boundaryPt: highPt,
            maxPayed: 0,
            minAcquired: 0,
            deadline: "0xffffffff"
        }
    );
}

describe("test ue earn legacyearn", function () {
    var signer, A, B, C, D, trader;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var limorderManager, limorderManager1, limorderManager2;
    var tokenX, tokenY;
    var rate;
    var aBigAmount;
    var rate;
    var pool;
    beforeEach(async function() {
        [signer, A, B, C, D, trader] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(signer.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderManager = await getLimorderManager(izumiswapFactory, weth9)
        limorderManager1 = await getLimorderManager(izumiswapFactory, weth9);
        limorderManager2 = await getLimorderManager(izumiswapFactory, weth9);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, -100);
        pool = await getPool(poolAddr, signer)

        rate = BigNumber("1.0001");
        aBigAmount = '10000000000000000000000'

        await tokenX.mint(trader.address, aBigAmount)
        await tokenX.connect(trader).approve(swap.address, aBigAmount)

        await tokenY.mint(trader.address, aBigAmount)
        await tokenY.connect(trader).approve(swap.address, aBigAmount)

        const accountList = [A, B, C, D]
        for (const account of accountList) {
            await tokenX.mint(account.address, aBigAmount)
            await tokenX.connect(account).approve(limorderManager.address, aBigAmount)
            await tokenX.connect(account).approve(limorderManager1.address, aBigAmount)
            await tokenX.connect(account).approve(limorderManager2.address, aBigAmount)
        }

        rate = 1.0001
    });

    
    it("test multiuser", async function() {
        
        await newLimOrderWithX(0, tokenX, tokenY, A, limorderManager, '10000000000', 0, 2000);
        const trade1 = '1000000000'
        await swapY2X(swap, trader, trade1, tokenX, tokenY, 1)
        await newLimOrderWithX(0, tokenX, tokenY, B, limorderManager, '10000000000', 0, 2000);
        await decLimitOrder(limorderManager, A, 0, '10000000000')
        const trade2 = '100000000'
        await swapY2X(swap, trader, trade2, tokenX, tokenY, 1)
        await newLimOrderWithX(0, tokenX, tokenY, C, limorderManager, '10000000000', 0, 2000);
        const trade3 = '10000000'
        await swapY2X(swap, trader, trade3, tokenX, tokenY, 1)
        const bCollect = await collectLimOrder(limorderManager, B, 0, tokenX, tokenY, '0', '1000000000000000')
        expect(bCollect.amountSell).to.equal('0')
        expect(bCollect.amountEarn).to.equal('110000000')
        await decLimitOrder(limorderManager, B, 0, '5000000000')
        const cCollect = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '0', '1000000000000000')
        expect(cCollect.amountSell).to.equal('0')
        expect(cCollect.amountEarn).to.equal('0')
        await newLimOrderWithX(0, tokenX, tokenY, D, limorderManager, '10000000000', 0, 2000);
        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)
        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)
        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)
        const bCollect2 = await collectLimOrder(limorderManager, B, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(bCollect2.amountSell).to.equal('5000000000')
        expect(bCollect2.amountEarn).to.equal('4890000000')
        const cCollect2 = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(cCollect2.amountSell).to.equal('0')
        expect(cCollect2.amountEarn).to.equal('10000000000')
        const aCollect = await collectLimOrder(limorderManager, A, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(aCollect.amountSell).to.equal('9000000000')
        expect(aCollect.amountEarn).to.equal('1000000000')
        const dCollect = await collectLimOrder(limorderManager, D, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(dCollect.amountSell).to.equal('0')
        expect(dCollect.amountEarn).to.equal('10000000000')
    });

    it("test multi limitorder manager", async function() {
        
        await newLimOrderWithX(0, tokenX, tokenY, A, limorderManager1, '10000000000', 0, 2000);
        const trade1 = '5000000000'
        await swapY2X(swap, trader, trade1, tokenX, tokenY, 1)
        
        await newLimOrderWithX(0, tokenX, tokenY, A, limorderManager2, '10000000000', 0, 2000);
        await newLimOrderWithX(0, tokenX, tokenY, B, limorderManager1, '10000000000', 0, 2000);
        await newLimOrderWithX(0, tokenX, tokenY, B, limorderManager2, '10000000000', 0, 2000);
        const trade2 = '500000000'
        await swapY2X(swap, trader, trade2, tokenX, tokenY, 1)
        await decLimitOrder(limorderManager2, B, 0, '2000000000')
        await newLimOrderWithX(0, tokenX, tokenY, C, limorderManager1, '10000000000', 0, 2000);
        // over
        await swapY2X(swap, trader, '10000000000000', tokenX, tokenY, 1)
        const a1 = await collectLimOrder(limorderManager1, A, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(a1.amountSell).to.equal('0')
        expect(a1.amountEarn).to.equal('10000000000')
        const b2 = await collectLimOrder(limorderManager2, B, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(b2.amountSell).to.equal('2000000000')
        expect(b2.amountEarn).to.equal('8000000000')

        const a1_1 = await collectLimOrder(limorderManager1, A, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(a1_1.amountSell).to.equal('0')
        expect(a1_1.amountEarn).to.equal('0')
        const b1_1 = await collectLimOrder(limorderManager1, B, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(b1_1.amountSell).to.equal('0')
        expect(b1_1.amountEarn).to.equal('10000000000')

        const a2_1 = await collectLimOrder(limorderManager2, A, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(a2_1.amountSell).to.equal('0')
        expect(a2_1.amountEarn).to.equal('10000000000')
        const b2_1 = await collectLimOrder(limorderManager2, B, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(b2_1.amountSell).to.equal('0')
        expect(b2_1.amountEarn).to.equal('0')

        const c1_1 = await collectLimOrder(limorderManager1, C, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(c1_1.amountSell).to.equal('0')
        expect(c1_1.amountEarn).to.equal('10000000000')
        
        const c1_2 = await collectLimOrder(limorderManager1, C, 0, tokenX, tokenY, '10000000000', '10000000000')
        expect(c1_2.amountSell).to.equal('0')
        expect(c1_2.amountEarn).to.equal('0')
    });

});