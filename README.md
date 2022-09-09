# iZiSwap-periphery

<div align="center">
  <a href="https://izumi.finance"> 
    <img width="900px" height="auto" 
    src="image/logo.png">
  </a>
</div>


Contracts for iZiSwap periphery.



## Set up Environment

install node.js(12.X) and npm

## Compile from source

##### 1. clone repo from github

```
$ git clone git@github.com:izumiFinance/izumi-swap-periphery.git
```

suppose the root dir of the project is `${IZUMI_SWAP_PERIPHERY}`

##### 2. checkout the branch
cd to the dir `${IZUMI_SWAP_PERIPHERY}` and checkout to the branch you want

##### 3. install denpendencies
install the package listed in the `package.json` via npm

##### 4. compile
compile via following command

```
$ npx hardhat compile
```

##### 5. compiled json file
after compile, the abi and code of the contracts can be found in files `artifacts/*.sol/*.json`

## Run test cases

##### 1. compile izumi-swap-core
before running test case, you should compile [izumi-swap-core](https://github.com/izumiFinance/izumi-swap-core) first.
you can refer to the README.md in the link to compile the core, suppose the project dir of izumi-swap-core 
is `${IZUMI_SWAP_CORE_DIR}`

##### 2. copy compiled json from izumi-swap-core to izmui-swap-periphery
after compile the izumi-swap-core project, copy dirs `${IZUMI_SWAP_CORE_DIR}/artifacts/*.sol` to 
`${IZUMI_SWAP_PERIPHERY}/test/core/`
copy compiled json file of weth into `${IZUMI_SWAP_PERIPHERY}/test/core/` and name it as `WETH9.json`
because when we running test cases, we will find abi and code of izumi-swap-core contracts and weth contract under `${IZUMI_SWAP_PERIPHERY}/test/core/`

##### 3. run test case
run test cases via following command
```
$ npx hardhat test
```
if you want to only run a single test case, simply run
```
$ npx hardhat test test/${FILE_OF_TEST_CASE}.json
```

## Example of Deploy and interact

##### 1. Example of Deploy and interact
we provide example scripts for deploy contracts, add pool, add liquidity, view liquidity, swap, prequery price.
in the following, we take the example of deploying and interface in izumi-test network, which has been set in `${IZUMI_SWAP_PERIPHERY}/hardhat.config.js`, if you want to deploy and interface in other eth-networks, you could just configure the network in the `hardhat.config.js` and specified it via `--network` when runing coresponding scripts

##### 2. prepare work
establish a file called `.settings.js` under dir `${IZUMI_SWAP_PERIPHERY}`
```
$ cp .settings.js.example .settings.js
```
following 3 field must be filled
change the field of sk to a private key of your sign account of the network you want to deploy
change the field of weth to address of contract weth of the network
change the field of izumiswapFactory to address of the IzumiswapFactory contract in the network, the deployment of IzumiswapFactory can be refered in [izumi-swap-core](https://github.com/izumiFinance/izumi-swap-core) 

the following field in the .settings.js can be empty string currently

##### 3. Example to deploy "NonfungibleLiquidityManager" and "Swap"

you can refer to the example script `scripts/deployPeriphery.js`.
if you want to deploy it in the izumi-test network configered in `hardhat.config.js`, simply run
```
$ npx hardhat run scripts/deployPeriphery.js --network izumi_test
```
replace `izumi_test` if you want to deploy the 2 contracts on other eth-networks

after running, the deployed addresses of `NonfungibleLiquidityManager` and `Swap` can be viewed on the screen.
and you should copy them to the fields `nflmAddr` and `swapAddr` in the `.settings.js` for  ineractions of add pool, add liquidity and swap

##### 4. Example to deploy "Quoter" contract.
```
$ npx hardhat run scripts/deployQuoter.js --network izumi_test
```
replace `izumi_test` to eth-network you want.
after running, the deployed addresses of `Quoter` can be viewed on the screen.
and you should copy them to the field `quoterAddr` in the `.settings.js` for  ineractions of pre query price

##### 5. Example to "add pool", "add Liquidity", "swap" and "prequery price"
`scripts/addPool` will add a pool of `(BIT/USDC/3000)`
before runing, make sure that `nflmAddr`, `swapAddr`, `BIT`, `USDC` in the `.settings.js` is correct, `BIT` and `USDC` are 2 token address used in the script, if you donot have such tokens in your eth-network, you can deploy them using `contracts/test/Token.sol`
running addPool
```
$ npx hardhat run scripts/addPool.js --network izumi_test
```
replace `izumi_test` to eth-network you want

```
$ npx hardhat run scripts/getPool --network izumi_test
```
you can view the pool address of `(BIT/USDC/3000)`

add and view liquidity
```
$ npx hardhat run scripts/addPool.js --network izumi_test
$ npx hardhat run scripts/viewLiquidity.js --network izumi_test
```

call swapX2Y(...) of Swap contract
```
$ npx hardhat run scripts/swapX2Y.js -- network izumi_test
```

call swapY2X(...)
```
$ npx hardhat run scripts/swapY2X.js -- network izumi_test
```

prequery price
```
$ node scripts/getSwapPrice.js
```
