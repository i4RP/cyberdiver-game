import { useGameStore } from '../stores/gameStore';

export default function ResultsPage() {
  const battle = useGameStore((s) => s.battle);
  const damageDealt = useGameStore((s) => s.damageDealt);
  const damageTaken = useGameStore((s) => s.damageTaken);
  const cyberSoulsCollected = useGameStore((s) => s.cyberSoulsCollected);
  const cyberSoulsLost = useGameStore((s) => s.cyberSoulsLost);
  const respawnCount = useGameStore((s) => s.respawnCount);
  const supportScore = useGameStore((s) => s.supportScore);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const user = useGameStore((s) => s.user);

  const isAlpha = battle.team === 'alpha';
  const won = isAlpha
    ? battle.teamAlphaLife > battle.teamBravoLife
    : battle.teamBravoLife > battle.teamAlphaLife;

  // Simplified BP calculation (matches backend formula)
  const baseBP = (damageDealt * 0.01) - (damageTaken * 0.005)
    - (respawnCount * 2)
    + (cyberSoulsCollected * 5) - (cyberSoulsLost * 3)
    + (won ? 10 : 0)
    + supportScore * 0.5;
  const totalBP = Math.max(0, baseBP);

  const handleReturnToLobby = () => {
    resetBattle();
    setScreen('lobby');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background flash */}
      <div className={`absolute inset-0 opacity-10 ${won ? 'bg-cyan-500' : 'bg-red-500'}`} />

      <div className="relative z-10 w-full max-w-2xl p-8">
        {/* Result header */}
        <div className="text-center mb-8">
          <h1 className={`text-6xl font-bold mb-2 ${won ? 'text-cyan-400' : 'text-red-400'}`}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className="text-gray-400 text-sm">
            Team {battle.team?.toUpperCase()} | {user?.display_name || user?.username}
          </p>
        </div>

        {/* Team life comparison */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <div className="text-xs text-cyan-400 uppercase tracking-wider mb-1">Team Alpha</div>
              <div className="text-2xl font-bold text-cyan-400">{battle.teamAlphaLife.toLocaleString()}</div>
            </div>
            <div className="text-center text-gray-500 text-xl">VS</div>
            <div className="text-center">
              <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Team Bravo</div>
              <div className="text-2xl font-bold text-red-400">{battle.teamBravoLife.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Combat stats */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Combat Report</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatRow label="Damage Dealt" value={damageDealt.toString()} color="text-yellow-400" />
            <StatRow label="Damage Taken" value={damageTaken.toString()} color="text-red-400" />
            <StatRow label="Cyber Souls Collected" value={cyberSoulsCollected.toString()} color="text-purple-400" />
            <StatRow label="Cyber Souls Lost" value={cyberSoulsLost.toString()} color="text-gray-400" />
            <StatRow label="Respawns" value={respawnCount.toString()} color="text-orange-400" />
            <StatRow label="Support Score" value={supportScore.toString()} color="text-green-400" />
          </div>
        </div>

        {/* BP earned */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Battle Points Earned</div>
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-400">
              +{totalBP.toFixed(1)} BP
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleReturnToLobby}
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-3 px-8 rounded transition-all uppercase tracking-wider text-sm"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-800">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`${color} font-mono font-bold`}>{value}</span>
    </div>
  );
}
