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
  const addKill = useGameStore((s) => s.addKill);
  const screen = useGameStore((s) => s.screen);
  const isDowned = useGameStore((s) => s.isDowned);
  const ammo = useGameStore((s) => s.ammo);
  const setAmmo = useGameStore((s) => s.setAmmo);
  const reload = useGameStore((s) => s.reload);
  const bots = useGameStore((s) => s.bots);
  const damageGate = useGameStore((s) => s.damageGate);
  const addGateDestroyed = useGameStore((s) => s.addGateDestroyed);
  const damageTeamLife = useGameStore((s) => s.damageTeamLife);
  const cyberGates = useGameStore((s) => s.cyberGates);
  const battle = useGameStore((s) => s.battle);
  const trails = useRef<BulletTrail[]>([]);
  const trailId = useRef(0);
  const lastShot = useRef(0);
  const FIRE_RATE = 0.15;
  const DAMAGE_PER_SHOT = 50;

  const raycaster = useRef(new THREE.Raycaster());

  // Reload on R key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && screen === 'battle' && !isDowned) {
        reload();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [screen, isDowned, reload]);

  const shoot = useCallback(() => {
    if (!isPointerLocked || screen !== 'battle' || isDowned) return;
    if (ammo <= 0) return;

    const now = performance.now() / 1000;
    if (now - lastShot.current < FIRE_RATE) return;
    lastShot.current = now;

    setAmmo(ammo - 1);

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    const start = camera.position.clone();
    let end: THREE.Vector3;
    let hitSomething = false;

    if (intersects.length > 0) {
      // Find first meaningful hit (skip ground and far objects)
      for (const hit of intersects) {
        if (hit.distance > 100) continue;

        end = hit.point.clone();

        // Check if we hit a bot
        let hitObject: THREE.Object3D | null = hit.object;
        while (hitObject) {
          // Check if parent group corresponds to a bot
          if (hitObject.parent) {
            const groupPos = hitObject.parent.position;
            const playerTeam = battle.team || 'alpha';

            // Check against enemy bots
            for (const bot of bots) {
              if (bot.isDowned || bot.team === playerTeam) continue;
              const botPos = new THREE.Vector3(bot.position[0], bot.position[1], bot.position[2]);
              const dist = groupPos.distanceTo(botPos);
              if (dist < 2) {
                // Hit this bot!
                addDamageDealt(DAMAGE_PER_SHOT);

                // Use the window function to damage the bot
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const damageBotFn = (window as any).__damageBot as
                  ((id: number, dmg: number, team: string) => void) | undefined;
                if (damageBotFn) {
                  damageBotFn(bot.id, DAMAGE_PER_SHOT, playerTeam);
                  if (bot.health - DAMAGE_PER_SHOT <= 0) {
                    addKill();
                  }
                }
                hitSomething = true;
                break;
              }
            }

            // Check against cyber gates
            for (const gate of cyberGates) {
              if (gate.isDestroyed) continue;
              // Only damage enemy gates
              const playerTeamStr = battle.team || 'alpha';
              if (gate.team === playerTeamStr) continue;

              const gatePos = new THREE.Vector3(gate.position[0], gate.position[1], gate.position[2]);
              const dist = hit.point.distanceTo(gatePos);
              if (dist < 3) {
                damageGate(gate.id, DAMAGE_PER_SHOT);
                addDamageDealt(DAMAGE_PER_SHOT);
                if (gate.health - DAMAGE_PER_SHOT <= 0) {
                  addGateDestroyed();
                  // Destroying gate damages team life heavily
                  damageTeamLife(gate.team, 5000);
                }
                hitSomething = true;
                break;
              }
            }
          }
          if (hitSomething) break;
          hitObject = hitObject.parent;
        }

        if (!hitSomething) {
          end = hit.point.clone();
        }
        break;
      }

      if (!end!) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        end = start.clone().add(dir.multiplyScalar(100));
      }
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      end = start.clone().add(dir.multiplyScalar(100));
    }

    trails.current.push({
      id: trailId.current++,
      start: start.clone().add(new THREE.Vector3(0.3, -0.2, 0)),
      end: end!,
      time: 0.2,
    });
  }, [camera, scene, isPointerLocked, addDamageDealt, addKill, screen, isDowned, ammo, setAmmo, bots, battle, cyberGates, damageGate, addGateDestroyed, damageTeamLife]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [shoot]);

  useFrame((_, delta) => {
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
