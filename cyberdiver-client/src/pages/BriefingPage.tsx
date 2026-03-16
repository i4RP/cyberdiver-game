import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

const GATES = ['A', 'B', 'C', 'D', 'E'];
const BRIEFING_TIME = 60;

export default function BriefingPage() {
  const [selectedGate, setSelectedGate] = useState('C');
  const [timer, setTimer] = useState(BRIEFING_TIME);
  const setBattle = useGameStore((s) => s.setBattle);
  const setScreen = useGameStore((s) => s.setScreen);
  const battle = useGameStore((s) => s.battle);
  const user = useGameStore((s) => s.user);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          startBattle();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startBattle = () => {
    setBattle({
      gate: selectedGate,
      status: 'active',
      timer: 300,
    });
    setScreen('battle');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2 uppercase tracking-widest">Briefing Room</h1>
          <p className="text-gray-400 text-sm">Choose your deployment gate and prepare for battle</p>
        </div>

        {/* Timer */}
        <div className="text-center mb-8">
          <div className="inline-block bg-black/60 border border-cyan-800 px-8 py-3 rounded">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Battle starts in</span>
            <div className="text-5xl font-mono font-bold text-white">{timer}s</div>
          </div>
        </div>

        {/* Team info */}
        <div className="text-center mb-6">
          <span className={`text-lg font-bold uppercase tracking-wider ${
            battle.team === 'alpha' ? 'text-cyan-400' : 'text-red-400'
          }`}>
            Team {battle.team || 'Alpha'}
          </span>
          <span className="text-gray-500 mx-3">|</span>
          <span className="text-gray-400">{user?.display_name || user?.username}</span>
        </div>

        {/* Gate Selection */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider text-center">
            Select Deployment Gate
          </h2>

          {/* Map visualization */}
          <div className="relative w-full h-48 bg-gray-800/50 rounded border border-gray-700 mb-4">
            {/* Map outline */}
            <div className="absolute inset-4 border border-gray-600 rounded">
              {/* Center point */}
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500 text-xs -mt-4">
                CENTER
              </div>

              {/* Gates */}
              {GATES.map((gate, i) => {
                const isAlpha = battle.team === 'alpha';
                const yPercent = 10 + (i * 20);
                const xPercent = isAlpha ? 5 : 85;
                const isSelected = selectedGate === gate;

                return (
                  <button
                    key={gate}
                    onClick={() => setSelectedGate(gate)}
                    className={`absolute w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-black scale-110 ring-2 ring-cyan-300'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {gate}
                  </button>
                );
              })}

              {/* Enemy gates */}
              {GATES.map((gate, i) => {
                const isAlpha = battle.team === 'alpha';
                const yPercent = 10 + (i * 20);
                const xPercent = isAlpha ? 85 : 5;
                return (
                  <div
                    key={`enemy-${gate}`}
                    className="absolute w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-red-900/50 text-red-400 border border-red-700"
                    style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {gate}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gate buttons */}
          <div className="flex justify-center gap-3">
            {GATES.map((gate) => (
              <button
                key={gate}
                onClick={() => setSelectedGate(gate)}
                className={`px-6 py-3 rounded font-bold text-sm transition-all ${
                  selectedGate === gate
                    ? 'bg-cyan-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                GATE {gate}
              </button>
            ))}
          </div>
        </div>

        {/* Ready button */}
        <div className="text-center">
          <button
            onClick={startBattle}
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-12 rounded text-lg transition-all uppercase tracking-widest"
          >
            DEPLOY NOW
          </button>
        </div>
      </div>
    </div>
  );
}
