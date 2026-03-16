import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

function Building({ position, size, color = '#334155' }: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      {/* Main building body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Neon edge lines on top */}
      <mesh position={[0, size[1] / 2 + 0.02, 0]}>
        <boxGeometry args={[size[0] + 0.05, 0.04, size[2] + 0.05]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Window-like panels on front */}
      {size[1] > 4 && (
        <>
          <mesh position={[0, size[1] * 0.15, size[2] / 2 + 0.01]}>
            <planeGeometry args={[size[0] * 0.6, size[1] * 0.25]} />
            <meshStandardMaterial color="#0a1628" emissive="#1a3a5c" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, -size[1] * 0.15, size[2] / 2 + 0.01]}>
            <planeGeometry args={[size[0] * 0.6, size[1] * 0.25]} />
            <meshStandardMaterial color="#0a1628" emissive="#1a3a5c" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function SpawnGate({ position, color }: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[4, 5, 0.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[3, 4, 0.6]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, 3, 1]} color={color} intensity={2} distance={10} />
      {/* Gate label - simple indicator */}
      <mesh position={[0, 3.5, 0.3]}>
        <planeGeometry args={[1, 0.4]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function CyberGateObject({ gateId }: { gateId: string }) {
  const gate = useGameStore((s) => s.cyberGates.find((g) => g.id === gateId));

  if (!gate) return null;

  const color = gate.team === 'alpha' ? '#00ffff' : '#ff4444';
  const healthPercent = gate.health / gate.maxHealth;

  if (gate.isDestroyed) {
    return (
      <group position={gate.position}>
        {/* Destroyed gate - rubble */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[1.5, 1.5, 0.6, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.2} roughness={0.8} />
        </mesh>
        {/* Sparks / damage effect */}
        <pointLight color="#ff6600" intensity={1} distance={5} position={[0, 0.5, 0]} />
        {/* Respawn timer indicator */}
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={gate.position}>
      {/* Gate cylinder */}
      <mesh castShadow name={`cyber-gate-${gate.id}`}>
        <cylinderGeometry args={[1.5, 1.5, 4, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5 * healthPercent}
          transparent
          opacity={0.4 + 0.3 * healthPercent}
        />
      </mesh>
      {/* Health bar background */}
      <mesh position={[0, 3, 0]}>
        <planeGeometry args={[2, 0.2]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      {/* Health bar fill */}
      <mesh position={[(healthPercent - 1) * 1, 3, 0.01]}>
        <planeGeometry args={[2 * healthPercent, 0.15]} />
        <meshBasicMaterial color={healthPercent > 0.5 ? color : '#ff6600'} />
      </mesh>
      <pointLight color={color} intensity={3} distance={15} position={[0, 3, 0]} />
    </group>
  );
}

export default function GameMap() {
  // Create a procedural grid texture for the floor
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // Dark base
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, 512, 512);
    // Grid lines
    ctx.strokeStyle = '#1a3a6a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    // Brighter major grid lines
    ctx.strokeStyle = '#2a5a9a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }, []);

  return (
    <group>
      {/* Reflective cyber floor with grid texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          map={floorTexture}
          color="#1a1a3e"
          metalness={0.7}
          roughness={0.2}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Subtle grid overlay */}
      <gridHelper args={[200, 40, '#0f3460', '#0a1a30']} position={[0, 0.01, 0]} />

      {/* Central area buildings */}
      <Building position={[0, 4, 0]} size={[8, 8, 8]} color="#16213e" />
      <Building position={[15, 3, 10]} size={[6, 6, 6]} color="#1a1a2e" />
      <Building position={[-15, 3, -10]} size={[6, 6, 6]} color="#1a1a2e" />
      <Building position={[20, 2.5, -15]} size={[5, 5, 8]} color="#0f3460" />
      <Building position={[-20, 2.5, 15]} size={[5, 5, 8]} color="#0f3460" />

      {/* Cover walls */}
      <Building position={[8, 1.5, 20]} size={[10, 3, 1]} color="#334155" />
      <Building position={[-8, 1.5, -20]} size={[10, 3, 1]} color="#334155" />
      <Building position={[25, 1.5, 0]} size={[1, 3, 10]} color="#334155" />
      <Building position={[-25, 1.5, 0]} size={[1, 3, 10]} color="#334155" />

      {/* Larger perimeter buildings */}
      <Building position={[35, 5, 25]} size={[10, 10, 10]} color="#16213e" />
      <Building position={[-35, 5, -25]} size={[10, 10, 10]} color="#16213e" />
      <Building position={[35, 4, -30]} size={[8, 8, 12]} color="#1a1a2e" />
      <Building position={[-35, 4, 30]} size={[8, 8, 12]} color="#1a1a2e" />

      {/* Ramps */}
      <mesh position={[10, 1, -5]} rotation={[0, 0, Math.PI * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.5, 4]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      <mesh position={[-10, 1, 5]} rotation={[0, 0, -Math.PI * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.5, 4]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>

      {/* Team Alpha spawn gates (A-E) */}
      <SpawnGate position={[-45, 2.5, -20]} color="#00aaff" />
      <SpawnGate position={[-45, 2.5, -10]} color="#00aaff" />
      <SpawnGate position={[-45, 2.5, 0]} color="#00aaff" />
      <SpawnGate position={[-45, 2.5, 10]} color="#00aaff" />
      <SpawnGate position={[-45, 2.5, 20]} color="#00aaff" />

      {/* Team Bravo spawn gates (A-E) */}
      <SpawnGate position={[45, 2.5, -20]} color="#ff4444" />
      <SpawnGate position={[45, 2.5, -10]} color="#ff4444" />
      <SpawnGate position={[45, 2.5, 0]} color="#ff4444" />
      <SpawnGate position={[45, 2.5, 10]} color="#ff4444" />
      <SpawnGate position={[45, 2.5, 20]} color="#ff4444" />

      {/* Cyber Gates - now interactive */}
      <CyberGateObject gateId="gate-alpha" />
      <CyberGateObject gateId="gate-bravo" />

      {/* Ambient neon lighting */}
      <pointLight position={[0, 15, 0]} color="#e94560" intensity={1} distance={60} />
      <pointLight position={[-30, 10, -20]} color="#00ffff" intensity={0.5} distance={30} />
      <pointLight position={[30, 10, 20]} color="#ff4444" intensity={0.5} distance={30} />

      {/* Fog */}
      <fog attach="fog" args={['#0a0a1a', 30, 120]} />
    </group>
  );
}
