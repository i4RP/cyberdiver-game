import { useState, useEffect } from 'react';
import api from '../services/api';
import { useGameStore } from '../stores/gameStore';

export default function LobbyPage() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const setScreen = useGameStore((s) => s.setScreen);
  const setBattle = useGameStore((s) => s.setBattle);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const [betAmount, setBetAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lb, st, profile] = await Promise.all([
        api.getLeaderboard(),
        api.getStats(),
        api.getProfile(),
      ]);
      setLeaderboard(Array.isArray(lb) ? lb : (lb?.leaderboard || []));
      setStats(st);
      setUser(profile);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const handleMatchmake = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api.matchmake(betAmount);
      setBattle({
        battleId: result.battle_id,
        team: result.team,
        status: result.status,
      });
      if (result.status === 'waiting') {
        setScreen('matchmaking');
      } else {
        setScreen('briefing');
      }
    } catch (err: any) {
      setError(err.message || 'Matchmaking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBattle = () => {
    resetBattle();
    setBattle({
      battleId: 'local-' + Date.now(),
      team: 'alpha',
      status: 'briefing',
    });
    setScreen('briefing');
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setScreen('login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-cyan-900/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500">
            CYBERDIVER
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-cyan-400">{user?.display_name || user?.username}</div>
              <div className="text-xs text-gray-500">Rank: {user?.rank} | BP: {user?.total_bp?.toFixed(1)}</div>
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Battle Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Battle */}
          <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">Battle</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Practice mode */}
              <button
                onClick={handleQuickBattle}
                className="bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-700/50 hover:border-cyan-500 rounded-lg p-6 text-left transition-all group"
              >
                <div className="text-cyan-400 font-bold text-lg mb-1 group-hover:text-cyan-300">PRACTICE</div>
                <div className="text-gray-400 text-sm">Offline battle with bots. No MATIC required.</div>
              </button>

              {/* Ranked match */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-red-700/50 hover:border-red-500 rounded-lg p-6 transition-all">
                <div className="text-red-400 font-bold text-lg mb-1">RANKED MATCH</div>
                <div className="text-gray-400 text-sm mb-3">5vs5 competitive. Bet MATIC to earn BP.</div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-gray-500 uppercase">Bet (MATIC):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm w-24 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={handleMatchmake}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-2 rounded transition-all disabled:opacity-50 uppercase text-sm tracking-wider"
                >
                  {loading ? 'SEARCHING...' : 'FIND MATCH'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded p-2">
                {error}
              </div>
            )}
          </div>

          {/* Wallet */}
          <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">Wallet</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Address</div>
                <div className="text-sm text-white font-mono truncate">{user?.wallet_address || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Balance</div>
                <div className="text-lg text-yellow-400 font-bold">{user?.wallet_balance_matic?.toFixed(4) || '0'} MATIC</div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          {stats && (
            <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
              <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">Global Stats</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total_users}</div>
                  <div className="text-xs text-gray-500 uppercase">Players</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total_battles_completed}</div>
                  <div className="text-xs text-gray-500 uppercase">Battles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.total_pool_matic}</div>
                  <div className="text-xs text-gray-500 uppercase">Pool (MATIC)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.active_battles}</div>
                  <div className="text-xs text-gray-500 uppercase">Active</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right - Leaderboard */}
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="text-gray-500 text-sm">No players ranked yet. Be the first!</div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((player: any, i: number) => (
                  <div key={player.user_id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-white text-sm">{player.display_name}</span>
                    </div>
                    <span className="text-cyan-400 text-sm font-mono">{player.total_bp?.toFixed(1)} BP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player Stats */}
          <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">Your Profile</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Rank</span>
                <span className="text-white text-sm font-bold">{user?.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total BP</span>
                <span className="text-cyan-400 text-sm font-mono">{user?.total_bp?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Account</span>
                <span className="text-white text-sm">{user?.is_guest ? 'Guest' : 'Registered'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Joined</span>
                <span className="text-gray-300 text-sm">{user?.created_at?.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
