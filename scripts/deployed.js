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
    mantleSepoliaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
        iZiSwapV3Factory: '0x6953DEe956eEe39973F1e1090368Ba434CCa0d94',
        wrappedNative: '0x67A1f4A939b477A6b7c5BF94D97E45dE87E608eF',
    },
    mantle: {
	iZiSwapFactory: '0x45e5F26451CDB01B0fA1f8582E0aAD9A6F27C218',
        wrapChainToken: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
        liquidityManager: '0x611575eE1fbd4F7915D0eABCC518eD396fF78F0c',
        swap: '0x25C030116Feb2E7BbA054b9de0915E5F51b03e31',
    },
    bscTest: {
        iZiSwapFactory: '0x31834FEc56F3e245715D3A68F63927D93a2d3e6d',
        iZiClassicFactory: '0x92322780ca702b5457524a685664bf346bd48f1a',
        iZiSwapV3Factory: '0x48283d44440f49B43670EE3A06Ff43acf4eDFE6e',
        wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
        pancakeSwapRouter: '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3',
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
    zkfair: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    zeta: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
	wrappedNative: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf',
	iZiClassicFactory: '0x4e86c9271bBd850dDc92f8a086F43FE996Ba59f5',
    },
    taikoKatlaL2Test: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    taikoHeklaL2Test: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    taiko: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    beraTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    beraBArtioTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    morphTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    BOB: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    Kava: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    kakarotStarknetSepoliaTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    core: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    gravity: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    iotex: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    morph: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    formicariumTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    plume: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    monadTest: {
        iZiSwapFactory: '0x64c2F1306b4ED3183E7B345158fd01c19C0d8c5E',
    },
    hashKey: {
        iZiSwapFactory: '0x110dE362cc436D7f54210f96b8C7652C2617887D',
    },
    hemi: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    overProtocol: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
    },
    memecore: {
        iZiSwapFactory: '0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08',
	wrappedNative: '0x653e645e3d81a72e71328Bc01A04002945E3ef7A',
    },
}

module.exports = contracts;
