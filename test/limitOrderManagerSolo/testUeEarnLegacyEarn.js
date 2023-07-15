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

describe("limordermanagersolo sell tokenx", function () {
    var signer, A, B, C, D, trader;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var managerAddrA, managerAddrB, managerAddrC, managerAddrD;
    var limitOrderManagerA, limitOrderManagerB, limitOrderManagerC, limitOrderManagerD;
    var limitOrderManagerA2, limitOrderManagerB2, limitOrderManagerC2, limitOrderManagerD2;

    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, A, B, C, D, trader, receiver] = await ethers.getSigners();

        const LogPowMathTest = await ethers.getContractFactory('TestLogPowMath');
        logPowMath = await LogPowMathTest.deploy();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);

        swap = await getSwap(izumiswapFactory, weth9);
        const limitOrderManagerSoloFactory = await getLimitOrderManagerSoloFactory(izumiswapFactory, weth9);

        await limitOrderManagerSoloFactory.connect(A).createManager();
        await limitOrderManagerSoloFactory.connect(B).createManager();
        await limitOrderManagerSoloFactory.connect(C).createManager();
        await limitOrderManagerSoloFactory.connect(D).createManager();

        managerAddrA = await limitOrderManagerSoloFactory.limitOrderManager(A.address);
        managerAddrB = await limitOrderManagerSoloFactory.limitOrderManager(B.address);
        managerAddrC = await limitOrderManagerSoloFactory.limitOrderManager(C.address);
        managerAddrD = await limitOrderManagerSoloFactory.limitOrderManager(D.address);

        const limitOrderManagerSoloFactory2 = await getLimitOrderManagerSoloFactory(izumiswapFactory, weth9);

        await limitOrderManagerSoloFactory2.connect(A).createManager();
        await limitOrderManagerSoloFactory2.connect(B).createManager();
        await limitOrderManagerSoloFactory2.connect(C).createManager();
        await limitOrderManagerSoloFactory2.connect(D).createManager();

        const managerAddrA2 = await limitOrderManagerSoloFactory2.limitOrderManager(A.address);
        const managerAddrB2 = await limitOrderManagerSoloFactory2.limitOrderManager(B.address);
        const managerAddrC2 = await limitOrderManagerSoloFactory2.limitOrderManager(C.address);
        const managerAddrD2 = await limitOrderManagerSoloFactory2.limitOrderManager(D.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManagerA = LimitOrderManagerSolo.attach(managerAddrA);
        limitOrderManagerB = LimitOrderManagerSolo.attach(managerAddrB);
        limitOrderManagerC = LimitOrderManagerSolo.attach(managerAddrC);
        limitOrderManagerD = LimitOrderManagerSolo.attach(managerAddrD);
        
        limitOrderManagerA2 = LimitOrderManagerSolo.attach(managerAddrA2);
        limitOrderManagerB2 = LimitOrderManagerSolo.attach(managerAddrB2);
        limitOrderManagerC2 = LimitOrderManagerSolo.attach(managerAddrC2);
        limitOrderManagerD2 = LimitOrderManagerSolo.attach(managerAddrD2);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, 0);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'

        await tokenX.mint(A.address, aBigNumber);
        await tokenX.mint(B.address, aBigNumber);
        await tokenX.mint(C.address, aBigNumber);
        await tokenX.mint(D.address, aBigNumber);
        await tokenX.mint(trader.address, aBigNumber);

        await tokenX.connect(A).approve(limitOrderManagerA.address, aBigNumber);
        await tokenX.connect(B).approve(limitOrderManagerB.address, aBigNumber);
        await tokenX.connect(C).approve(limitOrderManagerC.address, aBigNumber);
        await tokenX.connect(D).approve(limitOrderManagerD.address, aBigNumber);
        await tokenX.connect(A).approve(limitOrderManagerA2.address, aBigNumber);
        await tokenX.connect(B).approve(limitOrderManagerB2.address, aBigNumber);
        await tokenX.connect(C).approve(limitOrderManagerC2.address, aBigNumber);
        await tokenX.connect(D).approve(limitOrderManagerD2.address, aBigNumber);
        
        await tokenX.connect(trader).approve(swap.address, aBigNumber);

        await tokenY.mint(A.address, aBigNumber);
        await tokenY.mint(B.address, aBigNumber);
        await tokenY.mint(C.address, aBigNumber);
        await tokenY.mint(D.address, aBigNumber);
        await tokenY.mint(trader.address, aBigNumber);

        await tokenY.connect(A).approve(limitOrderManagerA.address, aBigNumber);
        await tokenY.connect(B).approve(limitOrderManagerB.address, aBigNumber);
        await tokenY.connect(C).approve(limitOrderManagerC.address, aBigNumber);
        await tokenY.connect(D).approve(limitOrderManagerD.address, aBigNumber);
        
        await tokenY.connect(A).approve(limitOrderManagerA2.address, aBigNumber);
        await tokenY.connect(B).approve(limitOrderManagerB2.address, aBigNumber);
        await tokenY.connect(C).approve(limitOrderManagerC2.address, aBigNumber);
        await tokenY.connect(D).approve(limitOrderManagerD2.address, aBigNumber);

        await tokenY.connect(trader).approve(swap.address, aBigNumber);

    });
    
    it("test multiuser", async function() {
        await newLimOrderSoloWithX(0, tokenX, tokenY, A, limitOrderManagerA, '10000000000', 0);
        const trade1 = '1000000000'
        await swapY2X(swap, trader, trade1, tokenX, tokenY, 1)
        await newLimOrderSoloWithX(0, tokenX, tokenY, B, limitOrderManagerB, '10000000000', 0);
        await decLimOrderWithX(A, 0, limitOrderManagerA, '10000000000')

        const trade2 = '100000000'
        await swapY2X(swap, trader, trade2, tokenX, tokenY, 1)
        await newLimOrderSoloWithX(0, tokenX, tokenY, C, limitOrderManagerC, '10000000000', 0);

        const trade3 = '10000000'
        await swapY2X(swap, trader, trade3, tokenX, tokenY, 1)
        const bCollect = await collectSoloLimOrder(limitOrderManagerB, tokenX, tokenY, B, 0)
        expect(bCollect.amountX).to.equal('0')
        expect(bCollect.amountY).to.equal('110000000')

        await decLimOrderWithX(B, 0, limitOrderManagerB, '5000000000')

        const cCollect = await collectSoloLimOrder(limitOrderManagerB, tokenX, tokenY, C, 0)
        expect(cCollect.amountX).to.equal('0')
        expect(cCollect.amountY).to.equal('0')
        await newLimOrderSoloWithX(0, tokenX, tokenY, D, limitOrderManagerD, '10000000000', 0);

        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)
        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)
        await swapY2X(swap, trader, '10000000000', tokenX, tokenY, 1)

        const bCollect2 = await collectSoloLimOrder(limitOrderManagerB, tokenX, tokenY, B, 0)
        expect(bCollect2.amountX).to.equal('5000000000')
        expect(bCollect2.amountY).to.equal('4890000000')
        const cCollect2 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(cCollect2.amountX).to.equal('0')
        expect(cCollect2.amountY).to.equal('10000000000')
        const aCollect = await collectSoloLimOrder(limitOrderManagerA, tokenX, tokenY, A, 0)
        expect(aCollect.amountX).to.equal('9000000000')
        expect(aCollect.amountY).to.equal('1000000000')
        const dCollect = await collectSoloLimOrder(limitOrderManagerD, tokenX, tokenY, D, 0)
        expect(dCollect.amountX).to.equal('0')
        expect(dCollect.amountY).to.equal('10000000000')
    });


    it("test multi limitorder manager", async function() {
        
        await newLimOrderSoloWithX(0, tokenX, tokenY, A, limitOrderManagerA, '10000000000', 0);
        const trade1 = '5000000000'
        await swapY2X(swap, trader, trade1, tokenX, tokenY, 1)
        
        await newLimOrderSoloWithX(0, tokenX, tokenY, A, limitOrderManagerA2, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, B, limitOrderManagerB, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, B, limitOrderManagerB2, '10000000000', 0);

        const trade2 = '500000000'
        await swapY2X(swap, trader, trade2, tokenX, tokenY, 1)
        await decLimOrderWithX(B, 0, limitOrderManagerB2, '2000000000')
        await newLimOrderSoloWithX(0, tokenX, tokenY, C, limitOrderManagerC, '10000000000', 0);

        // over
        await swapY2X(swap, trader, '10000000000000', tokenX, tokenY, 1)
        const a1 = await collectSoloLimOrder(limitOrderManagerA, tokenX, tokenY, A, 0)
        expect(a1.amountX).to.equal('0')
        expect(a1.amountY).to.equal('10000000000')

        const b2 = await collectSoloLimOrder(limitOrderManagerB2, tokenX, tokenY, B, 0)
        expect(b2.amountX).to.equal('2000000000')
        expect(b2.amountY).to.equal('8000000000')

        const a1_1 = await collectSoloLimOrder(limitOrderManagerA, tokenX, tokenY, A, 0)
        expect(a1_1.amountX).to.equal('0')
        expect(a1_1.amountY).to.equal('0')
        const b1_1 = await collectSoloLimOrder(limitOrderManagerB, tokenX, tokenY, B, 0)
        expect(b1_1.amountX).to.equal('0')
        expect(b1_1.amountY).to.equal('10000000000')

        const a2_1 = await collectSoloLimOrder(limitOrderManagerA2, tokenX, tokenY, A, 0)
        expect(a2_1.amountX).to.equal('0')
        expect(a2_1.amountY).to.equal('10000000000')
        const b2_1 = await collectSoloLimOrder(limitOrderManagerB2, tokenX, tokenY, B, 0)
        expect(b2_1.amountX).to.equal('0')
        expect(b2_1.amountY).to.equal('0')

        const c1_1 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(c1_1.amountX).to.equal('0')
        expect(c1_1.amountY).to.equal('10000000000')
        
        const c1_2 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(c1_2.amountX).to.equal('0')
        expect(c1_2.amountY).to.equal('0')
    });
});