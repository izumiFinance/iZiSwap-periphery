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
    newLimOrderWithY
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

async function swapY2X(swap, trader, amount, tokenX, tokenY, highPt) {
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

async function swapX2Y(swap, trader, amount, tokenX, tokenY, lowPt) {
    await swap.connect(trader).swapX2Y(
        {
            tokenX: tokenX.address, 
            tokenY: tokenY.address, 
            fee: 2000,
            recipient: trader.address,
            amount: amountAddFee(amount, 2000),
            boundaryPt: lowPt,
            maxPayed: 0,
            minAcquired: 0,
            deadline: "0xffffffff"
        }
    );
}
describe("test ue earn legacyearn", function () {
    var signer, A, B, C, D, E, F, G, H;
    var izumiswapFactory;
    var pool;
    var weth9;
    var nflm;
    var swap;
    var limorderManager;
    var tokenX, tokenY;
    var rate;
    var aBigAmount;
    var rate;
    beforeEach(async function() {
        [signer, A, B, C, D, E, F, G, H] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(signer.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderManager = await getLimorderManager(izumiswapFactory, weth9);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, -100);
        pool = await getPool(poolAddr, signer)
        rate = BigNumber("1.0001");
        aBigAmount = '10000000000000000000000'

        await tokenX.mint(signer.address, aBigAmount)
        await tokenX.connect(signer).approve(swap.address, aBigAmount)

        await tokenY.mint(signer.address, aBigAmount)
        await tokenY.connect(signer).approve(swap.address, aBigAmount)

        const accountList = [signer, A, B, C, D, E, F, G]
        for (const account of accountList) {
            await tokenX.mint(account.address, aBigAmount)
            await tokenX.connect(account).approve(limorderManager.address, aBigAmount)
            await tokenY.mint(account.address, aBigAmount)
            await tokenY.connect(account).approve(limorderManager.address, aBigAmount)
        }

        rate = 1.0001
    });

    
    it("test multiuser offset over", async function() {
        await newLimOrderWithX(0, tokenX, tokenY, A, limorderManager, '10000000000', 0, 2000)
        await swapY2X(swap, signer, '1000000000', tokenX, tokenY, 1)
        await newLimOrderWithY(0, tokenX, tokenY, B, limorderManager, '9000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, C, limorderManager, '10000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, D, limorderManager, '10000000000', 0, 2000)
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        await newLimOrderWithY(0, tokenX, tokenY, E, limorderManager, '5000000000', 0, 2000)
        await newLimOrderWithY(0, tokenX, tokenY, F, limorderManager, '20000000000', 0, 2000)

        await newLimOrderWithX(0, tokenX, tokenY, signer, limorderManager, '10000000000', 40, 2000)
        // move price up, > 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 1000)
        // move price down, < 1
        await swapX2Y(swap, signer, '1000000000000', tokenX, tokenY, -1000)

        await newLimOrderWithX(1, tokenX, tokenY, signer, limorderManager, '10000000000', -40, 2000)
        // move price up, = 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 0)

        await newLimOrderWithX(0, tokenX, tokenY, G, limorderManager, '10000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, H, limorderManager, '10000000000', 0, 2000)

        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)

        // g claim earn with a large number
        const gCollect1 = await collectLimOrder(limorderManager, G, 0, tokenX, tokenY, '0', '10000000000000000000')
        expect(gCollect1.amountSell).to.equal('0')
        expect(gCollect1.amountEarn).to.equal('5000000000')
        // h claim earn with a large number
        const hCollect1 = await collectLimOrder(limorderManager, H, 0, tokenX, tokenY, '0', '10000000000000000000')
        expect(hCollect1.amountSell).to.equal('0')
        // legacy has updated for sellingX on 0 point
        expect(hCollect1.amountEarn).to.equal('0')

        const aCollect1 = await collectLimOrder(limorderManager, A, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(aCollect1.amountSell).to.equal('0')
        expect(aCollect1.amountEarn).to.equal('10000000000')

        const cDec = await decLimitOrder(limorderManager, C, 0, '1000000000')
        const cCollect1 = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '10000000000000000000', '0')
        expect(cCollect1.amountSell).to.equal('0')
        expect(cCollect1.amountEarn).to.equal('0')
        const fDec = await decLimitOrder(limorderManager, F, 0, '1000000000')
        const fCollect1 = await collectLimOrder(limorderManager, F, 0, tokenX, tokenY, '10000000000000000000', '0')
        expect(fCollect1.amountSell).to.equal('0')
        expect(fCollect1.amountEarn).to.equal('0')
        const gDec = await decLimitOrder(limorderManager, G, 0, '5000000000')
        const gCollect2 = await collectLimOrder(limorderManager, G, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(gCollect2.amountSell).to.equal('5000000000')
        expect(gCollect2.amountEarn).to.equal('0')

        await newLimOrderWithY(1, tokenX, tokenY, H, limorderManager, '5000000000', 0, 2000)
        const hCollect2 = await collectLimOrder(limorderManager, H, 1, tokenY, tokenX, '10000000000000000000', '10000000000000000000')
        expect(hCollect2.amountSell).to.equal('0')
        expect(hCollect2.amountEarn).to.equal('5000000000')
        
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        const hCollect3 = await collectLimOrder(limorderManager, H, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(hCollect3.amountSell).to.equal('0')
        expect(hCollect3.amountEarn).to.equal('10000000000')

        const fCollect2 = await collectLimOrder(limorderManager, F, 0, tokenY, tokenX, '10000000000000000000', '10000000000000000000')
        expect(fCollect2.amountSell).to.equal('0')
        expect(fCollect2.amountEarn).to.equal('20000000000')

        const cCollect2 = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(cCollect2.amountSell).to.equal('0')
        expect(cCollect2.amountEarn).to.equal('10000000000')
        const dCollect2 = await collectLimOrder(limorderManager, D, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(dCollect2.amountSell).to.equal('0')
        expect(dCollect2.amountEarn).to.equal('10000000000')
    });
    
    it("test multiuser offset exactly", async function() {
        await newLimOrderWithX(0, tokenX, tokenY, A, limorderManager, '10000000000', 0, 2000)
        await swapY2X(swap, signer, '1000000000', tokenX, tokenY, 1)
        await newLimOrderWithY(0, tokenX, tokenY, B, limorderManager, '9000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, C, limorderManager, '10000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, D, limorderManager, '10000000000', 0, 2000)
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        await newLimOrderWithY(0, tokenX, tokenY, E, limorderManager, '15000000000', 0, 2000)

        await newLimOrderWithX(0, tokenX, tokenY, signer, limorderManager, '10000000000', 40, 2000)
        await newLimOrderWithY(1, tokenX, tokenY, signer, limorderManager, '10000000000', -40, 2000)
        // move price up, > 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 1000)
        // move price down, < 1
        await swapX2Y(swap, signer, '1000000000000', tokenX, tokenY, -1000)

        await newLimOrderWithX(2, tokenX, tokenY, signer, limorderManager, '10000000000', -40, 2000)
        // move price up, = 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 0)

        await newLimOrderWithX(0, tokenX, tokenY, G, limorderManager, '10000000000', 0, 2000)
        await newLimOrderWithX(0, tokenX, tokenY, H, limorderManager, '10000000000', 0, 2000)

        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)

        // g claim earn with a large number
        const gCollect1 = await collectLimOrder(limorderManager, G, 0, tokenX, tokenY, '0', '10000000000000000000')
        expect(gCollect1.amountSell).to.equal('0')
        expect(gCollect1.amountEarn).to.equal('5000000000')
        // h claim earn with a large number
        const hCollect1 = await collectLimOrder(limorderManager, H, 0, tokenX, tokenY, '0', '10000000000000000000')
        expect(hCollect1.amountSell).to.equal('0')
        expect(hCollect1.amountEarn).to.equal('5000000000')

        const aCollect1 = await collectLimOrder(limorderManager, A, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(aCollect1.amountSell).to.equal('0')
        expect(aCollect1.amountEarn).to.equal('10000000000')

        const cDec = await decLimitOrder(limorderManager, C, 0, '1000000000')
        const cCollect1 = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '10000000000000000000', '0')
        expect(cCollect1.amountSell).to.equal('0')
        expect(cCollect1.amountEarn).to.equal('0')
        
        const gDec = await decLimitOrder(limorderManager, G, 0, '5000000000')
        const gCollect2 = await collectLimOrder(limorderManager, G, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(gCollect2.amountSell).to.equal('5000000000')
        expect(gCollect2.amountEarn).to.equal('0')

        await newLimOrderWithY(1, tokenX, tokenY, H, limorderManager, '5000000000', 0, 2000)
        
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        
        const hCollect2 = await collectLimOrder(limorderManager, H, 1, tokenY, tokenX, '10000000000000000000', '10000000000000000000')
        expect(hCollect2.amountSell).to.equal('0')
        expect(hCollect2.amountEarn).to.equal('5000000000')
        
        const hCollect3 = await collectLimOrder(limorderManager, H, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(hCollect3.amountSell).to.equal('0')
        expect(hCollect3.amountEarn).to.equal('5000000000')

        const cCollect2 = await collectLimOrder(limorderManager, C, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(cCollect2.amountSell).to.equal('0')
        expect(cCollect2.amountEarn).to.equal('10000000000')
        const dCollect2 = await collectLimOrder(limorderManager, D, 0, tokenX, tokenY, '10000000000000000000', '10000000000000000000')
        expect(dCollect2.amountSell).to.equal('0')
        expect(dCollect2.amountEarn).to.equal('10000000000')
    });

});