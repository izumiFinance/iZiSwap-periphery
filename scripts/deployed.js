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
    scrollSepoliaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    scroll: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    bedrockRolluxTestL2: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
	liquidityManager: '0xC6C7c2edF70A3245ad6051E93809162B9758ce08',
	swap: '0xa9754f0D9055d14EB0D2d196E4C51d8B2Ee6f4d3',
    },
    mantleTest: {
        iZiSwapFactory: '0xF7713d221418e098a788C4DaDd52F74b55B379E5',
        wrapChainToken: '0x6e1723460D190B4A092a2c13BA42BcC57d71870b',
        liquidityManager: '0x879cd319b8aa506F4130acf766fA8E3654eD249B',
        swap: '0xae3272690D0db0199535EAec1C880283d4baD0cC',
    },
    mantle: {
	iZiSwapFactory: '0x45e5F26451CDB01B0fA1f8582E0aAD9A6F27C218',
        wrapChainToken: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
        liquidityManager: '0x611575eE1fbd4F7915D0eABCC518eD396fF78F0c',
        swap: '0x25C030116Feb2E7BbA054b9de0915E5F51b03e31',
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
    opBNBTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
	liquidityManager: '0x1eE5eDC5Fe498a2dD82862746D674DB2a5e7fef6',
	swap: '0xF6FFe4f3FdC8BBb7F70FFD48e61f17D1e343dDfD',
    },
    opBNB: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    ontologyTest: {
        iZiSwapFactory: '0x7336A5a3251b9259DDf8B9D02a96dA0153e0799d',
    },
    bsc: {
        iZiSwapFactory: '0x93BB94a0d5269cb437A1F71FF3a77AB753844422',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	wrapChainToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	liquidityManager: '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
	swap: '0xedf2021f41AbCfE2dEA4427E1B61f4d0AA5aA4b8',
    },
    ontology: {
	iZiSwapFactory: '0x032b241De86a8660f1Ae0691a4760B426EA246d7',
    },
    ethereum: {
        wrapChainToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        iZiSwapFactory: '0x1502d025BfA624469892289D45C0352997251728',
        liquidityManager: '0x19b683A2F45012318d9B2aE1280d68d3eC54D663',
        swap: '0x2db0AFD0045F3518c77eC6591a542e326Befd3D7',
    },
    aurora: {
        iZiSwapFactory: '0xce326A82913EAb09f7ec899C4508Cbe0E6526A74',
        WETH: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
        wrapChainToken: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
        liquidityManager: '0x61A41182CD6e94f2A026aE3c0D1b73B1AA579aEa',
        swap: '0xEB9668316Cb87Bd107b05C52455ed31577eA82Cc',
    },
    confluxEspace: {
        iZiSwapFactory: '0x77aB297Da4f3667059ef0C32F5bc657f1006cBB0',
	wrapChainToken: '0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b',
	liquidityManager: '0x6a7CDD0CC87ec02ed85c196e57BaBe1bc0Acd6f2',
	swap: '0x611575eE1fbd4F7915D0eABCC518eD396fF78F0c',
    },
    auroraTest: {
	iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
	WETH: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
    },
    arbitrum: {
        iZiSwapFactory: '0xCFD8A067e1fa03474e79Be646c5f6b6A27847399',
        WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        wrapChainToken: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        liquidityManager: '0xAD1F11FBB288Cd13819cCB9397E59FAAB4Cdc16F',
        swap: '0x01fDea353849cA29F778B2663BcaCA1D191bED0e',
    },
    cronos: {
        iZiSwapFactory: '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4',
        WETH: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
        wrapChainToken: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
        liquidityManager: '0x33531bDBFE34fa6Fd5963D0423f7699775AacaaF',
        swap: '0x04830cfCED9772b8ACbAF76Cfc7A630Ad82c9148',
    },
    etc: {
        iZiSwapFactory: '0x79D175eF5fBe31b5D84B3ee359fcbBB466153E39',
        wrapChainToken: '0x1953cab0E5bFa6D4a9BaD6E05fD46C1CC6527a5a',
    },
    polygon: {
        iZiSwapFactory: '0xcA7e21764CD8f7c1Ec40e651E25Da68AeD096037',
        wrapChainToken: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
    meter: {
        iZiSwapFactory: '0xed31C5a9C764761C3A699E2732183ba5d6EAcC35',
        wrapChainToken: '0x160361ce13ec33C993b5cCA8f62B6864943eb083',
    },
    telos: {
        iZiSwapFactory: '0x6a7CDD0CC87ec02ed85c196e57BaBe1bc0Acd6f2',
        wrapChainToken: '0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E',
    },
    ultron: {
        iZiSwapFactory: '0xd7de110Bd452AAB96608ac3750c3730A17993DE0',
        wrapChainToken: '0xb1183357745D3fD7d291E42a2c4B478cdB5710c6',
    },
    lineaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x2c1b868d6596a18e32e61b901e4060c872647b6c',
        liquidityManager: '',
        swap: '',
    },
    linea: {
        iZiSwapFactory: '0x45e5F26451CDB01B0fA1f8582E0aAD9A6F27C218',
        wrapChainToken: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
        liquidityManager: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
        swap: '0x032b241De86a8660f1Ae0691a4760B426EA246d7',
    },
    opsideTestRollux: {
	iZiSwapFactory: '0x58ce24c6cDC0d5A2c3BcA1e179E869AF97266829',
	wrapChainToken: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
	liquidityManager: '0xa341a31CCdD570cAEab465c96D64c880db609021',
	swap: '0x2A19e0CF8c73280CdDdFd5877AA64A9690AE6d47',
    },
    base: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
        wrapChainToken: '0x4200000000000000000000000000000000000006',
    },
    baseTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    loot: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
        wrapChainToken: '0x7a524c7e82874226F0b51aade60A1BE4D430Cf0F',
    },
    mantaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        wrapChainToken: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
    },
    manta: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    optimism: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
        wrapChainToken: '0x4200000000000000000000000000000000000006',
    },
    zetaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    kromaSepoliaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    kromaMainnet: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    gasZeroGoerliL2: {
	iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    x1Test: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    zkfairTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
}

module.exports = contracts;
