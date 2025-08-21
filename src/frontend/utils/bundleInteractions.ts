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
          weight: Number(component.weight) / 100, // Convert from basis points to percentage
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
    // Simplified mapping for known tokens (Berachain Testnet)
    const tokenMap: {[key: string]: string} = {
      '0x0000000000000000000000000000000000000000': 'ETH',
      // Mock tokens on Berachain testnet (DEPLOYED)
      '0x93B0c7AF3A1772919b56b1A2bE9966204dD39082': 'USDC',
      '0xCb3bb12157097612D4e98981F03d3bB68a16672f': 'BTC',
      '0x50e05C0E4ebF75d86d9a21BA33a0cb819438deCD': 'ETH',
      '0x25beBbD6B6bA19f90BCDD5f23aC67FbeA065AbC7': 'BERA',
      // Newly deployed component tokens
      '0x33E2d7Fc013D43bE07e90Cb49f072ECf65Cc9CbD': 'COMP1',
      '0xD78a73e98EcCd3ADc3B0352F1d033dbd6D6a98e4': 'COMP2', 
      '0xa2De30d3BcD85192F616474E50660C65b676D856': 'COMP3',
      // Original bundle component addresses (existing bundle)
      '0xc7728Db26526Ae7fBc46b99f0EE667Eaba7E6bb9': 'OLD-COMP1',
      '0x4752428217c35c7779b077170529f8d10676f660': 'OLD-COMP2', 
      '0x6e8d0eCfCE5c2b7587263923e23d141F6364c7f9': 'OLD-COMP3'
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
      const components = await this.getBundleComponents(bundleAddress);
      
      console.log('Required amounts:', requiredAmounts);
      
      // Approve all component tokens with correct decimal conversion
      for (let i = 0; i < components.length; i++) {
        const requiredAmountBigInt = requiredAmounts[i] || 0n;
        if (requiredAmountBigInt > 0n) {
          // Convert back to human readable format for approval
          const decimals = await this.getTokenDecimals(components[i].token);
          const divisor = BigInt(10 ** decimals);
          const humanAmount = (Number(requiredAmountBigInt) / Number(divisor)).toString();
          
          await this.approveToken(components[i].token, bundleAddress, humanAmount);
        }
      }
      
      const tx = await bundleContract.mintExactBasket(sharesWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Mint exact basket failed:', error);
      throw error;
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18;
    }

    const signer = await this.provider.getSigner();
    const erc20ABI = ["function decimals() external view returns (uint8)"];
    
    try {
      const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
      const decimals = await tokenContract.decimals();
      return Number(decimals);
    } catch (error) {
      console.log('Could not get token decimals, assuming 18:', error);
      return 18;
    }
  }

  /**
   * Get the correct amount in token's native units based on its decimals
   */
  async getTokenAmount(tokenAddress: string, amount: string): Promise<bigint> {
    // Skip for zero address (ETH)
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return parseEther(amount);
    }

    const signer = await this.provider.getSigner();
    const erc20ABI = [
      "function decimals() external view returns (uint8)"
    ];
    
    try {
      const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
      const decimals = await tokenContract.decimals();
      
      // Convert amount to proper units based on token decimals
      const factor = BigInt(10 ** Number(decimals));
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Number(factor)));
      
      return amountBigInt;
    } catch (error) {
      console.log('Could not get token decimals, assuming 18:', error);
      return parseEther(amount);
    }
  }

  /**
   * Approve ERC20 token for spending
   */
  async approveToken(tokenAddress: string, spenderAddress: string, amount: string): Promise<string> {
    try {
      // Skip approval for zero address (ETH) or zero amount
      if (tokenAddress === '0x0000000000000000000000000000000000000000' || 
          parseFloat(amount) === 0) {
        console.log('Skipping approval for ETH or zero amount');
        return '';
      }

      const signer = await this.provider.getSigner();
      
      // Complete ERC20 ABI with proper function signatures
      const erc20ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
        "function symbol() external view returns (string)",
        "function name() external view returns (string)",
        "function totalSupply() external view returns (uint256)",
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
      ];
      
      const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
      const amountWei = await this.getTokenAmount(tokenAddress, amount);
      
      // Check current allowance with proper error handling
      const userAddress = await signer.getAddress();
      let currentAllowance = 0n;
      
      try {
        currentAllowance = await tokenContract.allowance(userAddress, spenderAddress);
      } catch (allowanceError) {
        console.log('Could not check allowance, proceeding with approval:', allowanceError);
        // If we can't check allowance, just proceed with approval
      }
      
      // Only approve if needed or if we couldn't check allowance
      if (currentAllowance < amountWei) {
        console.log('Approving token:', tokenAddress, 'amount:', amount, 'wei:', amountWei.toString());
        const tx = await tokenContract.approve(spenderAddress, amountWei);
        const receipt = await tx.wait();
        return receipt.hash;
      } else {
        console.log('Token already approved with sufficient allowance');
        return '';
      }
    } catch (error) {
      console.error('Token approval failed:', error);
      throw error;
    }
  }

  /**
   * Calculate expected shares from input amount using contract simulation
   */
  async calculateExpectedShares(
    bundleAddress: string, 
    inputToken: string, 
    inputAmount: string
  ): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);
      
      // Get input amount in wei
      const inputAmountWei = await this.getTokenAmount(inputToken, inputAmount);
      
      // Get NAV and check creation unit
      const [nav, creationUnit] = await Promise.all([
        bundleContract.nav(),
        bundleContract.creationUnit()
      ]);
      
      console.log('Contract values:', {
        nav: nav.toString(),
        creationUnit: creationUnit.toString(),
        inputAmountWei: inputAmountWei.toString()
      });
      
      // We need to simulate the contract's _getTokenValue function
      // For USDC, if it's pegged at $1, then inputValue ≈ inputAmountWei * 1e12 (to get 18 decimals)
      // Since USDC has 6 decimals, we need to scale it to 18 decimals for USD value
      const inputValueUSD = inputAmountWei * BigInt('1000000000000'); // Scale from 6 to 18 decimals (10^12)
      
      // Calculate shares exactly like the contract: (inputValue * 1e18) / currentNav
      const navBigInt = typeof nav === 'bigint' ? nav : BigInt(nav.toString());
      const expectedShares = (inputValueUSD * BigInt('1000000000000000000')) / navBigInt;
      
      console.log('Calculation:', {
        inputValueUSD: inputValueUSD.toString(),
        expectedShares: expectedShares.toString(),
        creationUnit: creationUnit.toString(),
        meetsMinimum: expectedShares >= creationUnit
      });
      
      // Check if it meets the minimum creation unit
      if (expectedShares < creationUnit) {
        // Convert nav to BigInt if it isn't already
        const navBigInt = typeof nav === 'bigint' ? nav : BigInt(nav.toString());
        const minInputNeeded = (creationUnit * navBigInt) / BigInt('1000000000000000000000000000000'); // 10^30 in BigInt
        throw new Error(`Amount too small. Minimum ${formatEther(minInputNeeded * BigInt('1000000000000'))} USDC needed.`);
      }
      
      // Apply 2% slippage tolerance for minShares (be more conservative)
      const minShares = (expectedShares * 98n) / 100n;
      
      return formatEther(minShares);
    } catch (error) {
      console.error('Failed to calculate expected shares:', error);
      // If amount is too small, suggest a larger amount
      if (error instanceof Error && error.message.includes('Minimum')) {
        throw error;
      }
      // For other errors, return a safe minimum that meets creation unit
      return '1.0'; // 1 full share
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

      const inputAmountWei = await this.getTokenAmount(inputToken, inputAmount);
      
      // Calculate minShares if not provided or if provided as '0'
      let calculatedMinShares = minShares;
      if (!minShares || minShares === '0' || parseFloat(minShares) === 0) {
        calculatedMinShares = await this.calculateExpectedShares(bundleAddress, inputToken, inputAmount);
        console.log('Calculated minShares:', calculatedMinShares);
      }
      
      const minSharesWei = parseEther(calculatedMinShares);

      // First approve the input token
      console.log('Approving token:', inputToken, 'amount:', inputAmount);
      await this.approveToken(inputToken, bundleAddress, inputAmount);

      console.log('Minting with params:', {
        inputToken,
        inputAmountWei: inputAmountWei.toString(),
        minSharesWei: minSharesWei.toString(),
        calculatedMinShares
      });

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