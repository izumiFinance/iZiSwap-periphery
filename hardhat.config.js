require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('@nomiclabs/hardhat-etherscan');
const secret = require('./.secret.js');
const sk = secret.sk;
const apiKey = secret.apiKey;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const izumiRpcUrl = "http://47.241.103.6:9545";
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        }
      },
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    izumiTest: {
      url: izumiRpcUrl,
      accounts: [sk],
      // gas: 90000000,
      gas: 5000000,
      gasPrice: 100000000000,
    },
    bscTest: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [sk],
      // gas: 90000000,
      gasPrice: 10000000000,
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [sk],
      // gas: 90000000,
      gasPrice: 5000000000,
    },
    aurora: {
      url: 'https://mainnet.aurora.dev',
      accounts: [sk],
    },
    goerli: {
      url: 'https://goerli.prylabs.net',
      accounts: [sk],
      gasPrice: 10000000000,
    },
    auroraTest: {
      url: 'https://testnet.aurora.dev',
      accounts: [sk],
      gasPrice: 5000000000,
    }
  },
  etherscan: {
    apiKey: apiKey,
  }
};
