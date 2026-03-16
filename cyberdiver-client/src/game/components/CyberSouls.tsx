import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const COLLECT_DISTANCE = 2.5;
const HEAL_AMOUNT = 200;
const TEAM_LIFE_DAMAGE = 3000;

function CyberSoul({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current && !collected) {
      ref.current.rotation.y += delta * 2;
      ref.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.3;
    }
  });

  if (collected) return null;

  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={1}
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight color="#ff00ff" intensity={2} distance={8} />
      {/* Pickup indicator ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.8, 2, 32]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export default function CyberSouls() {
  const { camera } = useThree();
  const cyberSouls = useGameStore((s) => s.cyberSouls);
  const collectCyberSoul = useGameStore((s) => s.collectCyberSoul);
  const addCyberSoul = useGameStore((s) => s.addCyberSoul);
  const damageTeamLife = useGameStore((s) => s.damageTeamLife);
  const health = useGameStore((s) => s.health);
  const setHealth = useGameStore((s) => s.setHealth);
  const isDowned = useGameStore((s) => s.isDowned);
  const screen = useGameStore((s) => s.screen);
  const battle = useGameStore((s) => s.battle);

  useFrame(() => {
    if (screen !== 'battle' || isDowned) return;

    const playerPos = camera.position;
    const playerTeam = battle.team || 'alpha';

    cyberSouls.forEach((soul) => {
      if (soul.collected) return;

      const soulPos = new THREE.Vector3(...soul.position);
      const dist = playerPos.distanceTo(soulPos);

      if (dist < COLLECT_DISTANCE) {
        collectCyberSoul(soul.id);
        addCyberSoul();

        // Heal player
        setHealth(Math.min(1000, health + HEAL_AMOUNT));

        // Damage enemy team life (collecting enemy soul = big penalty for them)
        if (soul.sourceTeam !== playerTeam) {
          damageTeamLife(soul.sourceTeam as 'alpha' | 'bravo', TEAM_LIFE_DAMAGE);
        }
      }
    });
  });

  return (
    <group>
      {cyberSouls.map((soul) => (
        <CyberSoul key={soul.id} position={soul.position} collected={soul.collected} />
      ))}
    </group>
  );
}
