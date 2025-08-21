export const BundleV3ProductionABI = [
  // ERC20 Standard Functions
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "shares", "type": "uint256"},
      {"indexed": false, "internalType": "uint256[]", "name": "amounts", "type": "uint256[]"},
      {"indexed": false, "internalType": "bool", "name": "isSingleAsset", "type": "bool"}
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "shares", "type": "uint256"},
      {"indexed": false, "internalType": "uint256[]", "name": "amounts", "type": "uint256[]"},
      {"indexed": false, "internalType": "bool", "name": "isSingleAsset", "type": "bool"}
    ],
    "name": "Redeem",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "positionId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tvl", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "caller", "type": "address"}
    ],
    "name": "IslandAllocated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "positionId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "receiver", "type": "address"}
    ],
    "name": "IncentivesClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "newTvl", "type": "uint256"}
    ],
    "name": "IncentivesReinvested",
    "type": "event"
  },

  // Minting Functions
  {
    "inputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "name": "mintExactBasket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "inputToken", "type": "address"},
      {"internalType": "uint256", "name": "inputAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "minShares", "type": "uint256"}
    ],
    "name": "mintFromSingle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Redemption Functions
  {
    "inputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "name": "redeemForBasket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "shares", "type": "uint256"},
      {"internalType": "address", "name": "outputToken", "type": "address"},
      {"internalType": "uint256", "name": "minAmountOut", "type": "uint256"}
    ],
    "name": "redeemToSingle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Island Management
  {
    "inputs": [{"internalType": "uint256", "name": "_islandAllocationBps", "type": "uint256"}],
    "name": "allocateToIsland",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "positionId", "type": "uint256"},
      {"internalType": "uint256", "name": "minOut", "type": "uint256"}
    ],
    "name": "withdrawIslandPosition",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
    "name": "claimIslandRewards",
    "outputs": [{"internalType": "uint256", "name": "rewards", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Reward Management
  {
    "inputs": [{"internalType": "bool", "name": "reinvest", "type": "bool"}],
    "name": "distributeIncentives",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Rebalancing
  {
    "inputs": [],
    "name": "checkRebalanceNeeded",
    "outputs": [
      {"internalType": "bool", "name": "needed", "type": "bool"},
      {"internalType": "uint256[]", "name": "currentWeights", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rebalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [],
    "name": "nav",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalValue",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIslandPositionsValue",
    "outputs": [{"internalType": "uint256", "name": "totalValue", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getComponents",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "token", "type": "address"},
          {"internalType": "uint256", "name": "weight", "type": "uint256"},
          {"internalType": "enum BundleV3Production.ComponentType", "name": "ctype", "type": "uint8"},
          {"internalType": "uint256", "name": "islandId", "type": "uint256"}
        ],
        "internalType": "struct BundleV3Production.Component[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getComponentBalances",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentWeights",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "name": "getRequiredAmounts",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // State Variables
  {
    "inputs": [],
    "name": "creator",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "managementFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "islandAllocationBps",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unclaimedIncentives",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "driftThreshold",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];