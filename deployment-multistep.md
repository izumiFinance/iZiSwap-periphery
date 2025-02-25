## deployment multistep

### 1. build and config

refer to `deployment.md`

### 2. test

refer to `deployment.md`


### 3. config iZiSwap-core factory and other swap contracts.

refer to `deployment.md`

### 4. deploy contracts

Asume we are deploying on `bscTest` and we have finished sections above.


##### deploy WETH9 (optional)

if you want to deploy your own `WETH9` on some testnet, use following command

```
$ HARDHAT_NETWORK=bscTest node scripts/weth9/deployWETH9.js "Wrapped BNB" "WBNB"
```
here, `"Wrapped BNB"` and `"WBNB"` is `token-name` and `token-symbol` of your `WETH9`.

and we may get following output:
```
Paramters:
    tokenName: Wrapped BNB
    tokenSymbol: WBNB
Token Deployed Address: 0xF93919c9F62ECe0490F5AAC87D4AD1486bC0A704
```
if you want to use your own `WETH9`, you need to config `wrappedNative` address in `scripts/deployed.js`, you can refer to `section 3` for more details.

##### deploy liquidityManager

```
$ HARDHAT_NETWORK=bscTest node scripts/liquidityManager/deployLiquidityManager.js
```

and we may get output like following

```
LiquidityManager:  0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

**Notice:** if you failed with error like following, you can try a new rpc.
```
Error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)
```


##### deploy LimitOrderManager

```
$ HARDHAT_NETWORK=bscTest node scripts/limOrderManager/deployLimOrderManager.js
```

and we may get output like following

```
LimitOrderManager:  0x2A27Dd3fDEB7596DA73D71af3Ef1AeED3692CB8c
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

##### deploy LimitOrderWithSwapManager

```
$ HARDHAT_NETWORK=bscTest node scripts/limOrderWithSwapManager/deployLimOrderWithSwapManager.js
```

and we may get output like following

```
LimitOrderWithSwapManager:  0x222F48A90383A5C331FB356993B6C6FB7749e603
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```


##### deploy quoter

```
$ HARDHAT_NETWORK=bscTest node scripts/quoter/deployQuoter.js
```

and we may get output like following

```
quoter:  0x90d1a0F4Cf168964c09FE8D69D99251d8de91345
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```


##### deploy quoter with limit

```
$ HARDHAT_NETWORK=bscTest node scripts/quoter/deployQuoterWithLim.js
```

and we may get output like following

```
quoter:  0x5eD8b8Be50C1bB5Bb21280b0c32Ed01aA2DaE7C2
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

##### deploy swap

```
$ HARDHAT_NETWORK=bscTest node scripts/swap/deploySwap.js
```

and we may get output like following

```
Swap:  0x8c87b4c6fFBDBA6A17B59F83D0f2C984fD7247C5
constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
]
```

##### deploy locker

```
$ HARDHAT_NETWORK=bscTest node scripts/locker/deployLocker.js 0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481 300
```
here, `0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481` here is `liquidityManger` we deployed in previous steps.

`300` is max number of nft for each user.

and we can get following output:
```
locker:  0xBf1AA6D696CbC97f0310B0fC7Bb600FA25555A4f
constructor args:
module.exports = [ '0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481', '300' ]
```

##### deploy oracle

```
$ HARDHAT_NETWORK=bscTest node scripts/oracle/deployOracle.js
```

and we can get output:

```
oracle:  0x7915E6277f84bf5F7842a1FcA5CF7786a8e13EA1
```

oracle does not have constructor args.

### deploy multicall
```
HARDHAT_NETWORK=bscTest node scripts/multicall/deployMultiContractCall.js
```
and we can get output like following:
```
multicall Contract Address:  0x7Fd6e274Ebe75572Ce3CE616ce410931e0e30aBB
```
multicall does not have constructor args.

### deploy tapProxy
```
HARDHAT_NETWORK=bscTest node scripts/tapProxy/deployTapProxy.js 0x8c87b4c6fFBDBA6A17B59F83D0f2C984fD7247C5 0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481
```

here, `0x8c87b4c6fFBDBA6A17B59F83D0f2C984fD7247C5` is swap we previously deployed. `0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481` is liquidityManager we previously deployed.

and we can get output like following:
```
Deploying .....
pancake:  0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
uniswap:  0x0000000000000000000000000000000000000000
iZiSwapRouter:  0x8c87b4c6fFBDBA6A17B59F83D0f2C984fD7247C5
iZiSwapLiquidityManager:  0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481
tapProxy Contract Address:  0x3A0a298aBB3E0F3aC4dcF3e2196804B27B14fA5D
constructor args
module.exports = [
  '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3',
  '0x0000000000000000000000000000000000000000',
  '0x8c87b4c6fFBDBA6A17B59F83D0f2C984fD7247C5',
  '0xd5A7A4cc9549940164a0EDe36bDeBAAB9fFBf481'
]
```

##### deploy universal quoter and swap router (v1+v2)

ensure `iZiSwapFactory`, `iZiClassicFactory` and `wrappedNative` have been configured in `scripts/deployed.js`.

Just like following:

```
    bscTest: {
        iZiSwapFactory: '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
        iZiClassicFactory: '0x784EE74BE57D2567A17399F6aA435183C4e267EE', // default is zero-address
        wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    }
```

You should fill these fields with actual contract address when you deploy on other chains.

**deploy quoter**

```
$ HARDHAT_NETWORK=bscTest node scripts/universal/deployUniversalQuoter.js
```

and we can get output like following

```
quoter:  0x24D0F8908700267187b757201FB302C0E2D0Ccf4

constructor args:
module.exports = [
  '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
  '0x784EE74BE57D2567A17399F6aA435183C4e267EE'
]
```

**deploy swap router**

```
$ HARDHAT_NETWORK=bscTest node scripts/universal/deployUniversalRouter.js 0xe90ebA9b7f3fC6a0B1aE28FfF4932cb9E35B6946
```

Here, `0xe90ebA9b7f3fC6a0B1aE28FfF4932cb9E35B6946` is `fee collector` of this router, you can replace it with arbitrary address you want.

both scripts above will print deployed contract address and constructor args.

##### deploy universal quoter and router (v1+v2+v3)

##### deploy universal router (v1+v2+v3)

### verify
To verify contracts, you can refer to corresponding section in `deployment.md`.

the corresponding constructor args can be viewed in output of deployment-scripts.