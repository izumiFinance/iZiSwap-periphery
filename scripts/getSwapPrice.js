
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
    web3.eth.defaultAccount = "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe";
    var quoterABI = getQuoterABI();
    var quoter = new web3.eth.Contract(quoterABI, settings.quoterAddr);
    var ret = await quoter.methods.swapX2YDesireY(settings.BIT, settings.USDC, 500, "68000000000000000000000", -300000).call();
    console.log(ret);
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
