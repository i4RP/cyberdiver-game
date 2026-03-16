import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

export default function Deployables() {
  const deployables = useGameStore((s) => s.deployables);
  const removeDeployable = useGameStore((s) => s.removeDeployable);
  const screen = useGameStore((s) => s.screen);
  const health = useGameStore((s) => s.health);
  const setHealth = useGameStore((s) => s.setHealth);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const reload = useGameStore((s) => s.reload);
  const addSupportScore = useGameStore((s) => s.addSupportScore);
  const addDamageDealt = useGameStore((s) => s.addDamageDealt);
  const addKill = useGameStore((s) => s.addKill);
  const bots = useGameStore((s) => s.bots);
  const battle = useGameStore((s) => s.battle);

  const healTickRef = useRef(0);
  const sentryTickRef = useRef(0);

  useFrame((state, delta) => {
    if (screen !== 'battle') return;

    const playerPos = state.camera.position;
    const playerTeam = battle.team || 'alpha';

    for (const dep of deployables) {
      if (!dep.isActive) continue;

      // Duration countdown
      const newDuration = dep.duration - delta;
      if (newDuration <= 0) {
        removeDeployable(dep.id);
        continue;
      }
      // We update duration via direct mutation to avoid re-render spam
      dep.duration = newDuration;

      const depPos = new THREE.Vector3(dep.position[0], dep.position[1], dep.position[2]);

      // Healing Disc - heal nearby player
      if (dep.type === 'healing_disc' && dep.team === playerTeam) {
        healTickRef.current += delta;
        if (healTickRef.current >= 1.0) {
          healTickRef.current = 0;
          const dist = playerPos.distanceTo(depPos);
          if (dist < dep.radius && health < maxHealth) {
            setHealth(Math.min(maxHealth, health + 20));
            addSupportScore(5);
          }
        }
      }

      // Ammo Magazine - refill ammo for nearby player
      if (dep.type === 'ammo_magazine' && dep.team === playerTeam) {
        const dist = playerPos.distanceTo(depPos);
        if (dist < dep.radius) {
          reload();
          addSupportScore(3);
          removeDeployable(dep.id);
        }
      }

      // Sentry Gun - auto-attack nearby enemies
      if (dep.type === 'sentry_gun' && dep.team === playerTeam) {
        sentryTickRef.current += delta;
        if (sentryTickRef.current >= 0.5) {
          sentryTickRef.current = 0;
          for (const bot of bots) {
            if (bot.isDowned || bot.team === playerTeam) continue;
            const botPos = new THREE.Vector3(bot.position[0], bot.position[1], bot.position[2]);
            const dist = depPos.distanceTo(botPos);
            if (dist < dep.radius) {
              const damage = 25;
              addDamageDealt(damage);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const damageBotFn = (window as any).__damageBot as
                ((id: number, dmg: number, team: string) => void) | undefined;
              if (damageBotFn) {
                damageBotFn(bot.id, damage, playerTeam);
                if (bot.health - damage <= 0) addKill();
              }
              break; // one target per tick
            }
          }
        }
      }
    }
  });

  if (screen !== 'battle') return null;

  return (
    <group>
      {deployables.map((dep) => (
        <DeployableObject key={dep.id} deployable={dep} />
      ))}
    </group>
  );
}

function DeployableObject({ deployable }: { deployable: { id: number; type: string; team: 'alpha' | 'bravo'; position: [number, number, number]; health: number; maxHealth: number; radius: number; isActive: boolean } }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const teamColor = deployable.team === 'alpha' ? '#00ffff' : '#ff4444';
  const pos = deployable.position;

  const getColor = () => {
    switch (deployable.type) {
      case 'sentry_gun': return '#ff4444';
      case 'shield_generator': return '#00aaff';
      case 'ammo_magazine': return '#ffaa00';
      case 'healing_disc': return '#44ff88';
      case 'spy_camera': return '#aa88ff';
      default: return teamColor;
    }
  };

  const color = getColor();

  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main body */}
      <group ref={meshRef} position={[0, 0.4, 0]}>
        {deployable.type === 'sentry_gun' && (
          <>
            <mesh>
              <boxGeometry args={[0.4, 0.3, 0.6]} />
              <meshStandardMaterial color="#2a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.05, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.3, 6]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
            </mesh>
          </>
        )}

        {deployable.type === 'shield_generator' && (
          <>
            <mesh>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.8} />
            </mesh>
            {/* Shield bubble */}
            <mesh>
              <sphereGeometry args={[deployable.radius * 0.3, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.1} wireframe />
            </mesh>
          </>
        )}

        {deployable.type === 'healing_disc' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.08, 8, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
          </mesh>
        )}

        {deployable.type === 'ammo_magazine' && (
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.4]} />
            <meshStandardMaterial color="#3a2a1a" metalness={0.6} roughness={0.4} />
          </mesh>
        )}

        {deployable.type === 'spy_camera' && (
          <>
            <mesh>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, -0.12]}>
              <cylinderGeometry args={[0.04, 0.06, 0.08, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </mesh>
          </>
        )}
      </group>

      {/* Glow ring */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.02, 8, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>

      {/* Light */}
      <pointLight position={[0, 1, 0]} color={color} intensity={1} distance={8} />

      {/* Health bar */}
      {deployable.health < deployable.maxHealth && (
        <mesh position={[0, 1.2, 0]}>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
