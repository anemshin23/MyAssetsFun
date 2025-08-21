import { ethers, Contract, BrowserProvider, formatEther, parseEther } from 'ethers';
import { BundleV3ProductionABI } from './abis/BundleV3Production';
import { BundleFactoryV3ProductionABI } from './abis/BundleFactoryV3Production';
import { CONTRACT_ADDRESSES } from './deployBundle';

// Extend window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface BundleInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  nav: string;
  userBalance: string;
  userBalanceUSD: string;
  components: ComponentInfo[];
  creator: string;
  islandAllocation: string;
}

export interface ComponentInfo {
  token: string;
  symbol: string;
  weight: number;
  balance: string;
  value: string;
}

export class BundleManager {
  private provider: BrowserProvider;
  private network: keyof typeof CONTRACT_ADDRESSES;
  
  constructor(provider: BrowserProvider) {
    this.provider = provider;
    this.network = 'bepolia'; // Default to Bepolia
  }

  /**
   * Get all deployed bundles from the factory
   */
  async getAllBundles(): Promise<string[]> {
    try {
      const signer = await this.provider.getSigner();
      const factoryAddress = CONTRACT_ADDRESSES[this.network].bundleFactory;
      
      const factoryContract = new Contract(
        factoryAddress,
        BundleFactoryV3ProductionABI,
        signer
      );

      const bundles = await factoryContract.getAllBundles();
      return bundles;
    } catch (error) {
      console.error('Failed to get bundles:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific bundle
   */
  async getBundleInfo(bundleAddress: string, userAddress?: string): Promise<BundleInfo> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      // Get basic bundle info
      const [name, symbol, totalSupply, nav, creator] = await Promise.all([
        bundleContract.name(),
        bundleContract.symbol(),
        bundleContract.totalSupply(),
        bundleContract.nav(),
        bundleContract.creator()
      ]);

      // Get user balance if address provided
      let userBalance = '0';
      let userBalanceUSD = '0';
      if (userAddress) {
        const balance = await bundleContract.balanceOf(userAddress);
        userBalance = formatEther(balance);
        // Calculate USD value (nav * shares)
        userBalanceUSD = (parseFloat(formatEther(nav)) * parseFloat(userBalance)).toString();
      }

      // Get component information
      const components = await this.getBundleComponents(bundleAddress);

      return {
        address: bundleAddress,
        name,
        symbol,
        totalSupply: formatEther(totalSupply),
        nav: formatEther(nav),
        userBalance,
        userBalanceUSD,
        components,
        creator,
        islandAllocation: '0' // Would need to get from contract
      };
    } catch (error) {
      console.error('Failed to get bundle info:', error);
      throw error;
    }
  }

  /**
   * Get component information for a bundle
   */
  async getBundleComponents(bundleAddress: string): Promise<ComponentInfo[]> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      // Get components and their balances
      const [components, balances] = await Promise.all([
        bundleContract.getComponents(),
        bundleContract.getComponentBalances()
      ]);

      const componentInfos: ComponentInfo[] = [];

      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const balance = balances[i];
        
        componentInfos.push({
          token: component.token,
          symbol: this.getTokenSymbol(component.token), // Helper to get symbol
          weight: component.weight / 100, // Convert from basis points
          balance: formatEther(balance || 0n),
          value: '0' // Would need price oracle
        });
      }

      return componentInfos;
    } catch (error) {
      console.error('Failed to get components:', error);
      return [];
    }
  }

  /**
   * Helper to get token symbol from address (simplified)
   */
  private getTokenSymbol(tokenAddress: string): string {
    // Simplified mapping for known tokens
    const tokenMap: {[key: string]: string} = {
      '0x0000000000000000000000000000000000000000': 'BERA',
      '0xc7728Db26526Ae7fBc46b99f0EE667Eaba7E6bb9': 'BTC',
      '0x4752428217c35c7779b077170529f8d10676f660': 'ETH', 
      '0x6e8d0eCfCE5c2b7587263923e23d141F6364c7f9': 'USDC'
    };
    
    return tokenMap[tokenAddress] || tokenAddress.slice(0, 6) + '...';
  }

  /**
   * Mint bundle shares using exact basket of tokens
   */
  async mintExactBasket(bundleAddress: string, shares: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const sharesWei = parseEther(shares);
      
      // Get required amounts for the shares
      const requiredAmounts = await bundleContract.getRequiredAmounts(sharesWei);
      
      // Approve tokens first (would need to implement token approvals)
      console.log('Required amounts:', requiredAmounts);
      
      const tx = await bundleContract.mintExactBasket(sharesWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Mint exact basket failed:', error);
      throw error;
    }
  }

  /**
   * Mint bundle shares from a single token
   */
  async mintFromSingle(
    bundleAddress: string, 
    inputToken: string, 
    inputAmount: string, 
    minShares: string
  ): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const inputAmountWei = parseEther(inputAmount);
      const minSharesWei = parseEther(minShares);

      // First approve the input token (would need to implement)
      console.log('Approving token:', inputToken, 'amount:', inputAmount);

      const tx = await bundleContract.mintFromSingle(inputToken, inputAmountWei, minSharesWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Mint from single failed:', error);
      throw error;
    }
  }

  /**
   * Redeem bundle shares for the underlying basket
   */
  async redeemForBasket(bundleAddress: string, shares: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const sharesWei = parseEther(shares);
      
      const tx = await bundleContract.redeemForBasket(sharesWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Redeem for basket failed:', error);
      throw error;
    }
  }

  /**
   * Redeem bundle shares for a single token
   */
  async redeemForSingle(
    bundleAddress: string, 
    shares: string, 
    outputToken: string, 
    minOutputAmount: string
  ): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const sharesWei = parseEther(shares);
      const minOutputWei = parseEther(minOutputAmount);

      const tx = await bundleContract.redeemForSingle(sharesWei, outputToken, minOutputWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Redeem for single failed:', error);
      throw error;
    }
  }

  /**
   * Get estimated amounts for minting shares
   */
  async getRequiredAmounts(bundleAddress: string, shares: string): Promise<string[]> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const sharesWei = parseEther(shares);
      const amounts = await bundleContract.getRequiredAmounts(sharesWei);
      
      return amounts.map((amount: bigint) => formatEther(amount));
    } catch (error) {
      console.error('Failed to get required amounts:', error);
      return [];
    }
  }

  /**
   * Get estimated output for redeeming shares
   */
  async getRedeemAmounts(bundleAddress: string, shares: string): Promise<string[]> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);

      const sharesWei = parseEther(shares);
      const amounts = await bundleContract.getRedeemAmounts(sharesWei);
      
      return amounts.map((amount: bigint) => formatEther(amount));
    } catch (error) {
      console.error('Failed to get redeem amounts:', error);
      return [];
    }
  }
}

export default BundleManager;