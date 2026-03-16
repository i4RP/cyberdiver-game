export type WeaponCategory = 'primary' | 'secondary' | 'tactical' | 'deployable';
export type WeaponFireMode = 'auto' | 'semi' | 'burst' | 'charge' | 'spray' | 'throw' | 'deploy';

export interface WeaponData {
  id: string;
  name: string;
  category: WeaponCategory;
  fireMode: WeaponFireMode;
  damage: number;
  fireRate: number; // seconds between shots
  magazineSize: number;
  reloadTime: number; // seconds
  range: number; // max effective range
  spread: number; // bullet spread (radians)
  recoil: number; // visual recoil intensity
  moveSpeedMultiplier: number; // movement speed modifier
  description: string;
  // Deployable-specific
  deployHealth?: number;
  deployDuration?: number; // seconds active
  deployRadius?: number; // effect radius
  healAmount?: number;
  ammoAmount?: number;
  // Spray-specific
  sprayType?: 'water' | 'poison' | 'smoke';
  // Grenade-specific
  grenadeType?: 'explosive' | 'flash' | 'smoke' | 'emp' | 'incendiary';
  grenadeCount?: number;
  blastRadius?: number;
  // Sniper
  zoomLevel?: number;
  // Trail color
  trailColor: string;
  // Accent color for weapon model
  accentColor: string;
}

export const WEAPONS: Record<string, WeaponData> = {
  cyber_rifle: {
    id: 'cyber_rifle',
    name: 'Cyber Rifle',
    category: 'primary',
    fireMode: 'auto',
    damage: 50,
    fireRate: 0.12,
    magazineSize: 30,
    reloadTime: 2.0,
    range: 60,
    spread: 0.02,
    recoil: 0.15,
    moveSpeedMultiplier: 1.0,
    description: 'All-purpose assault rifle. Balanced damage and accuracy.',
    trailColor: '#00ffff',
    accentColor: '#00ffff',
  },
  handgun: {
    id: 'handgun',
    name: 'Handgun',
    category: 'secondary',
    fireMode: 'semi',
    damage: 35,
    fireRate: 0.25,
    magazineSize: 12,
    reloadTime: 1.2,
    range: 40,
    spread: 0.01,
    recoil: 0.2,
    moveSpeedMultiplier: 1.15,
    description: 'Precision sidearm. High accuracy, fast draw speed.',
    trailColor: '#ffcc00',
    accentColor: '#ffcc00',
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    name: 'Sniper Rifle',
    category: 'primary',
    fireMode: 'semi',
    damage: 150,
    fireRate: 1.2,
    magazineSize: 5,
    reloadTime: 3.0,
    range: 120,
    spread: 0.002,
    recoil: 0.4,
    moveSpeedMultiplier: 0.85,
    description: 'Long-range precision rifle. Devastating headshot damage.',
    zoomLevel: 4.0,
    trailColor: '#ff00ff',
    accentColor: '#ff00ff',
  },
  multi_spray_water: {
    id: 'multi_spray_water',
    name: 'Multi Spray (Water)',
    category: 'primary',
    fireMode: 'spray',
    damage: 15,
    fireRate: 0.05,
    magazineSize: 100,
    reloadTime: 3.5,
    range: 15,
    spread: 0.15,
    recoil: 0.02,
    moveSpeedMultiplier: 0.95,
    description: 'Short-range water spray. Slows enemies on hit.',
    sprayType: 'water',
    trailColor: '#4488ff',
    accentColor: '#4488ff',
  },
  multi_spray_poison: {
    id: 'multi_spray_poison',
    name: 'Multi Spray (Poison)',
    category: 'primary',
    fireMode: 'spray',
    damage: 8,
    fireRate: 0.05,
    magazineSize: 100,
    reloadTime: 3.5,
    range: 15,
    spread: 0.15,
    recoil: 0.02,
    moveSpeedMultiplier: 0.95,
    description: 'Toxic spray. Deals damage over time to enemies.',
    sprayType: 'poison',
    trailColor: '#44ff44',
    accentColor: '#44ff44',
  },
  grenade: {
    id: 'grenade',
    name: 'Grenade',
    category: 'tactical',
    fireMode: 'throw',
    damage: 200,
    fireRate: 1.0,
    magazineSize: 3,
    reloadTime: 0,
    range: 30,
    spread: 0,
    recoil: 0,
    moveSpeedMultiplier: 1.0,
    description: 'Throwable explosive. 5 types available.',
    grenadeType: 'explosive',
    grenadeCount: 3,
    blastRadius: 8,
    trailColor: '#ff6600',
    accentColor: '#ff6600',
  },
  sentry_gun: {
    id: 'sentry_gun',
    name: 'Sentry Gun',
    category: 'deployable',
    fireMode: 'deploy',
    damage: 25,
    fireRate: 0.3,
    magazineSize: 1,
    reloadTime: 0,
    range: 20,
    spread: 0.03,
    recoil: 0,
    moveSpeedMultiplier: 0.9,
    description: 'Auto-targeting turret. Deploys and attacks nearby enemies.',
    deployHealth: 300,
    deployDuration: 60,
    deployRadius: 20,
    trailColor: '#ff4444',
    accentColor: '#ff4444',
  },
  shield_generator: {
    id: 'shield_generator',
    name: 'Shield Generator',
    category: 'deployable',
    fireMode: 'deploy',
    damage: 0,
    fireRate: 0,
    magazineSize: 1,
    reloadTime: 0,
    range: 0,
    spread: 0,
    recoil: 0,
    moveSpeedMultiplier: 0.9,
    description: 'Defensive barrier. Blocks incoming damage within radius.',
    deployHealth: 500,
    deployDuration: 45,
    deployRadius: 6,
    trailColor: '#00aaff',
    accentColor: '#00aaff',
  },
  ammo_magazine: {
    id: 'ammo_magazine',
    name: 'Ammo Magazine',
    category: 'deployable',
    fireMode: 'deploy',
    damage: 0,
    fireRate: 0,
    magazineSize: 2,
    reloadTime: 0,
    range: 0,
    spread: 0,
    recoil: 0,
    moveSpeedMultiplier: 1.0,
    description: 'Teammate support. Deploys ammo crate for allies to refill.',
    deployDuration: 30,
    deployRadius: 4,
    ammoAmount: 30,
    trailColor: '#ffaa00',
    accentColor: '#ffaa00',
  },
  healing_disc: {
    id: 'healing_disc',
    name: 'Healing Disc',
    category: 'deployable',
    fireMode: 'deploy',
    damage: 0,
    fireRate: 0,
    magazineSize: 2,
    reloadTime: 0,
    range: 0,
    spread: 0,
    recoil: 0,
    moveSpeedMultiplier: 1.0,
    description: 'Recovery field. Heals nearby teammates over time.',
    deployHealth: 200,
    deployDuration: 30,
    deployRadius: 6,
    healAmount: 20,
    trailColor: '#44ff88',
    accentColor: '#44ff88',
  },
  spy_camera: {
    id: 'spy_camera',
    name: 'Spy Camera',
    category: 'deployable',
    fireMode: 'deploy',
    damage: 0,
    fireRate: 0,
    magazineSize: 3,
    reloadTime: 0,
    range: 0,
    spread: 0,
    recoil: 0,
    moveSpeedMultiplier: 1.05,
    description: 'Recon device. Reveals enemy positions within radius.',
    deployHealth: 50,
    deployDuration: 90,
    deployRadius: 15,
    trailColor: '#aa88ff',
    accentColor: '#aa88ff',
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);

// Default loadout: primary + secondary + tactical/deployable
export const DEFAULT_LOADOUT: string[] = ['cyber_rifle', 'handgun', 'grenade'];

// Get weapon by ID
export function getWeapon(id: string): WeaponData {
  return WEAPONS[id] || WEAPONS.cyber_rifle;
}
