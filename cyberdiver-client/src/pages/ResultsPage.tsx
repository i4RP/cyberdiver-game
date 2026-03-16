import { useGameStore } from '../stores/gameStore';

export default function ResultsPage() {
  const battle = useGameStore((s) => s.battle);
  const damageDealt = useGameStore((s) => s.damageDealt);
  const damageTaken = useGameStore((s) => s.damageTaken);
  const kills = useGameStore((s) => s.kills);
  const deaths = useGameStore((s) => s.deaths);
  const cyberSoulsCollected = useGameStore((s) => s.cyberSoulsCollected);
  const cyberSoulsLost = useGameStore((s) => s.cyberSoulsLost);
  const respawnCount = useGameStore((s) => s.respawnCount);
  const supportScore = useGameStore((s) => s.supportScore);
  const gatesDestroyed = useGameStore((s) => s.gatesDestroyed);
  const perfectVictory = useGameStore((s) => s.perfectVictory);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const user = useGameStore((s) => s.user);

  const isAlpha = battle.team === 'alpha';
  const won = isAlpha
    ? battle.teamAlphaLife > battle.teamBravoLife
    : battle.teamBravoLife > battle.teamAlphaLife;

  // Full 11-variable BP calculation (matches PDF spec)
  // 1. Damage Dealt bonus
  const bpDamageDealt = damageDealt * 0.01;
  // 2. Damage Taken penalty
  const bpDamageTaken = -(damageTaken * 0.005);
  // 3. Respawn penalty
  const bpRespawn = -(respawnCount * 2);
  // 4. Cyber Souls Collected bonus
  const bpSoulsCollected = cyberSoulsCollected * 5;
  // 5. Cyber Souls Lost penalty
  const bpSoulsLost = -(cyberSoulsLost * 3);
  // 6. Win/Loss bonus
  const bpWinLoss = won ? 10 : 0;
  // 7. Perfect Victory bonus (no team life lost)
  const bpPerfect = perfectVictory ? 15 : 0;
  // 8. Support score bonus
  const bpSupport = supportScore * 0.5;
  // 9. Kills bonus
  const bpKills = kills * 3;
  // 10. Gates Destroyed bonus
  const bpGates = gatesDestroyed * 8;
  // 11. Rank modifier (higher rank = higher multiplier)
  const rankMultipliers: Record<string, number> = {
    'ROOKIE': 1.0,
    'BRONZE': 1.1,
    'SILVER': 1.2,
    'GOLD': 1.3,
    'PLATINUM': 1.4,
    'DIAMOND': 1.5,
    'MASTER': 1.7,
    'LEGEND': 2.0,
  };
  const rankMultiplier = rankMultipliers[user?.rank || 'ROOKIE'] || 1.0;

  const rawBP = bpDamageDealt + bpDamageTaken + bpRespawn + bpSoulsCollected
    + bpSoulsLost + bpWinLoss + bpPerfect + bpSupport + bpKills + bpGates;
  const totalBP = Math.max(0, rawBP * rankMultiplier);

  const handleReturnToLobby = () => {
    resetBattle();
    setScreen('lobby');
  };

  const bpBreakdown = [
    { label: 'Damage Dealt', value: bpDamageDealt, detail: `${damageDealt} x 0.01`, color: 'text-yellow-400' },
    { label: 'Damage Taken', value: bpDamageTaken, detail: `${damageTaken} x -0.005`, color: 'text-red-400' },
    { label: 'Kills', value: bpKills, detail: `${kills} x 3`, color: 'text-orange-400' },
    { label: 'Respawns', value: bpRespawn, detail: `${respawnCount} x -2`, color: 'text-red-300' },
    { label: 'Souls Collected', value: bpSoulsCollected, detail: `${cyberSoulsCollected} x 5`, color: 'text-purple-400' },
    { label: 'Souls Lost', value: bpSoulsLost, detail: `${cyberSoulsLost} x -3`, color: 'text-gray-400' },
    { label: 'Win Bonus', value: bpWinLoss, detail: won ? 'Victory +10' : 'Defeat +0', color: 'text-green-400' },
    { label: 'Perfect Victory', value: bpPerfect, detail: perfectVictory ? '+15' : '+0', color: 'text-cyan-300' },
    { label: 'Support', value: bpSupport, detail: `${supportScore} x 0.5`, color: 'text-green-300' },
    { label: 'Gates Destroyed', value: bpGates, detail: `${gatesDestroyed} x 8`, color: 'text-orange-300' },
    { label: 'Rank Multiplier', value: rankMultiplier, detail: `${user?.rank || 'ROOKIE'} x${rankMultiplier}`, color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      <div className={`absolute inset-0 opacity-10 ${won ? 'bg-cyan-500' : 'bg-red-500'}`} />

      <div className="relative z-10 w-full max-w-3xl p-8 max-h-screen overflow-y-auto">
        {/* Result header */}
        <div className="text-center mb-6">
          <h1 className={`text-6xl font-bold mb-2 ${won ? 'text-cyan-400' : 'text-red-400'}`}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </h1>
          {perfectVictory && (
            <div className="text-yellow-400 text-lg font-bold animate-pulse">PERFECT VICTORY</div>
          )}
          <p className="text-gray-400 text-sm mt-1">
            Team {battle.team?.toUpperCase()} | {user?.display_name || user?.username}
          </p>
        </div>

        {/* Team life comparison */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-4 mb-4">
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
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">Combat Report</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <StatRow label="Damage Dealt" value={damageDealt.toString()} color="text-yellow-400" />
            <StatRow label="Damage Taken" value={damageTaken.toString()} color="text-red-400" />
            <StatRow label="Kills" value={kills.toString()} color="text-orange-400" />
            <StatRow label="Deaths" value={deaths.toString()} color="text-red-300" />
            <StatRow label="Cyber Souls Collected" value={cyberSoulsCollected.toString()} color="text-purple-400" />
            <StatRow label="Cyber Souls Lost" value={cyberSoulsLost.toString()} color="text-gray-400" />
            <StatRow label="Respawns" value={respawnCount.toString()} color="text-orange-400" />
            <StatRow label="Gates Destroyed" value={gatesDestroyed.toString()} color="text-orange-300" />
            <StatRow label="Support Score" value={supportScore.toString()} color="text-green-400" />
          </div>
        </div>

        {/* BP Breakdown */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">Battle Points Breakdown</h2>
          <div className="space-y-1">
            {bpBreakdown.map((item) => (
              <div key={item.label} className="flex justify-between items-center py-1 border-b border-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{item.label}</span>
                  <span className="text-gray-600 text-xs">({item.detail})</span>
                </div>
                <span className={`${item.color} font-mono text-sm font-bold`}>
                  {item.label === 'Rank Multiplier' ? `x${item.value}` : (item.value >= 0 ? '+' : '') + item.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total BP */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Total Battle Points Earned</div>
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
