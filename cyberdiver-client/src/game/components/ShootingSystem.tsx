import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

interface BulletTrail {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  time: number;
}

export default function ShootingSystem() {
  const { camera, scene } = useThree();
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const addDamageDealt = useGameStore((s) => s.addDamageDealt);
  const screen = useGameStore((s) => s.screen);
  const trails = useRef<BulletTrail[]>([]);
  const trailId = useRef(0);
  const lastShot = useRef(0);
  const FIRE_RATE = 0.15; // seconds between shots

  const raycaster = useRef(new THREE.Raycaster());

  const shoot = useCallback(() => {
    if (!isPointerLocked || screen !== 'battle') return;

    const now = performance.now() / 1000;
    if (now - lastShot.current < FIRE_RATE) return;
    lastShot.current = now;

    // Raycast from camera center
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    const start = camera.position.clone();
    let end: THREE.Vector3;

    if (intersects.length > 0) {
      end = intersects[0].point.clone();
      // Check if we hit something damageable (in future: enemy players)
      const hitDistance = intersects[0].distance;
      if (hitDistance < 100) {
        // Simulate damage for now
        addDamageDealt(Math.floor(Math.random() * 30 + 10));
      }
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      end = start.clone().add(dir.multiplyScalar(100));
    }

    // Add bullet trail
    trails.current.push({
      id: trailId.current++,
      start: start.clone().add(new THREE.Vector3(0.3, -0.2, 0)), // Offset for weapon position
      end,
      time: 0.2,
    });
  }, [camera, scene, isPointerLocked, addDamageDealt, screen]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [shoot]);

  useFrame((_, delta) => {
    // Decay trails
    trails.current = trails.current
      .map((t) => ({ ...t, time: t.time - delta }))
      .filter((t) => t.time > 0);
  });

  return (
    <group>
      {trails.current.map((trail) => (
        <BulletTrailMesh key={trail.id} start={trail.start} end={trail.end} opacity={trail.time / 0.2} />
      ))}
    </group>
  );
}

function BulletTrailMesh({ start, end, opacity }: { start: THREE.Vector3; end: THREE.Vector3; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);

  // Create a thin cylinder between start and end points to represent bullet trail
  const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
  const distance = start.distanceTo(end);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh ref={ref} position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.005, 0.005, distance, 4]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={opacity * 0.6} />
    </mesh>
  );
}
