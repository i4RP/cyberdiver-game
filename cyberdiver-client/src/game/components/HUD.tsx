import { useGameStore } from '../../stores/gameStore';

export default function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const battle = useGameStore((s) => s.battle);
  const damageDealt = useGameStore((s) => s.damageDealt);
  const kills = useGameStore((s) => s.kills);
  const cyberSoulsCollected = useGameStore((s) => s.cyberSoulsCollected);
  const respawnCount = useGameStore((s) => s.respawnCount);
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const screen = useGameStore((s) => s.screen);
  const isDowned = useGameStore((s) => s.isDowned);
  const respawnTimer = useGameStore((s) => s.respawnTimer);
  const ammo = useGameStore((s) => s.ammo);
  const maxAmmo = useGameStore((s) => s.maxAmmo);
  const killFeed = useGameStore((s) => s.killFeed);
  const cyberGates = useGameStore((s) => s.cyberGates);
  const gatesDestroyed = useGameStore((s) => s.gatesDestroyed);

  if (screen !== 'battle') return null;

  const healthPercent = (health / maxHealth) * 100;
  const healthColor = healthPercent > 60 ? 'bg-green-500' : healthPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const alphaLifePercent = (battle.teamAlphaLife / 100000) * 100;
  const bravoLifePercent = (battle.teamBravoLife / 100000) * 100;

  const minutes = Math.floor(battle.timer / 60);
  const seconds = battle.timer % 60;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Top bar - Team Life */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center p-2 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Alpha</span>
          <div className="w-48 h-3 bg-gray-800 border border-cyan-900 rounded-sm overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${alphaLifePercent}%` }} />
          </div>
          <span className="text-cyan-400 text-xs font-mono">{battle.teamAlphaLife.toLocaleString()}</span>
        </div>

        <div className="bg-black/60 border border-cyan-800 px-4 py-1 rounded">
          <span className="text-white text-lg font-mono font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs font-mono">{battle.teamBravoLife.toLocaleString()}</span>
          <div className="w-48 h-3 bg-gray-800 border border-red-900 rounded-sm overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${bravoLifePercent}%` }} />
          </div>
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Bravo</span>
        </div>
      </div>

      {/* Kill Feed - top right */}
      <div className="absolute top-12 right-4 flex flex-col gap-1">
        {killFeed.slice(0, 5).map((entry) => (
          <div key={entry.id} className="bg-black/60 px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
            <span className={entry.killerTeam === 'alpha' ? 'text-cyan-400' : 'text-red-400'}>
              {entry.killer}
            </span>
            <span className="text-gray-500">&gt;</span>
            <span className={entry.victimTeam === 'alpha' ? 'text-cyan-400' : 'text-red-400'}>
              {entry.victim}
            </span>
          </div>
        ))}
      </div>

      {/* Cyber Gate status - top left */}
      <div className="absolute top-12 left-4 flex flex-col gap-1">
        {cyberGates.map((gate) => {
          const gateHealthPercent = (gate.health / gate.maxHealth) * 100;
          const gateColor = gate.team === 'alpha' ? 'text-cyan-400' : 'text-red-400';
          const barColor = gate.team === 'alpha' ? 'bg-cyan-500' : 'bg-red-500';
          return (
            <div key={gate.id} className="bg-black/60 px-3 py-1 rounded text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className={gateColor}>
                  {gate.team.toUpperCase()} GATE
                </span>
                {gate.isDestroyed ? (
                  <span className="text-orange-400">
                    DESTROYED ({Math.ceil(gate.respawnTimer)}s)
                  </span>
                ) : (
                  <>
                    <div className="w-20 h-2 bg-gray-700 rounded overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${gateHealthPercent}%` }} />
                    </div>
                    <span className="text-gray-400">{gate.health}/{gate.maxHealth}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom left - Player health + ammo */}
      <div className="absolute bottom-6 left-6">
        <div className="bg-black/60 border border-cyan-800 p-3 rounded">
          <div className="text-cyan-300 text-xs mb-1 font-mono">HEALTH</div>
          <div className="w-48 h-4 bg-gray-800 rounded-sm overflow-hidden">
            <div className={`h-full ${healthColor} transition-all`} style={{ width: `${healthPercent}%` }} />
          </div>
          <div className="text-white text-sm font-mono mt-1">{health} / {maxHealth}</div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-cyan-300 text-xs font-mono">AMMO</div>
            <div className="text-white text-lg font-mono font-bold">
              {ammo} <span className="text-gray-500 text-sm">/ {maxAmmo}</span>
            </div>
            <div className="text-gray-500 text-xs font-mono">R to reload</div>
          </div>
        </div>
      </div>

      {/* Bottom right - Combat stats */}
      <div className="absolute bottom-6 right-6">
        <div className="bg-black/60 border border-cyan-800 p-3 rounded text-xs font-mono">
          <div className="text-cyan-300 mb-1">COMBAT STATS</div>
          <div className="text-white">DMG: <span className="text-yellow-400">{damageDealt}</span></div>
          <div className="text-white">KILLS: <span className="text-red-400">{kills}</span></div>
          <div className="text-white">SOULS: <span className="text-purple-400">{cyberSoulsCollected}</span></div>
          <div className="text-white">GATES: <span className="text-orange-400">{gatesDestroyed}</span></div>
          <div className="text-white">RESPAWN: <span className="text-gray-400">{respawnCount}</span></div>
        </div>
      </div>

      {/* DOWNED overlay */}
      {isDowned && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
          <div className="text-center">
            <div className="text-red-500 text-6xl font-bold mb-4 animate-pulse">DOWNED</div>
            <div className="text-white text-2xl font-mono">
              Respawning in {Math.ceil(respawnTimer)}s
            </div>
            <div className="mt-4 w-64 h-3 bg-gray-800 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${((5 - respawnTimer) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Click to play message */}
      {!isPointerLocked && !isDowned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-black/80 border border-cyan-500 px-8 py-4 rounded text-center">
            <div className="text-cyan-400 text-xl font-bold mb-2">CYBERDIVER</div>
            <div className="text-white text-sm">Click to enter battle</div>
            <div className="text-gray-400 text-xs mt-2">WASD: Move | SPACE: Jump | SHIFT: Dash | MOUSE: Aim | CLICK: Shoot | R: Reload</div>
          </div>
        </div>
      )}
    </div>
  );
}
