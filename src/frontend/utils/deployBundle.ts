import { ethers, Contract, BrowserProvider, formatEther, parseEther, ZeroAddress } from 'ethers';
import { BundleFactoryV3ProductionABI } from './abis/BundleFactoryV3Production';
import { BundleV3ProductionABI } from './abis/BundleV3Production';

// Extend window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Contract addresses - Updated with deployed addresses
export const CONTRACT_ADDRESSES = {
  bepolia: {
    bundleFactory: "0x7833346181fAA24a77b3D8484a8B00703AfE1E53", // Deployed to Bepolia testnet (Chain ID 80069)
    priceOracle: "0xF653Ef09885A93A42eFe7639aA4ab94E23d516D7", // Deployed to Bepolia testnet
    kodiakRouter: "0x19D1666f543D42ef17F66E376944A22aEa1a8E46", // Kodiak Router on Bepolia

    kodiakIslands: "0x0000000000000000000000000000000000000000", // Not deployed yet
    sweetenedIslands: "0x0000000000000000000000000000000000000000", // Not deployed yet
    pandaFactory: "0x0000000000000000000000000000000000000000", // Not deployed yet
  },
  artio: {
    bundleFactory: "0x7833346181fAA24a77b3D8484a8B00703AfE1E53", // Deployed to bArtio testnet (deprecated)
    priceOracle: "0xF653Ef09885A93A42eFe7639aA4ab94E23d516D7", // Deployed to bArtio testnet
    kodiakRouter: "0x19D1666f543D42ef17F66E376944A22aEa1a8E46", // Kodiak Router on bArtio
    kodiakIslands: "0x0000000000000000000000000000000000000000", // Not deployed yet
    sweetenedIslands: "0x0000000000000000000000000000000000000000", // Not deployed yet
    pandaFactory: "0x0000000000000000000000000000000000000000", // Not deployed yet
  },
  local: {
    bundleFactory: "0x0000000000000000000000000000000000000000",
    priceOracle: "0x0000000000000000000000000000000000000000",
    kodiakRouter: "0x0000000000000000000000000000000000000000",
    kodiakIslands: "0x0000000000000000000000000000000000000000",
    sweetenedIslands: "0x0000000000000000000000000000000000000000",
    pandaFactory: "0x0000000000000000000000000000000000000000",
  }
};

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  weight: number;
}

export interface BundleConfig {
  driftThreshold: number; // in basis points
  maxSlippageBps: number; // in basis points
  minRebalanceInterval: number; // in seconds
  islandAllocationBps: number; // in basis points (0-5000 = 0-50%)
  enableIslandRewards: boolean;
  rewardReinvestBps: number; // in basis points (0-10000)
}

export interface PandaSeedConfig {
  enableSeed: boolean;
  initialSeedUsdc: string; // in wei
  pandaSeedBps: number; // in basis points
  baseToken: string; // USDC, WETH, or BERA address
}

export interface DeployBundleParams {
  name: string;
  symbol: string;
  tokens: TokenInfo[];
  managementFee: number; // in basis points
  config: BundleConfig;
  seedConfig?: PandaSeedConfig;
}

export class BundleDeployer {
  private provider: BrowserProvider;
  private network: keyof typeof CONTRACT_ADDRESSES;
  private factoryContract: Contract | null = null;

  constructor(provider: BrowserProvider, network?: keyof typeof CONTRACT_ADDRESSES) {
    this.provider = provider;
    this.network = network || 'bepolia'; // Default to Bepolia (current active testnet)
  }

  /**
   * Automatically detect network based on chain ID
   */
  private async detectNetwork(): Promise<keyof typeof CONTRACT_ADDRESSES> {
    try {
      // Get chain ID directly without ENS resolution
      const win = globalThis as any;
      if (typeof win === 'undefined' || !win.ethereum) {
        throw new Error('No ethereum provider found');
      }
      
      const chainIdHex = await win.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      
      console.log(`Detected chain ID: ${chainId}`);
      
      switch (chainId) {
        case 80069:
          return 'bepolia'; // Berachain Bepolia (current active)
        case 80084:
          return 'artio';   // Berachain bArtio (deprecated)
        default:
          console.warn(`Unknown chain ID: ${chainId}, defaulting to bepolia`);
          return 'bepolia';
      }
    } catch (error) {
      console.warn('Failed to detect network, using default:', error);
      return 'bepolia';
    }
  }

  private async getFactoryContract(): Promise<Contract> {
    if (!this.factoryContract) {
      // Auto-detect network if not already set correctly
      const detectedNetwork = await this.detectNetwork();
      if (detectedNetwork !== this.network) {
        console.log(`Network auto-detected: ${detectedNetwork} (was ${this.network})`);
        this.network = detectedNetwork;
      }

      const signer = await this.provider.getSigner();
      console.log('signer', signer)
      const addresses = CONTRACT_ADDRESSES[this.network];
      console.log('addressess', addresses)
      if (!addresses.bundleFactory || addresses.bundleFactory === ZeroAddress) {
        throw new Error(`Bundle factory not deployed on ${this.network} network`);
      }
      console.log('creating contract', addresses.bundleFactory)
      this.factoryContract = new Contract(
        addresses.bundleFactory,
        BundleFactoryV3ProductionABI,
        signer
      );
    }
    console.log('ths.', this.factoryContract)
    return this.factoryContract;
  }

  /**
   * Deploy a new bundle without Panda seeding
   */
  async deployBundle(params: DeployBundleParams): Promise<{
    bundleAddress: string;
    transactionHash: string;
    gasUsed: bigint;
  }> {
    try {
      console.log('Deploying bundle:', params.name);
      
      // Validate token weights sum to 100%
      const totalWeight = params.tokens.reduce((sum, token) => sum + token.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error(`Token weights must sum to 100%, got ${totalWeight}%`);
      }

      // Convert weights from percentages to basis points
      const tokenAddresses = params.tokens.map(t => t.address);
      const tokenWeights = params.tokens.map(t => Math.round(t.weight * 100)); // Convert to basis points
      console.log('tokenWeights, tokenAddresses', tokenWeights, tokenAddresses)
      // Prepare bundle configuration
      const bundleConfig = {
        driftThreshold: params.config.driftThreshold,
        maxSlippageBps: params.config.maxSlippageBps,
        minRebalanceInterval: params.config.minRebalanceInterval,
        islandAllocationBps: params.config.islandAllocationBps,
        enableIslandRewards: params.config.enableIslandRewards,
        rewardReinvestBps: params.config.rewardReinvestBps
      };
      console.log("bundleconfig", bundleConfig)
      // Estimate gas
      const factoryContract = await this.getFactoryContract();
      console.log("got contract", factoryContract)
      console.log('for gas estime', params.name, params.symbol, tokenAddresses, tokenWeights, params.managementFee, bundleConfig)
      const gasEstimate = await factoryContract.createBundle.estimateGas(
        params.name,
        params.symbol,
        tokenAddresses,
        tokenWeights,
        params.managementFee,
        bundleConfig
      );

      console.log('Gas estimate:', gasEstimate.toString());

      // Execute transaction
      const tx = await factoryContract.createBundle(
        params.name,
        params.symbol,
        tokenAddresses,
        tokenWeights,
        params.managementFee,
        bundleConfig,
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        }
      );

      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      // Extract bundle address from events
      const bundleCreatedEvent = receipt.events?.find(
        (event: any) => event.event === 'BundleCreated'
      );
      
      if (!bundleCreatedEvent) {
        throw new Error('Bundle creation event not found in transaction receipt');
      }

      const bundleAddress = bundleCreatedEvent.args?.bundleAddress;
      console.log('Bundle deployed at:', bundleAddress);

      return {
        bundleAddress,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed
      };

    } catch (error) {
      console.error('Bundle deployment failed:', error);
      if (error instanceof Error) {
        throw new Error(`Bundle deployment failed: ${error.message}`);
      }
      throw new Error('Bundle deployment failed: Unknown error');
    }
  }

  /**
   * Deploy a bundle with Panda Factory seeding
   */
  async deployBundleWithSeed(params: DeployBundleParams): Promise<{
    bundleAddress: string;
    poolAddress: string;
    poolId: number;
    transactionHash: string;
    gasUsed: bigint;
  }> {
    if (!params.seedConfig) {
      throw new Error('Seed configuration required for seeded deployment');
    }

    try {
      console.log('Deploying bundle with seed:', params.name);
      
      // Validate token weights
      const totalWeight = params.tokens.reduce((sum, token) => sum + token.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error(`Token weights must sum to 100%, got ${totalWeight}%`);
      }

      const tokenAddresses = params.tokens.map(t => t.address);
      const tokenWeights = params.tokens.map(t => Math.round(t.weight * 100));

      const bundleConfig = {
        driftThreshold: params.config.driftThreshold,
        maxSlippageBps: params.config.maxSlippageBps,
        minRebalanceInterval: params.config.minRebalanceInterval,
        islandAllocationBps: params.config.islandAllocationBps,
        enableIslandRewards: params.config.enableIslandRewards,
        rewardReinvestBps: params.config.rewardReinvestBps
      };

      const seedConfig = {
        enableSeed: params.seedConfig.enableSeed,
        initialSeedUsdc: params.seedConfig.initialSeedUsdc,
        pandaSeedBps: params.seedConfig.pandaSeedBps,
        baseToken: params.seedConfig.baseToken
      };

      // Estimate gas
      const factoryContract = await this.getFactoryContract();
      const gasEstimate = await factoryContract.createBundleWithPandaSeed.estimateGas(
        params.name,
        params.symbol,
        tokenAddresses,
        tokenWeights,
        params.managementFee,
        bundleConfig,
        seedConfig,
        {
          value: params.seedConfig.initialSeedUsdc // Send ETH/BERA for seeding
        }
      );

      // Execute transaction
      const tx = await factoryContract.createBundleWithPandaSeed(
        params.name,
        params.symbol,
        tokenAddresses,
        tokenWeights,
        params.managementFee,
        bundleConfig,
        seedConfig,
        {
          gasLimit: gasEstimate * 120n / 100n,
          value: params.seedConfig.initialSeedUsdc
        }
      );

      const receipt = await tx.wait();
      
      // Extract results from events
      const bundleCreatedEvent = receipt.events?.find(
        (event: any) => event.event === 'BundleCreated'
      );
      
      if (!bundleCreatedEvent) {
        throw new Error('Bundle creation event not found');
      }

      const bundleAddress = bundleCreatedEvent.args?.bundleAddress;

      // Look for pool seeded event (custom implementation needed in factory)
      // For now, return placeholder values
      return {
        bundleAddress,
        poolAddress: ZeroAddress, // Would be in events
        poolId: 0, // Would be in events
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed
      };

    } catch (error) {
      console.error('Seeded bundle deployment failed:', error);
      if (error instanceof Error) {
        throw new Error(`Seeded bundle deployment failed: ${error.message}`);
      }
      throw new Error('Seeded bundle deployment failed: Unknown error');
    }
  }

  /**
   * Get bundle information after deployment
   */
  async getBundleInfo(bundleAddress: string): Promise<{
    name: string;
    symbol: string;
    totalSupply: string;
    nav: string;
    components: {
      token: string;
      weight: number;
      balance: string;
    }[];
    creator: string;
  }> {
    const bundleContract = new Contract(
      bundleAddress,
      BundleV3ProductionABI,
      this.provider
    );

    const [name, symbol, totalSupply, nav, components, creator] = await Promise.all([
      bundleContract.name(),
      bundleContract.symbol(),
      bundleContract.totalSupply(),
      bundleContract.nav(),
      bundleContract.getComponents(),
      bundleContract.creator()
    ]);

    const balances = await bundleContract.getComponentBalances();

    return {
      name,
      symbol,
      totalSupply: formatEther(totalSupply),
      nav: formatEther(nav),
      components: components.map((comp: any, i: number) => ({
        token: comp.token,
        weight: comp.weight / 100, // Convert from basis points to percentage
        balance: formatEther(balances[i] || 0n)
      })),
      creator
    };
  }

  /**
   * Validate bundle configuration before deployment
   */
  async validateBundleConfig(tokens: TokenInfo[], weights: number[]): Promise<{
    valid: boolean;
    reason: string;
  }> {
    try {
      const tokenAddresses = tokens.map(t => t.address);
      const tokenWeights = weights.map(w => Math.round(w * 100)); // Convert to basis points

      const factoryContract = await this.getFactoryContract();
      const result = await factoryContract.validateBundleTokens(
        tokenAddresses,
        tokenWeights
      );

      return {
        valid: result.valid,
        reason: result.reason
      };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get list of whitelisted tokens
   */
  async getWhitelistedTokens(): Promise<{
    address: string;
    isWhitelisted: boolean;
    hasTransferFee: boolean;
    isRebasable: boolean;
    minLiquidity: string;
    maxWeight: number;
    isKodiakSupported: boolean;
  }[]> {
    // This would need to be implemented by querying token whitelist
    // For now return empty array
    return [];
  }

  /**
   * Get supported Kodiak islands for yield allocation
   */
  async getSupportedIslands(): Promise<{
    islandIds: number[];
    sweetened: boolean[];
    apys: number[];
  }> {
    try {
      const factoryContract = await this.getFactoryContract();
      const result = await factoryContract.getSupportedIslands();
      return {
        islandIds: result.islandIds.map((id: bigint) => Number(id)),
        sweetened: result.sweetened,
        apys: result.apys.map((apy: bigint) => Number(apy))
      };
    } catch (error) {
      console.warn('Failed to get supported islands:', error);
      return {
        islandIds: [],
        sweetened: [],
        apys: []
      };
    }
  }

  /**
   * Update contract addresses (for different networks)
   */
  updateContractAddresses(addresses: typeof CONTRACT_ADDRESSES[keyof typeof CONTRACT_ADDRESSES]) {
    // Reset the contract so it gets recreated with new address
    this.factoryContract = null;
  }
}

// Utility function to convert percentage to basis points
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

// Utility function to convert basis points to percentage
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

// Default configurations for common bundle types
export const DEFAULT_CONFIGS = {
  conservative: {
    driftThreshold: 500, // 5%
    maxSlippageBps: 200, // 2%
    minRebalanceInterval: 86400, // 24 hours
    islandAllocationBps: 1000, // 10%
    enableIslandRewards: true,
    rewardReinvestBps: 8000 // 80% reinvest, 20% to creator
  },
  balanced: {
    driftThreshold: 750, // 7.5%
    maxSlippageBps: 300, // 3%
    minRebalanceInterval: 43200, // 12 hours
    islandAllocationBps: 2000, // 20%
    enableIslandRewards: true,
    rewardReinvestBps: 7000 // 70% reinvest, 30% to creator
  },
  aggressive: {
    driftThreshold: 1000, // 10%
    maxSlippageBps: 500, // 5%
    minRebalanceInterval: 21600, // 6 hours
    islandAllocationBps: 3000, // 30%
    enableIslandRewards: true,
    rewardReinvestBps: 6000 // 60% reinvest, 40% to creator
  }
};