import React, { useState, useEffect } from 'react';

interface CompletedBundle {
  id: string;
  originalTweetId: string;
  originalUsername: string;
  originalCashtag: string;
  bundle: string[];
  completedAt: string;
  conversationType: 'single_tweet' | 'conversation';
  tweetText?: string;
}

interface Influencer {
  username: string;
  bundleCount: number;
  totalBundles: CompletedBundle[];
  lastActive: string;
  avgBundleSize: number;
  totalAssets: string[];
  uniqueAssets: string[];
}

const InfluencerProfiles: React.FC = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<CompletedBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  // Fetch completed bundles and process influencers
  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3002/api/bundles');
        if (response.ok) {
          const responseData = await response.json();
          const data: CompletedBundle[] = responseData.data || responseData; // Handle both formats
          
          console.log('Fetched bundles:', data); // Debug log
          
          // Process influencers from completed bundles - get ALL unique usernames
          const influencerMap = new Map<string, CompletedBundle[]>();
          
          data.forEach((bundle: CompletedBundle) => {
            // Only include bundles with more than 1 asset
            if (bundle.bundle.length > 1) {
              const username = bundle.originalUsername;
              if (!influencerMap.has(username)) {
                influencerMap.set(username, []);
              }
              influencerMap.get(username)!.push(bundle);
            }
          });
          
          console.log('Influencer map:', influencerMap); // Debug log
          
          // Convert to influencer array with additional stats
          const influencerArray: Influencer[] = Array.from(influencerMap.entries()).map(([username, bundles]) => {
            const allAssets = bundles.flatMap(b => b.bundle);
            const uniqueAssets = Array.from(new Set(allAssets));
            
            return {
              username,
              bundleCount: bundles.length,
              totalBundles: bundles,
              lastActive: new Date(Math.max(...bundles.map(b => new Date(b.completedAt).getTime()))).toISOString(),
              avgBundleSize: bundles.reduce((sum, b) => sum + b.bundle.length, 0) / bundles.length,
              totalAssets: allAssets,
              uniqueAssets: uniqueAssets
            };
          });
          
          console.log('Influencer array:', influencerArray); // Debug log
          
          // Sort by bundle count (most active first)
          influencerArray.sort((a, b) => b.bundleCount - a.bundleCount);
          setInfluencers(influencerArray);
        }
      } catch (error) {
        console.error('Error fetching influencers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencers();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${diffInDays} days ago`;
  };

  // Mock data for bundle details (in real app, this would come from API)
  const getBundleDetails = (bundle: CompletedBundle) => {
    const assetAllocation = 100 / bundle.bundle.length; // Equal allocation
    const mockPrices = {
      '$HOOD': 86.12,
      '$BTC': 4314.72,
      '$ETH': 2456.89,
      '$COIN': 0.04,
      '$HYPE': 12.34,
      '$AUSD': 1.00
    };
    const mockPerformance = {
      '$HOOD': 0.9,
      '$BTC': 3.3,
      '$ETH': 3.2,
      '$COIN': 0.0,
      '$HYPE': 2.1,
      '$AUSD': 0.1
    };

    const assets = bundle.bundle.map(asset => ({
      ticker: asset,
      allocation: assetAllocation,
      value: mockPrices[asset as keyof typeof mockPrices] || Math.random() * 100 + 1,
      performance: mockPerformance[asset as keyof typeof mockPerformance] || (Math.random() * 10 - 5)
    }));

    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const avgPerformance = assets.reduce((sum, asset) => sum + asset.performance, 0) / assets.length;

    return { assets, totalValue, avgPerformance };
  };

  // Toggle function for bundle expansion
  const toggleBundleExpansion = (bundleId: string) => {
    const newExpanded = new Set(expandedBundles);
    if (newExpanded.has(bundleId)) {
      newExpanded.delete(bundleId);
    } else {
      newExpanded.add(bundleId);
    }
    setExpandedBundles(newExpanded);
  };

  const BundleDetailView: React.FC<{ bundle: CompletedBundle }> = ({ bundle }) => {
    const { assets, totalValue, avgPerformance } = getBundleDetails(bundle);
    const bundleName = bundle.bundle.slice(0, 2).join(' + ') + ' Bundle';

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedBundle(null)}
            className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-2"
          >
            ← Back to Bundles
          </button>
        </div>

        {/* Bundle Header */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-lg mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{bundleName}</h1>
          <a 
            href={`https://twitter.com/${bundle.originalUsername}/status/${bundle.originalTweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-800 font-medium"
          >
            View Original Tweet from @{bundle.originalUsername}
          </a>
        </div>

        {/* Individual Assets */}
        <div className="space-y-4 mb-6">
          {assets.map((asset, index) => (
            <div key={index} className="bg-white border border-emerald-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">{asset.ticker}</h3>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                    ({asset.allocation.toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Current Value</div>
                  <div className="text-2xl font-bold text-gray-900">${asset.value.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">24h Performance</div>
                  <div className={`text-2xl font-bold ${asset.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {asset.performance >= 0 ? '+' : ''}{asset.performance.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bundle Summary */}
        <div className="bg-white border border-emerald-200 rounded-xl p-8 mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Value</div>
              <div className="text-4xl font-bold text-gray-900">${totalValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Performance</div>
              <div className={`text-4xl font-bold ${avgPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgPerformance >= 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Buy Bundle Button */}
        <button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-green-700 transition-all transform hover:scale-105">
          Buy Bundle
        </button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-4 text-emerald-600">
          <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
          <span className="text-sm font-medium">Today</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading influencer profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
          All Twitter Users
        </h1>
        <p className="text-xl text-gray-600">Discover your favorite influencers and their bundles</p>
      </div>

      {selectedBundle ? (
        // Show detailed bundle view
        <BundleDetailView bundle={selectedBundle} />
      ) : selectedInfluencer ? (
        // Show specific user's bundles (like username filter)
        <div>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedInfluencer(null)}
              className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-2"
            >
              ← Back to All Users
            </button>
          </div>
          
          {(() => {
            const influencer = influencers.find(inf => inf.username === selectedInfluencer);
            if (!influencer) return null;
            
            return (
              <div>
                {/* User Profile Header */}
                <div className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-lg mb-8">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {influencer.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                    
                      <h2 className="text-3xl font-bold text-gray-900">@{influencer.username}</h2>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{influencer.bundleCount}</div>
                      <div className="text-sm text-gray-600">Total Bundles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{influencer.avgBundleSize.toFixed(1)}</div>
                      <div className="text-sm text-gray-600">Avg Bundle Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{influencer.uniqueAssets.length}</div>
                      <div className="text-sm text-gray-600">Unique Assets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{formatDate(influencer.lastActive)}</div>
                      <div className="text-sm text-gray-600">Last Active</div>
                    </div>
                  </div>
                </div>

                
                {influencer.totalBundles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg">No bundles found for this user</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {influencer.totalBundles.map((bundle) => {
                      const { totalValue } = getBundleDetails(bundle);
                      const isExpanded = expandedBundles.has(bundle.id);
                      return (
                        <div key={bundle.id} className="bg-white border border-emerald-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                          {/* Bundle Header */}
                          <div className="flex items-start justify-between mb-6">
                            <a 
                              href={`https://twitter.com/${bundle.originalUsername}/status/${bundle.originalTweetId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-xl font-bold transition-colors"
                            >
                              Bundle from @{bundle.originalUsername}
                            </a>
                          </div>

                          {/* Summary Stats */}
                          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                            <div>
                              <div className="text-gray-600 text-sm font-medium">Total Value</div>
                              <div className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</div>
                              <button
                                onClick={() => toggleBundleExpansion(bundle.id)}
                                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-sm font-medium mt-2 transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Hide Assets</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <span>Show Assets</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-600 text-sm font-medium">Performance</div>
                              <div className={`text-2xl font-bold ${getBundleDetails(bundle).avgPerformance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {getBundleDetails(bundle).avgPerformance > 0 ? '+' : ''}{getBundleDetails(bundle).avgPerformance.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Asset List */}
                          {isExpanded && (
                            <div className="space-y-4 mb-6">
                              {getBundleDetails(bundle).assets.map((asset, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900 text-lg">{asset.ticker}</span>
                                    <span className="text-emerald-600 text-sm font-medium bg-white px-2 py-1 rounded-full">({asset.allocation.toFixed(0)}%)</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-gray-900 font-medium">${asset.value.toFixed(2)}</div>
                                    <div className={`text-sm ${asset.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {asset.performance >= 0 ? '+' : ''}{asset.performance.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Button */}
                          <button className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-300 mb-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                            Buy Bundle
                          </button>

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 text-gray-500 text-sm justify-center">
                            <span className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"></span>
                            <span>{formatDate(bundle.completedAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        // Show all users (like username filter but with profiles)
        <div>
          {influencers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👥</span>
              </div>
              <div className="text-2xl font-bold text-gray-700 mb-3">No users found</div>
              <p className="text-gray-500 text-lg">Users will appear here as they create bundles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {influencers.map((influencer) => (
                <div 
                  key={influencer.username} 
                  className="bg-white border border-emerald-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer transform hover:-translate-y-1"
                  onClick={() => setSelectedInfluencer(influencer.username)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {influencer.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">@{influencer.username}</h3>
                      <p className="text-emerald-600 font-medium">{influencer.bundleCount} bundles</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                  </div>

                  {/* Top Assets */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {influencer.uniqueAssets.slice(0, 5).map((asset) => (
                        <span key={asset} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                          {asset}
                        </span>
                      ))}
                      {influencer.uniqueAssets.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          +{influencer.uniqueAssets.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <button className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                    View All Bundles
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InfluencerProfiles; 