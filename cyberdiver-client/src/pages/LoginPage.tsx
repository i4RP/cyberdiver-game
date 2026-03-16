import { useState } from 'react';
import api from '../services/api';
import { useGameStore } from '../stores/gameStore';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useGameStore((s) => s.setUser);
  const setScreen = useGameStore((s) => s.setScreen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (mode === 'register') {
        result = await api.register(username, password, displayName || undefined);
      } else {
        result = await api.login(username, password);
      }
      api.setToken(result.access_token);
      const profile = await api.getProfile();
      setUser(profile);
      setScreen('lobby');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api.guestLogin();
      api.setToken(result.access_token);
      const profile = await api.getProfile();
      setUser(profile);
      setScreen('lobby');
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500 mb-2">
            CYBERDIVER
          </h1>
          <p className="text-gray-500 text-sm tracking-widest uppercase">5vs5 FPS MOBA × Blockchain</p>
        </div>

        {/* Login form */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-700">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                mode === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                mode === 'register' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded transition-all disabled:opacity-50 uppercase tracking-wider text-sm"
            >
              {loading ? 'CONNECTING...' : mode === 'login' ? 'DIVE IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded transition-colors disabled:opacity-50 uppercase tracking-wider text-sm"
            >
              GUEST MODE
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Powered by Polygon Blockchain
        </p>
      </div>
    </div>
  );
}
