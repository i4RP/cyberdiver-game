import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

export default function WeaponView() {
  const { camera } = useThree();
  const weaponRef = useRef<THREE.Group>(null);
  const recoilRef = useRef(0);
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && isPointerLocked && screen === 'battle') {
        recoilRef.current = 0.15;
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isPointerLocked, screen]);

  useFrame(() => {
    if (!weaponRef.current || !isPointerLocked) return;

    // Position weapon relative to camera
    const offset = new THREE.Vector3(0.35, -0.3, -0.6);
    offset.applyQuaternion(camera.quaternion);

    weaponRef.current.position.copy(camera.position).add(offset);
    weaponRef.current.quaternion.copy(camera.quaternion);

    // Apply recoil
    if (recoilRef.current > 0) {
      const recoilOffset = new THREE.Vector3(0, 0.02, 0.08).multiplyScalar(recoilRef.current / 0.15);
      recoilOffset.applyQuaternion(camera.quaternion);
      weaponRef.current.position.add(recoilOffset);
      recoilRef.current = Math.max(0, recoilRef.current - 0.01);
    }

    // Slight weapon sway
    const time = Date.now() * 0.001;
    const swayX = Math.sin(time * 1.5) * 0.003;
    const swayY = Math.cos(time * 2) * 0.002;
    weaponRef.current.position.x += swayX;
    weaponRef.current.position.y += swayY;
  });

  if (screen !== 'battle') return null;

  return (
    <group ref={weaponRef}>
      {/* Cyber Rifle body */}
      <mesh castShadow>
        <boxGeometry args={[0.04, 0.06, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#0f3460" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Scope rail */}
      <mesh position={[0, 0.04, -0.05]}>
        <boxGeometry args={[0.02, 0.015, 0.2]} />
        <meshStandardMaterial color="#16213e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.06, 0.05]}>
        <boxGeometry args={[0.03, 0.08, 0.06]} />
        <meshStandardMaterial color="#0f3460" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.06, 0.15]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.025, 0.07, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Neon accent */}
      <mesh position={[0, 0.01, -0.1]}>
        <boxGeometry args={[0.045, 0.005, 0.15]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
      {/* Muzzle flash light (when shooting) */}
      <pointLight position={[0, 0, -0.45]} color="#00ffff" intensity={recoilRef.current > 0 ? 3 : 0} distance={5} />
    </group>
  );
}
