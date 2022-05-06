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

async function mint(nflm, miner, tokenX, tokenY, fee, pl, pr, amountX, amountY) {
    if (amountX.gt('0')) {
        await tokenX.connect(miner).approve(nflm.address, '1000000000000000000000000000000000');
        console.log("approve x: " + await tokenX.allowance(miner.address, nflm.address));
    }
    if (amountY.gt('0')) {
        await tokenY.connect(miner).approve(nflm.address, '1000000000000000000000000000000000');
        console.log("approve y: " + await tokenY.allowance(miner.address, nflm.address));
    }

    console.log('before mint');

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
            deadline: '0xffffffff'
        }
    );
    console.log('after mint');
}

async function addLiquidity(nflm, miner, tokenX, tokenY, lid, amountX, amountY) {
    if (amountX.gt('0')) {
        await tokenX.connect(miner).approve(nflm.address, '10000000000000000000000000000000');
        console.log("approve x: " + await tokenX.allowance(miner.address, nflm.address));
    }
    if (amountY.gt('0')) {
        await tokenY.connect(miner).approve(nflm.address, '10000000000000000000000000000000');
        console.log("approve y: " + await tokenY.allowance(miner.address, nflm.address));
    }
    console.log("amountX: ", amountX.toFixed(0));
    console.log("amountY: ", amountY.toFixed(0));
    await nflm.connect(miner).addLiquidity(
        {
            lid: lid,
            xLim: amountX.toFixed(0),
            yLim: amountY.toFixed(0),
            amountXMin: 0,
            amountYMin: 0,
            deadline: BigNumber("1000000000000").toFixed(0)
        }
    );
}

async function decLiquidity(nflm, miner, lid, liquidDelta) {
    await nflm.connect(miner).decLiquidity(
        lid, 
        liquidDelta,
        0,
        0,
        BigNumber("1000000000000").toFixed(0)
    );
}

async function tryDecLiquidity(nflm, miner, lid, liquidDelta) {
    let ok = true;
    try {
    await nflm.connect(miner).decLiquidity(
        lid, 
        liquidDelta,
        0,
        0,
        BigNumber("1000000000000").toFixed(0)
    );
    } catch (err) {
        console.log(err);
        ok = false;
    }
    return ok;
}

async function collect(nflm, tokenX, tokenY, miner, recipientAddr, lid, xlim, ylim) {

    const amountXBefore = (await tokenX.balanceOf(recipientAddr)).toString();
    const amountYBefore = (await tokenY.balanceOf(recipientAddr)).toString();
    try {
    await nflm.connect(miner).collect(recipientAddr, lid, xlim, ylim)
    } catch (err){

    }

    const amountXAfter = (await tokenX.balanceOf(recipientAddr)).toString();
    const amountYAfter = (await tokenY.balanceOf(recipientAddr)).toString();

    return {
        x: stringMinus(amountXAfter, amountXBefore),
        y: stringMinus(amountYAfter, amountYBefore)
    }
}
  function getAmountYNoRound(l, r, rate, liquidity) {
    var amountY = BigNumber('0');
    var price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountY = amountY.plus(liquidity.times(price.sqrt()));
      price = price.times(rate);
    }
    return amountY;
  }
  function getAmountXNoRound(l, r, rate, liquidity) {
    amountX = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountX = amountX.plus(liquidity.div(price.sqrt()));
      price = price.times(rate);
    }
    return amountX;
  }
  
  function getAmountY(l, r, rate, liquidity, up) {
    var amountY = BigNumber('0');
    var price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
      amountY = amountY.plus(liquidity.times(price.sqrt()));
      price = price.times(rate);
    }
    if (up) {
        return ceil(amountY);
    }
    return floor(amountY);
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
  function depositYAtPrice(p, rate, liquidity) {
    var price = rate.pow(p);
    var amountY = liquidity.times(price.sqrt());
    return amountY;
  }
  
  function depositXY(l, r, p, rate, liquidity) {
    expect(l).to.lessThanOrEqual(p);
    expect(r).to.greaterThan(p);
    var amountY = getAmountYNoRound(l, p, rate, liquidity);
    var amountX = getAmountXNoRound(p + 1, r, rate, liquidity);
    amountY = amountY.plus(depositYAtPrice(p, rate, liquidity));
    return [amountX, amountY];
  }

  async function mintByLiquid(nflm, tokenX, tokenY, miner, l, r, p, rate, liquidity) {
    var amountX1 = BigNumber("0");
    var amountY1 = BigNumber("0");
    if (l <= p && r > p) {
        [amountX1, amountY1] = depositXY(l, r, p, rate, BigNumber("1"));
    } else {
        if (l <= p) {
            amountY1 = getAmountYNoRound(l, r, rate, BigNumber("1"));
        }
        if (r > p) {
            amountX1 = getAmountXNoRound(l, r, rate, BigNumber("1"));
        }
    }
      var amountXLim = ceil(amountX1.times(liquidity));
      var amountYLim = ceil(amountY1.times(liquidity));
      console.log('amountXLim: ', amountXLim.toFixed(0));
      console.log('amountYLim: ', amountYLim.toFixed(0));
      await mint(nflm, miner, tokenX, tokenY, 3000, l, r, amountXLim, amountYLim);
  }
  async function addByLiquid(nflm, tokenX, tokenY, miner, l, r, p, rate, lid, liquidity) {
      var amountX1 = BigNumber("0");
      var amountY1 = BigNumber("0");
      if (l <= p && r > p) {
          [amountX1, amountY1] = depositXY(l, r, p, rate, BigNumber("1"));
      } else {
          if (l <= p) {
              amountY1 = getAmountYNoRound(l, r, rate, BigNumber("1"));
          }
          if (r > p) {
              amountX1 = getAmountXNoRound(l, r, rate, BigNumber("1"));
          }
      }
      var amountXLim = ceil(amountX1.times(liquidity));
      var amountYLim = ceil(amountY1.times(liquidity));
      await addLiquidity(nflm, miner, tokenX, tokenY, lid, amountXLim, amountYLim);
  }
  async function tryAddByLiquid(nflm, tokenX, tokenY, miner, l, r, p, rate, lid, liquidity) {
      var amountX1 = BigNumber("0");
      var amountY1 = BigNumber("0");
      if (l <= p && r > p) {
          [amountX1, amountY1] = depositXY(l, r, p, rate, BigNumber("1"));
      } else {
          if (l <= p) {
              amountY1 = getAmountYNoRound(l, r, rate, BigNumber("1"));
          }
          if (r > p) {
              amountX1 = getAmountXNoRound(l, r, rate, BigNumber("1"));
          }
      }
      var amountXLim = ceil(amountX1.times(liquidity));
      var amountYLim = ceil(amountY1.times(liquidity));
      let ok = true;
      try{
      await addLiquidity(nflm, miner, tokenX, tokenY, lid, amountXLim, amountYLim);
      } catch(err) {
          ok = false;
      }
      return ok;
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
    const IzumiswapPool = await ethers.getContractFactory("IzumiswapPool");
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
    const IzumiswapPool = await ethers.getContractFactory("IzumiswapPool");
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
    return b;
}
async function checkLiquidity(nflm, lid, expectLiquid, expectSx, expectSy, expectRx, expectRy) {
    var leftPt, rightPt, liquidity, lastFeeScaleX_128, lastFeeScaleY_128, remainTokenX, remainTokenY, poolId;
    [leftPt, rightPt, liquidity, lastFeeScaleX_128, lastFeeScaleY_128, remainTokenX, remainTokenY, poolId] = await nflm.liquidities(lid);
    expect(blockNumber2BigNumber(liquidity._hex).toFixed(0)).to.equal(expectLiquid.toFixed(0));
    expect(blockNumber2BigNumber(lastFeeScaleX_128._hex).toFixed(0)).to.equal(expectSx.toFixed(0));
    expect(blockNumber2BigNumber(lastFeeScaleY_128._hex).toFixed(0)).to.equal(expectSy.toFixed(0));
    expect(blockNumber2BigNumber(remainTokenX._hex).toFixed(0)).to.equal(expectRx.toFixed(0));
    expect(blockNumber2BigNumber(remainTokenY._hex).toFixed(0)).to.equal(expectRy.toFixed(0));
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

function getFeeAfterCharge(fee) {
    const charged = floor(fee.times(50).div(100));
    return fee.minus(charged);
}

function muldiv(a, b, c) {
    w = a.times(b);
    if (w.mod(c).eq("0")) {
        return floor(w.div(c));
    }
    return floor(w.minus(w.mod(c)).div(c));
}

async function getLiquidity(nflm, tokenId) {
    [l,r,liquid, sx,sy,rx,ry,p] = await nflm.liquidities(tokenId);
    return liquid.toString();
}

function stringMinus(a, b) {
    return BigNumber(a).minus(b).toFixed(0);
}

function stringMul(a, b) {
    const mul = BigNumber(a).times(b).toFixed(0);
    return mul;
}

function stringDiv(a, b) {
    let an = BigNumber(a);
    an = an.minus(an.mod(b));
    return an.div(b).toFixed(0);
}

function stringAdd(a, b) {
    return BigNumber(a).plus(b).toFixed(0);
}

function stringLess(a, b) {
    return BigNumber(a).lt(b);
}

function stringMin(a, b) {
    if (stringLess(a, b)) {
        return a;
    } else {
        return b;
    }
}

async function setBaseURI(nflm, miner, newBaseURI) {
    let ok = true;
    try {
        await nflm.connect(miner).setBaseURI(newBaseURI);
    } catch(err) {
        ok = false;
    }
    return ok;
} 

async function tokenURI(nflm, tokenId) {
    return await nflm.tokenURI(tokenId);
}

describe("swap", function () {
    var signer, miner1, miner2, miner3, miner4, trader1, trader2, receiver1, receiver2;
    var poolPart, poolPartDesire;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var tokenX, tokenY;
    var rate;

    var liquid1;
    var liquid2;
    var liquid2;

    var startTotalLiquidity;
    beforeEach(async function() {
        [signer, miner1, miner2, miner3, miner4, trader1, receiver1, receiver2, trader2] = await ethers.getSigners();
        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(signer.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        console.log("get izumiswapFactory");
        weth9 = await getWETH9(signer);
        console.log("get weth9");
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        console.log("get nflm");
        swap = await getSwap(izumiswapFactory, weth9);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();
    
        await tokenX.mint(miner1.address, '1000000000000000000000000000000000');
        await tokenY.mint(miner1.address, '1000000000000000000000000000000000');
        await tokenX.mint(miner2.address, '1000000000000000000000000000000000');
        await tokenY.mint(miner2.address, '1000000000000000000000000000000000');
        await tokenX.mint(miner3.address, '1000000000000000000000000000000000');
        await tokenY.mint(miner3.address, '1000000000000000000000000000000000');
        await tokenX.mint(miner4.address, '1000000000000000000000000000000000');
        await tokenY.mint(miner4.address, '1000000000000000000000000000000000');

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5010);
        rate = BigNumber("1.0001");
        console.log('beforer mint ')
        await mintByLiquid(nflm, tokenX, tokenY, miner1, 4900, 5100, 5010, rate, BigNumber("10000"));
        console.log('after mint');
        liquid1 = await getLiquidity(nflm, "0");
        console.log("liquid1: ", liquid1);
        await mintByLiquid(nflm, tokenX, tokenY, miner2, 4900, 5100, 5010, rate, BigNumber("20000"));
        liquid2 = await getLiquidity(nflm, "1");
        console.log("liquid2: ", liquid2);
        await mintByLiquid(nflm, tokenX, tokenY, miner3, 4900, 5100, 5010, rate, BigNumber("30000"));
        liquid3 = await getLiquidity(nflm, "2");
        console.log("liquid3: ", liquid3);

        startTotalLiquidity = BigNumber(liquid1).plus(liquid2).plus(liquid3).toFixed(0);
    });

    it("check fee after swap/add/dec", async function() {
        
        console.log(await tokenURI(nflm, '0'));
        console.log(await tokenURI(nflm, '1'));
        console.log(await tokenURI(nflm, '2'));
        try{
        console.log(await tokenURI(nflm, '3'));
        } catch (err) {
            console.log('3 is wrong: ', err)
        }

        await mintByLiquid(nflm, tokenX, tokenY, miner4, 4900, 5100, 5010, rate, BigNumber("20000"));
        

        const okMiner1 = await setBaseURI(nflm, miner1, 'www.google.com/');
        expect(okMiner1).to.equal(false);

        console.log(await tokenURI(nflm, '0'));
        console.log(await tokenURI(nflm, '1'));
        console.log(await tokenURI(nflm, '2'));
        console.log(await tokenURI(nflm, '3'));

        const okOwner = await setBaseURI(nflm, signer, 'www.sogou.com/');
        expect(okOwner).to.equal(true);

        console.log(await tokenURI(nflm, '0'));
        console.log(await tokenURI(nflm, '1'));
        console.log(await tokenURI(nflm, '2'));
        console.log(await tokenURI(nflm, '3'));


        const okMiner2 = await setBaseURI(nflm, miner2, 'www.baidu.com/');
        expect(okMiner2).to.equal(false);
        console.log(await tokenURI(nflm, '0'));
        console.log(await tokenURI(nflm, '1'));
        console.log(await tokenURI(nflm, '2'));
        console.log(await tokenURI(nflm, '3'));



        const okOwner_2 = await setBaseURI(nflm, signer, 'www.izumi.com/');
        expect(okOwner_2).to.equal(true);

        console.log(await tokenURI(nflm, '0'));
        console.log(await tokenURI(nflm, '1'));
        console.log(await tokenURI(nflm, '2'));
        console.log(await tokenURI(nflm, '3'));
    });
});