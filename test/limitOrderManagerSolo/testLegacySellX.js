const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { 
    getPoolParts, 
    getIzumiswapFactory, 
    newLimOrderSoloWithX, 
    newLimOrderSoloWithY, 
    addLimOrderSolo,
    collectSoloLimOrder, 
    getLimOrderSolo,
    decLimOrderWithX, 
    checkArrEqual, 
    stringMinus, 
    stringAdd, 
    stringMul, 
    stringDiv,
    decLimOrderWithY,
    updateOrderSolo,
    getWETH9,
    getNFTLiquidityManager,
    getSwap,
    getLimitOrderManagerSoloFactory,
    getCostYFromXAt,
    amountAddFee,
    getEarnXFromYAt,
    getEarnYFromXAt,
    getCostXFromYAt,
} = require("../funcs.js")

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

describe("limordermanagersolo sell tokenx", function () {
    var signer, seller1, seller2, seller3, trader;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var managerAddr1, managerAddr2, managerAddr3;
    var limitOrderManager1, limitOrderManager2, limitOrderManager3;
    var limitOrderManagerSoloFactory;
    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, receiver] = await ethers.getSigners();

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);

        swap = await getSwap(izumiswapFactory, weth9);
        limitOrderManagerSoloFactory = await getLimitOrderManagerSoloFactory(izumiswapFactory, weth9);

        await limitOrderManagerSoloFactory.connect(seller1).createManager();
        await limitOrderManagerSoloFactory.connect(seller2).createManager();
        await limitOrderManagerSoloFactory.connect(seller3).createManager();
        managerAddr1 = await limitOrderManagerSoloFactory.limitOrderManager(seller1.address);
        managerAddr2 = await limitOrderManagerSoloFactory.limitOrderManager(seller2.address);
        managerAddr3 = await limitOrderManagerSoloFactory.limitOrderManager(seller3.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManager1 = LimitOrderManagerSolo.attach(managerAddr1);
        limitOrderManager2 = LimitOrderManagerSolo.attach(managerAddr2);
        limitOrderManager3 = LimitOrderManagerSolo.attach(managerAddr3);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, 5000);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'
        await tokenX.mint(seller1.address, aBigNumber);
        await tokenX.mint(seller2.address, aBigNumber);
        await tokenX.mint(seller3.address, aBigNumber);
        await tokenX.mint(trader.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(seller3).approve(limitOrderManager3.address, aBigNumber);
        await tokenX.connect(trader).approve(swap.address, aBigNumber);
        await tokenY.mint(seller1.address, aBigNumber);
        await tokenY.mint(seller2.address, aBigNumber);
        await tokenY.mint(seller3.address, aBigNumber);
        await tokenY.mint(trader.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(seller3).approve(limitOrderManager3.address, aBigNumber);
        await tokenY.connect(trader).approve(swap.address, aBigNumber);

    });
    
    
    it("test legacy sell x", async function() {
        const sellX1 = "1000000000";
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, 5000);

        const acquireX1 = '1000000000'
        const costY1 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX1)
        const costY1WithFee = amountAddFee(costY1, 2000)
        const swap1 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 6000,
                maxPayed: costY1WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await newLimOrderSoloWithY(1, tokenX, tokenY, seller1, limitOrderManager1, '1000000000000', 5000)

        await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 4000,
                maxPayed: '100000000000000000',
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const sellX2 = "1000000000";
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller2, limitOrderManager2, sellX2, 5000);

        const sellX3 = '1000000000';
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller3, limitOrderManager3, sellX3, 5000);


        const acquireX2 = '1000000000'
        const costY2 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX2)
        const costY2WithFee = amountAddFee(costY2, 2000)

        const swap2 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: costY2WithFee,
                boundaryPt: 6000,
                maxPayed: costY2WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await decLimOrderWithX(seller2, '0', limitOrderManager2, '1000000000')
        const earnY2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX2)

        let limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellXEarnY).to.equal(true)
        expect(limOrder2.sellingRemain).to.equal('0')
        expect(limOrder2.sellingDec).to.equal('0')
        expect(limOrder2.earn).to.equal(earnY2)
        await updateOrderSolo(seller2, '0', limitOrderManager3)
        await updateOrderSolo(seller3, '0', limitOrderManager3)

        const earnY2ForS3 = stringMinus(costY2, earnY2)
        const soldX2ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), earnY2ForS3)
        const remainX2ForS3 = stringMinus('1000000000', soldX2ForS3)

        let limOrder3 = await getLimOrderSolo(limitOrderManager3, 0);
        expect(limOrder3.sellXEarnY).to.equal(true)
        expect(limOrder3.sellingRemain).to.equal(remainX2ForS3)
        expect(limOrder3.sellingDec).to.equal('0')
        expect(limOrder3.earn).to.equal(earnY2ForS3)

        await decLimOrderWithX(seller1, '0', limitOrderManager1, '1000000000')
        const earnY1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX1)
        let limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(true)
        expect(limOrder1.sellingRemain).to.equal('0')
        expect(limOrder1.sellingDec).to.equal('0')
        expect(limOrder1.earn).to.equal(earnY1)

        const acquireX3 = '500000000'
        const costY3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX3)
        const costY3WithFee = amountAddFee(costY3, 2000)

        const swap3 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: costY3WithFee,
                boundaryPt: 6000,
                maxPayed: costY3WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );
        // slot specified as 2, but actual 0
        await newLimOrderSoloWithX(2, tokenX, tokenY, seller1, limitOrderManager1, '100000000000000', 5000);

        await decLimOrderWithX(seller1, 0, limitOrderManager1, '1000000000')

        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(true)
        expect(limOrder1.sellingRemain).to.equal(stringMinus('100000000000000', '1000000000'))
        expect(limOrder1.sellingDec).to.equal('1000000000')
        expect(limOrder1.earn).to.equal(earnY1)
        
        const soldX3ForS3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), costY3)
        const remainX3ForS3 = stringMinus(remainX2ForS3, soldX3ForS3)

        await decLimOrderWithX(seller3, '0', limitOrderManager3, '1000000000')
        limOrder3 = await getLimOrderSolo(limitOrderManager3, 0)
        expect(limOrder3.sellXEarnY).to.equal(true)
        expect(limOrder3.sellingRemain).to.equal('0')
        expect(limOrder3.sellingDec).to.equal(remainX3ForS3)
        expect(limOrder3.earn).to.equal(stringAdd(earnY2ForS3, costY3))

        await decLimOrderWithX(seller1, '0', limitOrderManager1, '1000000000')
        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(true)
        expect(limOrder1.sellingRemain).to.equal(stringMinus('100000000000000', '2000000000'))
        expect(limOrder1.sellingDec).to.equal('2000000000')
        expect(limOrder1.earn).to.equal(earnY1)
    });
});