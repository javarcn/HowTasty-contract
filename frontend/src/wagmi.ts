import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com/' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'HowTasty',
  projectId: 'YOUR_PROJECT_ID', 
  chains: [monadTestnet],
  ssr: true,
});
