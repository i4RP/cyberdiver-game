import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function MatchmakingPage() {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const setScreen = useGameStore((s) => s.setScreen);
  const battle = useGameStore((s) => s.battle);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);

    const timerInterval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    // Auto-transition to briefing after simulated wait
    const timeout = setTimeout(() => {
      setScreen('briefing');
    }, 5000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(timerInterval);
      clearTimeout(timeout);
    };
  }, [setScreen]);

  const handleCancel = () => {
    setScreen('lobby');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-64 h-64 border border-cyan-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-48 h-48 border border-cyan-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 border border-cyan-500/40 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>
      </div>

      <div className="relative z-10 text-center">
        <div className="text-cyan-400 text-6xl font-bold mb-4 animate-pulse">
          ⟐
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">SEARCHING FOR MATCH{dots}</h1>
        <p className="text-gray-400 text-sm mb-6">
          Finding worthy opponents for 5vs5 battle
        </p>

        <div className="bg-black/60 border border-cyan-800 px-6 py-3 rounded inline-block mb-8">
          <span className="text-gray-400 text-xs uppercase">Time elapsed: </span>
          <span className="text-white font-mono text-lg">{elapsed}s</span>
        </div>

        {battle.battleId && (
          <div className="mb-6">
            <span className="text-xs text-gray-500 uppercase">Battle ID: </span>
            <span className="text-cyan-400 font-mono text-sm">{battle.battleId.slice(0, 8)}</span>
          </div>
        )}

        <div>
          <button
            onClick={handleCancel}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 px-8 rounded transition-colors uppercase text-sm tracking-wider"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
