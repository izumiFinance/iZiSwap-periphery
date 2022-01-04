// {
//     "tokenX": "0x41BC21bdcF0FA87ae6eeFcBE0e4dB29dB2b650C1",
//     "tokenY": "0xe507AAC9eFb2A08F53C7BC73B3B1b8BCf883E41B",
//     "poolFee": 3000,
//     "amountIn": "1000000000000000000",
//     "amountOut": "2000000000000000000",
//     "tickLimit": -414450,
//     "account": "0xD4D6F030520649c7375c492D37ceb56571f768D0"
// }



var Web3 = require('web3');
const settings = require("../.settings.js");
var web3 = new Web3(new Web3.providers.HttpProvider('http://47.241.103.6:9545'));

const BigNumber = require('bignumber.js');
function getContractJson(path) {
    const fs = require('fs');
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    return data;
}
function getQuoterABI() {
    var quoterJson = getContractJson(__dirname + "/../artifacts/contracts/Quoter.sol/Quoter.json");
    return quoterJson.abi;
}
function blockNum2BigNumber(blockNum) {
  return BigNumber(blockNum._hex);
}
async function main() {
    console.log(await web3.eth.getAccounts())
    console.log("default account: ", web3.eth.defaultAccount);
    web3.eth.defaultAccount = "0xD4D6F030520649c7375c492D37ceb56571f768D0";
    var quoterABI = getQuoterABI();
    var quoter = new web3.eth.Contract(quoterABI, settings.quoterAddr);
    const tokenX = settings.USDC;
    const tokenY = settings.IZI;
    var ret = await quoter.methods.swapX2Y(tokenX, tokenY, 3000, "2000000000000000000", -414450).call();
    console.log(ret.toString());
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})

