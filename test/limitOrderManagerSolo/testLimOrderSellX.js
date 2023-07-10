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
    
    it("first claim first earn", async function() {
        const sellX1 = "1000000000";
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sellX1, 5000);
        const sellX2 = "2000000000";
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller2, limitOrderManager2, sellX2, 5000);

        let acquireXExpect = stringAdd(sellX1, stringDiv(sellX2, 3))
        const costY = getCostYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), acquireXExpect)
        acquireXExpect = getEarnXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), costY)

        await swap.connect(trader).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 2000,
                recipient: trader.address,
                amount: amountAddFee(costY, 2000),
                boundaryPt: 5001,
                maxPayed: amountAddFee(costY, 2000),
                minAcquired: 0,
                deadline: '0xffffffff',
            }
        );

        await decLimOrderWithX(seller1, "0", limitOrderManager1, "500000000");
        const seller1EarnPhase1 = getEarnYFromXAt((await logPowMath.getSqrtPrice(5000)).toString(), sellX1)

        let limorder1 = await getLimOrderSolo(limitOrderManager1, 0);
        expect(limorder1.sellingRemain).to.equal('0')
        expect(limorder1.sellingDec).to.equal('0')
        expect(limorder1.earn).to.equal(seller1EarnPhase1)
        expect(limorder1.sellXEarnY).to.equal(true)

        await decLimOrderWithX(seller2, "0", limitOrderManager2, "10000");
        const seller2EarnPhase1 = stringMinus(costY, seller1EarnPhase1)
        const seller2SoldPhase1 = getCostXFromYAt((await logPowMath.getSqrtPrice(5000)).toString(), seller2EarnPhase1)
        const seller2RemainPhase1 = stringMinus(stringMinus(sellX2, seller2SoldPhase1), '10000')
        
        let limorder2 = await getLimOrderSolo(limitOrderManager2, 0);
        expect(limorder2.sellingRemain).to.equal(seller2RemainPhase1)
        expect(limorder2.sellingDec).to.equal('10000')
        expect(limorder2.earn).to.equal(seller2EarnPhase1)
        expect(limorder2.sellXEarnY).to.equal(true)

        const collect2_1 = await collectSoloLimOrder(
            limitOrderManager2, 
            tokenX, 
            tokenY, 
            seller2,
            0,
        )
        expect(collect2_1.amountY).to.equal(seller2EarnPhase1)
        expect(collect2_1.amountX).to.equal('10000')

        const collect2_2 = await collectSoloLimOrder(
            limitOrderManager2, 
            tokenX, 
            tokenY, 
            seller2,
            0,
        )
        expect(collect2_2.amountY).to.equal('0')
        expect(collect2_2.amountX).to.equal('0')
        
        const collect1_1 = await collectSoloLimOrder(
            limitOrderManager1, 
            tokenX, 
            tokenY, 
            seller1,
            0,
        )
        expect(collect1_1.amountX).to.equal('0')
        expect(collect1_1.amountY).to.equal(seller1EarnPhase1)

        const collect1_2 = await collectSoloLimOrder(
            limitOrderManager1, 
            tokenX, 
            tokenY, 
            seller1,
            0,
        )
        expect(collect1_2.amountX).to.equal('0')
        expect(collect1_2.amountY).to.equal('0')

    });
});