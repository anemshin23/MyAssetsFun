import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { BundleDeployer, DEFAULT_CONFIGS, DeployBundleParams } from '../utils/deployBundle';

// Extend window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface BundleAsset {
  symbol: string;
  name: string;
  weight: number;
  address: string;
}

interface BundleConfig {
  name: string;
  symbol: string;
  description: string;
  assets: BundleAsset[];
  rebalancePolicy: 'daily' | 'weekly' | 'monthly' | 'threshold';
  threshold: number;
  managementFee: number;
  performanceFee: number;
  // Kodiak-specific configuration
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  enableIslands: boolean;
  islandAllocation: number; // 0-50%
  enableRewardReinvestment: boolean;
  rewardReinvestmentRatio: number; // 0-100%
}

const CreateBundle: React.FC = () => {
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);
  const [bundleConfig, setBundleConfig] = useState<BundleConfig>({
    name: '',
    symbol: '',
    description: '',
    assets: [],
    rebalancePolicy: 'weekly',
    threshold: 5,
    managementFee: 0.5,
    performanceFee: 10,
    riskProfile: 'balanced',
    enableIslands: true,
    islandAllocation: 20, // 20%
    enableRewardReinvestment: true,
    rewardReinvestmentRatio: 70, // 70% reinvest, 30% to creator
  });

  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    bundleAddress: string;
    transactionHash: string;
  } | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Available tokens - updated to use our deployed component tokens
  const availableTokens = [
    // Our newly deployed component tokens (have oracle prices and user has balance)
    { symbol: 'COMP1', name: 'Component Token 1', address: '0x33E2d7Fc013D43bE07e90Cb49f072ECf65Cc9CbD' },
    { symbol: 'COMP2', name: 'Component Token 2', address: '0xD78a73e98EcCd3ADc3B0352F1d033dbd6D6a98e4' },
    { symbol: 'COMP3', name: 'Component Token 3', address: '0xa2De30d3BcD85192F616474E50660C65b676D856' },
    // Our deployed mock tokens (also have oracle prices)
    { symbol: 'USDC', name: 'USD Coin (Mock)', address: '0x93B0c7AF3A1772919b56b1A2bE9966204dD39082' },
    { symbol: 'BTC', name: 'Bitcoin (Mock)', address: '0xCb3bb12157097612D4e98981F03d3bB68a16672f' },
    { symbol: 'ETH', name: 'Ethereum (Mock)', address: '0x50e05C0E4ebF75d86d9a21BA33a0cb819438deCD' },
    { symbol: 'BERA', name: 'Berachain (Mock)', address: '0x25beBbD6B6bA19f90BCDD5f23aC67FbeA065AbC7' },
  ];

  const filteredTokens = availableTokens.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTokenSelection = (symbol: string) => {
    if (selectedTokens.includes(symbol)) {
      setSelectedTokens(selectedTokens.filter(t => t !== symbol));
    } else {
      setSelectedTokens([...selectedTokens, symbol]);
    }
  };

  const handleWeightChange = (symbol: string, weight: number) => {
    const updatedAssets = bundleConfig.assets.map(asset =>
      asset.symbol === symbol ? { ...asset, weight } : asset
    );
    setBundleConfig({ ...bundleConfig, assets: updatedAssets });
  };

  const addSelectedTokens = () => {
    const newAssets = selectedTokens.map(symbol => {
      const token = availableTokens.find(t => t.symbol === symbol)!;
      return {
        symbol: token.symbol,
        name: token.name,
        weight: 100 / selectedTokens.length,
        address: token.address,
      };
    });
    setBundleConfig({ ...bundleConfig, assets: newAssets });
    setCurrentStep(3);
  };

  const totalWeight = bundleConfig.assets.reduce((sum, asset) => sum + asset.weight, 0);
  const isValid = totalWeight === 100 && bundleConfig.name && bundleConfig.symbol;

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold text-white mb-4">Connect Your Wallet</div>
        <p className="text-slate-300">Please connect your wallet to create bundles</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep >= step 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-slate-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Bundle Details</span>
          <span>Asset Selection</span>
          <span>Configuration</span>
          <span>Review & Deploy</span>
        </div>
      </div>

      {/* Step 1: Bundle Details */}
      {currentStep === 1 && (
        <div className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Bundle Details</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bundle Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={bundleConfig.name}
                onChange={(e) => setBundleConfig({ ...bundleConfig, name: e.target.value })}
                placeholder="e.g., DeFi Growth Bundle"
                className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-slate-400 backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Symbol (Ticker) <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={bundleConfig.symbol}
                onChange={(e) => setBundleConfig({ ...bundleConfig, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., DEFI"
                className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-slate-400 backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={bundleConfig.description}
                onChange={(e) => setBundleConfig({ ...bundleConfig, description: e.target.value })}
                placeholder="Describe your bundle strategy..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-slate-400 backdrop-blur-sm"
              />
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!bundleConfig.name || !bundleConfig.symbol}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-500 shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-purple-400/20 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed"
            >
              Next: Asset Selection
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Asset Selection */}
      {currentStep === 2 && (
        <div className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Asset Selection</h2>
          
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tokens..."
              className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-slate-400 backdrop-blur-sm"
            />
          </div>

          {/* Token List */}
          <div className="grid grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
            {filteredTokens.map((token) => (
              <label key={token.symbol} className="flex items-center gap-3 p-3 bg-slate-700/60 border border-purple-500/30 rounded-lg hover:border-purple-400/50 cursor-pointer backdrop-blur-sm transition-all duration-300">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(token.symbol)}
                  onChange={() => handleTokenSelection(token.symbol)}
                  className="rounded border-purple-400 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-sm text-slate-300">{token.name}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 bg-slate-700/60 text-white rounded-xl hover:bg-slate-600/80 transition-all duration-300 backdrop-blur-sm border border-slate-500/30"
            >
              Back
            </button>
            <button
              onClick={addSelectedTokens}
              disabled={selectedTokens.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-500 shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-purple-400/20 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed"
            >
              Next: Configuration
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {currentStep === 3 && (
        <div className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>
          
          {/* Asset Weights */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Asset Weights</h3>
            <div className="space-y-4">
              {bundleConfig.assets.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-400/20 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{asset.symbol}</span>
                    <span className="text-sm text-slate-300">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={asset.weight}
                      onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-2 bg-slate-700/60 border border-purple-500/30 rounded-lg text-center text-white backdrop-blur-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-slate-300">%</span>
                  </div>
                </div>
              ))}
              <div className={`text-center p-3 rounded-lg backdrop-blur-sm ${
                totalWeight === 100 ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                Total Weight: {totalWeight.toFixed(1)}% {totalWeight === 100 ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Rebalance Policy */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Rebalance Policy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Policy Type</label>
                <select
                  value={bundleConfig.rebalancePolicy}
                  onChange={(e) => setBundleConfig({ ...bundleConfig, rebalancePolicy: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white backdrop-blur-sm"
                >
                  <option value="" disabled>Select rebalance policy</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="threshold">Threshold-based</option>
                </select>
              </div>
              {bundleConfig.rebalancePolicy === 'threshold' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Threshold (%)</label>
                  <input
                    type="number"
                    value={bundleConfig.threshold}
                    onChange={(e) => setBundleConfig({ ...bundleConfig, threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white backdrop-blur-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Fees</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Management Fee (%)</label>
                <input
                  type="number"
                  value={bundleConfig.managementFee}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 2) {
                      setBundleConfig({ ...bundleConfig, managementFee: value });
                    }
                  }}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white backdrop-blur-sm"
                  min="0"
                  max="2"
                  step="0.1"
                  //readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Performance Fee (%)</label>
                <input
                  type="number"
                  value={bundleConfig.performanceFee}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 2) {
                      setBundleConfig({ ...bundleConfig, performanceFee: value });
                    }
                  }}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  className="w-full px-4 py-3 bg-slate-700/60 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white backdrop-blur-sm"
                  min="0"
                  max="2"
                  step="0.1"
                  //readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-slate-700/60 text-white rounded-xl hover:bg-slate-600/80 transition-all duration-300 backdrop-blur-sm border border-slate-500/30"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              disabled={!isValid}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-500 shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-purple-400/20 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed"
            >
              Next: Review & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Deploy */}
      {currentStep === 4 && (
        <div className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Review & Deploy</h2>
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 rounded-xl border border-purple-400/20 mb-8 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4">Bundle Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-slate-300">Name</div>
                <div className="font-semibold text-white">{bundleConfig.name}</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Symbol</div>
                <div className="font-semibold text-white">{bundleConfig.symbol}</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Assets</div>
                <div className="font-semibold text-white">{bundleConfig.assets.length}</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Management Fee</div>
                <div className="font-semibold text-white">{bundleConfig.managementFee}%</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Risk Profile</div>
                <div className="font-semibold text-white capitalize">{bundleConfig.riskProfile}</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Islands Enabled</div>
                <div className="font-semibold text-white">{bundleConfig.enableIslands ? `Yes (${bundleConfig.islandAllocation}%)` : 'No'}</div>
              </div>
            </div>
          </div>

          {/* Asset Breakdown */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Asset Breakdown</h3>
            <div className="space-y-3">
              {bundleConfig.assets.map((asset) => (
                <div key={asset.symbol} className="flex justify-between items-center p-3 bg-slate-700/60 rounded-lg backdrop-blur-sm border border-slate-500/30">
                  <span className="font-medium text-white">{asset.symbol}</span>
                  <span className="text-slate-300">{asset.weight}%</span>
                </div>
              ))}
            </div>
            
            {/* Kodiak Features Summary */}
            {bundleConfig.enableIslands && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg backdrop-blur-sm">
                <h4 className="font-semibold text-blue-300 mb-2">🐻 Kodiak Features Enabled</h4>
                <div className="text-sm text-blue-200 space-y-1">
                  <div>• {bundleConfig.islandAllocation}% allocated to Islands for yield generation</div>
                  <div>• Automated PoL rewards from Berachain validators</div>
                  {bundleConfig.enableRewardReinvestment && (
                    <div>• {bundleConfig.rewardReinvestmentRatio}% rewards auto-reinvested for compound growth</div>
                  )}
                  <div>• Risk profile: {bundleConfig.riskProfile}</div>
                </div>
              </div>
            )}
          </div>

          {/* Deploy Button */}
          <div className="text-center">
            <button
              onClick={handleDeployBundle}
              disabled={isDeploying}
              className={`px-12 py-4 rounded-xl font-bold text-xl transition-all duration-500 shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-purple-400/20 ${
                isDeploying 
                  ? 'bg-slate-600 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
              }`}
            >
              {isDeploying ? 'Deploying...' : 'Deploy Bundle'}
            </button>
            <p className="text-sm text-slate-300 mt-3">
              Estimated gas: ~0.002 BERA {bundleConfig.enableIslands && '(+Islands setup)'}
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-slate-700/60 text-white rounded-xl hover:bg-slate-600/80 transition-all duration-300 backdrop-blur-sm border border-slate-500/30"
            >
              Back
            </button>
            
            {/* Deployment Status */}
            {deploymentResult && (
              <div className="mt-6 p-6 bg-purple-500/10 border border-purple-400/30 rounded-xl backdrop-blur-sm">
                <h4 className="text-lg font-semibold text-purple-300 mb-3">✅ Bundle Deployed Successfully!</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-purple-200">Bundle Address: </span>
                    <span className="font-mono text-purple-300">{deploymentResult.bundleAddress}</span>
                  </div>
                  <div>
                    <span className="font-medium text-purple-200">Transaction: </span>
                    <a 
                      href={`https://artio.beratrail.io/tx/${deploymentResult.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-purple-300 hover:underline"
                    >
                      {deploymentResult.transactionHash.slice(0, 20)}...{deploymentResult.transactionHash.slice(-10)}
                    </a>
                  </div>
                </div>
              </div>
            )}
            
            {deploymentError && (
              <div className="mt-6 p-6 bg-red-500/10 border border-red-400/30 rounded-xl backdrop-blur-sm">
                <h4 className="text-lg font-semibold text-red-300 mb-3">❌ Deployment Failed</h4>
                <p className="text-sm text-red-200">{deploymentError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  // Handle bundle deployment
  async function handleDeployBundle() {
    if (!isConnected) {
      setDeploymentError('Please connect your wallet first');
      return;
    }
    
    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);
    
    try {
      // Get provider from window.ethereum
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No ethereum provider found');
      }
      
      const { BrowserProvider } = await import('ethers');
      const web3Provider = new BrowserProvider(window.ethereum);
      // Auto-detect network based on connected wallet's chain ID
      const deployer = new BundleDeployer(web3Provider);
      
      // Convert UI config to deployment parameters
      const tokens = bundleConfig.assets.map(asset => ({
        address: asset.address,
        symbol: asset.symbol,
        name: asset.name,
        decimals: 18, // Assuming 18 decimals for now
        weight: asset.weight
      }));
      
      // Get configuration based on risk profile
      const riskConfig = DEFAULT_CONFIGS[bundleConfig.riskProfile];
      
      // Convert UI values to contract format
      const deployParams: DeployBundleParams = {
        name: bundleConfig.name,
        symbol: bundleConfig.symbol,
        tokens: tokens,
        managementFee: Math.round(bundleConfig.managementFee * 100), // Convert to basis points
        config: {
          driftThreshold: riskConfig.driftThreshold,
          maxSlippageBps: riskConfig.maxSlippageBps,
          minRebalanceInterval: riskConfig.minRebalanceInterval,
          islandAllocationBps: bundleConfig.enableIslands ? Math.round(bundleConfig.islandAllocation * 100) : 0,
          enableIslandRewards: bundleConfig.enableIslands && bundleConfig.enableRewardReinvestment,
          rewardReinvestBps: bundleConfig.enableRewardReinvestment 
            ? Math.round(bundleConfig.rewardReinvestmentRatio * 100)
            : 0
        }
      };
      
      console.log('Deploying bundle with params:', deployParams);
      
      const result = await deployer.deployBundle(deployParams);
      
      setDeploymentResult({
        bundleAddress: result.bundleAddress,
        transactionHash: result.transactionHash
      });
      
      console.log('Bundle deployed successfully:', result);
      
    } catch (error) {
      console.error('Bundle deployment failed:', error);
      setDeploymentError(
        error instanceof Error 
          ? error.message 
          : 'An unknown error occurred during deployment'
      );
    } finally {
      setIsDeploying(false);
    }
  }
};

export default CreateBundle; 