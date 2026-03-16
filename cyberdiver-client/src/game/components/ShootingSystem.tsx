import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { touchInput } from './TouchControls';

interface BulletTrail {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  time: number;
  color: string;
}

interface GrenadeProjectile {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  time: number;
  blastRadius: number;
  damage: number;
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
  const currentWeapon = useGameStore((s) => s.currentWeapon);
  const isReloading = useGameStore((s) => s.isReloading);
  const setIsReloading = useGameStore((s) => s.setIsReloading);
  const setReloadTimer = useGameStore((s) => s.setReloadTimer);
  const reloadTimer = useGameStore((s) => s.reloadTimer);
  const switchWeapon = useGameStore((s) => s.switchWeapon);
  const loadout = useGameStore((s) => s.loadout);
  const currentWeaponIndex = useGameStore((s) => s.currentWeaponIndex);
  const weaponSwitchCooldown = useGameStore((s) => s.weaponSwitchCooldown);
  const setWeaponSwitchCooldown = useGameStore((s) => s.setWeaponSwitchCooldown);
  const isZoomed = useGameStore((s) => s.isZoomed);
  const setIsZoomed = useGameStore((s) => s.setIsZoomed);
  const addDeployable = useGameStore((s) => s.addDeployable);
  const addSupportScore = useGameStore((s) => s.addSupportScore);
  const grenadeCount = useGameStore((s) => s.grenadeCount);
  const setGrenadeCount = useGameStore((s) => s.setGrenadeCount);

  const trails = useRef<BulletTrail[]>([]);
  const grenades = useRef<GrenadeProjectile[]>([]);
  const trailId = useRef(0);
  const grenadeId = useRef(0);
  const lastShot = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());

  // Weapon switching with number keys + scroll wheel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'battle' || isDowned) return;

      if (e.code === 'Digit1') switchWeapon(0);
      else if (e.code === 'Digit2') switchWeapon(1);
      else if (e.code === 'Digit3' && loadout.length > 2) switchWeapon(2);

      // R to reload
      if (e.code === 'KeyR' && currentWeapon.fireMode !== 'deploy' && currentWeapon.fireMode !== 'throw') {
        if (!isReloading && ammo < currentWeapon.magazineSize) {
          setIsReloading(true);
          setReloadTimer(currentWeapon.reloadTime);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (screen !== 'battle' || isDowned) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = (currentWeaponIndex + dir + loadout.length) % loadout.length;
      switchWeapon(next);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', onWheel);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('wheel', onWheel);
    };
  }, [screen, isDowned, currentWeapon, isReloading, ammo, currentWeaponIndex, loadout, switchWeapon, setIsReloading, setReloadTimer, reload]);

  // Right-click zoom for sniper
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (screen !== 'battle' || isDowned || !isPointerLocked) return;
      if (currentWeapon.zoomLevel) {
        setIsZoomed(!isZoomed);
      }
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [screen, isDowned, isPointerLocked, currentWeapon, isZoomed, setIsZoomed]);

  const handleHitDetection = useCallback((hitPoint: THREE.Vector3, damage: number) => {
    const playerTeam = battle.team || 'alpha';
    let hitSomething = false;

    for (const bot of bots) {
      if (bot.isDowned || bot.team === playerTeam) continue;
      const botPos = new THREE.Vector3(bot.position[0], bot.position[1] + 1, bot.position[2]);
      const dist = hitPoint.distanceTo(botPos);
      if (dist < 3) {
        addDamageDealt(damage);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const damageBotFn = (window as any).__damageBot as
          ((id: number, dmg: number, team: string) => void) | undefined;
        if (damageBotFn) {
          damageBotFn(bot.id, damage, playerTeam);
          if (bot.health - damage <= 0) addKill();
        }
        hitSomething = true;
        break;
      }
    }

    if (!hitSomething) {
      for (const gate of cyberGates) {
        if (gate.isDestroyed || gate.team === playerTeam) continue;
        const gatePos = new THREE.Vector3(gate.position[0], gate.position[1], gate.position[2]);
        const dist = hitPoint.distanceTo(gatePos);
        if (dist < 3) {
          damageGate(gate.id, damage);
          addDamageDealt(damage);
          if (gate.health - damage <= 0) {
            addGateDestroyed();
            damageTeamLife(gate.team, 5000);
          }
          hitSomething = true;
          break;
        }
      }
    }
    return hitSomething;
  }, [bots, battle, cyberGates, addDamageDealt, addKill, damageGate, addGateDestroyed, damageTeamLife]);

  const shoot = useCallback(() => {
    if (screen !== 'battle' || isDowned) return;
    if (!touchInput.isMobile && !isPointerLocked) return;
    if (isReloading || weaponSwitchCooldown > 0) return;

    const now = performance.now() / 1000;
    if (now - lastShot.current < currentWeapon.fireRate) return;
    lastShot.current = now;

    // Deployable weapons
    if (currentWeapon.fireMode === 'deploy') {
      if (ammo <= 0) return;
      setAmmo(ammo - 1);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const deployPos = camera.position.clone().add(dir.multiplyScalar(3));
      deployPos.y = 0.5;
      const playerTeam = (battle.team || 'alpha') as 'alpha' | 'bravo';
      addDeployable({
        type: currentWeapon.id,
        team: playerTeam,
        position: [deployPos.x, deployPos.y, deployPos.z],
        health: currentWeapon.deployHealth || 200,
        maxHealth: currentWeapon.deployHealth || 200,
        duration: currentWeapon.deployDuration || 30,
        radius: currentWeapon.deployRadius || 5,
        isActive: true,
      });
      addSupportScore(10);
      return;
    }

    // Grenades
    if (currentWeapon.fireMode === 'throw') {
      if (grenadeCount <= 0) return;
      setGrenadeCount(grenadeCount - 1);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      grenades.current.push({
        id: grenadeId.current++,
        position: camera.position.clone(),
        velocity: dir.multiplyScalar(25).add(new THREE.Vector3(0, 8, 0)),
        time: 2.0,
        blastRadius: currentWeapon.blastRadius || 8,
        damage: currentWeapon.damage,
      });
      return;
    }

    // Normal shooting
    if (ammo <= 0) {
      if (!isReloading) {
        setIsReloading(true);
        setReloadTimer(currentWeapon.reloadTime);
      }
      return;
    }

    setAmmo(ammo - 1);

    const spreadX = (Math.random() - 0.5) * currentWeapon.spread;
    const spreadY = (Math.random() - 0.5) * currentWeapon.spread;
    raycaster.current.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    const start = camera.position.clone();
    let end: THREE.Vector3;

    if (intersects.length > 0) {
      for (const hit of intersects) {
        if (hit.distance > currentWeapon.range) continue;
        end = hit.point.clone();
        handleHitDetection(hit.point, currentWeapon.damage);
        break;
      }
      if (!end!) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        end = start.clone().add(dir.multiplyScalar(currentWeapon.range));
      }
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      end = start.clone().add(dir.multiplyScalar(currentWeapon.range));
    }

    trails.current.push({
      id: trailId.current++,
      start: start.clone().add(new THREE.Vector3(0.3, -0.2, 0)),
      end: end!,
      time: currentWeapon.fireMode === 'spray' ? 0.1 : 0.2,
      color: currentWeapon.trailColor,
    });
  }, [camera, scene, isPointerLocked, screen, isDowned, ammo, setAmmo, currentWeapon, isReloading, setIsReloading, setReloadTimer, weaponSwitchCooldown, battle, handleHitDetection, addDeployable, addSupportScore, grenadeCount, setGrenadeCount, reload]);

  // Desktop: mouse click to shoot
  useEffect(() => {
    if (touchInput.isMobile) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [shoot]);

  // Mobile: touch shoot via touchInput flag
  const touchShootTimer = useRef(0);
  useEffect(() => {
    if (!touchInput.isMobile) return;
  }, []);

  useFrame((_, delta) => {
    // Mobile: touch shooting (continuous fire while holding)
    if (touchInput.isMobile && touchInput.shooting) {
      touchShootTimer.current -= delta;
      if (touchShootTimer.current <= 0) {
        shoot();
        touchShootTimer.current = currentWeapon.fireRate;
      }
    }

    // Mobile: touch reload
    if (touchInput.isMobile && touchInput.reloading) {
      if (!isReloading && ammo < currentWeapon.magazineSize && currentWeapon.fireMode !== 'deploy' && currentWeapon.fireMode !== 'throw') {
        setIsReloading(true);
        setReloadTimer(currentWeapon.reloadTime);
      }
    }

    // Reload timer
    if (isReloading && reloadTimer > 0) {
      const newTimer = reloadTimer - delta;
      if (newTimer <= 0) {
        reload();
      } else {
        setReloadTimer(newTimer);
      }
    }

    // Weapon switch cooldown
    if (weaponSwitchCooldown > 0) {
      setWeaponSwitchCooldown(Math.max(0, weaponSwitchCooldown - delta));
    }

    // Update bullet trails
    trails.current = trails.current
      .map((t) => ({ ...t, time: t.time - delta }))
      .filter((t) => t.time > 0);

    // Update grenade projectiles
    grenades.current = grenades.current.map((g) => {
      g.velocity.y -= 15 * delta;
      g.position.add(g.velocity.clone().multiplyScalar(delta));
      g.time -= delta;

      if (g.position.y <= 0.5 || g.time <= 0) {
        g.position.y = Math.max(0.5, g.position.y);
        const playerTeam = battle.team || 'alpha';
        const allBots = useGameStore.getState().bots;
        for (const bot of allBots) {
          if (bot.isDowned || bot.team === playerTeam) continue;
          const botPos = new THREE.Vector3(bot.position[0], bot.position[1], bot.position[2]);
          const dist = g.position.distanceTo(botPos);
          if (dist < g.blastRadius) {
            const falloffDamage = Math.floor(g.damage * (1 - dist / g.blastRadius));
            addDamageDealt(falloffDamage);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const damageBotFn = (window as any).__damageBot as
              ((id: number, dmg: number, team: string) => void) | undefined;
            if (damageBotFn) {
              damageBotFn(bot.id, falloffDamage, playerTeam);
              if (bot.health - falloffDamage <= 0) addKill();
            }
          }
        }
        g.time = -1;
      }
      return g;
    }).filter((g) => g.time > -1);
  });

  return (
    <group>
      {trails.current.map((trail) => (
        <BulletTrailMesh key={trail.id} start={trail.start} end={trail.end} opacity={trail.time / 0.2} color={trail.color} />
      ))}
      {grenades.current.map((g) => (
        <mesh key={g.id} position={g.position}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

function BulletTrailMesh({ start, end, opacity, color }: { start: THREE.Vector3; end: THREE.Vector3; opacity: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
  const distance = start.distanceTo(end);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh ref={ref} position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.005, 0.005, distance, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity * 0.6} />
    </mesh>
  );
}
