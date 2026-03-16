import { create } from 'zustand';
import { getWeapon, DEFAULT_LOADOUT, type WeaponData } from '../game/data/weapons';

interface User {
  id: string;
  username: string;
  display_name: string;
  is_guest: boolean;
  rank: string;
  total_bp: number;
  wallet_address: string | null;
  wallet_balance_matic: number | null;
  created_at: string;
}

export interface BotPlayer {
  id: number;
  team: 'alpha' | 'bravo';
  health: number;
  maxHealth: number;
  position: [number, number, number];
  targetPosition: [number, number, number];
  isDowned: boolean;
  downTimer: number;
  isAlive: boolean;
}

export interface CyberSoulData {
  id: number;
  position: [number, number, number];
  collected: boolean;
  sourceTeam: 'alpha' | 'bravo';
}

export interface CyberGateData {
  id: string;
  team: 'alpha' | 'bravo';
  position: [number, number, number];
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  respawnTimer: number;
}

export interface KillFeedEntry {
  id: number;
  killer: string;
  victim: string;
  killerTeam: 'alpha' | 'bravo';
  victimTeam: 'alpha' | 'bravo';
  timestamp: number;
}

interface BattleState {
  battleId: string | null;
  team: string | null;
  status: string;
  teamAlphaLife: number;
  teamBravoLife: number;
  timer: number;
  gate: string;
  participants: unknown[];
}

type GameScreen = 'login' | 'lobby' | 'matchmaking' | 'briefing' | 'battle' | 'results' | 'economy';

export interface Deployable {
  id: number;
  type: string;
  team: 'alpha' | 'bravo';
  position: [number, number, number];
  health: number;
  maxHealth: number;
  duration: number;
  radius: number;
  isActive: boolean;
}

interface GameStore {
  user: User | null;
  setUser: (user: User | null) => void;
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  battle: BattleState;
  setBattle: (battle: Partial<BattleState>) => void;
  resetBattle: () => void;
  health: number;
  maxHealth: number;
  setHealth: (health: number) => void;
  isDowned: boolean;
  setIsDowned: (downed: boolean) => void;
  respawnCount: number;
  incrementRespawn: () => void;
  respawnTimer: number;
  setRespawnTimer: (t: number) => void;
  // Weapon system
  loadout: string[];
  setLoadout: (loadout: string[]) => void;
  currentWeaponIndex: number;
  setCurrentWeaponIndex: (index: number) => void;
  currentWeapon: WeaponData;
  switchWeapon: (index: number) => void;
  isReloading: boolean;
  setIsReloading: (r: boolean) => void;
  reloadTimer: number;
  setReloadTimer: (t: number) => void;
  isZoomed: boolean;
  setIsZoomed: (z: boolean) => void;
  deployables: Deployable[];
  addDeployable: (d: Omit<Deployable, 'id'>) => void;
  removeDeployable: (id: number) => void;
  damageDeployable: (id: number, amount: number) => void;
  grenadeCount: number;
  setGrenadeCount: (n: number) => void;
  ammo: number;
  maxAmmo: number;
  setAmmo: (ammo: number) => void;
  reload: () => void;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
  cyberSoulsCollected: number;
  cyberSoulsLost: number;
  supportScore: number;
  gatesDestroyed: number;
  perfectVictory: boolean;
  addDamageDealt: (amount: number) => void;
  addDamageTaken: (amount: number) => void;
  addKill: () => void;
  addDeath: () => void;
  addCyberSoul: () => void;
  loseCyberSoul: () => void;
  addSupportScore: (amount: number) => void;
  addGateDestroyed: () => void;
  bots: BotPlayer[];
  setBots: (bots: BotPlayer[]) => void;
  updateBot: (id: number, data: Partial<BotPlayer>) => void;
  cyberSouls: CyberSoulData[];
  addCyberSoulDrop: (soul: Omit<CyberSoulData, 'id'>) => void;
  collectCyberSoul: (id: number) => void;
  cyberGates: CyberGateData[];
  setCyberGates: (gates: CyberGateData[]) => void;
  damageGate: (id: string, amount: number) => void;
  respawnGate: (id: string) => void;
  killFeed: KillFeedEntry[];
  addKillFeedEntry: (entry: Omit<KillFeedEntry, 'id' | 'timestamp'>) => void;
  damageTeamLife: (team: 'alpha' | 'bravo', amount: number) => void;
  isPointerLocked: boolean;
  setPointerLocked: (locked: boolean) => void;
  sensitivity: number;
  setSensitivity: (s: number) => void;
  weaponSwitchCooldown: number;
  setWeaponSwitchCooldown: (t: number) => void;
}

const initialBattle: BattleState = {
  battleId: null,
  team: null,
  status: 'idle',
  teamAlphaLife: 100000,
  teamBravoLife: 100000,
  timer: 300,
  gate: 'A',
  participants: [],
};

const createInitialBots = (): BotPlayer[] => [
  { id: 1, team: 'bravo', health: 1000, maxHealth: 1000, position: [10, 0, 5], targetPosition: [15, 0, -5], isDowned: false, downTimer: 0, isAlive: true },
  { id: 2, team: 'bravo', health: 1000, maxHealth: 1000, position: [20, 0, -10], targetPosition: [5, 0, 10], isDowned: false, downTimer: 0, isAlive: true },
  { id: 3, team: 'bravo', health: 1000, maxHealth: 1000, position: [15, 0, 15], targetPosition: [-5, 0, -8], isDowned: false, downTimer: 0, isAlive: true },
  { id: 4, team: 'bravo', health: 1000, maxHealth: 1000, position: [25, 0, 0], targetPosition: [10, 0, 15], isDowned: false, downTimer: 0, isAlive: true },
  { id: 5, team: 'alpha', health: 1000, maxHealth: 1000, position: [-10, 0, 5], targetPosition: [-15, 0, -5], isDowned: false, downTimer: 0, isAlive: true },
  { id: 6, team: 'alpha', health: 1000, maxHealth: 1000, position: [-20, 0, -10], targetPosition: [-5, 0, 10], isDowned: false, downTimer: 0, isAlive: true },
  { id: 7, team: 'alpha', health: 1000, maxHealth: 1000, position: [-15, 0, 15], targetPosition: [5, 0, -8], isDowned: false, downTimer: 0, isAlive: true },
  { id: 8, team: 'alpha', health: 1000, maxHealth: 1000, position: [-25, 0, 0], targetPosition: [-10, 0, 15], isDowned: false, downTimer: 0, isAlive: true },
];

const createInitialGates = (): CyberGateData[] => [
  { id: 'gate-alpha', team: 'alpha', position: [-30, 2, 0], health: 500, maxHealth: 500, isDestroyed: false, respawnTimer: 0 },
  { id: 'gate-bravo', team: 'bravo', position: [30, 2, 0], health: 500, maxHealth: 500, isDestroyed: false, respawnTimer: 0 },
];

let killFeedIdCounter = 0;
let cyberSoulIdCounter = 0;
let deployableIdCounter = 0;

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  screen: 'login',
  setScreen: (screen) => set({ screen }),
  battle: { ...initialBattle },
  setBattle: (battle) => set((state) => ({ battle: { ...state.battle, ...battle } })),
  resetBattle: () => {
    killFeedIdCounter = 0;
    cyberSoulIdCounter = 0;
    deployableIdCounter = 0;
    const weapon = getWeapon(DEFAULT_LOADOUT[0]);
    set({
      battle: { ...initialBattle },
      health: 1000,
      maxHealth: 1000,
      isDowned: false,
      respawnCount: 0,
      respawnTimer: 0,
      loadout: [...DEFAULT_LOADOUT],
      currentWeaponIndex: 0,
      currentWeapon: weapon,
      ammo: weapon.magazineSize,
      maxAmmo: weapon.magazineSize,
      isReloading: false,
      reloadTimer: 0,
      isZoomed: false,
      deployables: [],
      grenadeCount: 3,
      weaponSwitchCooldown: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0,
      cyberSoulsCollected: 0,
      cyberSoulsLost: 0,
      supportScore: 0,
      gatesDestroyed: 0,
      perfectVictory: false,
      bots: createInitialBots(),
      cyberSouls: [],
      cyberGates: createInitialGates(),
      killFeed: [],
    });
  },

  health: 1000,
  maxHealth: 1000,
  setHealth: (health) => set({ health: Math.max(0, Math.min(1000, health)) }),
  isDowned: false,
  setIsDowned: (isDowned) => set({ isDowned }),
  respawnCount: 0,
  incrementRespawn: () => set((s) => ({ respawnCount: s.respawnCount + 1 })),
  respawnTimer: 0,
  setRespawnTimer: (respawnTimer) => set({ respawnTimer }),

  // Weapon system
  loadout: [...DEFAULT_LOADOUT],
  currentWeaponIndex: 0,
  currentWeapon: getWeapon(DEFAULT_LOADOUT[0]),
  switchWeapon: (index) => set((s) => {
    if (index < 0 || index >= s.loadout.length) return s;
    const weapon = getWeapon(s.loadout[index]);
    return {
      currentWeaponIndex: index,
      currentWeapon: weapon,
      ammo: weapon.magazineSize,
      maxAmmo: weapon.magazineSize,
      isReloading: false,
      reloadTimer: 0,
      isZoomed: false,
      weaponSwitchCooldown: 0.3,
    };
  }),
  setCurrentWeaponIndex: (currentWeaponIndex) => set({ currentWeaponIndex }),
  setLoadout: (loadout) => set({ loadout }),
  isReloading: false,
  setIsReloading: (isReloading) => set({ isReloading }),
  reloadTimer: 0,
  setReloadTimer: (reloadTimer) => set({ reloadTimer }),
  isZoomed: false,
  setIsZoomed: (isZoomed) => set({ isZoomed }),
  deployables: [],
  addDeployable: (d) => set((s) => ({
    deployables: [...s.deployables, { ...d, id: deployableIdCounter++ }],
  })),
  removeDeployable: (id) => set((s) => ({
    deployables: s.deployables.filter((d) => d.id !== id),
  })),
  damageDeployable: (id, amount) => set((s) => ({
    deployables: s.deployables.map((d) => {
      if (d.id !== id) return d;
      const newHealth = d.health - amount;
      if (newHealth <= 0) return { ...d, health: 0, isActive: false };
      return { ...d, health: newHealth };
    }).filter((d) => d.isActive),
  })),
  grenadeCount: 3,
  setGrenadeCount: (grenadeCount) => set({ grenadeCount }),

  ammo: 30,
  maxAmmo: 30,
  setAmmo: (ammo) => set({ ammo }),
  reload: () => set((s) => ({ ammo: s.maxAmmo, isReloading: false, reloadTimer: 0 })),

  damageDealt: 0,
  damageTaken: 0,
  kills: 0,
  deaths: 0,
  cyberSoulsCollected: 0,
  cyberSoulsLost: 0,
  supportScore: 0,
  gatesDestroyed: 0,
  perfectVictory: false,
  addDamageDealt: (amount) => set((s) => ({ damageDealt: s.damageDealt + amount })),
  addDamageTaken: (amount) => set((s) => ({ damageTaken: s.damageTaken + amount })),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  addDeath: () => set((s) => ({ deaths: s.deaths + 1 })),
  addCyberSoul: () => set((s) => ({ cyberSoulsCollected: s.cyberSoulsCollected + 1 })),
  loseCyberSoul: () => set((s) => ({ cyberSoulsLost: s.cyberSoulsLost + 1 })),
  addSupportScore: (amount) => set((s) => ({ supportScore: s.supportScore + amount })),
  addGateDestroyed: () => set((s) => ({ gatesDestroyed: s.gatesDestroyed + 1 })),

  bots: createInitialBots(),
  setBots: (bots) => set({ bots }),
  updateBot: (id, data) => set((s) => ({
    bots: s.bots.map((b) => b.id === id ? { ...b, ...data } : b),
  })),

  cyberSouls: [],
  addCyberSoulDrop: (soul) => set((s) => ({
    cyberSouls: [...s.cyberSouls, { ...soul, id: cyberSoulIdCounter++ }],
  })),
  collectCyberSoul: (id) => set((s) => ({
    cyberSouls: s.cyberSouls.map((soul) =>
      soul.id === id ? { ...soul, collected: true } : soul
    ),
  })),

  cyberGates: createInitialGates(),
  setCyberGates: (cyberGates) => set({ cyberGates }),
  damageGate: (id, amount) => set((s) => ({
    cyberGates: s.cyberGates.map((gate) => {
      if (gate.id !== id) return gate;
      const newHealth = Math.max(0, gate.health - amount);
      return {
        ...gate,
        health: newHealth,
        isDestroyed: newHealth <= 0,
        respawnTimer: newHealth <= 0 ? 90 : gate.respawnTimer,
      };
    }),
  })),
  respawnGate: (id) => set((s) => ({
    cyberGates: s.cyberGates.map((gate) =>
      gate.id === id ? { ...gate, health: gate.maxHealth, isDestroyed: false, respawnTimer: 0 } : gate
    ),
  })),

  killFeed: [],
  addKillFeedEntry: (entry) => set((s) => ({
    killFeed: [
      { ...entry, id: killFeedIdCounter++, timestamp: Date.now() },
      ...s.killFeed,
    ].slice(0, 8),
  })),

  damageTeamLife: (team, amount) => set((s) => ({
    battle: {
      ...s.battle,
      teamAlphaLife: team === 'alpha' ? Math.max(0, s.battle.teamAlphaLife - amount) : s.battle.teamAlphaLife,
      teamBravoLife: team === 'bravo' ? Math.max(0, s.battle.teamBravoLife - amount) : s.battle.teamBravoLife,
    },
  })),

  isPointerLocked: false,
  setPointerLocked: (isPointerLocked) => set({ isPointerLocked }),
  sensitivity: 0.002,
  setSensitivity: (sensitivity) => set({ sensitivity }),
  weaponSwitchCooldown: 0,
  setWeaponSwitchCooldown: (weaponSwitchCooldown) => set({ weaponSwitchCooldown }),
}));
