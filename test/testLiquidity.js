const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');

async function getToken() {

    // deploy token
    const tokenFactory = await ethers.getContractFactory("Token")
    tokenX = await tokenFactory.deploy('a', 'a');
    await tokenX.deployed();
    tokenY = await tokenFactory.deploy('b', 'b');
    await tokenY.deployed();

    console.log("tokenX: " + tokenX.address.toLowerCase());
    console.log("tokenY: " + tokenY.address.toLowerCase());

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
    console.log("txAddr: " + txAddr);
    console.log("tyAddr: " + tyAddr);

    console.log("tx: " + tokenX.address);
    console.log("ty: " + tokenY.address);
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
        }
    );
}

async function addLiquidity(nflm, miner, tokenX, tokenY, lid, amountX, amountY) {
    if (amountX.gt('0')) {
        await tokenX.connect(miner).approve(nflm.address, amountX.toFixed(0));
        console.log("approve x: " + await tokenX.allowance(miner.address, nflm.address));
    }
    if (amountY.gt('0')) {
        await tokenY.connect(miner).approve(nflm.address, amountY.toFixed(0));
        console.log("approve y: " + await tokenY.allowance(miner.address, nflm.address));
    }
    console.log("amountX: ", amountX.toFixed(0));
    console.log("amountY: ", amountY.toFixed(0));
    await nflm.connect(miner).addLiquidity(
        {
            lid: lid,
            xLim: amountX.toFixed(0),
            yLim: amountY.toFixed(0)
        }
    );
}

async function decLiquidity(nflm, miner, lid, liquidDelta) {
    await nflm.connect(miner).decLiquidity(lid, liquidDelta);
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
  
  function depositYAtPrice(p, rate, liquidity) {
    var price = rate.pow(p);
    var amountY = liquidity.times(price.sqrt());
    return ceil(amountY);
  }
  
  function depositXY(l, r, p, rate, liquidity) {
    expect(l).to.lessThanOrEqual(p);
    expect(r).to.greaterThan(p);
    var amountY = getAmountY(l, p, rate, liquidity, true);
    var amountX = getAmountX(p + 1, r, rate, liquidity, true);
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
            amountY1 = getAmountY(l, r, rate, BigNumber("1"), true);
        }
        if (r > p) {
            amountX1 = getAmountX(l, r, rate, BigNumber("1"), true);
        }
    }
      var amountXLim = amountX1.times(liquidity);
      var amountYLim = amountY1.times(liquidity);
      await mint(nflm, miner, tokenX, tokenY, 3000, l, r, amountXLim, amountYLim);
  }
  async function addByLiquid(nflm, tokenX, tokenY, miner, l, r, p, rate, lid, liquidity) {
      var amountX1 = BigNumber("0");
      var amountY1 = BigNumber("0");
      if (l <= p && r > p) {
          [amountX1, amountY1] = depositXY(l, r, p, rate, BigNumber("1"));
      } else {
          if (l <= p) {
              amountY1 = getAmountY(l, r, rate, BigNumber("1"), true);
          }
          if (r > p) {
              amountX1 = getAmountX(l, r, rate, BigNumber("1"), true);
          }
      }
      var amountXLim = amountX1.times(liquidity);
      var amountYLim = amountY1.times(liquidity);
      await addLiquidity(nflm, miner, tokenX, tokenY, lid, amountXLim, amountYLim);
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
async function getPoolParts() {
  const IzumiswapPoolPartFactory = await ethers.getContractFactory("IzumiswapPoolPart");
  const izumiswapPoolPart = await IzumiswapPoolPartFactory.deploy();
  await izumiswapPoolPart.deployed();
  const IzumiswapPoolPartDesireFactory = await ethers.getContractFactory("IzumiswapPoolPartDesire");
  const izumiswapPoolPartDesire = await IzumiswapPoolPartDesireFactory.deploy();
  await izumiswapPoolPartDesire.deployed();
  return [izumiswapPoolPart.address, izumiswapPoolPartDesire.address];
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
async function getPoolParts(signer) {
    var izumiswapPoolPartJson = getContractJson(__dirname + '/core/IzumiswapPoolPart.sol/IzumiswapPoolPart.json');
    var IzumiswapPoolPartFactory = await ethers.getContractFactory(izumiswapPoolPartJson.abi, izumiswapPoolPartJson.bytecode, signer);

    const izumiswapPoolPart = await IzumiswapPoolPartFactory.deploy();
    await izumiswapPoolPart.deployed();

    var izumiswapPoolPartDesireJson = getContractJson(__dirname + '/core/IzumiswapPoolPartDesire.sol/IzumiswapPoolPartDesire.json');
    var IzsumiswapPoolPartDesireFactory = await ethers.getContractFactory(izumiswapPoolPartDesireJson.abi, izumiswapPoolPartDesireJson.bytecode, signer);
    const izumiswapPoolPartDesire = await IzsumiswapPoolPartDesireFactory.deploy();
    await izumiswapPoolPartDesire.deployed();
    return [izumiswapPoolPart.address, izumiswapPoolPartDesire.address];
}

async function getIzumiswapFactory(poolPart, poolPartDesire, signer) {
    var izumiswapJson = getContractJson(__dirname + '/core/IzumiswapFactory.sol/IzumiswapFactory.json');
    var IzumiswapFactory = await ethers.getContractFactory(izumiswapJson.abi, izumiswapJson.bytecode, signer);
    var factory = await IzumiswapFactory.deploy(poolPart, poolPartDesire);
    await factory.deployed();
    return factory;
}
async function getWETH9(signer) {
    var WETH9Json = getContractJson(__dirname + '/core/WETH9.json').WETH9;
    var WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode, signer);
    var WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}
async function getNFTLiquidityManager(factory, weth) {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("NonfungibleLiquidityManager");
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
    return ceil(amount.times(3).div(1000));
}

function muldiv(a, b, c) {
    w = a.times(b);
    if (w.mod(c).eq("0")) {
        return floor(w.div(c));
    }
    return floor(w.minus(w.mod(c)).div(c));
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
    beforeEach(async function() {
        [signer, miner1, miner2, miner3, miner4, trader1, trader2] = await ethers.getSigners();
        [poolPart, poolPartDesire] = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(poolPart, poolPartDesire, signer);
        console.log("get izumiswapFactory");
        weth9 = await getWETH9(signer);
        console.log("get weth9");
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        console.log("get nflm");
        swap = await getSwap(izumiswapFactory, weth9);

        [tokenX, tokenY] = await getToken();
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();
    
        await tokenX.transfer(miner1.address, 10000000000);
        await tokenY.transfer(miner1.address, 20000000000);
        await tokenX.transfer(miner2.address, 30000000000);
        await tokenY.transfer(miner2.address, 40000000000);
        await tokenX.transfer(miner3.address, 50000000000);
        await tokenY.transfer(miner3.address, 60000000000);
        await tokenX.transfer(miner4.address, 70000000000);
        await tokenY.transfer(miner4.address, 80000000000);

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5010);
        rate = BigNumber("1.0001");

        await mintByLiquid(nflm, tokenX, tokenY, miner1, 4900, 5100, 5010, rate, BigNumber("10000"));
        await mintByLiquid(nflm, tokenX, tokenY, miner2, 4900, 5100, 5010, rate, BigNumber("20000"));
        await mintByLiquid(nflm, tokenX, tokenY, miner3, 4900, 5100, 5010, rate, BigNumber("30000"));
    });

    it("check fee after swap/add/dec", async function() {
        // 5010 is all y
        var amountY1 = getAmountY(5011, 5100, rate, BigNumber("60000"), true);
        var amountY1Fee = getFee(amountY1);
        amountY1 = amountY1.plus(amountY1Fee);
        var amountX1 = getAmountX(5011, 5100, rate, BigNumber("60000"), false);
        var amountY1Origin = BigNumber("1000000000000");

        await tokenY.transfer(trader1.address, amountY1Origin.toFixed(0));
        await tokenY.connect(trader1).approve(swap.address, amountY1.toFixed(0));
        await swap.connect(trader1).swapY2X(tokenX.address, tokenY.address, 3000, amountY1.toFixed(0), 5100);
        await checkBalance(tokenY, trader1, amountY1Origin.minus(amountY1));

        var lastFeeScaleY_128 = floor(amountY1Fee.times(BigNumber("2").pow(128)).div("60000"));
        var miner3FeeY = floor(lastFeeScaleY_128.times(BigNumber("30000")).div(BigNumber("2").pow(128)));
        var miner2FeeY = floor(lastFeeScaleY_128.times(BigNumber("20000")).div(BigNumber("2").pow(128)));
        var miner1FeeY = floor(lastFeeScaleY_128.times(BigNumber("10000")).div(BigNumber("2").pow(128)));
        await decLiquidity(nflm, miner3, "2", "10000");
        await checkLiquidity(
            nflm, "2", BigNumber("20000"),
            BigNumber("0"),
            lastFeeScaleY_128,
            BigNumber("0"),
            getAmountY(4900, 5100, rate, BigNumber("10000"), false).plus(miner3FeeY)
        );
        await addByLiquid(nflm, tokenX, tokenY, miner2, 4900, 5100, 5100, rate, "1", BigNumber("10000"));
        await checkLiquidity(
            nflm, "1", BigNumber("30000"),
            BigNumber("0"),
            lastFeeScaleY_128,
            BigNumber("0"),
            miner2FeeY
        );
        await mintByLiquid(nflm, tokenX, tokenY, miner4, 4900, 5100, 5100, rate, BigNumber("20000"));
        await checkLiquidity(
            nflm, "3", BigNumber("20000"),
            BigNumber("0"),
            lastFeeScaleY_128,
            BigNumber("0"),
            BigNumber("0")
        );

        // trader 2
        var amountY2 = getAmountY(4900, 5100, rate, BigNumber("80000"), false);
        var amountX2 = getAmountX(4900, 5100, rate, BigNumber("80000"), true);
        var amountX2Fee = getFee(amountX2);
        amountX2 = amountX2.plus(amountX2Fee);
        var amountX2Origin = BigNumber("1000000000000");

        await tokenX.transfer(trader2.address, amountX2Origin.toFixed(0));
        console.log("amountX2: ", amountX2.toFixed(0));
        await tokenX.connect(trader2).approve(swap.address, amountX2.toFixed(0));
        await swap.connect(trader2).swapX2Y(tokenX.address, tokenY.address, 3000, amountX2.toFixed(0), 4900);
        await checkBalance(tokenX, trader2, amountX2Origin.minus(amountX2));


        var lastFeeScaleX_128 = floor(amountX2Fee.times(BigNumber("2").pow(128)).div("80000"));
        console.log("last fee scalex: ", lastFeeScaleX_128.toFixed(0));
        var miner1FeeX = muldiv(lastFeeScaleX_128, BigNumber("10000"), BigNumber("2").pow(128));
        var miner3FeeX = muldiv(lastFeeScaleX_128, BigNumber("20000"), BigNumber("2").pow(128));
        var miner2FeeX = muldiv(lastFeeScaleX_128, BigNumber("30000"), BigNumber("2").pow(128));
        var miner4FeeX = muldiv(lastFeeScaleX_128, BigNumber("20000"), BigNumber("2").pow(128));

        console.log("miner2FeeX: ", miner2FeeX.toFixed(0));

        await decLiquidity(nflm, miner1, "0", "10000");
        await checkLiquidity(
            nflm, "0", BigNumber("0"),
            lastFeeScaleX_128,
            lastFeeScaleY_128,
            getAmountX(
                4900, 4901, rate, BigNumber("10000"), false
            ).plus(getAmountX(4901, 5100, rate, BigNumber("10000"), false)).plus(miner1FeeX),
            miner1FeeY
        );

        await decLiquidity(nflm, miner2, "1", "30000");
        await checkLiquidity(
            nflm, "1", BigNumber("0"),
            lastFeeScaleX_128,
            lastFeeScaleY_128,
            getAmountX(
                4900, 4901, rate, BigNumber("30000"), false
            ).plus(getAmountX(4901, 5100, rate, BigNumber("30000"), false)).plus(miner2FeeX),
            miner2FeeY
        );

        await decLiquidity(nflm, miner3, "2", "20000");
        await checkLiquidity(
            nflm, "2", BigNumber("0"),
            lastFeeScaleX_128,
            lastFeeScaleY_128,
            getAmountX(
                4900, 4901, rate, BigNumber("20000"), false
            ).plus(getAmountX(4901, 5100, rate, BigNumber("20000"), false)).plus(miner3FeeX),
            getAmountY(4900, 5100, rate, BigNumber("10000"), false).plus(miner3FeeY)
        );

        await decLiquidity(nflm, miner4, "3", "20000");
        await checkLiquidity(
            nflm, "3", BigNumber("0"),
            lastFeeScaleX_128,
            lastFeeScaleY_128,
            getAmountX(
                4900, 4901, rate, BigNumber("20000"), false
            ).plus(getAmountX(4901, 5100, rate, BigNumber("20000"), false)).plus(miner4FeeX),
            BigNumber(0)
        );
    });
});