import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider } from 'ethers';
import BundleManager, { BundleInfo } from '../utils/bundleInteractions';

interface BundleCardProps {
  bundle: BundleInfo;
  onManage: (bundle: BundleInfo) => void;
}

const BundleCard: React.FC<BundleCardProps> = ({ bundle, onManage }) => {
  const navValue = parseFloat(bundle.nav);
  const userValue = parseFloat(bundle.userBalanceUSD);
  
  return (
    <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20 shadow-2xl hover:shadow-pink-500/25 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{bundle.name}</h3>
          <p className="text-slate-300">{bundle.symbol}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-300">NAV</div>
          <div className="text-lg font-semibold text-white">
            ${navValue.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-slate-300">Total Supply</span>
          <span className="font-medium text-white">{parseFloat(bundle.totalSupply).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Your Position</span>
          <span className="font-medium text-white">{parseFloat(bundle.userBalance).toFixed(4)} shares</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Position Value</span>
          <span className="font-medium text-pink-400">${userValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Components</h4>
        <div className="space-y-1">
          {bundle.components.slice(0, 3).map((component, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-slate-300">{component.symbol}</span>
              <span className="text-white">{component.weight}%</span>
            </div>
          ))}
          {bundle.components.length > 3 && (
            <div className="text-sm text-slate-400">+{bundle.components.length - 3} more</div>
          )}
        </div>
      </div>

      <button
        onClick={() => onManage(bundle)}
        className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-pink-600 hover:to-orange-600 transition-all duration-500 shadow-lg hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20"
      >
        Manage Position
      </button>
    </div>
  );
};

interface ManageBundleModalProps {
  bundle: BundleInfo | null;
  isOpen: boolean;
  onClose: () => void;
  bundleManager: BundleManager | null;
}

const ManageBundleModal: React.FC<ManageBundleModalProps> = ({ bundle, isOpen, onClose, bundleManager }) => {
  const [activeTab, setActiveTab] = useState<'invest' | 'redeem'>('invest');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expectedShares, setExpectedShares] = useState<string>('0');
  const [investMethod, setInvestMethod] = useState<'single' | 'exact'>('exact'); // Default to exact basket

  // Calculate expected shares when amount changes
  useEffect(() => {
    const calculateShares = async () => {
      if (bundleManager && bundle && amount && parseFloat(amount) > 0) {
        try {
          setError(null); // Clear any previous errors
          
          if (activeTab === 'invest' && investMethod === 'exact') {
            // For exact basket, the amount IS the shares
            setExpectedShares(amount);
          } else if (activeTab === 'invest' && investMethod === 'single') {
            // For single token, calculate expected shares from USDC amount
            const shares = await bundleManager.calculateExpectedShares(
              bundle.address,
              '0x93B0c7AF3A1772919b56b1A2bE9966204dD39082', // USDC
              amount
            );
            setExpectedShares(shares);
          } else {
            // For redeem, amount is shares
            setExpectedShares('0');
          }
        } catch (error) {
          console.error('Failed to calculate expected shares:', error);
          // Show error for minimum amount requirements
          if (error instanceof Error && error.message.includes('Minimum')) {
            setError(error.message);
            setExpectedShares('0');
          } else {
            // Fallback calculation based on NAV
            const nav = parseFloat(bundle.nav);
            if (nav > 0 && investMethod === 'single') {
              setExpectedShares((parseFloat(amount) / nav).toFixed(6));
            }
          }
        }
      } else {
        setExpectedShares('0');
        setError(null);
      }
    };

    calculateShares();
  }, [amount, bundle, bundleManager, activeTab, investMethod]);

  if (!isOpen || !bundle) return null;

  const handleInvest = async () => {
    if (!bundleManager || !amount) return;
    
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      if (investMethod === 'exact') {
        // Use mintExactBasket - provide exact shares
        const hash = await bundleManager.mintExactBasket(bundle.address, expectedShares);
        setTxHash(hash);
      } else {
        // Use mintFromSingle with USDC
        const hash = await bundleManager.mintFromSingle(
          bundle.address,
          '0x93B0c7AF3A1772919b56b1A2bE9966204dD39082', // USDC
          amount,
          '0' // Will trigger automatic calculation
        );
        setTxHash(hash);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!bundleManager || !amount) return;
    
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await bundleManager.redeemForBasket(bundle.address, amount);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redemption failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-r from-slate-800/90 to-pink-800/90 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-pink-500/20 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage {bundle.symbol}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl transition-colors duration-300"
          >
            ×
          </button>
        </div>

        {/* Bundle Info */}
        <div className="bg-pink-500/10 p-4 rounded-xl mb-6 border border-pink-400/20 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-300">Your Position</div>
              <div className="font-semibold text-white">{parseFloat(bundle.userBalance).toFixed(4)} shares</div>
            </div>
            <div>
              <div className="text-sm text-slate-300">Value</div>
              <div className="font-semibold text-pink-400">${parseFloat(bundle.userBalanceUSD).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-slate-700/60 rounded-xl p-1 backdrop-blur-sm border border-slate-500/30">
          <button
            onClick={() => setActiveTab('invest')}
            className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
              activeTab === 'invest'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Invest
          </button>
          <button
            onClick={() => setActiveTab('redeem')}
            className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
              activeTab === 'redeem'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Redeem
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'invest' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Investment Method
              </label>
              <div className="flex bg-slate-700/60 rounded-xl p-1 mb-4 backdrop-blur-sm border border-slate-500/30">
                <button
                  onClick={() => setInvestMethod('exact')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 text-sm ${
                    investMethod === 'exact'
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Exact Basket
                </button>
                <button
                  onClick={() => setInvestMethod('single')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 text-sm ${
                    investMethod === 'single'
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Single Token
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {activeTab === 'invest' 
                ? (investMethod === 'exact' ? 'Number of Shares' : 'Investment Amount (USDC)')
                : 'Shares to Redeem'
              }
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={activeTab === 'invest' 
                ? (investMethod === 'exact' ? '1.0' : '100') 
                : '10.0'
              }
              className="w-full px-4 py-3 bg-slate-700/60 border border-pink-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-white placeholder-slate-400 backdrop-blur-sm"
            />
          </div>

          {activeTab === 'invest' && (
            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-400/30 backdrop-blur-sm">
              <div className="text-sm text-orange-200">
                <div className="font-semibold mb-1">
                  {investMethod === 'exact' ? 'Exact Basket Details:' : 'Single Token Details:'}
                </div>
                {investMethod === 'exact' ? (
                  <>
                    <div>• Method: Provide exact amounts of each component token</div>
                    <div>• Requires: Component tokens (COMP1, COMP2, COMP3)</div>
                    <div>• Shares to mint: {amount || '0'}</div>
                    <div>• Bypasses swapping - more reliable</div>
                  </>
                ) : (
                  <>
                    <div>• Minimum investment: 0.1 USDC</div>
                    <div>• Current NAV: ${parseFloat(bundle.nav).toFixed(4)}</div>
                    <div>• Expected shares: {parseFloat(expectedShares).toFixed(6)}</div>
                    <div>• Min shares (95% slippage): {(parseFloat(expectedShares) * 0.95).toFixed(6)}</div>
                    <div>• Requires swap routing (may fail)</div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-400/30 backdrop-blur-sm">
              <div className="text-sm text-orange-200">
                <div className="font-semibold mb-1">Redemption Details:</div>
                <div>• You'll receive underlying tokens</div>
                <div>• Current value: ${amount ? (parseFloat(amount) * parseFloat(bundle.nav)).toFixed(2) : '0'}</div>
                <div>• Available to redeem: {bundle.userBalance} shares</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-red-200 text-sm">{error}</div>
            </div>
          )}

          {txHash && (
            <div className="bg-pink-500/10 border border-pink-400/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-pink-200 text-sm">
                <div className="font-semibold">Transaction Successful!</div>
                <div className="break-all mt-1">
                  <a 
                    href={`https://bepolia.beratrail.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    View on Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={activeTab === 'invest' ? handleInvest : handleRedeem}
            disabled={isLoading || !amount}
            className={`w-full py-3 rounded-xl font-medium transition-all duration-500 shadow-lg hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20 ${
              isLoading || !amount
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : activeTab === 'invest'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:from-pink-600 hover:to-orange-600'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
            }`}
          >
            {isLoading 
              ? (activeTab === 'invest' ? 'Investing...' : 'Redeeming...') 
              : (activeTab === 'invest' ? 'Invest' : 'Redeem')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageBundles: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [bundles, setBundles] = useState<BundleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundleManager, setBundleManager] = useState<BundleManager | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<BundleInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isConnected) {
      initializeBundleManager();
    }
  }, [isConnected]);

  const initializeBundleManager = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const { BrowserProvider } = await import('ethers');
        const provider = new BrowserProvider(window.ethereum);
        const manager = new BundleManager(provider);
        setBundleManager(manager);
        await loadBundles(manager);
      }
    } catch (error) {
      console.error('Failed to initialize bundle manager:', error);
      setLoading(false);
    }
  };

  const loadBundles = async (manager: BundleManager) => {
    try {
      setLoading(true);
      const bundleAddresses = await manager.getAllBundles();
      
      const bundleInfos = await Promise.all(
        bundleAddresses.map(addr => manager.getBundleInfo(addr, address))
      );
      
      setBundles(bundleInfos);
    } catch (error) {
      console.error('Failed to load bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBundle = (bundle: BundleInfo) => {
    setSelectedBundle(bundle);
    setShowModal(true);
  };

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-2xl font-bold text-white mb-4">Connect Your Wallet</div>
          <p className="text-slate-300">Please connect your wallet to manage bundle positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">Manage Bundles</h1>
        <p className="text-slate-300">Invest in or redeem from deployed asset bundles</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading bundles...</p>
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-xl font-semibold text-white mb-2">No Bundles Found</div>
          <p className="text-slate-300">No bundles have been deployed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <BundleCard
              key={bundle.address}
              bundle={bundle}
              onManage={handleManageBundle}
            />
          ))}
        </div>
      )}

      <ManageBundleModal
        bundle={selectedBundle}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        bundleManager={bundleManager}
      />
    </div>
  );
};

export default ManageBundles;