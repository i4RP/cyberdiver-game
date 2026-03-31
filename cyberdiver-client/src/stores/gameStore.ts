import { create } from 'zustand';

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

interface BattleState {
  battleId: string | null;
  team: string | null;
  status: string;
  teamAlphaLife: number;
  teamBravoLife: number;
  timer: number;
  gate: string;
  participants: any[];
}

type GameScreen = 'login' | 'lobby' | 'matchmaking' | 'briefing' | 'battle' | 'results';

interface GameStore {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Game screen
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  // Battle
  battle: BattleState;
  setBattle: (battle: Partial<BattleState>) => void;
  resetBattle: () => void;

  // Player state in battle
  health: number;
  setHealth: (health: number) => void;
  isDowned: boolean;
  setIsDowned: (downed: boolean) => void;
  respawnCount: number;
  incrementRespawn: () => void;

  // Combat stats
  damageDealt: number;
  damageTaken: number;
  cyberSoulsCollected: number;
  cyberSoulsLost: number;
  supportScore: number;
  addDamageDealt: (amount: number) => void;
  addDamageTaken: (amount: number) => void;
  addCyberSoul: () => void;
  loseCyberSoul: () => void;
  addSupportScore: (amount: number) => void;

  // Pointer lock
  isPointerLocked: boolean;
  setPointerLocked: (locked: boolean) => void;

  // Settings
  sensitivity: number;
  setSensitivity: (s: number) => void;
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

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  screen: 'login',
  setScreen: (screen) => set({ screen }),

  battle: { ...initialBattle },
  setBattle: (battle) => set((state) => ({ battle: { ...state.battle, ...battle } })),
  resetBattle: () => set({
    battle: { ...initialBattle },
    health: 1000,
    isDowned: false,
    respawnCount: 0,
    damageDealt: 0,
    damageTaken: 0,
    cyberSoulsCollected: 0,
    cyberSoulsLost: 0,
    supportScore: 0,
  }),

  health: 1000,
  setHealth: (health) => set({ health }),
  isDowned: false,
  setIsDowned: (isDowned) => set({ isDowned }),
  respawnCount: 0,
  incrementRespawn: () => set((s) => ({ respawnCount: s.respawnCount + 1 })),

  damageDealt: 0,
  damageTaken: 0,
  cyberSoulsCollected: 0,
  cyberSoulsLost: 0,
  supportScore: 0,
  addDamageDealt: (amount) => set((s) => ({ damageDealt: s.damageDealt + amount })),
  addDamageTaken: (amount) => set((s) => ({ damageTaken: s.damageTaken + amount })),
  addCyberSoul: () => set((s) => ({ cyberSoulsCollected: s.cyberSoulsCollected + 1 })),
  loseCyberSoul: () => set((s) => ({ cyberSoulsLost: s.cyberSoulsLost + 1 })),
  addSupportScore: (amount) => set((s) => ({ supportScore: s.supportScore + amount })),

  isPointerLocked: false,
  setPointerLocked: (isPointerLocked) => set({ isPointerLocked }),

  sensitivity: 0.002,
  setSensitivity: (sensitivity) => set({ sensitivity }),
}));
