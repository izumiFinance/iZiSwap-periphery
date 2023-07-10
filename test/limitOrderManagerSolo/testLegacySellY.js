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

describe("limordermanagersolo sell tokeny", function () {
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
    
    
    it("test legacy sell y", async function() {
        const sellY1 = "1000000000";
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, sellY1, 5000);

        const acquireY1 = '1000000000'
        const costX1 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY1)
        const costX1WithFee = amountAddFee(costX1, 2000)
        const swap1 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 4000,
                maxPayed: costX1WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await newLimOrderSoloWithX(1, tokenX, tokenY, seller1, limitOrderManager1, '1000000000000', 5000)

        await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 6000,
                maxPayed: '100000000000000000',
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        const sellY2 = "1000000000";
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller2, limitOrderManager2, sellY2, 5000);

        const sellY3 = '1000000000';
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller3, limitOrderManager3, sellY3, 5000);


        const acquireY2 = '1000000000'
        const costX2 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY2)
        const costX2WithFee = amountAddFee(costX2, 2000)

        const swap2 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: costX2WithFee,
                boundaryPt: 4000,
                maxPayed: costX2WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );

        await decLimOrderWithY(seller2, '0', limitOrderManager2, '1000000000')
        const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY2)

        let limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellXEarnY).to.equal(false)
        expect(limOrder2.sellingRemain).to.equal('0')
        expect(limOrder2.sellingDec).to.equal('0')
        expect(limOrder2.earn).to.equal(earnX2)

        await updateOrderSolo(seller3, '0', limitOrderManager3)

        const earnX2ForS3 = stringMinus(costX2, earnX2)
        const soldY2ForS3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), earnX2ForS3)
        const remainY2ForS3 = stringMinus('1000000000', soldY2ForS3)

        let limOrder3 = await getLimOrderSolo(limitOrderManager3, 0);
        expect(limOrder3.sellXEarnY).to.equal(false)
        expect(limOrder3.sellingRemain).to.equal(remainY2ForS3)
        expect(limOrder3.sellingDec).to.equal('0')
        expect(limOrder3.earn).to.equal(earnX2ForS3)

        await decLimOrderWithY(seller1, '0', limitOrderManager1, '1000000000')
        const earnX1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY1)
        let limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(false)
        expect(limOrder1.sellingRemain).to.equal('0')
        expect(limOrder1.sellingDec).to.equal('0')
        expect(limOrder1.earn).to.equal(earnX1)

        const acquireY3 = '500000000'
        const costX3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY3)
        const costX3WithFee = amountAddFee(costX3, 2000)

        const swap3 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: costX3WithFee,
                boundaryPt: 4000,
                maxPayed: costX3WithFee,
                minAcquired: 0,
                deadline: '0xffffffff'
            }
        );
        // slot specified as 2, but actual 0
        await newLimOrderSoloWithY(2, tokenX, tokenY, seller1, limitOrderManager1, '100000000000000', 5000);

        await decLimOrderWithY(seller1, 0, limitOrderManager1, '1000000000')

        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(false)
        expect(limOrder1.sellingRemain).to.equal(stringMinus('100000000000000', '1000000000'))
        expect(limOrder1.sellingDec).to.equal('1000000000')
        expect(limOrder1.earn).to.equal(earnX1)
        
        const soldY3ForS3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), costX3)
        const remainY3ForS3 = stringMinus(remainY2ForS3, soldY3ForS3)

        await decLimOrderWithY(seller3, '0', limitOrderManager3, '1000000000')
        limOrder3 = await getLimOrderSolo(limitOrderManager3, 0)
        expect(limOrder3.sellXEarnY).to.equal(false)
        expect(limOrder3.sellingRemain).to.equal('0')
        expect(limOrder3.sellingDec).to.equal(remainY3ForS3)
        expect(limOrder3.earn).to.equal(stringAdd(earnX2ForS3, costX3))

        await decLimOrderWithY(seller1, '0', limitOrderManager1, '1000000000')
        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellXEarnY).to.equal(false)
        expect(limOrder1.sellingRemain).to.equal(stringMinus('100000000000000', '2000000000'))
        expect(limOrder1.sellingDec).to.equal('2000000000')
        expect(limOrder1.earn).to.equal(earnX1)
    });
});