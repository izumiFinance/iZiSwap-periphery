require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('@nomiclabs/hardhat-etherscan');
require("@cronos-labs/hardhat-cronoscan")
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
          },
          outputSelection: {
            "*": {
              "*": [
                "abi",
                "evm.bytecode",
                "evm.deployedBytecode",
                "evm.methodIdentifiers",
                "metadata"
              ],
            }
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
      url: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
      //url: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
      accounts: [sk],
      // gas: 90000000,
      //gasPrice: 10000000000,
    },
    opBNBTest: {
      url: 'https://opbnb-testnet-rpc.bnbchain.org',
      accounts: [sk],
      gasPrice: 5000000000,
    },
    ontologyTest: {
      url: 'https://polaris1.ont.io:10339',
      accounts: [sk],
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [sk],
      // gas: 90000000,
      gasPrice: 5000000000,
    },
    ontology: {
      url: 'https://dappnode1.ont.io:10339',
      accounts: [sk],
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [sk],
    },
    aurora: {
      url: 'https://mainnet.aurora.dev',
      accounts: [sk],
    },
    cronos: {
      url: 'https://evm.cronos.org',
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
    },
    etc: {
      url: 'https://www.ethercluster.com/etc',
      accounts: [sk],
      gasPrice: 1100000000,
    },
    polygon: {
      url: 'https://rpc-mainnet.maticvigil.com',
      accounts: [sk],
    },
    mantleTest: {
      url: 'https://rpc.testnet.mantle.xyz',
      accounts: [sk],
    },
    mantle: {
      url: 'https://rpc.mantle.xyz',
      accounts: [sk],
    },
    scrollTestL2: {
      url: 'https://alpha-rpc.scroll.io/l2',
      accounts: [sk],
    },
    icplazaTest: {
      url: 'https://rpctest.ic-plaza.org/',
      accounts: [sk],
    },
    icplaza: {
      url: 'https://rpcmainnet.ic-plaza.org/',
      accounts: [sk],
    },
    bedrockRolluxTestL2: {
      url: 'https://bedrock.rollux.com:9545/',
      accounts: [sk],
    },
    meter: {
      url: 'https://rpc.meter.io',
      accounts: [sk],
    },
    telos: {
      url: 'https://mainnet.telos.net/evm',
      accounts: [sk],
    },
    ultron: {
       url: 'https://ultron-rpc.net',
       accounts: [sk],
    },
    lineaTest: {
       url: 'https://rpc.goerli.linea.build/',
       accounts: [sk],
    },
    linea: {
      url: 'https://linea-mainnet.infura.io/v3/<api key>',
      accounts: [sk],
    },
    opsideTest: {
       url: 'https://pre-alpha-us-http-geth.opside.network',
       accounts: [sk],
    },
    opsideTestRollux: {
       url: 'https://pre-alpha-zkrollup-rpc.opside.network/public',
       accounts: [sk],
    },
  },
  etherscan: {
    apiKey: apiKey,
  }
};
