
const { getWeb3 } = require('./getWeb3');
const { getContractABI } = require('./getContractJson');

function getNftLiquidityManager(address) {
    const path = __dirname + '/../../artifacts/contracts/NonfungibleLiquidityManager.sol/NonfungibleLiquidityManager.json';
    const nfLiquidityManagerABi = getContractABI(path);
    const web3 = getWeb3();

    const nfLiquidityManager = new web3.eth.Contract(nfLiquidityManagerABi, address);
    return nfLiquidityManager;
}

module.exports = {
    getNftLiquidityManager
}