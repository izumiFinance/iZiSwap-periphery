const hardhat = require("hardhat");

async function deploy(name, symbol) {

  // We get the contract to deploy
  const tokenFactory = await hardhat.ethers.getContractFactory("Token")
  const token = await tokenFactory.deploy(name, symbol);

  await token.deployed();
  console.log(`${name} deployed to:`, token.address);
  return token;
}

async function main() {
    await deploy("BIT", "Bit");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });