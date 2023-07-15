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
describe("limordermanagersolo sell tokenx", function () {
    var signer, A, B, C, D, E, F, G, H;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;

    var limitOrderManagerA, 
        limitOrderManagerB, 
        limitOrderManagerC, 
        limitOrderManagerD,
        limitOrderManagerE,
        limitOrderManagerF,
        limitOrderManagerG,
        limitOrderManagerH,
        limitOrderManagerSigner;
    
    var tokenX, tokenY;
    var rate;
    var aBigNumber;
    beforeEach(async function() {
        [signer, A, B, C, D, E, F, G, H, receiver] = await ethers.getSigners();

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
        await limitOrderManagerSoloFactory.connect(E).createManager();
        await limitOrderManagerSoloFactory.connect(F).createManager();
        await limitOrderManagerSoloFactory.connect(G).createManager();
        await limitOrderManagerSoloFactory.connect(H).createManager();
        await limitOrderManagerSoloFactory.connect(signer).createManager();

        const managerAddrA = await limitOrderManagerSoloFactory.limitOrderManager(A.address);
        const managerAddrB = await limitOrderManagerSoloFactory.limitOrderManager(B.address);
        const managerAddrC = await limitOrderManagerSoloFactory.limitOrderManager(C.address);
        const managerAddrD = await limitOrderManagerSoloFactory.limitOrderManager(D.address);
        const managerAddrE = await limitOrderManagerSoloFactory.limitOrderManager(E.address);
        const managerAddrF = await limitOrderManagerSoloFactory.limitOrderManager(F.address);
        const managerAddrG = await limitOrderManagerSoloFactory.limitOrderManager(G.address);
        const managerAddrH = await limitOrderManagerSoloFactory.limitOrderManager(H.address);
        const managerAddrSigner = await limitOrderManagerSoloFactory.limitOrderManager(signer.address);

        const LimitOrderManagerSolo = await ethers.getContractFactory("LimitOrderManagerSolo");
        limitOrderManagerA = LimitOrderManagerSolo.attach(managerAddrA);
        limitOrderManagerB = LimitOrderManagerSolo.attach(managerAddrB);
        limitOrderManagerC = LimitOrderManagerSolo.attach(managerAddrC);
        limitOrderManagerD = LimitOrderManagerSolo.attach(managerAddrD);
        limitOrderManagerE = LimitOrderManagerSolo.attach(managerAddrE);
        limitOrderManagerF = LimitOrderManagerSolo.attach(managerAddrF);
        limitOrderManagerG = LimitOrderManagerSolo.attach(managerAddrG);
        limitOrderManagerH = LimitOrderManagerSolo.attach(managerAddrH);
        limitOrderManagerSigner = LimitOrderManagerSolo.attach(managerAddrSigner);
        
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
        await tokenX.mint(E.address, aBigNumber);
        await tokenX.mint(F.address, aBigNumber);
        await tokenX.mint(G.address, aBigNumber);
        await tokenX.mint(H.address, aBigNumber);
        await tokenX.mint(signer.address, aBigNumber);

        await tokenX.connect(A).approve(limitOrderManagerA.address, aBigNumber);
        await tokenX.connect(B).approve(limitOrderManagerB.address, aBigNumber);
        await tokenX.connect(C).approve(limitOrderManagerC.address, aBigNumber);
        await tokenX.connect(D).approve(limitOrderManagerD.address, aBigNumber);
        await tokenX.connect(E).approve(limitOrderManagerE.address, aBigNumber);
        await tokenX.connect(F).approve(limitOrderManagerF.address, aBigNumber);
        await tokenX.connect(G).approve(limitOrderManagerG.address, aBigNumber);
        await tokenX.connect(H).approve(limitOrderManagerH.address, aBigNumber);
        await tokenX.connect(signer).approve(limitOrderManagerSigner.address, aBigNumber);
        await tokenX.connect(signer).approve(swap.address, aBigNumber);

        await tokenY.mint(A.address, aBigNumber);
        await tokenY.mint(B.address, aBigNumber);
        await tokenY.mint(C.address, aBigNumber);
        await tokenY.mint(D.address, aBigNumber);
        await tokenY.mint(E.address, aBigNumber);
        await tokenY.mint(F.address, aBigNumber);
        await tokenY.mint(G.address, aBigNumber);
        await tokenY.mint(H.address, aBigNumber);
        await tokenY.mint(signer.address, aBigNumber);

        await tokenY.connect(A).approve(limitOrderManagerA.address, aBigNumber);
        await tokenY.connect(B).approve(limitOrderManagerB.address, aBigNumber);
        await tokenY.connect(C).approve(limitOrderManagerC.address, aBigNumber);
        await tokenY.connect(D).approve(limitOrderManagerD.address, aBigNumber);
        await tokenY.connect(E).approve(limitOrderManagerE.address, aBigNumber);
        await tokenY.connect(F).approve(limitOrderManagerF.address, aBigNumber);
        await tokenY.connect(G).approve(limitOrderManagerG.address, aBigNumber);
        await tokenY.connect(H).approve(limitOrderManagerH.address, aBigNumber);
        await tokenY.connect(signer).approve(limitOrderManagerSigner.address, aBigNumber);
        await tokenY.connect(signer).approve(swap.address, aBigNumber);

    });
    
    
    it("test multiuser offset over", async function() {
        await newLimOrderSoloWithX(0, tokenX, tokenY, A, limitOrderManagerA, '10000000000', 0);
        await swapY2X(swap, signer, '1000000000', tokenX, tokenY, 1)
        await newLimOrderSoloWithY(0, tokenX, tokenY, B, limitOrderManagerB, '9000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, C, limitOrderManagerC, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, D, limitOrderManagerD, '10000000000', 0);
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)

        await newLimOrderSoloWithY(0, tokenX, tokenY, E, limitOrderManagerE, '5000000000', 0);
        await newLimOrderSoloWithY(0, tokenX, tokenY, F, limitOrderManagerF, '20000000000', 0);

        await newLimOrderSoloWithX(0, tokenX, tokenY, signer, limitOrderManagerSigner, '10000000000', 40);
        // move price up, > 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 1000)
        // move price down, < 1
        await swapX2Y(swap, signer, '1000000000000', tokenX, tokenY, -1000)
        await newLimOrderSoloWithX(1, tokenX, tokenY, signer, limitOrderManagerSigner, '10000000000', -40);
        // move price up, = 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 0)

        await newLimOrderSoloWithX(0, tokenX, tokenY, G, limitOrderManagerG, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, H, limitOrderManagerH, '10000000000', 0);

        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)

        // g claim earn with a large number
        const gCollect1 = await collectSoloLimOrder(limitOrderManagerG, tokenX, tokenY, G, 0)
        expect(gCollect1.amountX).to.equal('0')
        expect(gCollect1.amountY).to.equal('5000000000')

        // h claim earn with a large number
        const hCollect1 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 0)
        expect(hCollect1.amountX).to.equal('0')
        // legacy has updated for sellingX on 0 point
        expect(hCollect1.amountY).to.equal('0')

        const aCollect1 = await collectSoloLimOrder(limitOrderManagerA, tokenX, tokenY, A, 0)
        expect(aCollect1.amountX).to.equal('0')
        expect(aCollect1.amountY).to.equal('10000000000')

        await decLimOrderWithX(C, 0, limitOrderManagerC, '1000000000')
        const cCollect1 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(cCollect1.amountX).to.equal('0')
        expect(cCollect1.amountY).to.equal('10000000000')
        
        await decLimOrderWithY(F, 0, limitOrderManagerF, '1000000000')
        const fCollect1 = await collectSoloLimOrder(limitOrderManagerF, tokenX, tokenY, F, 0)
        expect(fCollect1.amountX).to.equal('20000000000')
        expect(fCollect1.amountY).to.equal('0')

        await decLimOrderWithX(G, 0, limitOrderManagerG, '5000000000')
        const gCollect2 = await collectSoloLimOrder(limitOrderManagerG, tokenX, tokenY, G, 0)
        expect(gCollect2.amountX).to.equal('5000000000')
        expect(gCollect2.amountY).to.equal('0')
        
        await newLimOrderSoloWithY(1, tokenX, tokenY, H, limitOrderManagerH, '5000000000', 0);
        const hCollect2 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 1)
        expect(hCollect2.amountX).to.equal('5000000000')
        expect(hCollect2.amountY).to.equal('0')
        
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        const hCollect3 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 0)
        expect(hCollect3.amountX).to.equal('0')
        expect(hCollect3.amountY).to.equal('10000000000')

        const fCollect2 = await collectSoloLimOrder(limitOrderManagerF, tokenX, tokenY, F, 0)
        // earned x has been collect in fCollect1
        expect(fCollect2.amountX).to.equal('0')
        expect(fCollect2.amountY).to.equal('0')

        const cCollect2 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(cCollect2.amountX).to.equal('0')
        // earned y has been collect in cCollect1
        expect(cCollect2.amountY).to.equal('0')

        const dCollect2 = await collectSoloLimOrder(limitOrderManagerD, tokenX, tokenY, D, 0)
        expect(dCollect2.amountX).to.equal('0')
        expect(dCollect2.amountY).to.equal('10000000000')

    });

    it("test multiuser offset exactly", async function() {
        await newLimOrderSoloWithX(0, tokenX, tokenY, A, limitOrderManagerA, '10000000000', 0);
        await swapY2X(swap, signer, '1000000000', tokenX, tokenY, 1)
        await newLimOrderSoloWithY(0, tokenX, tokenY, B, limitOrderManagerB, '9000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, C, limitOrderManagerC, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, D, limitOrderManagerD, '10000000000', 0);
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        await newLimOrderSoloWithY(0, tokenX, tokenY, E, limitOrderManagerE, '15000000000', 0);
        
        await newLimOrderSoloWithX(0, tokenX, tokenY, signer, limitOrderManagerSigner, '10000000000', 40);
        await newLimOrderSoloWithY(1, tokenX, tokenY, signer, limitOrderManagerSigner, '10000000000', -40);
        // move price up, > 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 1000)
        // move price down, < 1
        await swapX2Y(swap, signer, '1000000000000', tokenX, tokenY, -1000)
        
        await newLimOrderSoloWithX(2, tokenX, tokenY, signer, limitOrderManagerSigner, '10000000000', -40);
        // move price up, = 1
        await swapY2X(swap, signer, '1000000000000', tokenX, tokenY, 0)
        await newLimOrderSoloWithX(0, tokenX, tokenY, G, limitOrderManagerG, '10000000000', 0);
        await newLimOrderSoloWithX(0, tokenX, tokenY, H, limitOrderManagerH, '10000000000', 0);

        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)

        // g claim earn with a large number
        const gCollect1 = await collectSoloLimOrder(limitOrderManagerG, tokenX, tokenY, G, 0)
        expect(gCollect1.amountX).to.equal('0')
        expect(gCollect1.amountY).to.equal('5000000000')
        // h claim earn with a large number
        const hCollect1 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 0)
        expect(hCollect1.amountX).to.equal('0')
        expect(hCollect1.amountY).to.equal('5000000000')

        const aCollect1 = await collectSoloLimOrder(limitOrderManagerA, tokenX, tokenY, A, 0)
        expect(aCollect1.amountX).to.equal('0')
        expect(aCollect1.amountY).to.equal('10000000000')

        await decLimOrderWithX(C, 0, limitOrderManagerC, '1000000000')
        const cCollect1 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(cCollect1.amountX).to.equal('0')
        expect(cCollect1.amountY).to.equal('10000000000')
        
        await decLimOrderWithX(G, 0, limitOrderManagerG, '5000000000')
        const gCollect2 = await collectSoloLimOrder(limitOrderManagerG, tokenX, tokenY, G, 0)
        expect(gCollect2.amountX).to.equal('5000000000')
        expect(gCollect2.amountY).to.equal('0')

        await newLimOrderSoloWithY(1, tokenX, tokenY, H, limitOrderManagerH, '5000000000', 0);
        
        await swapY2X(swap, signer, '5000000000', tokenX, tokenY, 1)
        const hCollect2 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 1)
        expect(hCollect2.amountX).to.equal('5000000000')
        expect(hCollect2.amountY).to.equal('0')

        const hCollect3 = await collectSoloLimOrder(limitOrderManagerH, tokenX, tokenY, H, 0)
        expect(hCollect3.amountX).to.equal('0')
        expect(hCollect3.amountY).to.equal('5000000000')
        
        const cCollect2 = await collectSoloLimOrder(limitOrderManagerC, tokenX, tokenY, C, 0)
        expect(cCollect2.amountX).to.equal('0')
        expect(cCollect2.amountY).to.equal('0')

        const dCollect2 = await collectSoloLimOrder(limitOrderManagerD, tokenX, tokenY, D, 0)
        expect(dCollect2.amountX).to.equal('0')
        expect(dCollect2.amountY).to.equal('10000000000')
        
    });
});