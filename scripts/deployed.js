const contracts = {
    izumiTest: {
        iZiSwapFactory: '0xe1fE5791aa0BdC0137393Cf19AfaDf1ddac3E249',

        BIT: '0x41BC21bdcF0FA87ae6eeFcBE0e4dB29dB2b650C1',
        iZi: '0xEe5e3852434eB67F8e9E97015e32845861ea15E8',
        USDC: '0xe507AAC9eFb2A08F53C7BC73B3B1b8BCf883E41B',
        DAI: '0xA97f8bc2b98a56f648340e05406cc7E34bB25D3A',

        WETH9: "0x3AD23A16A81Cd40010F39309876978F20DD2f682",

        liquidityManager: '0xFC19d593ca3d4bF4E911e93232daAA865039CC97',
        limitOrderManager: '0x8209e406D0C3470C8D79070Faca08f66e5a70714',
        swap: '0xEa650dA109Ce9027dB10de931ce8994C5d4A6D0C',
        quoter: '0xbE3CedE70731D3F1cA647c27dEa7C703076e9bF1',
        testQuoterSwap: '0x7C6102422CA180BFAB76FDA5529580cbBC72c3D9',
    },
    bscTest: {
        iZiSwapFactory: '0x77132b63429718Db2B6ad8D942eE13A198f6Ab49',
        WETH9: '0xa9754f0D9055d14EB0D2d196E4C51d8B2Ee6f4d3',
    }
}

module.exports = contracts;