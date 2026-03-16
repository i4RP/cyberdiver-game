import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { WEAPON_LIST, getWeapon, type WeaponData } from '../game/data/weapons';

const GATES = ['A', 'B', 'C', 'D', 'E'];
const BRIEFING_TIME = 60;

const PRIMARY_WEAPONS = WEAPON_LIST.filter((w) => w.category === 'primary');
const SECONDARY_WEAPONS = WEAPON_LIST.filter((w) => w.category === 'secondary');
const TACTICAL_WEAPONS = WEAPON_LIST.filter((w) => w.category === 'tactical' || w.category === 'deployable');

export default function BriefingPage() {
  const [selectedGate, setSelectedGate] = useState('C');
  const [timer, setTimer] = useState(BRIEFING_TIME);
  const [selectedPrimary, setSelectedPrimary] = useState('cyber_rifle');
  const [selectedSecondary, setSelectedSecondary] = useState('handgun');
  const [selectedTactical, setSelectedTactical] = useState('grenade');
  const setBattle = useGameStore((s) => s.setBattle);
  const setScreen = useGameStore((s) => s.setScreen);
  const setLoadout = useGameStore((s) => s.setLoadout);
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
    setLoadout([selectedPrimary, selectedSecondary, selectedTactical]);
    const weapon = getWeapon(selectedPrimary);
    useGameStore.setState({
      currentWeaponIndex: 0,
      currentWeapon: weapon,
      ammo: weapon.magazineSize,
      maxAmmo: weapon.magazineSize,
    });
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

      <div className="relative z-10 w-full max-w-4xl p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 mb-1 md:mb-2 uppercase tracking-widest">Briefing Room</h1>
          <p className="text-gray-400 text-xs md:text-sm">Choose your loadout and deployment gate</p>
        </div>

        {/* Timer */}
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-block bg-black/60 border border-cyan-800 px-4 md:px-8 py-2 md:py-3 rounded">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Battle starts in</span>
            <div className="text-3xl md:text-5xl font-mono font-bold text-white">{timer}s</div>
          </div>
        </div>

        {/* Team info */}
        <div className="text-center mb-4">
          <span className={`text-lg font-bold uppercase tracking-wider ${
            battle.team === 'alpha' ? 'text-cyan-400' : 'text-red-400'
          }`}>
            Team {battle.team || 'Alpha'}
          </span>
          <span className="text-gray-500 mx-3">|</span>
          <span className="text-gray-400">{user?.display_name || user?.username}</span>
        </div>

        {/* Weapon Selection */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider text-center">
            Select Loadout
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Primary */}
            <div>
              <div className="text-xs text-gray-400 font-mono uppercase mb-2 text-center">Primary [1]</div>
              <div className="flex flex-col gap-1">
                {PRIMARY_WEAPONS.map((w) => (
                  <WeaponButton
                    key={w.id}
                    weapon={w}
                    isSelected={selectedPrimary === w.id}
                    onClick={() => setSelectedPrimary(w.id)}
                  />
                ))}
              </div>
            </div>
            {/* Secondary */}
            <div>
              <div className="text-xs text-gray-400 font-mono uppercase mb-2 text-center">Secondary [2]</div>
              <div className="flex flex-col gap-1">
                {SECONDARY_WEAPONS.map((w) => (
                  <WeaponButton
                    key={w.id}
                    weapon={w}
                    isSelected={selectedSecondary === w.id}
                    onClick={() => setSelectedSecondary(w.id)}
                  />
                ))}
              </div>
            </div>
            {/* Tactical / Deployable */}
            <div>
              <div className="text-xs text-gray-400 font-mono uppercase mb-2 text-center">Tactical [3]</div>
              <div className="flex flex-col gap-1">
                {TACTICAL_WEAPONS.map((w) => (
                  <WeaponButton
                    key={w.id}
                    weapon={w}
                    isSelected={selectedTactical === w.id}
                    onClick={() => setSelectedTactical(w.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Selected loadout summary */}
          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-center gap-4">
            {[selectedPrimary, selectedSecondary, selectedTactical].map((id, i) => {
              const w = getWeapon(id);
              return (
                <div key={id} className="text-center">
                  <div className="text-xs text-gray-500 font-mono">[{i + 1}]</div>
                  <div className="text-sm font-bold" style={{ color: w.accentColor }}>{w.name}</div>
                  <div className="text-xs text-gray-500">{w.damage > 0 ? `DMG: ${w.damage}` : w.description.split('.')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gate Selection */}
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider text-center">
            Select Deployment Gate
          </h2>

          {/* Map visualization */}
          <div className="relative w-full h-40 bg-gray-800/50 rounded border border-gray-700 mb-3">
            <div className="absolute inset-4 border border-gray-600 rounded">
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500 text-xs -mt-4">
                CENTER
              </div>

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
                className={`px-5 py-2 rounded font-bold text-sm transition-all ${
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
        <div className="text-center pb-4">
          <button
            onClick={startBattle}
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 md:py-4 px-8 md:px-12 rounded text-base md:text-lg transition-all uppercase tracking-widest w-full md:w-auto"
          >
            DEPLOY NOW
          </button>
        </div>
      </div>
    </div>
  );
}

function WeaponButton({ weapon, isSelected, onClick }: { weapon: WeaponData; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-all border ${
        isSelected
          ? 'border-cyan-400 bg-cyan-900/30'
          : 'border-gray-700 bg-gray-800/30 hover:bg-gray-700/30'
      }`}
    >
      <div className="font-bold" style={{ color: isSelected ? weapon.accentColor : '#9ca3af' }}>
        {weapon.name}
      </div>
      <div className="text-gray-500 text-xs truncate">{weapon.description.split('.')[0]}</div>
      {weapon.damage > 0 && (
        <div className="text-gray-600 text-xs mt-0.5">
          DMG:{weapon.damage} | RPM:{Math.round(60 / weapon.fireRate)} | MAG:{weapon.magazineSize}
        </div>
      )}
    </button>
  );
}
