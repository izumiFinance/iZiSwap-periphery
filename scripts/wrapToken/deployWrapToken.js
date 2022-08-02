const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/wrapToken/deployWrapToken.js tokenAddr name symbol

*/

const v = process.argv

async function main() {
    // deploy nft
    const WrapToken = await ethers.getContractFactory("WrapToken");
    const args = [
        v[2], v[3], v[4]
    ]
    const wrapToken = await WrapToken.deploy(...args);
    console.log("wrapToken: ", wrapToken.address);
    await nflom.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})