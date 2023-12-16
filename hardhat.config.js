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
    opBNB: {
      url: 'https://opbnb-mainnet-rpc.bnbchain.org',
      accounts: [sk],
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
    confluxEspace: {
	                url: 'https://evm.confluxrpc.com',
	          accounts: [sk],
	        },
    base: {
          url: 'https://developer-access-mainnet.base.org',
          accounts: [sk],
    },
    baseTest: {
          url: 'https://goerli.base.org',
          accounts: [sk],
	  gasPrice: 110000000
    },
    loot: {
      url: 'https://rpc.lootchain.com/http',
      accounts: [sk],
    },
    mantaTest: {
      url: 'https://manta-testnet.calderachain.xyz/http',
      accounts: [sk],
    },
    manta: {
      url: 'https://manta-pacific.calderachain.xyz/http',
      accounts: [sk],
    },
    optimism: {
      url: 'https://mainnet.optimism.io',
      accounts: [sk],
    },
    zetaTest: {
      url: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
      accounts: [sk],
    },
    kromaSepoliaTest: {
      url: 'https://api.sepolia.kroma.network',
      accounts: [sk],
    },
    scrollSepoliaTest: {
      url: 'https://sepolia-rpc.scroll.io',
      accounts: [sk],
    },
    scroll: {
      url: 'https://rpc.scroll.io',
      accounts: [sk],
    },
    kromaMainnet: {
      url: 'https://api.kroma.network/',
      accounts: [sk],
    },
    gasZeroGoerliL2: {
      url: 'https://goerlitest.gaszero.com/',
      accounts: [sk],
    },
    x1Test: {
      url: 'https://testrpc.x1.tech',
      accounts: [sk],
    },
    zkfairTest: {
      url: 'https://testnet-rpc.zkfair.io/',
      accounts: [sk],
    },
  },
  etherscan: { 
    customChains:[
      {
         network: "kromaMainnet",
         chainId: 255,
         urls: {
           apiURL: "https://blockscout.kroma.network/api",
           browserURL: "https://blockscout.kroma.network/",
	 }
      }],
    apiKey: apiKey,
  },
};
