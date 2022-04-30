const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');

const { getPoolParts, getIzumiswapFactory } = require("./funcs.js")
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

function ceil(b) {
    return BigNumber(b.toFixed(0, 2));
}

function floor(b) {
    return BigNumber(b.toFixed(0, 3));
}

async function addLiquidity(nflm, miner, tokenX, tokenY, fee, pl, pr, amountX, amountY) {
    console.log("enter add liquidity");
    if (amountX.gt('0')) {
        await tokenX.connect(miner).approve(nflm.address, amountX.toFixed(0));
        console.log("approve x: " + await tokenX.allowance(miner.address, nflm.address));
    }
    if (amountY.gt('0')) {
        await tokenY.connect(miner).approve(nflm.address, amountY.toFixed(0));
        console.log("approve y: " + await tokenY.allowance(miner.address, nflm.address));
    }
    await nflm.connect(miner).mint(
        {
            miner: miner.address,
            tokenX: tokenX.address,
            tokenY: tokenY.address,
            fee: fee,
            pl: pl,
            pr: pr,
            xLim: amountX.toFixed(0),
            yLim: amountY.toFixed(0),
            amountXMin: 0,
            amountYMin: 0,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
  }
  
  function getAmountX(l, r, rate, liquidity, up) {
    amountX = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountX = amountX.plus(liquidity.div(price.sqrt()));
      price = price.times(rate);
    }
    if (up) {
        return ceil(amountX);
    }
    return floor(amountX);
  }
  
  function getAmountY(l, r, rate, liquidity, up) {
    amountY = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountY = amountY.plus(liquidity.times(price.sqrt()));
      price = price.times(rate);
    }
    if (up) {
        return ceil(amountY);
    }
    return floor(amountY);
  }
  
  function getAmountXNoRound(l, r, rate, liquidity, up) {
    amountX = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountX = amountX.plus(liquidity.div(price.sqrt()));
      price = price.times(rate);
    }
    return amountX;
  }
  
  function getAmountYNoRound(l, r, rate, liquidity, up) {
    amountY = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountY = amountY.plus(liquidity.times(price.sqrt()));
      price = price.times(rate);
    }
    return amountY;
  }
  function depositYAtPrice(p, rate, liquidity) {
    price = rate.pow(p);
    amountY = liquidity.times(price.sqrt());
    return amountY;
  }
  
  function depositXY(l, r, p, rate, liquidity) {
    expect(l).to.lessThanOrEqual(p);
    expect(r).to.greaterThan(p);
    amountY = getAmountYNoRound(l, p, rate, liquidity);
    amountX = getAmountXNoRound(p + 1, r, rate, liquidity);
    amountY = amountY.plus(depositYAtPrice(p, rate, liquidity));
    return [amountX, amountY];
  }

  async function addLiquidityByLiquid(nflm, tokenX, tokenY, miner, l, r, p, rate, liquidity) {
      [amountX1, amountY1] = depositXY(l, r, p, rate, BigNumber("1"));
      amountXLim = ceil(amountX1.times(liquidity));
      amountYLim = ceil(amountY1.times(liquidity));
      await addLiquidity(nflm, miner, tokenX, tokenY, 3000, l, r, amountXLim, amountYLim);
  }
async function addLimOrderWithY(tokenX, tokenY, seller, testAddLimOrder, amountY, point) {
    await tokenY.transfer(seller.address, amountY);
    await tokenY.connect(seller).approve(testAddLimOrder.address, amountY);
    await testAddLimOrder.connect(seller).addLimOrderWithY(
        tokenX.address, tokenY.address, 3000, point, amountY
    );
}
async function addLimOrderWithX(tokenX, tokenY, seller, testAddLimOrder, amountX, point) {
    await tokenX.transfer(seller.address, amountX);
    await tokenX.connect(seller).approve(testAddLimOrder.address, amountX);
    await testAddLimOrder.connect(seller).addLimOrderWithX(
        tokenX.address, tokenY.address, 3000, point, amountX
    );
}
function getCostX(point, rate, amountY) {
    sp = rate.pow(point).sqrt();
    liquidity = ceil(amountY.div(sp));
    costX = ceil(liquidity.div(sp));

    liquidity = floor(costX.times(sp));
    acquireY = floor(liquidity.times(sp));
    return [acquireY, costX];
}
function blockNum2BigNumber(blc) {
    return BigNumber(blc._hex);
}
async function checkBalance(token, address, value) {
    expect(blockNum2BigNumber(await token.balanceOf(address)).toFixed(0)).to.equal(value.toFixed(0));
}
async function checkLimOrder(eSellingX, eAccEarnX, eSellingY, eAccEarnY, eEarnX, eEarnY, poolAddr, pt) {
    [sellingX, accEarnX, sellingY, accEarnY, earnX, earnY] = await getLimOrder(poolAddr, pt);
    expect(sellingX.toFixed(0)).to.equal(eSellingX.toFixed(0));
    expect(accEarnX.toFixed(0)).to.equal(eAccEarnX.toFixed(0));
    expect(sellingY.toFixed(0)).to.equal(eSellingY.toFixed(0));
    expect(accEarnY.toFixed(0)).to.equal(eAccEarnY.toFixed(0));
    expect(earnX.toFixed(0)).to.equal(eEarnX.toFixed(0));
    expect(earnY.toFixed(0)).to.equal(eEarnY.toFixed(0));
}
function list2BigNumber(valueList) {
    bigList = [];
    for (var i = 0; i < valueList.length; i ++) {
        bigList.push(BigNumber(valueList[i]._hex));
    }
    return bigList;
}
async function getUserEarn(testAddLimOrder, poolAddr, sellerAddr, pt, sellXEarnY) {
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await testAddLimOrder.getEarn(poolAddr, sellerAddr, pt, sellXEarnY);
    return list2BigNumber([lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign]);
}
async function checkUserEarn(
    eLastAccEarn, eSellingRemain, eSellingDesc, eEarn, eEarnAssign,
    testAddLimOrder, poolAddr, sellerAddr, pt, sellXEarnY) {
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await getUserEarn(
        testAddLimOrder, poolAddr, sellerAddr, pt, sellXEarnY
    );
    expect(eLastAccEarn.toFixed(0)).to.equal(lastAccEarn.toFixed(0));
    expect(eSellingRemain.toFixed(0)).to.equal(sellingRemain.toFixed(0));
    expect(eSellingDesc.toFixed(0)).to.equal(sellingDesc.toFixed(0));
    expect(eEarn.toFixed(0)).to.equal(earn.toFixed(0));
    expect(eEarnAssign.toFixed(0)).to.equal(earnAssign.toFixed(0));
}

async function getLimOrder(poolAddr, pt) {
    const IzumiswapPool = await ethers.getContractFactory("iZiSwapPool");
    pool = await IzumiswapPool.attach(poolAddr);
    [sellingX, accEarnX, sellingY, accEarnY, earnX, earnY] = await pool.limitOrderData(pt);
    return [
        BigNumber(sellingX._hex),
        BigNumber(accEarnX._hex),
        BigNumber(sellingY._hex),
        BigNumber(accEarnY._hex),
        BigNumber(earnX._hex),
        BigNumber(earnY._hex)
    ]
}
async function getStatusVal(poolAddr, pt) {
    const IzumiswapPool = await ethers.getContractFactory("iZiSwapPool");
    pool = await IzumiswapPool.attach(poolAddr);
    return await pool.statusVal(pt / 50);
}
async function checkStatusVal(eVal, poolAddr, pt) {
    val = await getStatusVal(poolAddr, pt);
    expect(eVal).to.equal(val);
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
function blockNumber2BigNumber(num) {
    var b = BigNumber(num);
    console.log(b.toFixed(0));
    return b;
}
async function checkLiquidity(nflm, lid, expectLiquid) {
    var leftPt, rightPt, liquidity, lastFeeScaleX_128, lastFeeScaleY_128, remainTokenX, remainTokenY, poolId;
    [leftPt, rightPt, liquidity, lastFeeScaleX_128, lastFeeScaleY_128, remainTokenX, remainTokenY, poolId] = await nflm.liquidities(lid);
    expect(blockNumber2BigNumber(liquidity._hex).toFixed(0)).to.equal(expectLiquid.toFixed(0));
    console.log("aaa");
}
async function checkOwner(nflm, lid, owner) {
    await nflm.connect(owner).decLiquidity(lid, "1");
}
async function checkNotOwner(nflm, lid, notOwner) {

    try {
        await nflm.connect(notOwner).decLiquidity(lid, "1");
    } catch(err) {
        // console.log(str(err));
        // console.log(err);
        var pos = err.toString().indexOf('Not approved');
        expect(pos).to.gte(0);
    }
}

async function checkBalance(token, miner, expectAmount) {
    var amount = await token.balanceOf(miner.address);
    expect(amount.toString()).to.equal(expectAmount.toFixed(0));
}

function getFee(amount) {
    return ceil(amount.times(3).div(997));
}
async function getLiquidity(nflm, tokenId) {
    [l,r,liquid, sx,sy,rx,ry,p] = await nflm.liquidities(tokenId);
    return liquid.toString();
}
describe("swap", function () {
    var signer, miner1, miner2, miner3, trader1, trader2, trader3, trader4;
    var poolPart, poolPartDesire;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var tokenX, tokenY;
    var rate;
    var totalLiquidity;
    beforeEach(async function() {
        [signer, miner1, miner2, miner3, trader1, trader2, trader3, trader4, receiver] = await ethers.getSigners();
        
        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        console.log("get izumiswapFactory");
        weth9 = await getWETH9(signer);
        console.log("get weth9");
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        console.log("get nflm");
        swap = await getSwap(izumiswapFactory, weth9);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();
    
        await tokenX.transfer(miner1.address, 10000000000);
        await tokenY.transfer(miner1.address, 20000000000);
        await tokenX.transfer(miner2.address, 30000000000);
        await tokenY.transfer(miner2.address, 40000000000);
        await tokenX.transfer(miner3.address, 50000000000);
        await tokenY.transfer(miner3.address, 60000000000);

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5010);
        rate = BigNumber("1.0001");

        await addLiquidityByLiquid(nflm, tokenX, tokenY, miner1, 4900, 5100, 5010, rate, BigNumber("10000"));
        var liquid0 = await getLiquidity(nflm, "0");
        console.log('liquid0: ',liquid0);
        await addLiquidityByLiquid(nflm, tokenX, tokenY, miner2, 4900, 5100, 5010, rate, BigNumber("20000"));
        var liquid1 = await getLiquidity(nflm, "1");
        console.log('liquid1: ',liquid1);

        totalLiquidity = BigNumber(liquid0).plus(liquid1).toFixed(0);
    });

    it("check swap y2x", async function() {
        // 5010 is all y
        var amountY = getAmountY(5011, 5100, rate, BigNumber(totalLiquidity), true);
        amountY = amountY.plus(getFee(amountY));
        var amountX = getAmountX(5011, 5100, rate, BigNumber(totalLiquidity), false);
        var amountYOrigin = BigNumber("1000000000000");
        await tokenY.transfer(trader1.address, amountYOrigin.toFixed(0));
        await tokenY.connect(trader1).approve(swap.address, amountY.toFixed(0));
        await swap.connect(trader1).swapY2X(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader1.address,
                amount: amountY.toFixed(0),
                boundaryPt: 5100,
                minAcquired: 0,
                maxPayed: amountY.toFixed(0),
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );
        console.log('after swapy2x!!!!!!!!!!!!!!!!!!!!!');
        await checkBalance(tokenY, trader1, amountYOrigin.minus(amountY));
        await checkBalance(tokenX, trader1, amountX);

    });
    it("check swap x2y", async function() {
        // 5010 is all y, [4900, 5011)
        var amountY = getAmountY(4900, 5011, rate, BigNumber(totalLiquidity), false);
        var amountX = getAmountX(4900, 5011, rate, BigNumber(totalLiquidity), true);
        amountX = amountX.plus(getFee(amountX));
        var amountXOrigin = BigNumber("1000000000000");
        await tokenX.transfer(trader1.address, amountXOrigin.toFixed(0));
        await tokenX.connect(trader1).approve(swap.address, amountX.toFixed(0));
        await swap.connect(trader1).swapX2Y(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader1.address,
                amount: amountX.toFixed(0),
                boundaryPt: 4900,
                minAcquired: 0,
                maxPayed: amountX.toFixed(0),
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );
        await checkBalance(tokenX, trader1, amountXOrigin.minus(amountX));
        await checkBalance(tokenY, trader1, amountY);
    });
    it("check swap y2x desireX", async function() {
        // 5010 is all y
        var amountY = getAmountY(5011, 5100, rate, BigNumber(totalLiquidity), true);
        amountY = amountY.plus(getFee(amountY));
        var amountX = getAmountX(5011, 5100, rate, BigNumber(totalLiquidity), false);
        var amountYOrigin = BigNumber("1000000000000");
        await tokenY.transfer(trader1.address, amountYOrigin.toFixed(0));
        await tokenY.connect(trader1).approve(swap.address, amountY.toFixed(0));
        await swap.connect(trader1).swapY2XDesireX(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader1.address,
                amount: amountX.toFixed(0),
                boundaryPt: 5100,
                minAcquired: 0,
                maxPayed: '1000000000000',
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );
        await checkBalance(tokenY, trader1, amountYOrigin.minus(amountY));
        await checkBalance(tokenX, trader1, amountX);
    });
    it("check swap x2y desireY", async function() {
        // 5010 is all y, [4900, 5011)
        var amountY = getAmountY(4900, 5011, rate, BigNumber(totalLiquidity), false);
        var amountX = getAmountX(4900, 5011, rate, BigNumber(totalLiquidity), true);
        amountX = amountX.plus(getFee(amountX));
        var amountXOrigin = BigNumber("1000000000000");
        await tokenX.transfer(trader1.address, amountXOrigin.toFixed(0));
        await tokenX.connect(trader1).approve(swap.address, amountX.toFixed(0));
        await swap.connect(trader1).swapX2YDesireY(
            {
                tokenX: tokenX.address, 
                tokenY: tokenY.address, 
                fee: 3000,
                recipient: trader1.address,
                amount: amountY.toFixed(0),
                boundaryPt: 4900,
                minAcquired: 0,
                maxPayed: '1000000000000',
                deadline: BigNumber("1000000000000").toFixed(0)
            }
        );
        await checkBalance(tokenX, trader1, amountXOrigin.minus(amountX));
        await checkBalance(tokenY, trader1, amountY);
    });
});