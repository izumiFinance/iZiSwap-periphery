const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/swap/deploySwap.js

*/

const net = process.env.HARDHAT_NETWORK

function getContractJson(path) {
    const fs = require('fs');
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    return data;
}
async function getWETH9() {
    const WETH9Json = getContractJson(__dirname + '/../../test/core/WETH9.json');
    const WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode);
    const WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}

async function main() {

    const weth9 = await getWETH9();
    console.log('weth9: ', weth9.address);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})