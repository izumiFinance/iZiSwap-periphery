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
    var signer, seller1, seller2, trader;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var managerAddr1, managerAddr2;
    var limitOrderManager1, limitOrderManager2;
    var limitOrderManagerSoloFactory;
    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, seller1, seller2, trader, receiver] = await ethers.getSigners();

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
        managerAddr1 = await limitOrderManagerSoloFactory.limitOrderManager(seller1.address);
        managerAddr2 = await limitOrderManagerSoloFactory.limitOrderManager(seller2.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManager1 = LimitOrderManagerSolo.attach(managerAddr1);
        limitOrderManager2 = LimitOrderManagerSolo.attach(managerAddr2);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, 5000);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'
        await tokenX.mint(seller1.address, aBigNumber);
        await tokenX.mint(seller2.address, aBigNumber);
        await tokenX.mint(trader.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(trader).approve(swap.address, aBigNumber);
        await tokenY.mint(seller1.address, aBigNumber);
        await tokenY.mint(seller2.address, aBigNumber);
        await tokenY.mint(trader.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(trader).approve(swap.address, aBigNumber);

    });
    
    it("sell tokenX and then sell tokenY on the same point", async function() {
        const sellX1 = "1000000000"
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, 5000);

        let acquireXExpect = '300000000'
        const costY = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireXExpect)
        acquireXExpect = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), costY)
        const seller1CostX = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), costY)

        const sellY1 = costY
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller2, limitOrderManager2, sellY1, 5000);
        await decLimOrderWithY(seller2, "0", limitOrderManager2, "100000000000000000000");

        let limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellingRemain).to.equal('0');
        expect(limOrder2.sellingDec).to.equal('0');
        expect(limOrder2.earn).to.equal(acquireXExpect);
        expect(limOrder2.sellXEarnY).to.equal(false)
        expect(limOrder2.pt).to.equal(5000)

        await decLimOrderWithX(seller1, "0", limitOrderManager1, "1");
        const seller2EarnPhase1 = acquireXExpect

        let limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)

        expect(limOrder1.sellingRemain).to.equal(
            stringMinus(stringMinus(sellX1, seller1CostX), '1')
        )
        expect(limOrder1.sellingDec).to.equal('1')
        expect(limOrder1.earn).to.equal(costY)
        expect(limOrder1.sellXEarnY).to.equal(true)
        expect(limOrder1.pt).to.equal(5000)

        const seller1Remain = stringMinus(stringMinus(sellX1, seller1CostX), '1')

        const acquireXExpect2 = stringMinus(stringMinus('1000000000', acquireXExpect), '1')
        const earnY2 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), seller1Remain)
        const costY2 = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireXExpect2)

        const sellY2 = stringAdd(costY2, '20000000000')

        // sell tokenY and over all origin tokenX
        await newLimOrderSoloWithY(1, tokenX, tokenY, seller2, limitOrderManager2, sellY2, 5000);

        await decLimOrderWithX(seller1, "0", limitOrderManager1, "1000000000000000000");
        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)

        expect(limOrder1.sellingRemain).to.equal('0')
        expect(limOrder1.sellingDec).to.equal('1')
        expect(limOrder1.earn).to.equal(stringAdd(costY, earnY2))
        expect(limOrder1.sellXEarnY).to.equal(true)
        expect(limOrder1.pt).to.equal(5000)
        let collect1 = await collectSoloLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0)
        expect(collect1.amountX).to.equal(limOrder1.sellingDec)
        expect(collect1.amountY).to.equal(limOrder1.earn)

        let collect1_2 = await collectSoloLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0)
        expect(collect1_2.amountX).to.equal('0')
        expect(collect1_2.amountY).to.equal('0')

        await decLimOrderWithY(seller2, "1", limitOrderManager2, "1");
        await decLimOrderWithY(seller2, "0", limitOrderManager2, "1");

        const seller2EarnPhase2 = acquireXExpect2
        limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellingRemain).to.equal('19999999999');
        expect(limOrder2.sellingDec).to.equal('1');
        expect(limOrder2.earn).to.equal(stringAdd(acquireXExpect, acquireXExpect2));
        expect(limOrder2.sellXEarnY).to.equal(false)
        expect(limOrder2.pt).to.equal(5000)

        let collect2 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 0)
        expect(collect2.amountY).to.equal(limOrder2.sellingDec)
        expect(collect2.amountX).to.equal(limOrder2.earn)

        let collect2_2 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 0)
        expect(collect2_2.amountX).to.equal('0')
        expect(collect2_2.amountY).to.equal('0')

        let collect2_3 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 1)
        expect(collect2_3.amountX).to.equal('0')
        expect(collect2_3.amountY).to.equal('0')
    });
});