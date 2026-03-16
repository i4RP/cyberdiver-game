import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { polygon } from 'viem/chains'
import './index.css'
import App from './App.tsx'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'cmmshzs2101xb0ckz9fo85zkt';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed - app works without it
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00e5ff',
        },
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord', 'telegram'],
        defaultChain: polygon,
        supportedChains: [polygon],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
