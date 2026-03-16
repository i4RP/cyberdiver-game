import { useGameStore } from '../../stores/gameStore';

function Building({ position, size, color = '#334155' }: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
    </mesh>
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
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Grid overlay */}
      <gridHelper args={[200, 40, '#0f3460', '#0f3460']} position={[0, 0.01, 0]} />

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
