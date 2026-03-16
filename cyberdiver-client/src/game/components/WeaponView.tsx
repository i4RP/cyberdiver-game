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
  const currentWeapon = useGameStore((s) => s.currentWeapon);
  const isZoomed = useGameStore((s) => s.isZoomed);
  const isReloading = useGameStore((s) => s.isReloading);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && isPointerLocked && screen === 'battle') {
        recoilRef.current = currentWeapon.recoil;
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isPointerLocked, screen, currentWeapon]);

  useFrame(() => {
    if (!weaponRef.current || !isPointerLocked) return;

    const zoomOffset = isZoomed ? new THREE.Vector3(0, -0.1, -0.3) : new THREE.Vector3(0.35, -0.3, -0.6);
    const offset = zoomOffset.clone();
    offset.applyQuaternion(camera.quaternion);

    weaponRef.current.position.copy(camera.position).add(offset);
    weaponRef.current.quaternion.copy(camera.quaternion);

    // Recoil
    if (recoilRef.current > 0) {
      const recoilMult = currentWeapon.recoil > 0 ? recoilRef.current / currentWeapon.recoil : 0;
      const recoilOffset = new THREE.Vector3(0, 0.02, 0.08).multiplyScalar(recoilMult);
      recoilOffset.applyQuaternion(camera.quaternion);
      weaponRef.current.position.add(recoilOffset);
      recoilRef.current = Math.max(0, recoilRef.current - 0.01);
    }

    // Reload bob animation
    if (isReloading) {
      const time = Date.now() * 0.005;
      const reloadBob = new THREE.Vector3(0, -0.1 + Math.sin(time) * 0.05, 0.1);
      reloadBob.applyQuaternion(camera.quaternion);
      weaponRef.current.position.add(reloadBob);
    }

    // Sway
    const time = Date.now() * 0.001;
    const swayX = Math.sin(time * 1.5) * 0.003;
    const swayY = Math.cos(time * 2) * 0.002;
    weaponRef.current.position.x += swayX;
    weaponRef.current.position.y += swayY;
  });

  if (screen !== 'battle') return null;

  const accent = currentWeapon.accentColor;

  return (
    <group ref={weaponRef}>
      {currentWeapon.id === 'cyber_rifle' && <CyberRifleModel accent={accent} />}
      {currentWeapon.id === 'handgun' && <HandgunModel accent={accent} />}
      {currentWeapon.id === 'sniper_rifle' && <SniperRifleModel accent={accent} />}
      {(currentWeapon.id === 'multi_spray_water' || currentWeapon.id === 'multi_spray_poison') && <MultiSprayModel accent={accent} />}
      {currentWeapon.id === 'grenade' && <GrenadeModel accent={accent} />}
      {currentWeapon.id === 'sentry_gun' && <DeployableModel accent={accent} label="SENTRY" />}
      {currentWeapon.id === 'shield_generator' && <DeployableModel accent={accent} label="SHIELD" />}
      {currentWeapon.id === 'ammo_magazine' && <DeployableModel accent={accent} label="AMMO" />}
      {currentWeapon.id === 'healing_disc' && <DeployableModel accent={accent} label="HEAL" />}
      {currentWeapon.id === 'spy_camera' && <DeployableModel accent={accent} label="RECON" />}
      <pointLight position={[0, 0, -0.45]} color={accent} intensity={recoilRef.current > 0 ? 3 : 0} distance={5} />
    </group>
  );
}

function CyberRifleModel({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.04, 0.06, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#0f3460" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.04, -0.05]}>
        <boxGeometry args={[0.02, 0.015, 0.2]} />
        <meshStandardMaterial color="#16213e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.06, 0.05]}>
        <boxGeometry args={[0.03, 0.08, 0.06]} />
        <meshStandardMaterial color="#0f3460" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.06, 0.15]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.025, 0.07, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, -0.1]}>
        <boxGeometry args={[0.045, 0.005, 0.15]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function HandgunModel({ accent }: { accent: string }) {
  return (
    <group>
      {/* Slide */}
      <mesh castShadow>
        <boxGeometry args={[0.03, 0.04, 0.22]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, -0.005, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.1, 6]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.06, 0.06]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.025, 0.08, 0.035]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.035, 0.02]}>
        <boxGeometry args={[0.02, 0.01, 0.04]} />
        <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Accent line */}
      <mesh position={[0, 0.015, -0.03]}>
        <boxGeometry args={[0.035, 0.004, 0.08]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function SniperRifleModel({ accent }: { accent: string }) {
  return (
    <group>
      {/* Long body */}
      <mesh castShadow>
        <boxGeometry args={[0.035, 0.05, 0.7]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Long barrel */}
      <mesh position={[0, 0, -0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.4, 8]} />
        <meshStandardMaterial color="#0f3460" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Scope */}
      <mesh position={[0, 0.05, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Scope lens */}
      <mesh position={[0, 0.05, -0.19]}>
        <circleGeometry args={[0.018, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, -0.01, 0.3]}>
        <boxGeometry args={[0.03, 0.06, 0.15]} />
        <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.06, 0.1]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.022, 0.07, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Accent */}
      <mesh position={[0, 0.01, -0.15]}>
        <boxGeometry args={[0.04, 0.004, 0.2]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function MultiSprayModel({ accent }: { accent: string }) {
  return (
    <group>
      {/* Tank body */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
        <meshStandardMaterial color="#1a2a2e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Nozzle */}
      <mesh position={[0, 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshStandardMaterial color="#0f3460" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.05, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.025, 0.06, 0.04]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Tank accent ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.042, 0.005, 8, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function GrenadeModel({ accent }: { accent: string }) {
  return (
    <group>
      {/* Grenade body */}
      <mesh castShadow>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#2a2a2e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Pin top */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 6]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Ring */}
      <mesh position={[0.02, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.012, 0.003, 8, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glow band */}
      <mesh>
        <torusGeometry args={[0.052, 0.004, 8, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

function DeployableModel({ accent }: { accent: string; label: string }) {
  return (
    <group>
      {/* Box body */}
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.06, 0.1]} />
        <meshStandardMaterial color="#1a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top plate */}
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.085, 0.005, 0.105]} />
        <meshStandardMaterial color="#0f3460" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.015, 0.02]} />
        <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Indicator light */}
      <mesh position={[0, 0.02, -0.052]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} />
      </mesh>
      {/* Side accent */}
      <mesh position={[0, 0, -0.052]}>
        <boxGeometry args={[0.06, 0.02, 0.002]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
