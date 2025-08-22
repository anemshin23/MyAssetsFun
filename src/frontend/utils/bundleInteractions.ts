import { ethers, Contract, BrowserProvider, formatEther, parseEther, Interface } from 'ethers';
import { BundleV3ProductionABI } from './abis/BundleV3Production';
import { BundleFactoryV3ProductionABI } from './abis/BundleFactoryV3Production';
import { CONTRACT_ADDRESSES } from './deployBundle';
import { getQuote } from './mock-quote-service';

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

// EIP-7702 Batch Transaction Interfaces
export interface BatchCall {
  to: string;
  value: string;
  data: string;
}

export interface BatchTransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
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
      '0x33E2d7Fc013D43bE07e90Cb49f072ECf65Cc9CbD': 'RAMEN',
      '0xD78a73e98EcCd3ADc3B0352F1d033dbd6D6a98e4': 'OOGA', 
      '0xa2De30d3BcD85192F616474E50660C65b676D856': 'YEET',
      // Original bundle component addresses (existing bundle)
      '0xc7728Db26526Ae7fBc46b99f0EE667Eaba7E6bb9': 'OLD-COMP1',
      '0x4752428217c35c7779b077170529f8d10676f660': 'OLD-COMP2', 
      '0x6e8d0eCfCE5c2b7587263923e23d141F6364c7f9': 'OLD-COMP3',
      '0x0000000000000000000000000000000000001001': 'BERA',
      '0x0000000000000000000000000000000000001002': 'swBERA',
      '0x0000000000000000000000000000000000001003': 'IBGT',
      '0x0000000000000000000000000000000000001004': 'osBGT',
      '0x0000000000000000000000000000000000001005': 'BITCOIN',
      '0x0000000000000000000000000000000000001006': 'HENLO',
      '0x0000000000000000000000000000000000001007': 'COMP3',
      '0x0000000000000000000000000000000000001008': 'COMP2',
      '0x0000000000000000000000000000000000001009': 'COMP1',
      '0x0000000000000000000000000000000000001010': 'POLLEN',
      '0x0000000000000000000000000000000000001011': 'DOLO',
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
      
      // Check creation unit requirement
      try {
        const creationUnit = await bundleContract.creationUnit();
        if (sharesWei < creationUnit) {
          const minShares = formatEther(creationUnit);
          throw new Error(`Amount too small. Minimum ${minShares} shares required (creation unit constraint).`);
        }
      } catch (creationUnitError) {
        console.log('Could not check creation unit (function may not exist):', creationUnitError);
      }
      
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
   * Get user's token balance
   */
  async getUserTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // ETH balance
        const balance = await this.provider.getBalance(userAddress);
        return formatEther(balance);
      }

      const erc20ABI = ["function balanceOf(address account) external view returns (uint256)"];
      const tokenContract = new Contract(tokenAddress, erc20ABI, this.provider);
      const balance = await tokenContract.balanceOf(userAddress);
      
      const decimals = await this.getTokenDecimals(tokenAddress);
      const divisor = BigInt(10 ** decimals);
      return (Number(balance) / Number(divisor)).toString();
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return '0';
    }
  }

  /**
   * Get swap quote from mock service
   */
  async getSwapQuote(
    tokenIn: string,
    tokenOut: string, 
    amountIn: string,
  ): Promise<{
    amountOut: string;
    route: any[];
    priceImpact: string;
    fee: string;
  }> {
    try {
      const amountOut = await getQuote(amountIn, tokenIn, tokenOut);
      return {
        amountOut,
        route: [],
        priceImpact: '0',
        fee: '0'
      };
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw new Error('Failed to get swap quote from mock service');
    }
  }

  /**
   * Execute swap via mock service router
   */
  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string,
    recipient?: string
  ): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const userAddress = recipient || await signer.getAddress();
      const routerAddress = '0xCd2678b19626B8d1e6dAa724FcBbdbA9508B8A04';
      
      // Approve token if needed
      if (tokenIn !== '0x0000000000000000000000000000000000000000') {
        await this.approveToken(tokenIn, routerAddress, amountIn);
      }

      const amountInWei = await this.getTokenAmount(tokenIn, amountIn);
      const minAmountOutWei = await this.getTokenAmount(tokenOut, minAmountOut);

      // Use router for swap
      const swapRouterABI = [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
      ];

      const swapRouter = new Contract(routerAddress, swapRouterABI, signer);
      
      const path = [tokenIn, tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      const tx = await swapRouter.swapExactTokensForTokens(amountInWei, minAmountOutWei, path, userAddress, deadline, {
        value: tokenIn === '0x0000000000000000000000000000000000000000' ? amountInWei : 0
      });
      
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Swap execution failed:', error);
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
      
      // Get NAV and check creation unit
      const [nav, creationUnit] = await Promise.all([
        bundleContract.nav(),
        bundleContract.creationUnit()
      ]);

      // Get the value of the input token in USDC
      const usdcAddress = '0x93B0c7AF3A1772919b56b1A2bE9966204dD39082'; // Mock USDC address
      const quote = await this.getSwapQuote(inputToken, usdcAddress, inputAmount);
      const inputValueUSD = parseEther(quote.amountOut);
      
      // Calculate shares exactly like the contract: (inputValue * 1e18) / currentNav
      const navBigInt = typeof nav === 'bigint' ? nav : BigInt(nav.toString());
      if (navBigInt === 0n) {
        return '0'; // Avoid division by zero
      }
      const expectedShares = (inputValueUSD * BigInt('1000000000000000000')) / navBigInt;
      
      // Check if it meets the minimum creation unit
      if (expectedShares < creationUnit) {
        const minInputNeeded = (creationUnit * navBigInt) / BigInt('1000000000000000000');
        throw new Error(`Amount too small. Minimum ${formatEther(minInputNeeded)} USDC needed.`);
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
      try {
        const signer = await this.provider.getSigner();
        const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);
        const creationUnit = await bundleContract.creationUnit();
        return formatEther(creationUnit); // Return minimum as a string
      } catch (fetchError) {
        console.error('Failed to fetch creation unit, returning 1.0 as fallback:', fetchError);
        return '1.0'; // Fallback in case creation unit cannot be fetched
      }
    }
  }

  /**
   * Mint bundle shares from a single token with automatic swapping
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

      // Calculate minShares if not provided or if provided as '0'
      let calculatedMinShares = minShares;
      if (!minShares || minShares === '0' || parseFloat(minShares) === 0) {
        calculatedMinShares = await this.calculateExpectedShares(bundleAddress, inputToken, inputAmount);
        console.log('Calculated minShares:', calculatedMinShares);
      }
      
      const minSharesWei = parseEther(calculatedMinShares);

      // Strategy 1: Try direct mintFromSingle (if bundle supports it)
      try {
        const inputAmountWei = await this.getTokenAmount(inputToken, inputAmount);
        await this.approveToken(inputToken, bundleAddress, inputAmount);

        console.log('Attempting direct mintFromSingle...');
        const tx = await bundleContract.mintFromSingle(inputToken, inputAmountWei, minSharesWei);
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (directError) {
        console.log('Direct mintFromSingle failed, trying swap + mintExactBasket approach:', directError);
      }

      // Strategy 2: Swap to component tokens + mintExactBasket
      return await this.mintViaSwapAndExactBasket(bundleAddress, inputToken, inputAmount, calculatedMinShares);

    } catch (error) {
      console.error('Mint from single failed:', error);
      throw error;
    }
  }

  /**
   * Mint by swapping input token to component tokens then calling mintExactBasket
   */
  async mintViaSwapAndExactBasket(
    bundleAddress: string,
    inputToken: string, 
    inputAmount: string,
    targetShares: string
  ): Promise<string> {
    try {
      console.log('Starting swap + exact basket mint...');
      
      // Get bundle components and required amounts
      const components = await this.getBundleComponents(bundleAddress);
      const sharesWei = parseEther(targetShares);
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, await this.provider.getSigner());
      const requiredAmounts = await bundleContract.getRequiredAmounts(sharesWei);

      console.log('Required component amounts:', requiredAmounts);
      console.log('Bundle components:', components);

      // Calculate how much of input token to allocate to each component
      const totalValue = await this.calculateTotalRequiredValue(components, requiredAmounts, inputToken);
      const inputAmountNum = parseFloat(inputAmount);
      
      const swapPromises: Promise<string>[] = [];
      
      // Execute swaps for each component token
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const requiredAmount = requiredAmounts[i];
        
        if (requiredAmount > 0n) {
          // Calculate proportion of input token needed for this component
          const componentValue = await this.getTokenValueInInputToken(
            component.token, 
            formatEther(requiredAmount),
            inputToken
          );
          
          const swapAmount = totalValue > 0 ? (componentValue / totalValue * inputAmountNum).toString() : '0';
          
          console.log(`Swapping ${swapAmount} ${this.getTokenSymbol(inputToken)} to ${component.symbol}`);
          
          if (component.token !== inputToken) {
            // Get quote for swap
            const quote = await this.getSwapQuote(inputToken, component.token, swapAmount);
            const minAmountOut = (parseFloat(quote.amountOut) * 0.98).toString(); // 2% slippage
            
            // Execute swap
            swapPromises.push(
              this.executeSwap(inputToken, component.token, swapAmount, minAmountOut)
            );
          }
        }
      }

      // Wait for all swaps to complete
      console.log('Executing swaps...');
      await Promise.all(swapPromises);
      
      // Wait a bit for balances to update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now call mintExactBasket with the swapped tokens
      console.log('Calling mintExactBasket...');
      return await this.mintExactBasket(bundleAddress, targetShares);

    } catch (error) {
      console.error('Swap + exact basket mint failed:', error);
      throw error;
    }
  }

  /**
   * Calculate total value needed in input token terms
   */
  async calculateTotalRequiredValue(components: ComponentInfo[], requiredAmounts: bigint[], inputToken: string): Promise<number> {
    let totalValue = 0;
    
    for (let i = 0; i < components.length; i++) {
      if (requiredAmounts[i] > 0n) {
        const amount = formatEther(requiredAmounts[i]);
        const valueInInputToken = await this.getTokenValueInInputToken(components[i].token, amount, inputToken);
        totalValue += valueInInputToken;
      }
    }
    
    return totalValue;
  }

  /**
   * Get token value in terms of input token
   */
  async getTokenValueInInputToken(
    targetToken: string,
    amount: string, 
    inputToken: string
  ): Promise<number> {
    if (targetToken === inputToken) {
      return parseFloat(amount);
    }
    
    const quote = await this.getSwapQuote(amount, targetToken, inputToken);
    return parseFloat(quote.amountOut);
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

  /**
   * Check if wallet supports EIP-7702 batch transactions
   */
  async supportsBatchTransactions(): Promise<boolean> {
    try {
      // Check if we're in a browser environment
      if (typeof globalThis === 'undefined') return false;
      
      // Check if the wallet supports EIP-7702
      const windowObj = globalThis as any;
      if (!windowObj.ethereum) return false;
      
      // Try to detect batch transaction support
      // This is a simple check - in practice, you'd check for specific wallet capabilities
      return !!(windowObj.ethereum.isMetaMask || windowObj.ethereum.isCoinbaseWallet);
    } catch (error) {
      console.error('Error checking batch transaction support:', error);
      return false;
    }
  }

  /**
   * Create batch transaction call data
   */
  private createBatchCall(to: string, value: string, functionData: string): BatchCall {
    return {
      to,
      value,
      data: functionData
    };
  }

  /**
   * Execute EIP-7702 batch transaction
   */
  async executeBatchTransaction(calls: BatchCall[]): Promise<BatchTransactionResult> {
    try {
      const signer = await this.provider.getSigner();
      
      // Simplified EIP-7702 implementation
      // In production, you'd need the actual batch transaction contract
      console.log('Executing batch transaction with', calls.length, 'calls');
      
      // For now, execute calls sequentially but in a single user confirmation
      // This is a simplified approach until full EIP-7702 wallet support is available
      const results: string[] = [];
      
      for (const call of calls) {
        console.log('Executing call to:', call.to, 'data:', call.data);
        
        const tx = await signer.sendTransaction({
          to: call.to,
          value: call.value || '0',
          data: call.data,
        });
        
        const receipt = await tx.wait();
        if (receipt) {
          results.push(receipt.hash);
        }
      }
      
      return {
        success: true,
        txHash: results[results.length - 1] // Return the last transaction hash
      };
    } catch (error) {
      console.error('Batch transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch transaction failed'
      };
    }
  }

  /**
   * Mint exact basket using batch transactions (EIP-7702)
   */
  async mintExactBasketBatch(bundleAddress: string, shares: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const bundleContract = new Contract(bundleAddress, BundleV3ProductionABI, signer);
      const erc20Interface = new Interface([
        "function approve(address spender, uint256 amount) external returns (bool)"
      ]);
      const bundleInterface = new Interface(BundleV3ProductionABI);

      const sharesWei = parseEther(shares);
      
      // Check creation unit requirement
      try {
        const creationUnit = await bundleContract.creationUnit();
        if (sharesWei < creationUnit) {
          const minShares = formatEther(creationUnit);
          throw new Error(`Amount too small. Minimum ${minShares} shares required (creation unit constraint).`);
        }
      } catch (creationUnitError) {
        console.log('Could not check creation unit (function may not exist):', creationUnitError);
      }
      
      // Get required amounts for the shares
      const requiredAmounts = await bundleContract.getRequiredAmounts(sharesWei);
      const components = await this.getBundleComponents(bundleAddress);
      
      console.log('Building batch transaction for', components.length, 'components');
      
      const batchCalls: BatchCall[] = [];
      
      // Add approval calls for each component token
      for (let i = 0; i < components.length; i++) {
        const requiredAmountBigInt = requiredAmounts[i] || 0n;
        if (requiredAmountBigInt > 0n) {
          const tokenAddress = components[i].token;
          
          // Skip approval for ETH (zero address)
          if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          // Check if approval is needed
          const tokenContract = new Contract(tokenAddress, [
            "function allowance(address owner, address spender) external view returns (uint256)"
          ], signer);
          
          const userAddress = await signer.getAddress();
          let currentAllowance = 0n;
          
          try {
            currentAllowance = await tokenContract.allowance(userAddress, bundleAddress);
          } catch (allowanceError) {
            console.log('Could not check allowance, including approval in batch:', allowanceError);
          }
          
          // Only add approval if needed
          if (currentAllowance < requiredAmountBigInt) {
            const approveData = erc20Interface.encodeFunctionData('approve', [
              bundleAddress,
              requiredAmountBigInt
            ]);
            
            batchCalls.push(this.createBatchCall(
              tokenAddress,
              '0',
              approveData
            ));
            
            console.log(`Added approval for ${components[i].symbol}: ${requiredAmountBigInt.toString()}`);
          }
        }
      }
      
      // Add the mintExactBasket call
      const mintData = bundleInterface.encodeFunctionData('mintExactBasket', [sharesWei]);
      batchCalls.push(this.createBatchCall(
        bundleAddress,
        '0',
        mintData
      ));
      
      console.log(`Batch transaction prepared: ${batchCalls.length} calls (${batchCalls.length - 1} approvals + 1 mint)`);
      
      // Execute batch transaction
      const result = await this.executeBatchTransaction(batchCalls);
      
      if (!result.success) {
        throw new Error(result.error || 'Batch transaction failed');
      }
      
      return result.txHash || '';
    } catch (error) {
      console.error('Batch mint exact basket failed:', error);
      throw error;
    }
  }
}

export default BundleManager;