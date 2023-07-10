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
    
    it("sell tokenY and then sell tokenX on the same point", async function() {
        const sellY1 = "1000000000"
        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, sellY1, 5000);

        let acquireYExpect = '300000000'
        const costX = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireYExpect)
        acquireYExpect = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), costX)
        const seller1CostY = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), costX)

        const sellX1 = costX
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller2, limitOrderManager2, sellX1, 5000);
        await decLimOrderWithX(seller2, "0", limitOrderManager2, "100000000000000000000");

        let limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellingRemain).to.equal('0');
        expect(limOrder2.sellingDec).to.equal('0');
        expect(limOrder2.earn).to.equal(acquireYExpect);
        expect(limOrder2.sellXEarnY).to.equal(true)
        expect(limOrder2.pt).to.equal(5000)

        await decLimOrderWithY(seller1, "0", limitOrderManager1, "1");
        const seller2EarnPhase1 = acquireYExpect

        let limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)

        expect(limOrder1.sellingRemain).to.equal(
            stringMinus(stringMinus(sellY1, seller1CostY), '1')
        )
        expect(limOrder1.sellingDec).to.equal('1')
        expect(limOrder1.earn).to.equal(costX)
        expect(limOrder1.sellXEarnY).to.equal(false)
        expect(limOrder1.pt).to.equal(5000)

        const seller1Remain = stringMinus(stringMinus(sellY1, seller1CostY), '1')

        const acquireYExpect2 = stringMinus(stringMinus('1000000000', acquireYExpect), '1')
        const earnX2 = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), seller1Remain)
        const costX2 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireYExpect2)

        const sellX2 = stringAdd(costX2, '20000000000')

        // sell tokenX and over all origin tokenY
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller2, limitOrderManager2, sellX2, 5000);

        await decLimOrderWithY(seller1, "0", limitOrderManager1, "1000000000000000000");
        
        limOrder1 = await getLimOrderSolo(limitOrderManager1, 0)
        expect(limOrder1.sellingRemain).to.equal('0')
        expect(limOrder1.sellingDec).to.equal('1')
        expect(limOrder1.earn).to.equal(stringAdd(costX, earnX2))
        expect(limOrder1.sellXEarnY).to.equal(false)
        expect(limOrder1.pt).to.equal(5000)
        let collect1 = await collectSoloLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0)
        expect(collect1.amountX).to.equal(limOrder1.earn)
        expect(collect1.amountY).to.equal(limOrder1.sellingDec)

        let collect1_2 = await collectSoloLimOrder(limitOrderManager1, tokenX, tokenY, seller1, 0)
        expect(collect1_2.amountX).to.equal('0')
        expect(collect1_2.amountY).to.equal('0')

        await decLimOrderWithX(seller2, "1", limitOrderManager2, "1");
        await decLimOrderWithX(seller2, "0", limitOrderManager2, "1");

        const seller2EarnPhase2 = acquireYExpect2
        limOrder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limOrder2.sellingRemain).to.equal('19999999999');
        expect(limOrder2.sellingDec).to.equal('1');
        expect(limOrder2.earn).to.equal(stringAdd(acquireYExpect, acquireYExpect2));
        expect(limOrder2.sellXEarnY).to.equal(true)
        expect(limOrder2.pt).to.equal(5000)

        let collect2 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 0)
        expect(collect2.amountX).to.equal(limOrder2.sellingDec)
        expect(collect2.amountY).to.equal(limOrder2.earn)

        let collect2_2 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 0)
        expect(collect2_2.amountX).to.equal('0')
        expect(collect2_2.amountY).to.equal('0')

        let collect2_3 = await collectSoloLimOrder(limitOrderManager2, tokenX, tokenY, seller2, 1)
        expect(collect2_3.amountX).to.equal('0')
        expect(collect2_3.amountY).to.equal('0')
    });
});