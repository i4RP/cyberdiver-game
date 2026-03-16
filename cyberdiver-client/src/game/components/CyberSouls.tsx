import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CyberSoulProps {
  position: [number, number, number];
  collected?: boolean;
}

function CyberSoul({ position, collected }: CyberSoulProps) {
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
    </group>
  );
}

export default function CyberSouls() {
  // Demo cyber souls scattered on the map
  const souls: [number, number, number][] = [
    [5, 1, 5],
    [-10, 1, 8],
    [12, 1, -7],
    [-5, 1, -12],
    [20, 1, 3],
    [-18, 1, -5],
    [8, 1, 15],
    [-15, 1, 18],
  ];

  return (
    <group>
      {souls.map((pos, i) => (
        <CyberSoul key={i} position={pos} />
      ))}
    </group>
  );
}
