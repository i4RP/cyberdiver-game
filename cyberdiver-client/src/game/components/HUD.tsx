import { useGameStore } from '../../stores/gameStore';
import { getWeapon } from '../data/weapons';
import { touchInput } from './TouchControls';

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
  const currentWeapon = useGameStore((s) => s.currentWeapon);
  const currentWeaponIndex = useGameStore((s) => s.currentWeaponIndex);
  const loadout = useGameStore((s) => s.loadout);
  const isReloading = useGameStore((s) => s.isReloading);
  const reloadTimer = useGameStore((s) => s.reloadTimer);
  const isZoomed = useGameStore((s) => s.isZoomed);
  const grenadeCount = useGameStore((s) => s.grenadeCount);

  const isMobile = touchInput.isMobile;

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
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center p-2 gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider hidden md:inline">Alpha</span>
          <span className="text-cyan-400 text-xs font-bold md:hidden">A</span>
          <div className="w-20 md:w-48 h-2 md:h-3 bg-gray-800 border border-cyan-900 rounded-sm overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${alphaLifePercent}%` }} />
          </div>
          <span className="text-cyan-400 text-xs font-mono hidden md:inline">{battle.teamAlphaLife.toLocaleString()}</span>
        </div>

        <div className="bg-black/60 border border-cyan-800 px-2 md:px-4 py-1 rounded">
          <span className="text-white text-sm md:text-lg font-mono font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-red-400 text-xs font-mono hidden md:inline">{battle.teamBravoLife.toLocaleString()}</span>
          <div className="w-20 md:w-48 h-2 md:h-3 bg-gray-800 border border-red-900 rounded-sm overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${bravoLifePercent}%` }} />
          </div>
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider hidden md:inline">Bravo</span>
          <span className="text-red-400 text-xs font-bold md:hidden">B</span>
        </div>
      </div>

      {/* Kill Feed - top right (hidden on mobile to save space) */}
      <div className="absolute top-12 right-4 flex-col gap-1 hidden md:flex">
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

      {/* Cyber Gate status - top left (compact on mobile) */}
      <div className="absolute top-10 md:top-12 left-2 md:left-4 flex flex-col gap-1">
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

      {/* Bottom left - Player health + weapon info (positioned above joystick on mobile) */}
      <div className={`absolute ${isMobile ? 'bottom-36 left-2' : 'bottom-6 left-6'}`}>
        <div className={`bg-black/60 border border-cyan-800 rounded ${isMobile ? 'p-1.5' : 'p-3'}`}>
          <div className="text-cyan-300 text-xs mb-0.5 font-mono">HEALTH</div>
          <div className={`${isMobile ? 'w-24' : 'w-48'} h-2 md:h-4 bg-gray-800 rounded-sm overflow-hidden`}>
            <div className={`h-full ${healthColor} transition-all`} style={{ width: `${healthPercent}%` }} />
          </div>
          <div className="text-white text-xs font-mono mt-0.5">{health} / {maxHealth}</div>

          {/* Weapon info */}
          <div className="mt-1 md:mt-2 pt-1 md:pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold" style={{ color: currentWeapon.accentColor }}>
                {currentWeapon.name}
              </span>
            </div>
            {currentWeapon.fireMode === 'throw' ? (
              <div className="text-white text-sm md:text-lg font-mono font-bold">
                {grenadeCount} <span className="text-gray-500 text-xs md:text-sm">grenades</span>
              </div>
            ) : currentWeapon.fireMode === 'deploy' ? (
              <div className="text-white text-sm md:text-lg font-mono font-bold">
                {ammo} <span className="text-gray-500 text-xs md:text-sm">charges</span>
              </div>
            ) : (
              <>
                <div className="text-white text-sm md:text-lg font-mono font-bold">
                  {ammo} <span className="text-gray-500 text-xs md:text-sm">/ {maxAmmo}</span>
                </div>
                {isReloading && (
                  <div className="mt-1">
                    <div className="text-yellow-400 text-xs font-mono mb-0.5">RELOADING...</div>
                    <div className="w-full h-1.5 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${((currentWeapon.reloadTime - reloadTimer) / currentWeapon.reloadTime) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {!isReloading && !isMobile && <div className="text-gray-500 text-xs font-mono">R to reload</div>}
              </>
            )}
          </div>

          {/* Weapon loadout slots - hidden on mobile (use touch switch button instead) */}
          {!isMobile && (
            <div className="mt-2 pt-2 border-t border-gray-700 flex gap-1">
              {loadout.map((weaponId, index) => {
                const w = getWeapon(weaponId);
                const isActive = index === currentWeaponIndex;
                return (
                  <div
                    key={weaponId}
                    className={`px-2 py-1 rounded text-xs font-mono border ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-900/40 text-white'
                        : 'border-gray-700 bg-gray-800/40 text-gray-500'
                    }`}
                  >
                    <span className="text-gray-400 mr-1">{index + 1}</span>
                    {w.name.split(' ')[0]}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom right - Combat stats (hidden on mobile - touch controls occupy this area) */}
      {!isMobile && (
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
      )}

      {/* Sniper zoom overlay */}
      {isZoomed && currentWeapon.zoomLevel && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 border-4 border-black/80" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/50" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-48 h-48 border-2 border-red-500/30 rounded-full" />
          </div>
          <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded">
            <span className="text-red-400 text-xs font-mono">{currentWeapon.zoomLevel}x ZOOM</span>
          </div>
        </div>
      )}

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

      {/* Click to play message (desktop only - mobile has touch controls) */}
      {!isMobile && !isPointerLocked && !isDowned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-black/80 border border-cyan-500 px-8 py-4 rounded text-center">
            <div className="text-cyan-400 text-xl font-bold mb-2">CYBERDIVER</div>
            <div className="text-white text-sm">Click to enter battle</div>
            <div className="text-gray-400 text-xs mt-2">WASD: Move | SPACE: Jump | SHIFT: Dash | MOUSE: Aim | CLICK: Shoot</div>
            <div className="text-gray-400 text-xs">R: Reload | 1-3: Switch Weapon | Scroll: Cycle | Right-Click: Zoom (Sniper)</div>
          </div>
        </div>
      )}
    </div>
  );
}
