import { useGameStore } from '../../stores/gameStore';

export default function HUD() {
  const health = useGameStore((s) => s.health);
  const battle = useGameStore((s) => s.battle);
  const damageDealt = useGameStore((s) => s.damageDealt);
  const cyberSoulsCollected = useGameStore((s) => s.cyberSoulsCollected);
  const respawnCount = useGameStore((s) => s.respawnCount);
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const screen = useGameStore((s) => s.screen);

  if (screen !== 'battle') return null;

  const healthPercent = (health / 1000) * 100;
  const healthColor = healthPercent > 60 ? 'bg-green-500' : healthPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const alphaLifePercent = (battle.teamAlphaLife / 100000) * 100;
  const bravoLifePercent = (battle.teamBravoLife / 100000) * 100;

  const minutes = Math.floor(battle.timer / 60);
  const seconds = battle.timer % 60;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Top bar - Team Life */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center p-2 gap-4">
        {/* Alpha team life */}
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Alpha</span>
          <div className="w-48 h-3 bg-gray-800 border border-cyan-900 rounded-sm overflow-hidden">
            <div className={`h-full bg-cyan-500 transition-all`} style={{ width: `${alphaLifePercent}%` }} />
          </div>
          <span className="text-cyan-400 text-xs font-mono">{battle.teamAlphaLife.toLocaleString()}</span>
        </div>

        {/* Timer */}
        <div className="bg-black/60 border border-cyan-800 px-4 py-1 rounded">
          <span className="text-white text-lg font-mono font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>

        {/* Bravo team life */}
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs font-mono">{battle.teamBravoLife.toLocaleString()}</span>
          <div className="w-48 h-3 bg-gray-800 border border-red-900 rounded-sm overflow-hidden">
            <div className={`h-full bg-red-500 transition-all`} style={{ width: `${bravoLifePercent}%` }} />
          </div>
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Bravo</span>
        </div>
      </div>

      {/* Bottom left - Player health */}
      <div className="absolute bottom-6 left-6">
        <div className="bg-black/60 border border-cyan-800 p-3 rounded">
          <div className="text-cyan-300 text-xs mb-1 font-mono">HEALTH</div>
          <div className="w-48 h-4 bg-gray-800 rounded-sm overflow-hidden">
            <div className={`h-full ${healthColor} transition-all`} style={{ width: `${healthPercent}%` }} />
          </div>
          <div className="text-white text-sm font-mono mt-1">{health} / 1000</div>
        </div>
      </div>

      {/* Bottom right - Combat stats */}
      <div className="absolute bottom-6 right-6">
        <div className="bg-black/60 border border-cyan-800 p-3 rounded text-xs font-mono">
          <div className="text-cyan-300 mb-1">COMBAT STATS</div>
          <div className="text-white">DMG: <span className="text-yellow-400">{damageDealt}</span></div>
          <div className="text-white">SOULS: <span className="text-purple-400">{cyberSoulsCollected}</span></div>
          <div className="text-white">RESPAWN: <span className="text-red-400">{respawnCount}</span></div>
        </div>
      </div>

      {/* Center - Click to play message */}
      {!isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-black/80 border border-cyan-500 px-8 py-4 rounded text-center">
            <div className="text-cyan-400 text-xl font-bold mb-2">CYBERDIVER</div>
            <div className="text-white text-sm">Click to enter battle</div>
            <div className="text-gray-400 text-xs mt-2">WASD: Move | SPACE: Jump | SHIFT: Dash | MOUSE: Aim | CLICK: Shoot</div>
          </div>
        </div>
      )}
    </div>
  );
}
