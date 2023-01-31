const contracts = { 
    icplazaTest: {
        wrapChainToken: '0x1eE5eDC5Fe498a2dD82862746D674DB2a5e7fef6',
        iZiSwapFactory: '0xC6C7c2edF70A3245ad6051E93809162B9758ce08',
        liquidityManager: '0x77132b63429718Db2B6ad8D942eE13A198f6Ab49',
        swap: '0x95c5F14106ab4d1dc0cFC9326225287c18c2d247',
    },
    icplaza: {
        wrapChainToken: '0xc59d478873d11CCc68F9c63571E821a253c5B605',
        iZiSwapFactory: '0xCe1E9F846b05Ce9996BA2f55F3EC731c7C1A0fdb',
	liquidityManager: '0x5bD3E57915D8136d5118Fb08C838542A3DE817DC',
	swap: '0xE0c7b10009fC582beFE3cAFE777eC7E2753368aF',
    },
    scrollTestL2: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x3aB38EF845E86E949253Dd3a6FdA37Cc7d4Cd892',
        liquidityManager: '0x6953DEe956eEe39973F1e1090368Ba434CCa0d94',
        swap: '0xaDd9336AB4a795a66E4E1820f5d347c4294dd76a',
    },
    mantleTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
        liquidityManager: '0xC6C7c2edF70A3245ad6051E93809162B9758ce08',
        swap: '0xa9754f0D9055d14EB0D2d196E4C51d8B2Ee6f4d3',
    },
    bscTest: {
        iZiSwapFactory: '0x7fc0574eAe768B109EF38BC32665e6421c52Ee9d',
	liquidityManager: '0xDE02C26c46AC441951951C97c8462cD85b3A124c',
	swap: '0x4bD007912911f3Ee4b4555352b556B08601cE7Ce',
        WETH9: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
        wrapChainToken: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
	    BIT: '0xac360dc0F8EF1C94Ab4034220E0A01567acbFdE4',
	    WBNB: '0xa9754f0D9055d14EB0D2d196E4C51d8B2Ee6f4d3',
	    USDT: '0x6AECfe44225A50895e9EC7ca46377B9397D1Bb5b',
	    BUSD: '0xd88972676f5D0997c8150A3d2C4634CbaaDD3396',
	    iUSD: '0x60FE1bE62fa2082b0897eA87DF8D2CfD45185D30',
        SLD: '0x45F76eD56082cd0B0A0Ad1E4513214d1219f9998',
        DUET: '0x5D111A3573838f6A24B4b64dbE6A234bE1e6d822',
        dWTI: '0x967b61E062205C2DcbB6146b383119A8827493C3',
        DUSD: '0x5682fBb54565b02a4E72Ce29C5a9B61Dee8a0819',
        USDT18: '0x3eC84d8bDD27Db0FD49462187b0bd8E347bBc1e7',
        KSW: '0xe377BA982D52C598568cE37dd146ced237FFd938',
        REVO: '0x1e19F04008f57344D589494C50Ff8138aD5207Ae',
        LAND: '0x1017D7d37169f98EED32BBB68aD79A3881174e3f',
        FROYO: '0xed2F92D6D2b936ce3Db9e046E57D9119e4A31ECb',
    },
    bsc: {
        iZiSwapFactory: '0xd7de110Bd452AAB96608ac3750c3730A17993DE0',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	wrapChainToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	liquidityManager: '0x93C22Fbeff4448F2fb6e432579b0638838Ff9581',
	swap: '0xBd3bd95529e0784aD973FD14928eEDF3678cfad8',
    },
    aurora: {
        iZiSwapFactory: '0x156d8a0bE25FA232bb637Fc76255bCd00dEae9E9',
        WETH: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
        wrapChainToken: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
        liquidityManager: '0xE78e7447223aaED59301b44513D1d3A892ECF212',
        swap: '0x96539F87cA176c9f6180d65Bc4c10fca264aE4A5',
    },
    auroraTest: {
	iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
	WETH: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
    },
    arbitrum: {
        iZiSwapFactory: '0x45e5F26451CDB01B0fA1f8582E0aAD9A6F27C218',
        WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        wrapChainToken: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        liquidityManager: '0x611575eE1fbd4F7915D0eABCC518eD396fF78F0c',
        swap: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
    },
    cronos: {
        iZiSwapFactory: '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4',
        WETH: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
        wrapChainToken: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
        liquidityManager: '0x33531bDBFE34fa6Fd5963D0423f7699775AacaaF',
        swap: '0x04830cfCED9772b8ACbAF76Cfc7A630Ad82c9148',
    },
    etc: {
        iZiSwapFactory: '0x25C030116Feb2E7BbA054b9de0915E5F51b03e31',
        wrapChainToken: '0x1953cab0E5bFa6D4a9BaD6E05fD46C1CC6527a5a',
        liquidityManager: '0x1D377311b342633A970e71a787C50F83858BFC1B',
        swap: '0xe6805638db944eA605e774e72c6F0D15Fb6a1347',
    },
    polygon: {
        iZiSwapFactory: '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4',
        wrapChainToken: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        liquidityManager: '0x33531bDBFE34fa6Fd5963D0423f7699775AacaaF',
        swap: '0x3F559139C2Fc7B97Ad6FE9B4d1f75149F551DB18',
    }
}

module.exports = contracts;
