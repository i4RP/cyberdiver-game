import { useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameStore } from './stores/gameStore';
import api from './services/api';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import MatchmakingPage from './pages/MatchmakingPage';
import BriefingPage from './pages/BriefingPage';
import ResultsPage from './pages/ResultsPage';
import EconomyPage from './pages/EconomyPage';
import GameScene from './game/GameScene';
import OrientationLock from './components/OrientationLock';

function App() {
  const screen = useGameStore((s) => s.screen);
  const setUser = useGameStore((s) => s.setUser);
  const setScreen = useGameStore((s) => s.setScreen);
  const { ready, authenticated, user: privyUser, getAccessToken } = usePrivy();

  const syncWithBackend = useCallback(async () => {
    if (!authenticated || !privyUser) return;

    try {
      // First try existing stored token for fast resume
      const existingToken = api.getToken();
      if (existingToken) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
          setScreen('lobby');
          return;
        } catch {
          // Stored token expired, re-authenticate below
        }
      }

      const privyToken = await getAccessToken();
      if (!privyToken) return;

      const result = await api.privyAuth(privyToken);
      api.setToken(result.access_token);
      const profile = await api.getProfile();
      setUser(profile);
      setScreen('lobby');
    } catch (err) {
      console.error('Backend sync failed:', err);
      // Still allow access to lobby even if backend sync fails
      setUser({
        id: privyUser.id,
        username: privyUser.email?.address || privyUser.wallet?.address || privyUser.id.slice(0, 12),
        display_name: privyUser.email?.address || privyUser.wallet?.address?.slice(0, 10) || 'Player',
        is_guest: false,
        rank: 'ROOKIE',
        total_bp: 0,
        wallet_address: privyUser.wallet?.address || null,
        wallet_balance_matic: null,
        created_at: new Date().toISOString(),
      });
      setScreen('lobby');
    }
  }, [authenticated, privyUser, getAccessToken, setUser, setScreen]);

  // Sync with backend when Privy auth state changes
  useEffect(() => {
    if (ready && authenticated && privyUser) {
      syncWithBackend();
    } else if (ready && !authenticated) {
      // Dev mode: ?mobile=1&dev=1 skips auth for mobile testing
      const params = new URLSearchParams(window.location.search);
      if (params.get('dev') === '1') {
        setUser({
          id: 'dev-user',
          username: 'DevTester',
          display_name: 'DevTester',
          is_guest: true,
          rank: 'ROOKIE',
          total_bp: 0,
          wallet_address: null,
          wallet_balance_matic: null,
          created_at: new Date().toISOString(),
        });
        setScreen('lobby');
        return;
      }
      // User logged out or not yet logged in
      api.clearToken();
      setUser(null);
      setScreen('login');
    }
  }, [ready, authenticated, privyUser, syncWithBackend, setUser, setScreen]);

  // Show loading screen while Privy is initializing (not login screen)
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">INITIALIZING...</div>
      </div>
    );
  }

  // Show loading while authenticated user is being synced (prevents login flash)
  if (ready && authenticated && screen === 'login') {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginPage />;
      case 'lobby':
        return <LobbyPage />;
      case 'matchmaking':
        return <MatchmakingPage />;
      case 'briefing':
        return <BriefingPage />;
      case 'battle':
        return <GameScene />;
      case 'results':
        return <ResultsPage />;
      case 'economy':
        return <EconomyPage />;
      default:
        return <LoginPage />;
    }
  };

  return (
    <>
      <OrientationLock />
      {renderScreen()}
    </>
  );
}

export default App;
