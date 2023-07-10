const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { getPoolParts, getIzumiswapFactory, newLimOrderSoloWithX, newLimOrderSoloWithY, addLimOrderSolo, decLimOrderWithX, checkArrEqual, stringMinus, stringAdd, stringMul, decLimOrderWithY } = require("../funcs.js")

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

function getContractJson(path) {
    const fs = require('fs');
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    return data;
}

async function getWETH9(signer) {
    var WETH9Json = getContractJson(__dirname + '/../core/WETH9.json');
    var WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode, signer);
    var WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}
async function getNFTLiquidityManager(factory, weth) {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("LiquidityManager");
    var nflm = await NonfungibleLiquidityManager.deploy(factory.address, weth.address);
    await nflm.deployed();
    return nflm;
}
async function getSwap(factory, weth) {
    const SwapManager = await ethers.getContractFactory("Swap");
    var swap = await SwapManager.deploy(factory.address, weth.address);
    await swap.deployed();
    return swap;
}

async function getLimitOrderManagerSoloFactory(factory, weth) {
    const LimitOrderManagerSoloFactory = await ethers.getContractFactory('LimitOrderManagerSoloFactory')
    var limitOrderManagerFactory = await LimitOrderManagerSoloFactory.deploy(factory.address, weth.address)
    await limitOrderManagerFactory.deployed();
    return limitOrderManagerFactory;
}

describe("limordermanagersolo slot idx", function () {
    var signer, seller1, seller2;
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
        [signer, seller1, seller2, receiver] = await ethers.getSigners();

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

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 2000, 0);
        rate = BigNumber("1.0001");
        aBigNumber = '1000000000000000000000000000'
        await tokenX.mint(seller1.address, aBigNumber);
        await tokenX.mint(seller2.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenX.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.mint(seller1.address, aBigNumber);
        await tokenY.mint(seller2.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller1).approve(limitOrderManager2.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager1.address, aBigNumber);
        await tokenY.connect(seller2).approve(limitOrderManager2.address, aBigNumber);
    });


    it("check x and y map at current point", async function() {
        const sell = '1000000000'
        const sell2 = '2000000000'
        await newLimOrderSoloWithX(0, tokenX, tokenY, seller1, limitOrderManager1, sell, 0);
        await newLimOrderSoloWithX(1, tokenX, tokenY, seller1, limitOrderManager1, sell, 1000);
        await newLimOrderSoloWithY(2, tokenX, tokenY, seller1, limitOrderManager1, sell, -1000);
        let {activeIdx: activeIdx1, activeLimitOrder: orders1} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx1 = activeIdx1.map(e=>e.toString())
        checkArrEqual(activeIdx1, ['0', '1', '2'])
        let sellXSet = new Set([0,1])

        for (let i = 0; i < activeIdx1.length; i ++) {
            const idx = Number(activeIdx1[i])
            sellingRemain = sell
            sellingDec = '0'
            expect(orders1[i].sellingRemain).to.equal(sellingRemain)
            expect(orders1[i].earn).to.equal('0')
            expect(orders1[i].sellingDec).to.equal(sellingDec)
            expect(orders1[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }

        await newLimOrderSoloWithX(10, tokenX, tokenY, seller1, limitOrderManager1, sell, 0)
        let {activeIdx: activeIdx2, activeLimitOrder: orders2} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx2 = activeIdx2.map(e=>e.toString())
        checkArrEqual(activeIdx2, ['0', '1', '2'])
        sellXSet = new Set([0,1])

        for (let i = 0; i < activeIdx2.length; i ++) {
            const idx = Number(activeIdx2[i])
            sellingRemain = sell
            sellingDec = '0'
            if (idx === 0) {
                sellingRemain = stringAdd(sell, sell)
            }
            expect(orders2[i].sellingRemain).to.equal(sellingRemain)
            expect(orders2[i].earn).to.equal('0')
            expect(orders2[i].sellingDec).to.equal(sellingDec)
            expect(orders2[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }

        const ok = await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, stringMul(sell, '3'), 0)
        expect(ok).to.equal(false)
        await newLimOrderSoloWithY(3, tokenX, tokenY, seller1, limitOrderManager1, stringMul(sell, '3'), 0)
        let {activeIdx: activeIdx3, activeLimitOrder: orders3} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx3 = activeIdx3.map(e=>e.toString())
        checkArrEqual(activeIdx3, ['0', '1', '2', '3'])
        sellXSet = new Set([0,1])

        for (let i = 0; i < activeIdx3.length; i ++) {
            const idx = Number(activeIdx3[i])
            sellingRemain = sell
            sellingDec = '0'
            earn = '0'
            if (idx === 0) {
                sellingRemain = stringMul(sell, '2')
            }
            if (idx === 3) {
                sellingRemain = sell
                earn = stringMul(sell, '2')
            }
            expect(orders3[i].sellingRemain).to.equal(sellingRemain)
            expect(orders3[i].earn).to.equal(earn)
            expect(orders3[i].sellingDec).to.equal(sellingDec)
            expect(orders3[i].sellXEarnY).to.equal(sellXSet.has(idx))
        }

        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, sell, 0)
        await newLimOrderSoloWithX(3, tokenX, tokenY, seller1, limitOrderManager1, stringMul(sell, 3), 0)

        let {activeIdx: activeIdx4, activeLimitOrder: orders4} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx4 = activeIdx4.map(e=>e.toString())
        checkArrEqual(activeIdx4, ['0', '1', '2', '3'])

        for (let i = 0; i < activeIdx4.length; i ++) {
            const idx = Number(activeIdx4[i])
            sellingRemain = sell
            sellingDec = '0'
            earn = '0'
            if (idx === 0) {
                earn = stringMul(sell, '4')
                sellingRemain = sell
            }
            if (idx === 3) {
                sellingRemain = stringMul(sell, '2')
                earn = stringMul(sell, '2')
            }
            expect(orders4[i].sellingRemain).to.equal(sellingRemain)
            expect(orders4[i].earn).to.equal(earn)
            expect(orders4[i].sellingDec).to.equal(sellingDec)
            expect(orders4[i].sellXEarnY).to.equal(sellXSet.has(idx))

        }

        await newLimOrderSoloWithY(0, tokenX, tokenY, seller1, limitOrderManager1, stringMul(sell, 2), 0)
        await newLimOrderSoloWithX(3, tokenX, tokenY, seller1, limitOrderManager1, stringMul(sell, 2), 0)

        let {activeIdx: activeIdx5, activeLimitOrder: orders5} = await limitOrderManager1.getActiveOrders(); //.map((e)=>translateLimOrder(e));
        activeIdx5 = activeIdx5.map(e=>e.toString())
        checkArrEqual(activeIdx5, ['0', '1', '2', '3'])

        for (let i = 0; i < activeIdx5.length; i ++) {
            const idx = Number(activeIdx5[i])
            sellingRemain = sell
            sellingDec = '0'
            earn = '0'
            if (idx === 0) {
                earn = stringMul(sell, '6')
                sellingRemain = sell
            }
            if (idx === 3) {
                sellingRemain = sell
                earn = stringMul(sell, '5')
            }
            expect(orders5[i].sellingRemain).to.equal(sellingRemain)
            expect(orders5[i].earn).to.equal(earn)
            expect(orders5[i].sellingDec).to.equal(sellingDec)
            expect(orders5[i].sellXEarnY).to.equal(sellXSet.has(idx))

        }
    });

});