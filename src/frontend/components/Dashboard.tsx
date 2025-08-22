import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import deployedBundlesData from '../../../data/completed-bundles.json';

interface Bundle {
  id: string;
  name: string;
  symbol: string;
  assets: string[];
  totalValue: number;
  performance: number;
  shares: number;
  isCreator: boolean;
}

interface DeployedBundle {
  id: string;
  originalTweetId: string;
  originalUsername: string;
  originalCashtag: string;
  bundle: string[];
  completedAt: string;
  conversationType: string;
  tweetText: string;
  profileImageUrl: string;
}

const Dashboard: React.FC = () => {
  const { isConnected, connector } = useAccount();
  const [activeTab, setActiveTab] = useState<'bundles' | 'investments' | 'allbundles' | 'notifications' | 'settings'>('bundles');
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'rebalance',
      message: 'DeFi Growth Bundle rebalanced due to 5% drift',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'fee',
      message: 'Performance fee of 0.5 BERA collected from Layer 2 Bundle',
      timestamp: '1 day ago',
      read: true,
    },
  ]);
  const [myBundles, setMyBundles] = useState<Bundle[]>([]);

  useEffect(() => {
    const formattedBundles: Bundle[] = (deployedBundlesData as DeployedBundle[]).map((deployedBundle) => ({
      id: deployedBundle.id,
      name: `${deployedBundle.originalCashtag} Bundle`,
      symbol: deployedBundle.originalCashtag,
      assets: deployedBundle.bundle,
      totalValue: Math.floor(Math.random() * 20000) + 5000, // Mock data for demonstration
      performance: parseFloat(((Math.random() - 0.2) * 25).toFixed(2)), // Mock data for demonstration
      shares: Math.floor(Math.random() * 1000) + 200, // Mock data for demonstration
      isCreator: true,
    }));
    setMyBundles(formattedBundles);
  }, []);


  const markAsRead = (notificationId: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const myInvestments: Bundle[] = [
    {
      id: '3',
      name: 'Blue Chip Bundle',
      symbol: 'BLUE',
      assets: ['BTC', 'ETH', 'SOL'],
      totalValue: 5600,
      performance: 12.1,
      shares: 450,
      isCreator: false,
    },
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold text-white mb-4">Connect Your Wallet</div>
        <p className="text-slate-300">Please connect your wallet to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-xl text-slate-300">Manage your bundles and investments</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <div className="text-slate-300 text-md">Created Bundles</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{myBundles.length}</div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <div className="text-slate-300 text-md">Total Invested</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            ${myInvestments.reduce((sum, inv) => sum + inv.totalValue, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <div className="text-slate-300 text-sm">Avg Performance</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-pink-400">
            {myBundles.length > 0 ?
    `+${Math.round((myBundles.reduce((sum, b) => sum + b.performance, 0) / myBundles.length) * 100) / 100}%` :
    'N/A'
  }
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <div className="text-slate-300 text-sm">Unread</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {notifications.filter(n => !n.read).length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg rounded-2xl border border-pink-500/20 shadow-2xl mb-8">
        <div className="flex border-b border-pink-500/20">
          {[
            { id: 'bundles', label: 'My Bundles'},
            { id: 'investments', label: 'My Investments'},
            { id: 'notifications', label: 'Notifications'},
            { id: 'settings', label: 'Settings'},
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-500/10'
                  : 'text-slate-400 hover:text-pink-300 hover:bg-pink-500/5'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* My Bundles Tab */}
          {activeTab === 'bundles' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">My Created Bundles</h2>
              </div>
              
              {myBundles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-300 text-lg mb-4">No bundles created yet</div>
                  <button className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-orange-600 transition-all duration-500 shadow-2xl hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20">
                    Create Your First Bundle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {myBundles.map((bundle) => (
                    <div key={bundle.id} className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg border border-pink-500/20 rounded-xl p-6 hover:shadow-pink-500/25 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{bundle.name}</h3>
                          <p className="text-pink-400 font-medium">{bundle.symbol}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">${bundle.totalValue.toLocaleString()}</div>
                          <div className={`text-sm font-medium ${bundle.performance > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {bundle.performance > 0 ? '+' : ''}{bundle.performance}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-slate-300 mb-2">Assets:</div>
                        <div className="flex flex-wrap gap-2">
                          {bundle.assets.map((asset) => (
                            <span key={asset} className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs font-medium backdrop-blur-sm border border-pink-400/30">
                              {asset}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-pink-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20">
                          Manage
                        </button>
                        <button className="flex-1 bg-slate-700/60 text-white py-2 px-4 rounded-lg font-medium hover:bg-slate-600/80 transition-all duration-300 backdrop-blur-sm border border-slate-500/30">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Investments Tab */}
          {activeTab === 'investments' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">My Investments</h2>
              
              {myInvestments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-300 text-lg mb-4">No investments yet</div>
                  <button className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-orange-600 transition-all duration-500 shadow-2xl hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20">
                    Explore Bundles
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {myInvestments.map((investment) => (
                    <div key={investment.id} className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg border border-pink-500/20 rounded-xl p-6 hover:shadow-pink-500/25 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{investment.name}</h3>
                          <p className="text-pink-400 font-medium">{investment.symbol}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">${investment.totalValue.toLocaleString()}</div>
                          <div className={`text-sm font-medium ${investment.performance > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {investment.performance > 0 ? '+' : ''}{investment.performance}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-slate-300 mb-2">Your Shares: {investment.shares.toLocaleString()}</div>
                        <div className="text-sm text-slate-300">Assets:</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {investment.assets.map((asset) => (
                            <span key={asset} className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs font-medium backdrop-blur-sm border border-pink-400/30">
                              {asset}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-pink-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-pink-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-400/20">
                          Invest More
                        </button>
                        <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-red-400/20">
                          Withdraw
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>
              
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-300 text-lg">No notifications</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`flex items-start gap-4 p-4 rounded-lg border backdrop-blur-sm ${
                      notification.read ? 'border-slate-500/30 bg-slate-700/30' : 'border-pink-500/30 bg-pink-500/10'
                    }`}>
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        notification.read ? 'bg-slate-400' : 'bg-pink-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-white mb-1">{notification.message}</p>
                        <p className="text-sm text-slate-300">{notification.timestamp}</p>
                      </div>
                      {!notification.read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-pink-400 hover:text-pink-300 text-sm font-medium transition-colors duration-300"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Bundles Tab */}
          {activeTab === 'allbundles' && !loading && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">All Bundles ({allBundles.length})</h2>
              
              {allBundles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-300 text-lg mb-4">No bundles deployed yet</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {allBundles.map((bundle) => (
                    <div key={bundle.address} className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6 hover:shadow-purple-500/25 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{bundle.name}</h3>
                          <p className="text-purple-400 font-medium">{bundle.symbol}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            By: {bundle.creator.slice(0, 6)}...{bundle.creator.slice(-4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">${parseFloat(bundle.nav).toFixed(4)}</div>
                          <div className="text-xs text-slate-300">NAV</div>
                          <div className="text-sm text-purple-300 mt-1">
                            {parseFloat(bundle.totalSupply).toFixed(2)} shares
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-slate-300 mb-2">Components ({bundle.components.length}):</div>
                        <div className="flex flex-wrap gap-1">
                          {bundle.components.slice(0, 3).map((component) => (
                            <span key={component.token} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium backdrop-blur-sm border border-purple-400/30">
                              {component.symbol}
                            </span>
                          ))}
                          {bundle.components.length > 3 && (
                            <span className="px-2 py-1 bg-slate-500/20 text-slate-300 rounded-full text-xs font-medium backdrop-blur-sm">
                              +{bundle.components.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 px-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-purple-400/20 text-sm">
                          Invest
                        </button>
                        <button className="flex-1 bg-slate-700/60 text-white py-2 px-3 rounded-lg font-medium hover:bg-slate-600/80 transition-all duration-300 backdrop-blur-sm border border-slate-500/30 text-sm">
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-slate-800/80 to-pink-800/80 backdrop-blur-lg border border-pink-500/20 rounded-xl p-6 shadow-2xl">
                  <h3 className="text-lg font-semibold text-white mb-4">Wallet Management</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Connected Wallet</span>
                      <span className="text-pink-400 font-medium">
                        {connector?.name || 'Unknown Wallet'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Network</span>
                      <span className="text-pink-400 font-medium">Berachain</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 