const hardhat = require("hardhat");
const { modules } = require("web3");
const contracts = require("../deployed.js");

const BigNumber = require('bignumber.js');

const Web3 = require("web3");
const secret = require('../../.secret.js');
const pk = secret.pk;

const config = require("../../hardhat.config.js");



const quoterJsonABI = [
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      },
      {
        "internalType": "bytes",
        "name": "path",
        "type": "bytes"
      }
    ],
    "name": "swapAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "acquire",
        "type": "uint256"
      },
      {
        "internalType": "int24[]",
        "name": "pointAfterList",
        "type": "int24[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
]



const v = process.argv
const net = process.env.HARDHAT_NETWORK

const rpc = config.networks[net].url
const quoterAddress = contracts[net].quoter;
var web3 = new Web3(new Web3.providers.HttpProvider(rpc));

//Example: HARDHAT_NETWORK='izumiTest' node increaseCardinality.js iZi WETH9 3000 20

async function main() {

  const quoter = new web3.eth.Contract(quoterJsonABI, quoterAddress);

  const hexString = '0x41BC21bdcF0FA87ae6eeFcBE0e4dB29dB2b650C10001F4e507AAC9eFb2A08F53C7BC73B3B1b8BCf883E41B000BB8Ee5e3852434eB67F8e9E97015e32845861ea15E8';
  const ret = await quoter.methods.swapAmount('100000000000000000000', hexString).call();
  console.log('ret: ', ret);
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
})

module.exports = main;
