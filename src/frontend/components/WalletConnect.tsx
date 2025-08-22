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
                      className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-500 hover:to-pink-600 transition-all duration-500 shadow-lg hover:shadow-pink-400/40 transform hover:-translate-y-1 backdrop-blur-sm border border-pink-300/30"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (connectedChain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors backdrop-blur-sm border border-red-400/20"
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
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-900/80 to-pink-800/80 backdrop-blur-lg border border-pink-400/30 px-4 py-2 rounded-lg hover:border-pink-300/60 transition-all duration-300 shadow-lg hover:shadow-pink-400/30"
                      >
                        <div className="w-3 h-3 rounded-full bg-pink-300"></div>
                        <span className="text-sm font-medium text-white">
                          {connectedChain.name}
                        </span>
                        <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showNetworkSelector && (
                        <div className="absolute right-0 mt-2 w-48 bg-gradient-to-r from-pink-900/90 to-pink-800/90 backdrop-blur-lg border border-pink-400/30 rounded-lg shadow-2xl z-[9999]">
                          <div className="p-2">
                            {chains.map((chainOption) => (
                              <button
                                key={chainOption.id}
                                onClick={() => {
                                  switchChain({ chainId: chainOption.id });
                                  setShowNetworkSelector(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-all duration-300 ${
                                  chainOption.id === connectedChain.id 
                                    ? 'bg-pink-400/30 text-pink-200 border border-pink-300/40' 
                                    : 'text-slate-200 hover:text-white hover:bg-pink-800/60'
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
                      className="flex items-center gap-3 bg-gradient-to-r from-pink-900/80 to-pink-800/80 backdrop-blur-lg border border-pink-400/30 px-4 py-3 rounded-lg hover:border-pink-300/60 transition-all duration-300 shadow-lg hover:shadow-pink-400/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {account.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">
                            {account.displayName}
                          </div>
                          <div className="text-xs text-slate-200">
                            {account.address.slice(0, 6)}...{account.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </button>

                    
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