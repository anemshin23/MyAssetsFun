import React, { useState } from 'react';
import { useAccount } from 'wagmi';

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
  });

  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock token list - replace with actual token data
  const availableTokens = [
    { symbol: 'BTC', name: 'Bitcoin', address: '0x...' },
    { symbol: 'ETH', name: 'Ethereum', address: '0x...' },
    { symbol: 'USDC', name: 'USD Coin', address: '0x...' },
    { symbol: 'BASE', name: 'Base', address: '0x...' },
    { symbol: 'SOL', name: 'Solana', address: '0x...' },
    { symbol: 'AVAX', name: 'Avalanche', address: '0x...' },
    { symbol: 'MATIC', name: 'Polygon', address: '0x...' },
    { symbol: 'LINK', name: 'Chainlink', address: '0x...' },
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
        <div className="text-2xl font-bold text-gray-700 mb-4">Connect Your Wallet</div>
        <p className="text-gray-500">Please connect your wallet to create bundles</p>
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
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Bundle Details</span>
          <span>Asset Selection</span>
          <span>Configuration</span>
          <span>Review & Deploy</span>
        </div>
      </div>

      {/* Step 1: Bundle Details */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Bundle Details</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Name</label>
              <input
                type="text"
                value={bundleConfig.name}
                onChange={(e) => setBundleConfig({ ...bundleConfig, name: e.target.value })}
                placeholder="e.g., DeFi Growth Bundle"
                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbol (Ticker)</label>
              <input
                type="text"
                value={bundleConfig.symbol}
                onChange={(e) => setBundleConfig({ ...bundleConfig, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., DEFI"
                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={bundleConfig.description}
                onChange={(e) => setBundleConfig({ ...bundleConfig, description: e.target.value })}
                placeholder="Describe your bundle strategy..."
                rows={4}
                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!bundleConfig.name || !bundleConfig.symbol}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
            >
              Next: Asset Selection
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Asset Selection */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Asset Selection</h2>
          
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tokens..."
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Token List */}
          <div className="grid grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
            {filteredTokens.map((token) => (
              <label key={token.symbol} className="flex items-center gap-3 p-3 border border-emerald-200 rounded-lg hover:border-emerald-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(token.symbol)}
                  onChange={() => handleTokenSelection(token.symbol)}
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{token.symbol}</div>
                  <div className="text-sm text-gray-500">{token.name}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={addSelectedTokens}
              disabled={selectedTokens.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
            >
              Next: Configuration
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration</h2>
          
          {/* Asset Weights */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Weights</h3>
            <div className="space-y-4">
              {bundleConfig.assets.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{asset.symbol}</span>
                    <span className="text-sm text-gray-500">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={asset.weight}
                      onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-emerald-200 rounded-lg text-center"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              ))}
              <div className={`text-center p-3 rounded-lg ${
                totalWeight === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                Total Weight: {totalWeight.toFixed(1)}% {totalWeight === 100 ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Rebalance Policy */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rebalance Policy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Policy Type</label>
                <select
                  value={bundleConfig.rebalancePolicy}
                  onChange={(e) => setBundleConfig({ ...bundleConfig, rebalancePolicy: e.target.value as any })}
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="threshold">Threshold-based</option>
                </select>
              </div>
              {bundleConfig.rebalancePolicy === 'threshold' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Threshold (%)</label>
                  <input
                    type="number"
                    value={bundleConfig.threshold}
                    onChange={(e) => setBundleConfig({ ...bundleConfig, threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="0"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fees</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Management Fee (%)</label>
                <input
                  type="number"
                  value={bundleConfig.managementFee}
                  onChange={(e) => setBundleConfig({ ...bundleConfig, managementFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance Fee (%)</label>
                <input
                  type="number"
                  value={bundleConfig.performanceFee}
                  onChange={(e) => setBundleConfig({ ...bundleConfig, performanceFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              disabled={!isValid}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
            >
              Next: Review & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Deploy */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Deploy</h2>
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Bundle Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="font-semibold text-gray-900">{bundleConfig.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Symbol</div>
                <div className="font-semibold text-gray-900">{bundleConfig.symbol}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Assets</div>
                <div className="font-semibold text-gray-900">{bundleConfig.assets.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Management Fee</div>
                <div className="font-semibold text-gray-900">{bundleConfig.managementFee}%</div>
              </div>
            </div>
          </div>

          {/* Asset Breakdown */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Breakdown</h3>
            <div className="space-y-3">
              {bundleConfig.assets.map((asset) => (
                <div key={asset.symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{asset.symbol}</span>
                  <span className="text-gray-600">{asset.weight}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deploy Button */}
          <div className="text-center">
            <button
              onClick={() => {
                // TODO: Implement bundle deployment
                console.log('Deploying bundle:', bundleConfig);
              }}
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-12 py-4 rounded-xl font-bold text-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Deploy Bundle
            </button>
            <p className="text-sm text-gray-500 mt-3">Estimated gas: ~0.001 BERA</p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBundle; 