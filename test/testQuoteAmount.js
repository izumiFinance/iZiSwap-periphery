const { expect } = require("chai");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { strictEqual } = require("assert");
const { getPoolParts, getIzumiswapFactory, addLiquidity } = require("./funcs.js")

async function getToken(name, symbol, decimal) {
    const tokenFactory = await ethers.getContractFactory("TestToken")
    const token = await tokenFactory.deploy(name, symbol, decimal);
    return token;
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
function ceil(b) {
    return BigNumber(b.toFixed(0, 2));
}

function floor(b) {
    return BigNumber(b.toFixed(0, 3));
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
    const swap = await SwapManager.deploy(factory.address, weth.address);
    await swap.deployed();
    return swap;
}
async function getQuoter(factory, weth) {
    const QuoterManager = await ethers.getContractFactory("Quoter");
    const Quoter = await QuoterManager.deploy(factory.address, weth.address);
    await Quoter.deployed();
    return Quoter;
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

function num2Hex(n) {
    if (n < 10) {
        return String(n);
    }
    const str = 'ABCDEF';
    return str[n - 10];
}

function fee2Hex(fee) {
    const n0 = fee % 16;
    const n1 = Math.floor(fee/16) % 16;
    const n2 = Math.floor(fee/256) % 16;
    const n3 = Math.floor(fee/4096) % 16;
    const n4 = 0;
    const n5 = 0;
    return '0x' + num2Hex(n5) + num2Hex(n4) + num2Hex(n3) + num2Hex(n2) + num2Hex(n1) + num2Hex(n0);
}

function appendHex(hexString, newHexString) {
    return hexString + newHexString.slice(2);
}
describe("swap", function () {
    var signer, miner, trader, receiver;
    var izumiswapFactory;
    var weth9;
    var nflm;
    var swap;
    var tokenX, tokenY, tokenZ;
    var rate;
    var totalLiquidity;
    var poolXY, poolYZ;
    beforeEach(async function() {
        [signer, miner, trader, receiver] = await ethers.getSigners();
        
        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        console.log("get izumiswapFactory");
        weth9 = await getWETH9(signer);
        console.log("get weth9");
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        console.log("get nflm");
        quoter = await getQuoter(izumiswapFactory, weth9);

        tokenX = await getToken('a', 'a', 18);
        tokenY = await getToken('b', 'b', 18);
        tokenZ = await getToken('z', 'z', 18);

        await tokenX.mint(miner.address, '1000000000000000000000000000000');
        await tokenY.mint(miner.address, '1000000000000000000000000000000');
        await tokenZ.mint(miner.address, '1000000000000000000000000000000');

        await tokenX.mint(trader.address, '1000000000000000000000000000000');
        await tokenY.mint(trader.address, '1000000000000000000000000000000');
        await tokenZ.mint(trader.address, '1000000000000000000000000000000');
    
        console.log('aaaaa');
        if (tokenX.address.toLowerCase() < tokenY.address.toLowerCase()) {
            poolXY = await nflm.createPool(tokenX.address, tokenY.address, 3000, 5010);
        } else {
            poolXY = await nflm.createPool(tokenY.address, tokenX.address, 3000, 5010);
        }
        if (tokenY.address.toLowerCase() > tokenZ.address.toLowerCase()) {
            poolYZ = await nflm.createPool(tokenZ.address, tokenY.address, 3000, 1000);
        } else {
            poolYZ = await nflm.createPool(tokenY.address, tokenZ.address, 3000, 1000);
        }

        await tokenX.connect(miner).approve(nflm.address, '1000000000000000000000000000000');
        await tokenY.connect(miner).approve(nflm.address, '1000000000000000000000000000000');
        await tokenZ.connect(miner).approve(nflm.address, '1000000000000000000000000000000');

        await tokenX.connect(trader).approve(quoter.address, '1000000000000000000000000000000');
        await tokenY.connect(trader).approve(quoter.address, '1000000000000000000000000000000');
        await tokenZ.connect(trader).approve(quoter.address, '1000000000000000000000000000000');

        console.log('aaaaa');
        await addLiquidity(nflm, miner, tokenX, tokenY, 3000, 1500, 8000, '100000000000000000000', '100000000000000000000');
        console.log('bbbbb');
        await addLiquidity(nflm, miner, tokenY, tokenZ, 3000, -1000, 6000, '50000000000000000000', '50000000000000000000');
        console.log('ccccc');

    });

    it("check swap amount x2y2z", async function() {
        const tokenXAddr = tokenX.address.toLowerCase();
        const tokenYAddr = tokenY.address.toLowerCase();
        const tokenZAddr = tokenZ.address.toLowerCase();
        let hexString = appendHex(tokenXAddr, fee2Hex(3000));
        hexString = appendHex(hexString, tokenYAddr);
        hexString = appendHex(hexString, fee2Hex(3000));
        hexString = appendHex(hexString, tokenZAddr);

        const params = {
            path: hexString,
            recipient: trader.address,
            amount: '100000000',
            minAcquired: '0',
        }

        const balanceXBefore = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYBefore = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZBefore = (await tokenZ.balanceOf(trader.address)).toString();

        console.log('hexstring: ', hexString);
        console.log('tokenX: ', tokenX.address);
        console.log('tokenY: ', tokenY.address);
        console.log('tokenZ: ', tokenZ.address);
        console.log('trader: ', trader.address);
        const res = await quoter.connect(trader).swapAmount(params.amount, params.path);
        console.log(res);

        const balanceXAfter = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYAfter = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZAfter = (await tokenZ.balanceOf(trader.address)).toString();

        console.log(stringMinus(balanceXBefore, balanceXAfter));
        console.log(stringMinus(balanceYAfter, balanceYBefore));
        console.log(stringMinus(balanceZAfter, balanceZBefore));

    });

    // it("check swap amount z2y2x", async function() {
    //     const tokenXAddr = tokenX.address.toLowerCase();
    //     const tokenYAddr = tokenY.address.toLowerCase();
    //     const tokenZAddr = tokenZ.address.toLowerCase();
    //     let hexString = appendHex(tokenZAddr, fee2Hex(3000));
    //     hexString = appendHex(hexString, tokenYAddr);
    //     hexString = appendHex(hexString, fee2Hex(3000));
    //     hexString = appendHex(hexString, tokenXAddr);

    //     const params = {
    //         path: hexString,
    //         recipient: trader.address,
    //         amount: '100000000',
    //         minAcquired: '0',
    //     }

    //     const balanceXBefore = (await tokenX.balanceOf(trader.address)).toString();
    //     const balanceYBefore = (await tokenY.balanceOf(trader.address)).toString();
    //     const balanceZBefore = (await tokenZ.balanceOf(trader.address)).toString();

    //     console.log('hexstring: ', hexString);
    //     console.log('tokenX: ', tokenX.address);
    //     console.log('tokenY: ', tokenY.address);
    //     console.log('tokenZ: ', tokenZ.address);
    //     console.log('trader: ', trader.address);
    //     await swap.connect(trader).swapAmount(params);

    //     const balanceXAfter = (await tokenX.balanceOf(trader.address)).toString();
    //     const balanceYAfter = (await tokenY.balanceOf(trader.address)).toString();
    //     const balanceZAfter = (await tokenZ.balanceOf(trader.address)).toString();

    //     console.log(stringMinus(balanceZBefore, balanceZAfter));
    //     console.log(stringMinus(balanceYAfter, balanceYBefore));
    //     console.log(stringMinus(balanceXAfter, balanceXBefore));

    // });
    it("check swap desire x2y2z", async function() {
        const tokenXAddr = tokenX.address.toLowerCase();
        const tokenYAddr = tokenY.address.toLowerCase();
        const tokenZAddr = tokenZ.address.toLowerCase();
        let hexString = appendHex(tokenZAddr, fee2Hex(3000));
        hexString = appendHex(hexString, tokenYAddr);
        hexString = appendHex(hexString, fee2Hex(3000));
        hexString = appendHex(hexString, tokenXAddr);

        const params = {
            path: hexString,
            recipient: trader.address,
            desire: '1000000',
            maxPayed: '200000000',
        }

        const balanceXBefore = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYBefore = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZBefore = (await tokenZ.balanceOf(trader.address)).toString();

        console.log('hexstring: ', hexString);
        console.log('tokenX: ', tokenX.address);
        console.log('tokenY: ', tokenY.address);
        console.log('tokenZ: ', tokenZ.address);
        console.log('trader: ', trader.address);
        await quoter.connect(trader).swapDesire(params.desire, params.path);

        const balanceXAfter = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYAfter = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZAfter = (await tokenZ.balanceOf(trader.address)).toString();

        console.log(stringMinus(balanceXBefore, balanceXAfter));
        console.log(stringMinus(balanceYAfter, balanceYBefore));
        console.log(stringMinus(balanceZAfter, balanceZBefore));

    });
    
    it("check swap desire x2y2z", async function() {
        const tokenZAddr = tokenZ.address.toLowerCase();
        const tokenYAddr = tokenY.address.toLowerCase();
        const tokenXAddr = tokenX.address.toLowerCase();
        let hexString = appendHex(tokenXAddr, fee2Hex(3000));
        hexString = appendHex(hexString, tokenYAddr);
        hexString = appendHex(hexString, fee2Hex(3000));
        hexString = appendHex(hexString, tokenZAddr);

        const params = {
            path: hexString,
            recipient: trader.address,
            desire: '1000000',
            maxPayed: '200000000',
        }

        const balanceXBefore = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYBefore = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZBefore = (await tokenZ.balanceOf(trader.address)).toString();

        console.log('hexstring: ', hexString);
        console.log('tokenX: ', tokenX.address);
        console.log('tokenY: ', tokenY.address);
        console.log('tokenZ: ', tokenZ.address);
        console.log('trader: ', trader.address);
        await quoter.connect(trader).swapDesire(params.desire, params.path);

        const balanceXAfter = (await tokenX.balanceOf(trader.address)).toString();
        const balanceYAfter = (await tokenY.balanceOf(trader.address)).toString();
        const balanceZAfter = (await tokenZ.balanceOf(trader.address)).toString();

        console.log(stringMinus(balanceXBefore, balanceXAfter));
        console.log(stringMinus(balanceYAfter, balanceYBefore));
        console.log(stringMinus(balanceZAfter, balanceZBefore));

    });

    // it("check swap desire x2y2z", async function() {
        
    //     const hexString = '0x41BC21bdcF0FA87ae6eeFcBE0e4dB29dB2b650C10001F4e507AAC9eFb2A08F53C7BC73B3B1b8BCf883E41B';

    //     const params = {
    //         path: hexString,
    //         recipient: trader.address,
    //         desire: '1000000',
    //         maxPayed: '200000000',
    //     }

    //     await quoter.connect(trader).swapDesire(params.desire, params.path);

    // });
});