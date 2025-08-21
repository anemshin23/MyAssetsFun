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
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{bundle.name}</h3>
          <p className="text-gray-500">{bundle.symbol}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">NAV</div>
          <div className="text-lg font-semibold text-gray-900">
            ${navValue.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Supply</span>
          <span className="font-medium">{parseFloat(bundle.totalSupply).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Your Position</span>
          <span className="font-medium">{parseFloat(bundle.userBalance).toFixed(4)} shares</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Position Value</span>
          <span className="font-medium text-emerald-600">${userValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Components</h4>
        <div className="space-y-1">
          {bundle.components.slice(0, 3).map((component, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">{component.symbol}</span>
              <span className="text-gray-900">{component.weight}%</span>
            </div>
          ))}
          {bundle.components.length > 3 && (
            <div className="text-sm text-gray-500">+{bundle.components.length - 3} more</div>
          )}
        </div>
      </div>

      <button
        onClick={() => onManage(bundle)}
        className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-green-600 transition-all duration-300"
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

  if (!isOpen || !bundle) return null;

  const handleInvest = async () => {
    if (!bundleManager || !amount) return;
    
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // For now, use single token minting (would need to select input token)
      const hash = await bundleManager.mintFromSingle(
        bundle.address,
        '0x0000000000000000000000000000000000000000', // BERA (native token)
        amount,
        '100' // Minimum shares (would calculate)
      );
      setTxHash(hash);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Manage {bundle.symbol}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Bundle Info */}
        <div className="bg-emerald-50 p-4 rounded-xl mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Your Position</div>
              <div className="font-semibold">{parseFloat(bundle.userBalance).toFixed(4)} shares</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Value</div>
              <div className="font-semibold text-emerald-600">${parseFloat(bundle.userBalanceUSD).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('invest')}
            className={`flex-1 py-2 px-4 rounded-lg transition-all ${
              activeTab === 'invest'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Invest
          </button>
          <button
            onClick={() => setActiveTab('redeem')}
            className={`flex-1 py-2 px-4 rounded-lg transition-all ${
              activeTab === 'redeem'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Redeem
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {activeTab === 'invest' ? 'Investment Amount (BERA)' : 'Shares to Redeem'}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={activeTab === 'invest' ? '100' : '10.0'}
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
            />
          </div>

          {activeTab === 'invest' && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-1">Investment Details:</div>
                <div>• Minimum investment: 0.1 BERA</div>
                <div>• Current NAV: ${parseFloat(bundle.nav).toFixed(4)}</div>
                <div>• Estimated shares: {amount ? (parseFloat(amount) / parseFloat(bundle.nav)).toFixed(4) : '0'}</div>
              </div>
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="text-sm text-orange-800">
                <div className="font-semibold mb-1">Redemption Details:</div>
                <div>• You'll receive underlying tokens</div>
                <div>• Current value: ${amount ? (parseFloat(amount) * parseFloat(bundle.nav)).toFixed(2) : '0'}</div>
                <div>• Available to redeem: {bundle.userBalance} shares</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {txHash && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-green-800 text-sm">
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
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              isLoading || !amount
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : activeTab === 'invest'
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
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
          <div className="text-2xl font-bold text-gray-700 mb-4">Connect Your Wallet</div>
          <p className="text-gray-500">Please connect your wallet to manage bundle positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Bundles</h1>
        <p className="text-gray-600">Invest in or redeem from deployed asset bundles</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading bundles...</p>
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-xl font-semibold text-gray-700 mb-2">No Bundles Found</div>
          <p className="text-gray-500">No bundles have been deployed yet.</p>
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