const { ethers } = require("hardhat");

const net = process.env.HARDHAT_NETWORK

async function main() {
    // deploy oracle
    const OracleFactory = await ethers.getContractFactory("Oracle");
    const oracle = await OracleFactory.deploy();
    console.log("oracle: ", oracle.address);
    await oracle.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})