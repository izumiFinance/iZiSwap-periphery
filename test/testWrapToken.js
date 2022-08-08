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
async function withdraw(wrapTokenX, tokenX, miner, recipientAddress, amount) {
    const balanceBefore = await tokenX.balanceOf(recipientAddress)

    const wrapBalanceBefore = await wrapTokenX.balanceOf(miner.address)
    let ok = true
    try {
        await wrapTokenX.connect(miner).withdraw(recipientAddress, amount)
    } catch(err) {
        ok = false
    }
    const wrapBalanceAfter = await wrapTokenX.balanceOf(miner.address)

    const balanceAfter = await tokenX.balanceOf(recipientAddress)
    const tokenXDelta = stringMinus(balanceAfter, balanceBefore)
    const wrapXDelta = stringMinus(wrapBalanceBefore, wrapBalanceAfter)
    return {ok, tokenXDelta, wrapXDelta}
}

describe("wrap token", function () {
    var signer, miner1, miner2, miner3;
    var tokenX;
    var wrapTokenX;
    beforeEach(async function() {
        [signer, miner1, miner2, miner3] = await ethers.getSigners()
        
        const TokenX = await ethers.getContractFactory("TestFeeToken")
        tokenX = await TokenX.deploy('tokenX', 'tokenX', 18, 20)
        const WrapTokenX = await ethers.getContractFactory('WrapToken')
        wrapTokenX = await WrapTokenX.deploy(tokenX.address, 'WrapTokenX', 'WrapTokenX')

    });

    it("deposit from other and check transfer/withdraw balance, deposit / withdraw 0", async function() {
        // balance not enough        
        await tokenX.connect(miner1).approve(wrapTokenX.address, '1000000000000000000000000000000')
        await tokenX.connect(miner3).approve(wrapTokenX.address, '1000000000000000000000000000000')

        await tokenX.mint(miner1.address, '30000000000000000000')

        try {
            await wrapTokenX.connect(miner3).depositFrom(miner1.address, miner2.address, '20000000000000000000')
            expect(1).to.equals(2)
        } catch (err) {
            // console.log('err: ', err)
        }

        await wrapTokenX.connect(miner1).depositFrom(miner1.address, miner1.address, '0')
        await wrapTokenX.connect(miner2).depositFrom(miner2.address, miner2.address, '0')
        await wrapTokenX.connect(miner3).depositFrom(miner3.address, miner3.address, '0')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('30000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('0')

        await wrapTokenX.connect(miner1).depositApprove(miner3.address, '20000000000000000000')
        await wrapTokenX.connect(miner3).depositFrom(miner1.address, miner2.address, '10000000000000000000')
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('20000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('8000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('8000000000000000000')
        
        expect((await wrapTokenX.depositAllowance(miner1.address, miner3.address)).toString()).to.equals('10000000000000000000')


        try {
            await wrapTokenX.connect(miner3).depositFrom(miner1.address, miner2.address, '10000000000000001000')
            expect(1).to.equals(2)
        } catch (err) {
            // console.log('err: ', err)
        }
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('20000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('8000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('8000000000000000000')
        
        expect((await wrapTokenX.depositAllowance(miner1.address, miner3.address)).toString()).to.equals('10000000000000000000')

        await wrapTokenX.connect(miner3).depositFrom(miner1.address, miner2.address, '2000000000000000000')
        expect((await wrapTokenX.depositAllowance(miner1.address, miner3.address)).toString()).to.equals('8000000000000000000')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('9600000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('9600000000000000000')

        await wrapTokenX.connect(miner1).depositApprove(miner3.address, '2000000000000000000000000000000')
        expect((await wrapTokenX.depositAllowance(miner1.address, miner3.address)).toString()).to.equals('2000000000000000000000000000000')
        try {
            await wrapTokenX.connect(miner3).depositFrom(miner1.address, miner2.address, '20000000000000000000')
            expect(1).to.equals(2)
        } catch (err) {
            // console.log('err: ', err)
        }
        expect((await wrapTokenX.depositAllowance(miner1.address, miner3.address)).toString()).to.equals('2000000000000000000000000000000')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('9600000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('9600000000000000000')

        await tokenX.mint(miner3.address, '30000000000000000000')
        await wrapTokenX.connect(miner3).depositFrom(miner3.address, miner2.address, '20000000000000000000')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('25600000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('10000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('25600000000000000000')

        await wrapTokenX.connect(miner3).depositFrom(miner3.address, miner3.address, '10000000000000000000')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('25600000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('33600000000000000000')


        await wrapTokenX.connect(miner2).transfer(miner1.address, '12800000000000000000')
        await wrapTokenX.connect(miner3).transfer(miner1.address, '8000000000000000000')
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('20800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('33600000000000000000')


        const miner3Withdraw0 = await withdraw(wrapTokenX, tokenX, miner3, miner3.address, '100000')
        expect(miner3Withdraw0.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('20800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('33600000000000000000')

        const miner3Withdraw1 = await withdraw(wrapTokenX, tokenX, miner3, miner3.address, '0')
        expect(miner3Withdraw1.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('20800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('33600000000000000000')

        const miner1Withdraw0 = await withdraw(wrapTokenX, tokenX, miner1, miner1.address, '20800000000000010000')
        expect(miner1Withdraw0.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('20800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('33600000000000000000')

        const miner1Withdraw1 = await withdraw(wrapTokenX, tokenX, miner1, miner1.address, '20000000000000000000')
        expect(miner1Withdraw1.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('34000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('13600000000000000000')

        const miner2Withdraw0 = await withdraw(wrapTokenX, tokenX, miner2, miner2.address, '12800000000000010000')
        expect(miner2Withdraw0.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('34000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('13600000000000000000')


        const miner2Withdraw1 = await withdraw(wrapTokenX, tokenX, miner2, miner2.address, '0')
        expect(miner2Withdraw1.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('34000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('12800000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('13600000000000000000')

    });
    it("deposit from msg.sender and check transfer/withdraw balance", async function() {
        // balance not enough        
        await tokenX.connect(miner1).approve(wrapTokenX.address, '1000000000000000000000000000000')
        await tokenX.connect(miner3).approve(wrapTokenX.address, '1000000000000000000000000000000')

        try {
            await wrapTokenX.connect(miner1).depositFrom(miner1.address, miner2.address, '20000000000000000000')
            expect(1).to.equals(2)
        } catch (err) {
            // console.log('err: ', err)
        }

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('0')

        await tokenX.mint(miner1.address, '30000000000000000000')
        await wrapTokenX.connect(miner1).depositFrom(miner1.address, miner2.address, '20000000000000000000')

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('10000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('16000000000000000000')

        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('16000000000000000000')

        await tokenX.mint(miner3.address, '60000000000000000000')
        await wrapTokenX.connect(miner3).depositFrom(miner3.address, miner3.address, '10000000000000000000')
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('10000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('16000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')


        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('24000000000000000000')

        const miner1Withdraw = await withdraw(wrapTokenX, tokenX, miner1, miner2.address, '100')
        expect(miner1Withdraw.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('10000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('16000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')

        const miner2Withdraw0 = await withdraw(wrapTokenX, tokenX, miner2, miner2.address, '16000000000000001000')
        expect(miner2Withdraw0.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('10000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('16000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')


        const miner2Withdraw1 = await withdraw(wrapTokenX, tokenX, miner2, miner1.address, '10000000000000000000')
        expect(miner2Withdraw1.ok).to.equals(true)

        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('6000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')

        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('14000000000000000000')

        const miner2Withdraw2 = await withdraw(wrapTokenX, tokenX, miner2, miner2.address, '6000000000000000100')
        expect(miner2Withdraw2.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('6000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')

        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('14000000000000000000')


        const miner2Withdraw3 = await withdraw(wrapTokenX, tokenX, miner2, miner2.address, '5000000000000000000')
        expect(miner2Withdraw3.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('0')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('8000000000000000000')

        expect((await tokenX.balanceOf(wrapTokenX.address)).toString()).to.equals('9000000000000000000')

        await wrapTokenX.connect(miner3).transfer(miner1.address, '2000000000000000000')
        try {
            await wrapTokenX.connect(miner3).transfer(miner1.address, '8000000000000000000')
            expect(1).to.equals(0)
        }catch(err) {

        }
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('2000000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('6000000000000000000')

        const miner1Withdraw1 = await withdraw(wrapTokenX, tokenX, miner1, miner2.address, '2000000000000010000')
        expect(miner1Withdraw1.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18000000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('2000000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('6000000000000000000')

        const miner1Withdraw2 = await withdraw(wrapTokenX, tokenX, miner1, miner1.address, '200000000000000000')
        expect(miner1Withdraw2.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18160000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('1800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('6000000000000000000')


        const miner3Withdraw1 = await withdraw(wrapTokenX, tokenX, miner1, miner1.address, '6000000000000100000')
        expect(miner3Withdraw1.ok).to.equals(false)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18160000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('1800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50000000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('6000000000000000000')


        const miner3Withdraw2 = await withdraw(wrapTokenX, tokenX, miner3, miner3.address, '1000000000000000000')
        expect(miner3Withdraw2.ok).to.equals(true)
        expect((await tokenX.balanceOf(miner1.address)).toString()).to.equals('18160000000000000000')
        expect((await tokenX.balanceOf(miner2.address)).toString()).to.equals('4000000000000000000')
        expect((await wrapTokenX.balanceOf(miner1.address)).toString()).to.equals('1800000000000000000')
        expect((await wrapTokenX.balanceOf(miner2.address)).toString()).to.equals('1000000000000000000')
        expect((await tokenX.balanceOf(miner3.address)).toString()).to.equals('50800000000000000000')
        expect((await wrapTokenX.balanceOf(miner3.address)).toString()).to.equals('5000000000000000000')
    });

});