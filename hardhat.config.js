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
      accounts: [sk],
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
      url: 'https://etc.mytokenpocket.vip',
      accounts: [sk],
      gasPrice: 1100000000,
    },
    polygon: {
	    url: 'https://polygon-bor-rpc.publicnode.com',
	    //url: 'https://polygon-rpc.com/',
      //url: 'https://rpc-mainnet.maticvigil.com',
      accounts: [sk],
    },
    mantleTest: {
      url: 'https://rpc.testnet.mantle.xyz',
      accounts: [sk],
    },
    mantleSepoliaTest: {
      url: 'https://rpc.sepolia.mantle.xyz',
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
      url: 'https://linea-mainnet.infura.io/v3/<your api key>',
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
      url: 'https://{zeta rpc url}',
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
	    url: 'https://1rpc.io/kroma	',
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
    zkfair: {
      url: 'https://rpc.zkfair.io ',
      accounts: [sk],
    },
    zeta: {
      url: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
      accounts: [sk],
    },
    taikoKatlaL2Test: {
      url: 'https://rpc.katla.taiko.xyz',
      accounts: [sk],
    },
    taikoHeklaL2Test: {
      url: 'https://rpc.hekla.taiko.xyz',
      accounts: [sk],
    },
    taiko: {
      url: 'https://rpc.mainnet.taiko.xyz',
      accounts: [sk],
      gasPrice: 12000000,
    },
    beraBArtioTest: {
      url: 'https://bartio.rpc.berachain.com/',
      accounts: [sk],
    },
    morphTest: {
      url: 'https://rpc-testnet.morphl2.io',
      accounts: [sk],
    },
    XLayer: {
      // url: 'https://rpc.xlayer.tech',
      url: 'https://xlayerrpc.okx.com',
      accounts: [sk],
    },
    BOB: {
      url: 'https://rpc.gobob.xyz',
      accounts: [sk],
    },
    Kava: {
      url: 'https://evm.kava-rpc.com',
      accounts: [sk],
    },
    kakarotSepoliaTest: {
      url: 'https://sepolia-rpc.kakarot.org',
      accounts: [sk],
    },
    core: {
      url: 'https://core.public.infstones.com',
      accounts: [sk],
    },
    gravity: {
      url: 'https://rpc.gravity.xyz',
      accounts: [sk],
    },
    iotex: {
      url: 'https://babel-api.fastblocks.io',
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
      },
      {
         network: "linea",
         chainId: 59144,
         urls:{
           apiURL: "https://api.lineascan.build/api",
           browserURL: "https://lineascan.build/",
         }
      },
      {
         network: "base",
         chainId: 8453,
         urls:{
	   apiURL: "https://api.basescan.org/api",
           browserURL: "https://basescan.org",
         }
      },
      {
         network: "scroll",
         chainId: 534352,
         urls:{
	   apiURL: "https://api.scrollscan.com/api",
           browserURL: "https://scrollscan.com/",
         }
      },
      {
         network: "taiko",
         chainId: 167000,
         urls: {
           apiURL: "https://api.routescan.io/v2/network/mainnet/evm/167000/etherscan",
           browserURL: "https://taikoscan.network"
         }
      },
      {
         network: 'Kava',
         chainId: 2222,
         urls: {
           apiURL: 'https://api.verify.mintscan.io/evm/api/0x8ae',
           browserURL: 'https://kavascan.com',
         },
      },
      {
         network: "core",
         chainId: 1116,
         urls: {
             apiURL: "https://openapi.coredao.org/api",
             browserURL: "https://scan.coredao.org/"
         }
      },
      {
        network: "iotex",
        chainId: 4689,
        urls: {
          apiURL: "https://IoTeXscout.io/api",
          browserURL: "https://IoTeXscan.io"
        }
      },
    ],
    apiKey: apiKey,
  },
};
