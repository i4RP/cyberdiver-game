import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import api from './services/api';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import MatchmakingPage from './pages/MatchmakingPage';
import BriefingPage from './pages/BriefingPage';
import ResultsPage from './pages/ResultsPage';
import GameScene from './game/GameScene';

function App() {
  const screen = useGameStore((s) => s.screen);
  const setUser = useGameStore((s) => s.setUser);
  const setScreen = useGameStore((s) => s.setScreen);

  // Auto-login with saved token
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getProfile()
        .then((profile) => {
          setUser(profile);
          setScreen('lobby');
        })
        .catch(() => {
          api.clearToken();
        });
    }
  }, [setUser, setScreen]);

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
    default:
      return <LoginPage />;
  }
}

export default App;
