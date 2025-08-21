import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig, chains } from './wallet-config';
import WalletConnect from './components/WalletConnect';
import CreateBundle from './components/CreateBundle';
import Dashboard from './components/Dashboard';
import InfluencerProfiles from './components/InfluencerProfiles';
import '@rainbow-me/rainbowkit/styles.css';
import { FaHome } from 'react-icons/fa';

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

interface BundleStats {
  totalBundles: number;
  uniqueUsers: number;
  uniqueCashtags: number;
  conversationBundles: number;
  singleTweetBundles: number;
  mostPopularCashtags: Array<{ cashtag: string; count: number }>;
  recentBundles: CompletedBundle[];
}

//const apiKey = process.env.COINAPI_API_KEY; // Replace with your actual CoinAPI key


const BundlesDisplay: React.FC = () => {
  const [bundles, setBundles] = useState<CompletedBundle[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<CompletedBundle[]>([]);
  const [stats, setStats] = useState<BundleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showCashtagDropdown, setShowCashtagDropdown] = useState(false);
  const [selectedCashtags, setSelectedCashtags] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'bundles' | 'create' | 'dashboard' | 'influencers'>('home');
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: {price: number, change: number}}>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const API_BASE = 'http://localhost:3002/api';
  const WS_BASE = 'http://localhost:3002';

  // Get real price for a cryptocurrency using CoinGecko (no API key required)
  const getPrice = async (baseAsset: string, quoteAsset: string = 'usd') => {
    try {
      // Convert common symbols to CoinGecko IDs
      const symbolMap: {[key: string]: string} = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'AVAX': 'avalanche-2',
        'DOGE': 'dogecoin',
        'SHIB': 'shiba-inu',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOT': 'polkadot',
        'LINK': 'chainlink',
        'UNI': 'uniswap',
        'MATIC': 'matic-network',
        'LTC': 'litecoin',
        'BCH': 'bitcoin-cash',
        'XLM': 'stellar',
        'XMR': 'monero',
        'ATOM': 'cosmos',
        'NEAR': 'near',
        'FTM': 'fantom',
        'ALGO': 'algorand',
        'VET': 'vechain',
        'THETA': 'theta-token',
        'FIL': 'filecoin',
        'ICP': 'internet-computer',
        'APT': 'aptos',
        'SUI': 'sui',
        'OP': 'optimism',
        'ARB': 'arbitrum',
        'INJ': 'injective-protocol',
        'TIA': 'celestia'
      };
      
      const coinId = symbolMap[baseAsset.toUpperCase()] || baseAsset.toLowerCase();
      const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${quoteAsset}&include_24hr_change=true`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const priceData = data[coinId];
      
      if (priceData && priceData[quoteAsset]) {
        return {
          price: priceData[quoteAsset],
          change: priceData[`${quoteAsset}_24h_change`] || 0
        };
      }
      
      throw new Error('Price data not found');
    } catch (error) {
      console.error('Error fetching price:', error);
      // Fallback to mock data if API fails
      return {
        price: Math.random() * 100 + 1,
        change: Math.random() * 20 - 10
      };
    }
  };

  // Get price for a cashtag (remove $ symbol)
  const getCashtagPrice = (cashtag: string) => {
    const symbol = cashtag.replace('$', '');
    return getPrice(symbol, 'usd');
  };

  // Fetch and cache prices for all cashtags
  const fetchAllPrices = async () => {
    if (bundles.length === 0) return;
    
    const allCashtags = [...new Set(bundles.flatMap(bundle => bundle.bundle))];
    const pricePromises = allCashtags.map(async (cashtag) => {
      const symbol = cashtag.replace('$', '');
      const priceData = await getPrice(symbol, 'usd');
      return { cashtag, price: priceData.price, change: priceData.change };
    });
    
    try {
      const priceResults = await Promise.all(pricePromises);
      const priceMap: {[key: string]: {price: number, change: number}} = {};
      priceResults.forEach(({ cashtag, price, change }) => {
        priceMap[cashtag] = { price, change };
      });
      setCryptoPrices(priceMap);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  // Get cached price or fallback
  const getCachedPrice = (cashtag: string) => {
    const cachedData = cryptoPrices[cashtag];
    if (cachedData) {
      return `$${cachedData.price.toFixed(2)}`;
    }
    return `$${(Math.random() * 100 + 1).toFixed(2)}`;
  };

  // Get cached price change or fallback
  const getCachedChange = (cashtag: string) => {
    const cachedData = cryptoPrices[cashtag];
    if (cachedData) {
      return cachedData.change;
    }
    return Math.random() * 20 - 10; // Random change between -10 and +10
  };

  // Calculate real bundle performance from cached data
  const getBundlePerformance = (bundle: CompletedBundle) => {
    const changes = bundle.bundle.map(cashtag => getCachedChange(cashtag));
    if (changes.length === 0) return 0;
    
    // Calculate average performance of all assets in the bundle
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return avgChange;
  };

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCashtagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(WS_BASE);
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });
    
    newSocket.on('bundles-updated', (data: { bundles: CompletedBundle[], stats: BundleStats }) => {
      console.log('Received real-time bundle update');
      setBundles(data.bundles);
      setStats(data.stats);
      setLastUpdate(new Date());
      setLoading(false);
      fetchAllPrices(); // Update prices when bundles change
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/bundles`);
      const data = await response.json();
      if (data.success) {
        setBundles(data.data);
      } else {
        setError('Failed to fetch bundles');
      }
    } catch (err) {
      setError('Error connecting to API server');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const filterBundlesByCashtags = () => {
    if (selectedCashtags.length === 0) {
      setFilteredBundles([]);
      return;
    }
    const filtered = bundles.filter(bundle => 
      bundle.bundle.some(cashtag => selectedCashtags.includes(cashtag))
    );
    setFilteredBundles(filtered);
  };

  const filterBundlesByUsername = () => {
    if (!selectedUsername.trim()) {
      setFilteredBundles([]);
      setUsernameError('Please enter a username to search.');
      return;
    }
    
    const filtered = bundles.filter(bundle => 
      bundle.originalUsername.toLowerCase().includes(selectedUsername.toLowerCase())
    );
    
    if (filtered.length === 0) {
      setUsernameError(`This user hasn't created any bundles yet`);
      setFilteredBundles([]);
      } else {
      setFilteredBundles(filtered);
      setUsernameError('');
    }
  };

  const toggleBundleExpansion = (bundleId: string) => {
    const newExpanded = new Set(expandedBundles);
    if (newExpanded.has(bundleId)) {
      newExpanded.delete(bundleId);
    } else {
      newExpanded.add(bundleId);
    }
    setExpandedBundles(newExpanded);
  };

  useEffect(() => {
    fetchBundles();
    fetchStats();
  }, []);

  // Fetch prices when bundles change
  useEffect(() => {
    if (bundles.length > 0) {
      fetchAllPrices();
    }
  }, [bundles]);

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


  if (loading && bundles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-lg text-blue-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={fetchBundles}
            className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Home Page View
  if (currentView === 'home') {
  return (
      <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 border-b border-emerald-700 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
                <h1 className="text-3xl font-bold text-white">MyAssetsFun</h1>
              </div>
              <WalletConnect/>
            </div>
          </div>

          {/* Full Screen Hero Section */}
          <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-green-400/20 to-teal-400/20">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `radial-gradient(circle at 30px 30px, rgba(255,255,255,0.1) 2px, transparent 2px)`,
                backgroundSize: '60px 60px'
              }}></div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-300/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-green-300/30 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-teal-300/30 rounded-full blur-xl animate-pulse delay-2000"></div>
            
            {/* Hero Content */}
            <div className="relative z-10 text-center px-6 py-40">
              
              <h1 className="text-6xl lg:text-8xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-12" style={{ lineHeight: '1.1' }}>
                Assets are more fun<br />together!
              </h1>
              
              
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => setCurrentView('influencers')}
                  className="group bg-gradient-to-r from-emerald-500 to-green-500 text-white px-10 py-5 rounded-2xl text-xl font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <span className="flex items-center gap-3">
                    <span>Explore Bundles</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </button>
                
                <button
                  onClick={() => setCurrentView('create')}
                  className="group bg-white text-emerald-600 border-2 border-emerald-200 px-10 py-5 rounded-2xl text-xl font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="flex items-center gap-3">
                    <span>Create Bundle</span>
                    <span className="group-hover:rotate-90 transition-transform">+</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Scroll to discover indicator */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-gray-700 animate-bounce">
              <p className="text-lg">Scroll to discover</p>
              <svg className="w-6 h-6 mx-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </div>

          {/* Learn More Section - Appears on Scroll */}
          <div className="bg-white py-20">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-bold text-gray-800 text-center mb-12">Why Bundle Assets?</h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8">
                <p>
                  Cryptocurrency bundling represents a revolutionary approach to digital asset investment that combines the power of diversification with the simplicity of single-transaction investing. When you bundle assets, you're essentially creating a miniature portfolio within a single investment vehicle, allowing you to gain exposure to multiple cryptocurrencies without the complexity of managing individual positions.
                </p>
                
                <p>
                  The primary advantage of bundling lies in its ability to reduce risk through strategic diversification. By combining complementary assets—such as established Layer 1 blockchains, emerging DeFi protocols, and stablecoins—you create a balanced portfolio that can weather market volatility more effectively than any single asset. When one cryptocurrency experiences a downturn, others in your bundle may remain stable or even appreciate, helping to cushion your overall investment.
                </p>
                
                <p>
                  Beyond risk management, bundling offers significant practical benefits for both novice and experienced investors. For newcomers to the crypto space, bundles provide a curated entry point that eliminates the overwhelming task of researching hundreds of individual tokens. Instead of making dozens of separate investment decisions, you can rely on proven combinations or create your own strategic allocations based on your investment goals and risk tolerance.
                </p>
                
                <p>
                  Experienced investors benefit from the operational efficiency that bundling provides. Managing multiple individual positions requires constant monitoring, rebalancing, and transaction management—all of which incur time costs and trading fees. Bundles streamline this process by allowing you to maintain your desired asset allocation through a single, cohesive investment that automatically maintains your target weights through periodic rebalancing.
                </p>
                
                <p>
                  The strategic allocation capabilities of bundling are particularly valuable in the dynamic cryptocurrency market. You can create bundles that target specific sectors—such as DeFi protocols, gaming tokens, or infrastructure projects—or design portfolios that balance high-growth potential assets with more stable, established cryptocurrencies. This flexibility allows you to align your investments with your market outlook and personal investment philosophy.
                </p>
                
                <p>
                  Cost efficiency is another compelling reason to embrace bundling. Traditional approaches to building a diversified crypto portfolio often involve numerous transactions, each carrying network fees, exchange fees, and potential slippage costs. Bundling consolidates these costs into a single transaction, potentially saving significant amounts on fees while also reducing the complexity of tracking multiple positions across different platforms.
                </p>
                
                <p>
                  Finally, bundling fosters a collaborative investment community where knowledge and strategies can be shared transparently. When experienced traders and analysts create bundles, they're essentially sharing their market insights and portfolio strategies with the broader community. This democratization of investment expertise allows less experienced investors to benefit from proven approaches while learning about effective portfolio construction techniques.
                </p>
      </div>

              <div className="text-center mt-16">
                <button
                  onClick={() => setCurrentView('bundles')}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-12 py-4 rounded-2xl text-lg font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Start Exploring Bundles
                </button>
              </div>
            </div>
          </div>
        </div>
      </RainbowKitProvider>
      </WagmiConfig>
    );
  }

  // Bundles Page View
  return (
    
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 border-b border-emerald-700 px-6 py-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">MyAssetsFun</h1>
              </div>
              <div className="flex items-center gap-4">
              <button
                  onClick={() => setCurrentView('home')}
                  className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                 <div>
                  <FaHome />
                </div>
              </button>
                <WalletConnect />

              </div>
            </div>
          </div>

          {/* Navigation */}

          <div className="bg-white border-b border-emerald-100">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex space-x-8">
              <button
                  onClick={() => setCurrentView('influencers')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    currentView === 'influencers'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Influencers
                </button>
                <button
                  onClick={() => setCurrentView('bundles')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    currentView === 'bundles'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Bundles
                </button>
               
                <button
                  onClick={() => setCurrentView('create')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    currentView === 'create'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create Bundle
                </button>
                
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    currentView === 'dashboard'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
                
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto p-6">
            {currentView === 'bundles' && (
              <>
                {/* Bundles Header */}
                <div className="max-w-7xl mx-auto p-6">
                  <div className="mb-8">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
                    All Bundles
                  </h1>
                  <p className="text-xl text-gray-600">Discover all created bundles</p>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-xl border border-emerald-100 p-8 shadow-lg mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    Filter Bundles
                  </h3>
                  <div className="space-y-8">
                    {/* Combined Search Filter */}
                    <div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-emerald-300 transition-colors text-gray-900"
                            value={selectedUsername}
                            onChange={(e) => setSelectedUsername(e.target.value)}
                            placeholder="Search by username (e.g., cryptotrader) or currency (e.g., $BTC, $ETH)"
                          />
                        </div>
                       
                        <button
                          onClick={() => {
                            const searchTerm = selectedUsername.trim();
                            if (searchTerm.startsWith('$')) {
                              // Search by currency
                              setSelectedCashtags([searchTerm]);
                              filterBundlesByCashtags();
                            } else {
                              // Search by username
                              filterBundlesByUsername();
                            }
                          }}
                          disabled={!selectedUsername.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed whitespace-nowrap font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                          Search
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUsername('');
                            setSelectedCashtags([]);
                            setFilteredBundles([]);
                            setUsernameError('');
                            setShowCashtagDropdown(false);
                          }}
                          className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300 whitespace-nowrap font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                          Show All
                        </button>
                      </div>
                      
                      {usernameError && (
                        <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {usernameError}
                        </div>
                      )}
                      
                      {selectedCashtags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedCashtags.map((cashtag) => (
                            <span
                              key={cashtag}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 rounded-full text-sm font-medium border border-emerald-200"
                            >
                              {cashtag}
                              <button
                                onClick={() => {
                                  setSelectedCashtags(selectedCashtags.filter(tag => tag !== cashtag));
                                  if (selectedCashtags.length === 1) {
                                    setFilteredBundles([]);
                                  }
                                }}
                                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200 rounded-full w-5 h-5 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                    </div>
                      )}
                    </div>
                  </div>
                        </div>

                {/* Bundles Display Section */}
                <div className="mb-8">
                  {filteredBundles.length > 0 && (
                    <div className="mb-6 text-center">
                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 px-6 py-3 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-lg font-medium">
                          {selectedCashtags.length > 0 && selectedUsername.trim() !== '' 
                            ? `Showing bundles with ${selectedCashtags.join(', ')} and username "${selectedUsername}"`
                            : selectedCashtags.length > 0 
                              ? `Showing bundles with ${selectedCashtags.join(', ')}`
                              : `Showing bundles from username "${selectedUsername}"`
                          }
                        </span>
                          </div>
                        </div>
                  )}
                  
                  {(filteredBundles.length > 0 ? filteredBundles : bundles).filter(bundle => bundle.bundle.length > 1).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📦</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-700 mb-3">No multi-currency bundles found</div>
                      <p className="text-gray-500 text-lg">
                        {filteredBundles.length > 0 
                          ? `No bundles with multiple currencies match your criteria`
                          : 'Start creating crypto bundles with multiple currencies to see them here!'
                        }
                      </p>
                  </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                      {(filteredBundles.length > 0 ? filteredBundles : bundles)
                        .filter(bundle => bundle.bundle.length > 1) // Only show bundles with more than one currency
                        .slice(0, 6).map((bundle) => (
                        <div key={bundle.id} className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                          {/* Bundle Header */}
                          <div className="flex items-start justify-between mb-6">
                            <a 
                              href={`https://twitter.com/${bundle.originalUsername}/status/${bundle.originalTweetId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-800 hover:text-emerald-800 text-xl font-bold transition-colors"
                            >
                              Bundle from @{bundle.originalUsername}
                            </a>
                  </div>

                  {/* Summary Stats */}
                          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                    <div>
                              <div className="text-gray-600 text-sm font-medium">Total Value</div>
                              <div className="text-2xl font-bold text-gray-900">
                                ${bundle.bundle.reduce((total, cashtag) => {
                                  const cachedPrice = cryptoPrices[cashtag];
                                  if (cachedPrice) {
                                    return total + cachedPrice.price;
                                  }
                                  return total + (Math.random() * 100 + 1);
                                }, 0).toFixed(2)}
                              </div>
                              <button
                                onClick={() => toggleBundleExpansion(bundle.id)}
                                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-sm font-medium mt-2 transition-colors"
                              >
                                {expandedBundles.has(bundle.id) ? (
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
                              <div className={`text-2xl font-bold ${getBundlePerformance(bundle) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {getBundlePerformance(bundle) > 0 ? '+' : ''}{getBundlePerformance(bundle).toFixed(1)}%
                              </div>
                    </div>
                  </div>

                          {/* Collapsible Asset List */}
                          {expandedBundles.has(bundle.id) && (
                            <div className="space-y-4 mb-6">
                              {bundle.bundle.map((cashtag, index) => {
                                const cachedData = cryptoPrices[cashtag];
                                const price = cachedData ? cachedData.price : Math.random() * 100 + 1;
                                const change = cachedData ? cachedData.change : Math.random() * 20 - 10;
                                
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-gray-900 text-lg">{cashtag}</span>
                                      <span className="text-emerald-600 text-sm font-medium bg-white px-2 py-1 rounded-full">({Math.round(100 / bundle.bundle.length)}%)</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-gray-900 font-medium">${price.toFixed(2)}</div>
                                      <div className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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
                
              ))}
            </div>
            
          )}
        </div>
        
        </div>
              </>
            )}
            {currentView === 'create' && <CreateBundle />}
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'influencers' && <InfluencerProfiles />}
          </div>
        </div>
        
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default BundlesDisplay;


