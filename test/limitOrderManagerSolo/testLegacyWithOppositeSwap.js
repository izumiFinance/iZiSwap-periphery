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

async function priceMoveUp(slotIdx, tokenX, tokenY, seller, swap, limorderManager, trader, targetPoint) {

    await newLimOrderSoloWithX(slotIdx, tokenX, tokenY, seller, limorderManager, '1000000000000', targetPoint)

    await swap.connect(trader).swapY2X(
        {
            tokenX: tokenX.address, 
            tokenY: tokenY.address, 
            fee: 2000,
            recipient: trader.address,
            amount: '100000000000000000',
            boundaryPt: targetPoint + 1,
            maxPayed: '100000000000000000',
            minAcquired: 0,
            deadline: "1000000000000"
        }
    );
}

describe("limordermanagersolo sell tokeny", function () {
    var signer, seller1, seller2, seller3, seller4, seller5, trader;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var managerAddr1, managerAddr2, managerAddr3, managerAddr4, managerAddr5;
    var limitOrderManager1, limitOrderManager2, limitOrderManager3, limitOrderManager4, limitOrderManager5;
    var limitOrderManagerSoloFactory;
    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, seller4, seller5, trader, receiver] = await ethers.getSigners();

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
        await limitOrderManagerSoloFactory.connect(seller4).createManager();
        await limitOrderManagerSoloFactory.connect(seller5).createManager();
        managerAddr1 = await limitOrderManagerSoloFactory.limitOrderManager(seller1.address);
        managerAddr2 = await limitOrderManagerSoloFactory.limitOrderManager(seller2.address);
        managerAddr3 = await limitOrderManagerSoloFactory.limitOrderManager(seller3.address);
        managerAddr4 = await limitOrderManagerSoloFactory.limitOrderManager(seller4.address);
        managerAddr5 = await limitOrderManagerSoloFactory.limitOrderManager(seller5.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManager1 = LimitOrderManagerSolo.attach(managerAddr1);
        limitOrderManager2 = LimitOrderManagerSolo.attach(managerAddr2);
        limitOrderManager3 = LimitOrderManagerSolo.attach(managerAddr3);
        limitOrderManager4 = LimitOrderManagerSolo.attach(managerAddr4);
        limitOrderManager5 = LimitOrderManagerSolo.attach(managerAddr5);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, 5000);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'
        await tokenX.mint(seller1.address, aBigNumber);
        await tokenX.mint(seller2.address, aBigNumber);
        await tokenX.mint(seller3.address, aBigNumber);
        await tokenX.mint(seller4.address, aBigNumber);
        await tokenX.mint(seller5.address, aBigNumber);
        await tokenX.mint(trader.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(seller3).approve(limitOrderManager3.address, aBigNumber);
        await tokenX.connect(seller4).approve(limitOrderManager4.address, aBigNumber);
        await tokenX.connect(seller5).approve(limitOrderManager5.address, aBigNumber);
        await tokenX.connect(trader).approve(swap.address, aBigNumber);
        await tokenY.mint(seller1.address, aBigNumber);
        await tokenY.mint(seller2.address, aBigNumber);
        await tokenY.mint(seller3.address, aBigNumber);
        await tokenY.mint(seller4.address, aBigNumber);
        await tokenY.mint(seller5.address, aBigNumber);
        await tokenY.mint(trader.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(seller3).approve(limitOrderManager3.address, aBigNumber);
        await tokenY.connect(seller4).approve(limitOrderManager4.address, aBigNumber);
        await tokenY.connect(seller5).approve(limitOrderManager5.address, aBigNumber);
        await tokenY.connect(trader).approve(swap.address, aBigNumber);

    });
    
    it("first claim first earn", async function() {
        const sellY1 = "1000000000";
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, sellY1, 5000);

        const acquireY1 = '1000000000'
        const costX1 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY1)
        const earnX1 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY1)
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
                deadline: "1000000000000"
            }
        );

        const s1Collect1 = await collectSoloLimOrder(
            limitOrderManager1, tokenX, tokenY, seller1, 0
        )

        expect(s1Collect1.amountX).to.equal(earnX1)
        expect(s1Collect1.amountY).to.equal('0')

        const s1Collect1_2 = await collectSoloLimOrder(
            limitOrderManager1, tokenX, tokenY, seller1, 0
        )

        expect(s1Collect1_2.amountX).to.equal('0')
        expect(s1Collect1_2.amountY).to.equal('0')

        await priceMoveUp(0, tokenX, tokenY, seller5, swap, limitOrderManager5, trader, 6000)

        const sellY2 = "1000000000";
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, sellY2, 5000)

        const acquireY2 = '1000000000'
        const costX2 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY2)
        const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY2)
        const costX2WithFee = amountAddFee(costX2, 2000)
        const swap2 = await swap.connect(trader).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: '100000000000000000',
                boundaryPt: 4000,
                maxPayed: costX2WithFee,
                minAcquired: 0,
                deadline: "1000000000000"
            }
        );

        await priceMoveUp(0, tokenX, tokenY, seller5, swap, limitOrderManager5, trader, 6000)

        const sellY3_s2 = "1000000000"
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller2, limitOrderManager2, sellY3_s2, 5000);

        const sellY3_s3 = '1000000000'
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller3, limitOrderManager3, sellY3_s3, 5000);

        const acquireY3_least = '1000000000'
        const costX3 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY3_least)
        const acquireY3 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), costX3)
        const remainY3 = stringMinus('2000000000', acquireY3)
        // console.log('acquireY3_modify: ', acquireY3_modify)
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
                deadline: "1000000000000"
            }
        );

        await decLimOrderWithY(seller2, '0', limitOrderManager2, '1000000000')
        const earnX3 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY3)

        let limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.pt).to.equal(5000);
        expect(limOrder2.sellingRemain).to.equal('0');
        expect(limOrder2.sellingDec).to.equal('0');
        expect(limOrder2.earn).to.equal(earnX3);
        expect(limOrder2.sellXEarnY).to.equal(false);

        await updateOrderSolo(seller3, '0', limitOrderManager3)

        const earnX3ForS3 = stringMinus(costX3, earnX3)
        const soldY3ForS3 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), earnX3ForS3)
        const remainY3ForS3 = stringMinus('1000000000', soldY3ForS3)

        let limOrder3 = await getLimOrderSolo(limitOrderManager3, 0)
        expect(limOrder3.pt).to.equal(5000);
        expect(limOrder3.sellingRemain).to.equal(remainY3ForS3);
        expect(limOrder3.sellingDec).to.equal('0');
        expect(limOrder3.earn).to.equal(earnX3ForS3);
        expect(limOrder3.sellXEarnY).to.equal(false);

        await decLimOrderWithY(seller1, '0', limitOrderManager1, '1000000000')
        // const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireY1)
        let limOrder1_y = await getLimOrderSolo(limitOrderManager1, 0);
        expect(limOrder1_y.pt).to.equal(5000);
        expect(limOrder1_y.sellingRemain).to.equal('0');
        expect(limOrder1_y.sellingDec).to.equal('0');
        expect(limOrder1_y.earn).to.equal(earnX2);
        expect(limOrder1_y.sellXEarnY).to.equal(false);

        const sellX4_s1 = '1000000000'
        const offsetXForSellY = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), remainY3)
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller1, limitOrderManager1, stringAdd(sellX4_s1, offsetXForSellY), 5000);
        limOrder1_y = await getLimOrderSolo(limitOrderManager1, 0);
        expect(limOrder1_y.pt).to.equal(5000);
        expect(limOrder1_y.sellingRemain).to.equal('0');
        expect(limOrder1_y.sellingDec).to.equal('0');
        expect(limOrder1_y.earn).to.equal(earnX2);
        expect(limOrder1_y.sellXEarnY).to.equal(false);

        let limOrder1_x = await getLimOrderSolo(limitOrderManager1, 1);
        expect(limOrder1_x.pt).to.equal(5000);
        expect(limOrder1_x.sellingRemain).to.equal('1000000000');
        expect(limOrder1_x.sellingDec).to.equal('0');
        expect(limOrder1_x.earn).to.equal(remainY3);
        expect(limOrder1_x.sellXEarnY).to.equal(true);

        await updateOrderSolo(seller3, '0', limitOrderManager3)

        const earnXForRemainY3ForS3 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), remainY3ForS3)
        let limOrder3_y = await getLimOrderSolo(limitOrderManager3, 0);
        expect(limOrder3_y.pt).to.equal(5000);
        expect(limOrder3_y.sellingRemain).to.equal('0');
        expect(limOrder3_y.sellingDec).to.equal('0');
        expect(limOrder3_y.earn).to.equal(stringAdd(earnX3ForS3, earnXForRemainY3ForS3));
        expect(limOrder3_y.sellXEarnY).to.equal(false);

        const sellX4_s2 = '1000000000'
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller2, limitOrderManager2, sellX4_s2, 5000);

        const acquireX4_least = '2000000000'
        const costY4 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX4_least)
        const earnY4_s1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), sellX4_s1)
        const earnY4_s2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), sellX4_s2)
        const swap4 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: amountAddFee(costY4, 2000),
                boundaryPt: 6000,
                maxPayed: amountAddFee(costY4, 2000),
                minAcquired: 0,
                deadline: "0xffffffff"
            }
        );

        const sellX5_s3 = '1000000000'
        const sellX5_s4 = '1000000000'
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller3, limitOrderManager3, sellX5_s3, 5000);
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller4, limitOrderManager4, sellX5_s4, 5000);

        const acquireX5_least = '1500000000'
        const costY5 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireX5_least)
        const acquireX5 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), costY5)

        const swap5 = await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: amountAddFee(costY5, 2000),
                boundaryPt: 6000,
                maxPayed: amountAddFee(costY5, 2000),
                minAcquired: 0,
                deadline: "0xffffffff"
            }
        );

        const earnY5_s3 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), sellX5_s3)

        const collect5_s3 = await collectSoloLimOrder(limitOrderManager3, tokenX, tokenY, seller3, 1)
        expect(collect5_s3.amountX, '0')
        expect(collect5_s3.amountY, earnY5_s3)

        // const collect5_s4 = await collectSoloLimOrder(limitOrderManager4, tokenX, tokenY, seller4, 0)
        // expect(collect5_s4.amountX, '0')
        // expect(collect5_s4.amountY, '1')
        limOrder3_x = await getLimOrderSolo(limitOrderManager3, 1);
        expect(limOrder3_x.pt).to.equal(5000);
        expect(limOrder3_x.sellingRemain).to.equal('0');
        expect(limOrder3_x.sellingDec).to.equal('0');
        expect(limOrder3_x.earn).to.equal('0');
        expect(limOrder3_x.sellXEarnY).to.equal(true);

        await updateOrderSolo(seller4, 0, limitOrderManager4);

        const earnY5_s4 = stringMinus(costY5, earnY5_s3)
        const soldX5_s4 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), earnY5_s4)
        let limOrder4_x = await getLimOrderSolo(limitOrderManager4, 0);
        expect(limOrder4_x.pt).to.equal(5000);
        expect(limOrder4_x.sellingRemain).to.equal(stringMinus(sellX5_s4, soldX5_s4));
        expect(limOrder4_x.sellingDec).to.equal('0');
        expect(limOrder4_x.earn).to.equal(earnY5_s4);
        expect(limOrder4_x.sellXEarnY).to.equal(true);

        await updateOrderSolo(seller1, 1, limitOrderManager1);
        await updateOrderSolo(seller2, 1, limitOrderManager2);

        limOrder1_x = await getLimOrderSolo(limitOrderManager1, 1);
        expect(limOrder1_x.pt).to.equal(5000);
        expect(limOrder1_x.sellingRemain).to.equal('0');
        expect(limOrder1_x.sellingDec).to.equal('0');
        expect(limOrder1_x.earn).to.equal(stringAdd(remainY3, earnY4_s1));
        expect(limOrder1_x.sellXEarnY).to.equal(true);

        limOrder2_x = await getLimOrderSolo(limitOrderManager2, 1);
        expect(limOrder2_x.pt).to.equal(5000);
        expect(limOrder2_x.sellingRemain).to.equal('0');
        expect(limOrder2_x.sellingDec).to.equal('0');
        expect(limOrder2_x.earn).to.equal(earnY4_s2);
        expect(limOrder2_x.sellXEarnY).to.equal(true);
       
    });
});