import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const BOT_SPEED = 3;
const BOT_RESPAWN_TIME = 5;

function PlayerModel({ position, team, health, maxHealth, isDowned }: {
  position: [number, number, number];
  team: 'alpha' | 'bravo';
  health: number;
  maxHealth: number;
  isDowned: boolean;
}) {
  const color = team === 'alpha' ? '#00aaff' : '#ff4444';
  const healthPercent = health / maxHealth;

  if (isDowned) {
    return (
      <group position={[position[0], 0.2, position[2]]}>
        {/* Downed body - lying flat */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.4, 1.2, 0.6]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} opacity={0.5} transparent />
        </mesh>
        {/* Down indicator */}
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Head - used as hit target (name for raycast identification) */}
      <mesh position={[0, 1.6, 0]} castShadow name="enemy-head">
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      {/* Health bar */}
      <group position={[0, 2.1, 0]}>
        <mesh>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[(healthPercent - 1) * 0.4, 0, 0.01]}>
          <planeGeometry args={[0.8 * healthPercent, 0.06]} />
          <meshBasicMaterial color={healthPercent > 0.5 ? '#00ff88' : '#ff4444'} />
        </mesh>
      </group>
      {/* Team indicator */}
      <pointLight position={[0, 1.6, 0.3]} color={color} intensity={0.3} distance={3} />
    </group>
  );
}

export default function EnemyPlayers() {
  const bots = useGameStore((s) => s.bots);
  const updateBot = useGameStore((s) => s.updateBot);
  const addCyberSoulDrop = useGameStore((s) => s.addCyberSoulDrop);
  const damageTeamLife = useGameStore((s) => s.damageTeamLife);
  const addKillFeedEntry = useGameStore((s) => s.addKillFeedEntry);
  const screen = useGameStore((s) => s.screen);

  const positionsRef = useRef<Map<number, THREE.Vector3>>(new Map());
  const targetsRef = useRef<Map<number, THREE.Vector3>>(new Map());

  // Initialize positions from bots
  bots.forEach((bot) => {
    if (!positionsRef.current.has(bot.id)) {
      positionsRef.current.set(bot.id, new THREE.Vector3(...bot.position));
    }
    if (!targetsRef.current.has(bot.id)) {
      targetsRef.current.set(bot.id, new THREE.Vector3(...bot.targetPosition));
    }
  });

  useFrame((_, delta) => {
    if (screen !== 'battle') return;

    bots.forEach((bot) => {
      // Handle downed bots - countdown to respawn
      if (bot.isDowned) {
        const newDownTimer = bot.downTimer - delta;
        if (newDownTimer <= 0) {
          // Respawn bot
          const spawnX = bot.team === 'alpha' ? -40 + Math.random() * 10 : 30 + Math.random() * 10;
          const spawnZ = (Math.random() - 0.5) * 30;
          const newPos: [number, number, number] = [spawnX, 0, spawnZ];
          positionsRef.current.set(bot.id, new THREE.Vector3(...newPos));
          targetsRef.current.set(bot.id, new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60));
          updateBot(bot.id, {
            health: bot.maxHealth,
            isDowned: false,
            downTimer: 0,
            isAlive: true,
            position: newPos,
          });
        } else {
          updateBot(bot.id, { downTimer: newDownTimer });
        }
        return;
      }

      if (!bot.isAlive) return;

      // Move bot toward target
      const pos = positionsRef.current.get(bot.id);
      const target = targetsRef.current.get(bot.id);
      if (!pos || !target) return;

      const dir = target.clone().sub(pos).normalize();
      pos.add(dir.multiplyScalar(delta * BOT_SPEED));

      // Reached target - pick new random target
      if (pos.distanceTo(target) < 2) {
        target.set(
          (Math.random() - 0.5) * 60,
          0,
          (Math.random() - 0.5) * 60,
        );
        targetsRef.current.set(bot.id, target);
      }

      // Sync position back to store periodically
      const newPos: [number, number, number] = [pos.x, pos.y, pos.z];
      updateBot(bot.id, { position: newPos });
    });
  });

  // Expose a function on window for the shooting system to call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__damageBot = (botId: number, damage: number, playerTeam: string) => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot || bot.isDowned) return;

    const newHealth = Math.max(0, bot.health - damage);

    if (newHealth <= 0) {
      // Bot is downed
      updateBot(botId, { health: 0, isDowned: true, downTimer: BOT_RESPAWN_TIME });

      // Drop cyber soul at bot position
      addCyberSoulDrop({
        position: [...bot.position] as [number, number, number],
        collected: false,
        sourceTeam: bot.team,
      });

      // Damage the downed bot's team life (per-down penalty)
      damageTeamLife(bot.team, 500);

      // Add kill feed entry
      addKillFeedEntry({
        killer: 'You',
        victim: `Bot-${botId}`,
        killerTeam: playerTeam as 'alpha' | 'bravo',
        victimTeam: bot.team,
      });
    } else {
      updateBot(botId, { health: newHealth });
    }
  };

  return (
    <group>
      {bots.map((bot) => (
        <PlayerModel
          key={bot.id}
          position={bot.position}
          team={bot.team}
          health={bot.health}
          maxHealth={bot.maxHealth}
          isDowned={bot.isDowned}
        />
      ))}
    </group>
  );
}
