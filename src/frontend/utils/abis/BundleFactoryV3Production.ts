// Minimal Factory ABI - simplified version without token whitelisting
export const BundleFactoryV3ProductionABI = [
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "bundleAddress", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "symbol", "type": "string"},
      {"indexed": false, "internalType": "address[]", "name": "tokens", "type": "address[]"},
      {"indexed": false, "internalType": "uint256[]", "name": "weights", "type": "uint256[]"},
      {"indexed": false, "internalType": "uint256", "name": "islandAllocation", "type": "uint256"}
    ],
    "name": "BundleCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "kodiakRouter", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "kodiakIslands", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "pandaFactory", "type": "address"}
    ],
    "name": "KodiakIntegrationUpdated",
    "type": "event"
  },

  // Constructor
  {
    "inputs": [
      {"internalType": "address", "name": "_priceOracle", "type": "address"},
      {"internalType": "address", "name": "_kodiakRouter", "type": "address"},
      {"internalType": "address", "name": "_kodiakIslands", "type": "address"},
      {"internalType": "address", "name": "_sweetenedIslands", "type": "address"},
      {"internalType": "address", "name": "_pandaFactory", "type": "address"},
      {"internalType": "address", "name": "_fallbackSwapRouter", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },

  // Bundle Creation Functions
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string", "name": "_symbol", "type": "string"},
      {"internalType": "address[]", "name": "_tokens", "type": "address[]"},
      {"internalType": "uint256[]", "name": "_weights", "type": "uint256[]"},
      {"internalType": "uint256", "name": "_managementFee", "type": "uint256"},
      {
        "components": [
          {"internalType": "uint256", "name": "driftThreshold", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSlippageBps", "type": "uint256"},
          {"internalType": "uint256", "name": "minRebalanceInterval", "type": "uint256"},
          {"internalType": "uint256", "name": "islandAllocationBps", "type": "uint256"},
          {"internalType": "bool", "name": "enableIslandRewards", "type": "bool"},
          {"internalType": "uint256", "name": "rewardReinvestBps", "type": "uint256"}
        ],
        "internalType": "struct BundleFactoryV3Production.BundleConfig",
        "name": "_config",
        "type": "tuple"
      }
    ],
    "name": "createBundle",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string", "name": "_symbol", "type": "string"},
      {"internalType": "address[]", "name": "_tokens", "type": "address[]"},
      {"internalType": "uint256[]", "name": "_weights", "type": "uint256[]"},
      {"internalType": "uint256", "name": "_managementFee", "type": "uint256"},
      {
        "components": [
          {"internalType": "uint256", "name": "driftThreshold", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSlippageBps", "type": "uint256"},
          {"internalType": "uint256", "name": "minRebalanceInterval", "type": "uint256"},
          {"internalType": "uint256", "name": "islandAllocationBps", "type": "uint256"},
          {"internalType": "bool", "name": "enableIslandRewards", "type": "bool"},
          {"internalType": "uint256", "name": "rewardReinvestBps", "type": "uint256"}
        ],
        "internalType": "struct BundleFactoryV3Production.BundleConfig",
        "name": "_config",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "bool", "name": "enableSeed", "type": "bool"},
          {"internalType": "uint256", "name": "initialSeedUsdc", "type": "uint256"},
          {"internalType": "uint256", "name": "pandaSeedBps", "type": "uint256"},
          {"internalType": "address", "name": "baseToken", "type": "address"}
        ],
        "internalType": "struct BundleFactoryV3Production.PandaSeedConfig",
        "name": "_seedConfig",
        "type": "tuple"
      }
    ],
    "name": "createBundleWithPandaSeed",
    "outputs": [
      {"internalType": "address", "name": "bundleAddress", "type": "address"},
      {"internalType": "address", "name": "poolAddress", "type": "address"},
      {"internalType": "uint256", "name": "poolId", "type": "uint256"}
    ],
    "stateMutability": "payable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [{"internalType": "address", "name": "creator", "type": "address"}],
    "name": "getCreatorBundles",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllBundles",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "isTokenWhitelisted",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "getTokenInfo",
    "outputs": [
      {
        "components": [
          {"internalType": "bool", "name": "isWhitelisted", "type": "bool"},
          {"internalType": "bool", "name": "hasTransferFee", "type": "bool"},
          {"internalType": "bool", "name": "isRebasable", "type": "bool"},
          {"internalType": "uint256", "name": "minLiquidity", "type": "uint256"},
          {"internalType": "uint256", "name": "maxWeight", "type": "uint256"},
          {"internalType": "bytes32", "name": "codeHash", "type": "bytes32"},
          {"internalType": "bool", "name": "isKodiakSupported", "type": "bool"}
        ],
        "internalType": "struct BundleFactoryV3Production.TokenInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "isKodiakSupported",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getKodiakAddresses",
    "outputs": [
      {"internalType": "address", "name": "router", "type": "address"},
      {"internalType": "address", "name": "islands", "type": "address"},
      {"internalType": "address", "name": "sweetened", "type": "address"},
      {"internalType": "address", "name": "panda", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]", "name": "tokens", "type": "address[]"},
      {"internalType": "uint256[]", "name": "weights", "type": "uint256[]"}
    ],
    "name": "validateBundleTokens",
    "outputs": [
      {"internalType": "bool", "name": "valid", "type": "bool"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedIslands",
    "outputs": [
      {"internalType": "uint256[]", "name": "islandIds", "type": "uint256[]"},
      {"internalType": "bool[]", "name": "sweetened", "type": "bool[]"},
      {"internalType": "uint256[]", "name": "apys", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];