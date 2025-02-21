## deployment

non-zksync

### 1. build and config

##### clone the repo.

```
$ git clone git@github.com:izumiFinance/iZiSwap-periphery.git
```

##### install dependencies

```
$ cd iZiSwap-periphery/
$ npm install
```

##### config

before compile or deploy, you should config your secret key.

```
$ touch .secret.js
```
and write following text into ".secret.js" file
```
module.exports = {
    // your secret key without leading '0x'
    sk: '',
    // apiKey for verify on scan: 
    apiKey:'',
} 
```

##### compile

```
$ npx hardhat compile
```

### 2. test

first, copy compiled ".json" files from  `izumi-swap-core` and `WETH9.json` into periphery's `test/core/`. If no `test/core` dir, just create it and then copy those files.

after that, hierarchy of `test/core` will look like following

```
test/core
├── FlashModule.dbg.json
├── FlashModule.json
├── LimitOrderModule.dbg.json
├── LimitOrderModule.json
├── LiquidityModule.dbg.json
├── LiquidityModule.json
├── SwapX2YModule.dbg.json
├── SwapX2YModule.json
├── SwapY2XModule.dbg.json
├── SwapY2XModule.json
├── WETH9.json
├── iZiSwapFactory.dbg.json
├── iZiSwapFactory.json
├── iZiSwapPool.dbg.json
└── iZiSwapPool.json
```

And then you can run test command

```
npx hardhat test
```


### 3. config iZiSwap-core factory and other swap contracts.

we may need config following 6 contracts in `scripts/deployed.js`.
```
iZiSwapFactory           # required
wrappedNative            # required, WETH9 interface
pancakeSwapRouter        # optional, need by tap-proxy, default is zero-address
uniswapRouter            # optional, need by tap-proxy, default is zero-address
iZiClassicFactory        # optional, need by UniversalV2/V3, default is zero-address
iZiSwapV3Factory         # optional, need by UniversalV3
```

in this example, we config those contract in 
`scripts/deployed.js` like following:

```
const contracts = { 
    // other networks
    bscTest: {
        iZiSwapFactory: '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
        wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
        pancakeSwapRouter: '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3', // remove this line if not need
        uniswapRouter: '0x...', // remove this line if not need
        iZiClassicFactory: '0x...', // remove this line if not need
        iZiSwapV3Factory: '0x...', // remove this line if not need
    },
    // other networks
}
module.exports = contracts;
```

here, `0x31834FEc56F3e245715D3A68F63927D93a2d3e6d` is address of `iZiSwapFactory` we deployed in `izumi-swap-core`, you should replace it with your own deployed `iZiSwapFactory`.

`0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` is `WBNB` we used on `bscTest`.

`0x9ac64cc6e4415144c455bd8e4837fea55603e5c3` is `pancakeSwapRouter` on `bscTest`.

**Notice:** On some testnet, we may need deploy `WETH9` separately, and we can refer to `deployment-multistep.md` for deployment of `WETH9`.


### 4. deploy and verify

before deployment, we should complete previous sections.

##### deploy in one command

**Notice 1:** `deploy-in-one-command` will not involve deployment of `universal quoters and routers`, due to the fact that `universal quoter and router` may need `v2 or v3` addresses. If you want to deploy `universal quoter and router`, you can refer to `deployment-multistep.md`.

**Notice 2:** `deploy-in-one-command` will not involve deployment of `WETH9`, because on mainnet we will use official `WETH9`. If you want to deploy `WETH9` on testnet, you can refer to `deployment-multistep.md`. On testnet, you can first deploy `WETH9` separately and then deploy other contracts via `deploy-in-one-command`.


deploy in one command:

```
$ HARDHAT_NETWORK=${network} node scripts/all/deployAll.js ${locker_max_nft_count}
```

An example on bscTest

```
HARDHAT_NETWORK=bscTest node scripts/all/deployAll.js 300
```

here, `300` is max number of nft for each user in locker.

and we can get some log info like following:

```
locker max cnt:  300
iZiSwapFactory:  0x31834FEc56F3e245715D3A68F63927D93a2d3e6d
WETH9:  0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
pancakeSwapRouter:  0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
uniswapRouter:  0x0000000000000000000000000000000000000000
==============================
-- deploying LiquidityManager...
-- LiquidityManager:  0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6
-- deploying LimitOrderManager...
-- LimitOrderManager:  0x85258799e35be8507814125b31Cb3614ABDcd3e8
-- deploying LimitOrderWithSwapManager...
-- LimitOrderWithSwapManager:  0x46e9dC0c0C515cad1c2E13Dc3f62b2A7376EfE5A
-- deploying quoter...
-- quoter:  0x4BB345e7F6cFcc780cBDF98E545b2901474b3268
-- deploying quoterWithLim...
-- quoterWithLim:  0x55e2e91857Fc077d2Ee37A2d6231ff862a3C325B
-- deploying Swap...
-- Swap:  0xfa00170b4694c5303ff2B2e453319a0a4F4c732F
-- deploying Locker...
-- locker:  0xCA98973fd060A4120ee3876c0Ae84dfa7aF33213
-- deploying Oracle...
-- oracle:  0xd2FAF28b91ad0E7635a65df11749a74D67E43f3A
-- deploying TapProxy...
Deploying .....
pancake:  0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
uniswap:  0x0000000000000000000000000000000000000000
iZiSwapRouter:  0xfa00170b4694c5303ff2B2e453319a0a4F4c732F
iZiSwapLiquidityManager:  0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6
tapProxy Contract Address:  0xBE889B9d93CaFbA7076937c9d7c04438fe07f87d
-- TapProxy:  0xBE889B9d93CaFbA7076937c9d7c04438fe07f87d
-- deploying Multicall...
-- Multicall:  0x402b343Da677B2e6850537c4F435C760D4f0dddD
==============================
deployed:
liquidityManager:  0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6
limitOrderManager:  0x85258799e35be8507814125b31Cb3614ABDcd3e8
limitOrderWithSwapManager:  0x46e9dC0c0C515cad1c2E13Dc3f62b2A7376EfE5A
quoter:  0x4BB345e7F6cFcc780cBDF98E545b2901474b3268
quoterWithLim:  0x55e2e91857Fc077d2Ee37A2d6231ff862a3C325B
swap:  0xfa00170b4694c5303ff2B2e453319a0a4F4c732F
locker:  0xCA98973fd060A4120ee3876c0Ae84dfa7aF33213
oracle:  0xd2FAF28b91ad0E7635a65df11749a74D67E43f3A
tapProxy:  0xBE889B9d93CaFbA7076937c9d7c04438fe07f87d
multicall:  0x402b343Da677B2e6850537c4F435C760D4f0dddD
==============================
constructor args for locker:


module.exports = [ '0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6', '300' ]


constructor args for tapProxy:


module.exports = [
  '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3',
  '0x0000000000000000000000000000000000000000',
  '0xfa00170b4694c5303ff2B2e453319a0a4F4c732F',
  '0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6'
]


constructor args for liquidityManager, limitOrderManager, limitOrderWithSwap, quoter, quoterWithLim, swap:


module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

this `deployAll.js` will print addresses deployed and also, it will print `constructor args` for each deployed contract if need.


##### deploy via multi step

you can refer to this doc `deployment-multistep.md`

### verify

##### contract with constructor args

deployment scripts will output `constructor args` for each contract if need.

copy `constructor args` printed when deploying those contracts and paste them into a js file with arbitrary name (like `tmp.js`)

in the above example, the `constructor-args` of `liquidityManager` is following

```
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

And run the following command to verify

```
$ npx hardhat verify --network bscTest --constructor-args tmp.js 0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6
```
Then, `liquidityManager` is verified.
Here, `0xEFcA2237eA31F49ABCDC2c2eb2dD3eE9e754C9f6` is `liquidityManager` address deployed in previous section, you need replace it with your newly deployed contract.


##### contract without constructor args

`oracle` does not have constructor args, just run following command:

```
$ npx hardhat verify --network bscTest 0xd2FAF28b91ad0E7635a65df11749a74D67E43f3A
```

here, `0xd2FAF28b91ad0E7635a65df11749a74D67E43f3A` is oracle we deployed in previous example.