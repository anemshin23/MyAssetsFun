import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, zora, Chain } from 'wagmi/chains';
import { createPublicClient } from 'viem';

// Berachain configuration (you'll need to add this)
const berachain: Chain = {
  id: 80069, // Replace with actual Berachain chain ID
  name: 'Berachain',
  nativeCurrency: {
    decimals: 18,
    name: 'BERA',
    symbol: 'BERA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.berachain.com'] }, // Replace with actual RPC
    public: { http: ['https://rpc.berachain.com'] },
  },
  blockExplorers: {
    default: { name: 'Berachain Explorer', url: 'https://explorer.berachain.com' },
  },
};

const chains = [
  berachain, // Berachain as primary
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
] as const;

const { connectors } = getDefaultWallets({
  appName: 'MyAssetsFun',
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
});

const publicClient = createPublicClient({
  chain: berachain,
  transport: http(),
});

const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [berachain.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [zora.id]: http(),
  },
});

export { wagmiConfig, chains, RainbowKitProvider }; 