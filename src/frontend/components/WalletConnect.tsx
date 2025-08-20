import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';

const WalletConnect: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);

  // Get balances for common tokens
  const { data: beraBalance } = useBalance({
    address,
  });

  const { data: usdcBalance } = useBalance({
    address,
    token: '0xA0b86a33E6441b8c4C8D8c4C8c4C8c4C8c4C8c4C', // Replace with actual USDC contract
  });

  return (
    <div className="relative">
      <ConnectButton.Custom>
        {({
          account,
          chain: connectedChain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && connectedChain;

          return (
            <div className="flex items-center gap-3">
              {(() => {
                if (!ready) {
                  return null;
                }

                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (connectedChain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-3">
                    {/* Network Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowNetworkSelector(!showNetworkSelector)}
                        className="flex items-center gap-2 bg-white border border-emerald-200 px-4 py-2 rounded-lg hover:border-emerald-300 transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {connectedChain.name}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showNetworkSelector && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-emerald-200 rounded-lg shadow-xl z-50">
                          <div className="p-2">
                            {chains.map((chainOption) => (
                              <button
                                key={chainOption.id}
                                onClick={() => {
                                  switchChain({ chainId: chainOption.id });
                                  setShowNetworkSelector(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-emerald-50 transition-colors ${
                                  chainOption.id === connectedChain.id ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700'
                                }`}
                              >
                                {chainOption.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wallet Info */}
                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-3 bg-white border border-emerald-200 px-4 py-3 rounded-lg hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {account.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">
                            {account.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.address.slice(0, 6)}...{account.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Balances */}
                    {isConnected && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">
                          {beraBalance ? `${parseFloat(beraBalance.formatted).toFixed(4)} BERA` : '...'}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="font-medium">
                          {usdcBalance ? `${parseFloat(usdcBalance.formatted).toFixed(2)} USDC` : '...'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
};

export default WalletConnect; 