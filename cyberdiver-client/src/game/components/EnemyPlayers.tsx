import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BotPlayer {
  id: number;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  team: 'alpha' | 'bravo';
  health: number;
}

function PlayerModel({ position, team, health }: { position: THREE.Vector3; team: 'alpha' | 'bravo'; health: number }) {
  const ref = useRef<THREE.Group>(null);
  const color = team === 'alpha' ? '#00aaff' : '#ff4444';
  const healthPercent = health / 1000;

  return (
    <group ref={ref} position={position}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
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
      {/* Visor glow */}
      <pointLight position={[0, 1.6, 0.3]} color={color} intensity={0.3} distance={3} />
    </group>
  );
}

export default function EnemyPlayers() {
  const bots = useRef<BotPlayer[]>([
    { id: 1, position: new THREE.Vector3(10, 0, 5), targetPosition: new THREE.Vector3(15, 0, -5), team: 'bravo', health: 1000 },
    { id: 2, position: new THREE.Vector3(20, 0, -10), targetPosition: new THREE.Vector3(5, 0, 10), team: 'bravo', health: 800 },
    { id: 3, position: new THREE.Vector3(15, 0, 15), targetPosition: new THREE.Vector3(-5, 0, -8), team: 'bravo', health: 600 },
    { id: 4, position: new THREE.Vector3(25, 0, 0), targetPosition: new THREE.Vector3(10, 0, 15), team: 'bravo', health: 1000 },
    { id: 5, position: new THREE.Vector3(-5, 0, -5), targetPosition: new THREE.Vector3(-20, 0, 10), team: 'alpha', health: 900 },
    { id: 6, position: new THREE.Vector3(-15, 0, 10), targetPosition: new THREE.Vector3(-5, 0, -15), team: 'alpha', health: 750 },
    { id: 7, position: new THREE.Vector3(-10, 0, -15), targetPosition: new THREE.Vector3(5, 0, 5), team: 'alpha', health: 1000 },
    { id: 8, position: new THREE.Vector3(-20, 0, 0), targetPosition: new THREE.Vector3(-10, 0, -10), team: 'alpha', health: 500 },
  ]);

  useFrame((_, delta) => {
    bots.current.forEach((bot) => {
      const dir = bot.targetPosition.clone().sub(bot.position).normalize();
      bot.position.add(dir.multiplyScalar(delta * 3));

      // If reached target, set new random target
      if (bot.position.distanceTo(bot.targetPosition) < 2) {
        bot.targetPosition.set(
          (Math.random() - 0.5) * 60,
          0,
          (Math.random() - 0.5) * 60,
        );
      }
    });
  });

  return (
    <group>
      {bots.current.map((bot) => (
        <PlayerModel key={bot.id} position={bot.position} team={bot.team} health={bot.health} />
      ))}
    </group>
  );
}
