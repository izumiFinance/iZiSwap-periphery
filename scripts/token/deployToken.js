const hardhat = require("hardhat");

const v = process.argv
const para = {
    tokenName: v[2],
    tokenSymbol: v[3],
    decimal: v[4],
}

async function main() {

  console.log("Deploy ERC20 Token Contract: %s(%s)", para.tokenName, para.tokenSymbol);
  console.log("Paramters: ");
  for ( var i in para) { console.log("    " + i + ": " + para[i]); }

  // We get the contract to deploy
  const tokenFactory = await hardhat.ethers.getContractFactory("TestToken")
  const token = await tokenFactory.deploy(para.tokenName, para.tokenSymbol, para.decimal);
  
  await token.deployed();

  console.log("Token Deployed Address:", token.address);
  console.log("constructor args")
  console.log("module.exports =", [
    para.tokenName, para.tokenSymbol, para.decimal
  ])
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
