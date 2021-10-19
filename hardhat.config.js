require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');

const settings = require('./.settings.js');
const sk = settings.sk;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const izumiRpcUrl = "http://47.241.103.6:9545";
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    izumi_test: {
      url: izumiRpcUrl,
      accounts: [sk],
      // gas: 90000000,
      // gasPrice: 200000000,
      allowUnlimitedContractSize: true,
    },
  }
};
