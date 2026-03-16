import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { touchInput } from './TouchControls';

const MOVE_SPEED = 15;
const DASH_SPEED = 30;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const PLAYER_HEIGHT = 1.7;
const DASH_DURATION = 0.3;
const DASH_COOLDOWN = 2;
const RESPAWN_TIME = 5;

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
  shoot: boolean;
}

export default function FPSController() {
  const { camera, gl } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const keys = useRef<KeyState>({
    forward: false, backward: false, left: false, right: false,
    jump: false, dash: false, shoot: false,
  });
  const isOnGround = useRef(true);
  const isDashing = useRef(false);
  const dashTimer = useRef(0);
  const dashCooldown = useRef(0);
  const sensitivity = useGameStore((s) => s.sensitivity);
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const setPointerLocked = useGameStore((s) => s.setPointerLocked);
  const screen = useGameStore((s) => s.screen);

  // Down/respawn state
  const isDowned = useGameStore((s) => s.isDowned);
  const setIsDowned = useGameStore((s) => s.setIsDowned);
  const setHealth = useGameStore((s) => s.setHealth);
  const addDamageTaken = useGameStore((s) => s.addDamageTaken);
  const incrementRespawn = useGameStore((s) => s.incrementRespawn);
  const addDeath = useGameStore((s) => s.addDeath);
  const loseCyberSoul = useGameStore((s) => s.loseCyberSoul);
  const addCyberSoulDrop = useGameStore((s) => s.addCyberSoulDrop);
  const respawnTimer = useGameStore((s) => s.respawnTimer);
  const setRespawnTimer = useGameStore((s) => s.setRespawnTimer);
  const battle = useGameStore((s) => s.battle);
  const damageTeamLife = useGameStore((s) => s.damageTeamLife);

  // Bot damage tracking
  const botDamageTimer = useRef(0);

  // Set initial camera position based on gate
  useEffect(() => {
    const gatePositions: Record<string, [number, number]> = {
      'A': [-43, -20],
      'B': [-43, -10],
      'C': [-43, 0],
      'D': [-43, 10],
      'E': [-43, 20],
    };
    const gate = battle.gate || 'C';
    const pos = gatePositions[gate] || gatePositions['C'];
    camera.position.set(pos[0], PLAYER_HEIGHT, pos[1]);
    euler.current.setFromQuaternion(camera.quaternion);
  }, [camera, battle.gate]);

  // Pointer lock
  const requestPointerLock = useCallback(() => {
    if (screen === 'battle' && !isDowned) {
      gl.domElement.requestPointerLock();
    }
  }, [gl, screen, isDowned]);

  useEffect(() => {
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === gl.domElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, [gl, setPointerLocked]);

  // Mouse movement (desktop)
  useEffect(() => {
    if (touchInput.isMobile) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked || isDowned) return;
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * sensitivity;
      euler.current.x -= e.movementY * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [camera, sensitivity, isPointerLocked, isDowned]);

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = true; break;
        case 'KeyS': keys.current.backward = true; break;
        case 'KeyA': keys.current.left = true; break;
        case 'KeyD': keys.current.right = true; break;
        case 'Space': keys.current.jump = true; break;
        case 'ShiftLeft': keys.current.dash = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = false; break;
        case 'KeyS': keys.current.backward = false; break;
        case 'KeyA': keys.current.left = false; break;
        case 'KeyD': keys.current.right = false; break;
        case 'Space': keys.current.jump = false; break;
        case 'ShiftLeft': keys.current.dash = false; break;
      }
    };

    const onClick = () => {
      requestPointerLock();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    gl.domElement.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      gl.domElement.removeEventListener('click', onClick);
    };
  }, [gl, requestPointerLock]);

  useFrame((_, delta) => {
    if (screen !== 'battle') return;

    // Handle downed state - respawn countdown
    if (isDowned) {
      const newTimer = respawnTimer - delta;
      if (newTimer <= 0) {
        // Respawn
        setIsDowned(false);
        setRespawnTimer(0);
        setHealth(1000);
        incrementRespawn();

        // Move to spawn position
        const spawnX = (battle.team === 'bravo') ? 40 : -40;
        const spawnZ = (Math.random() - 0.5) * 30;
        camera.position.set(spawnX, PLAYER_HEIGHT, spawnZ);
      } else {
        setRespawnTimer(newTimer);
      }
      return; // No movement while downed
    }

    // On mobile, skip pointer lock check and handle touch aim
    if (touchInput.isMobile) {
      // Apply touch aim deltas
      if (touchInput.aimDeltaX !== 0 || touchInput.aimDeltaY !== 0) {
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y -= touchInput.aimDeltaX * sensitivity * 1.5;
        euler.current.x -= touchInput.aimDeltaY * sensitivity * 1.5;
        euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));
        camera.quaternion.setFromEuler(euler.current);
        touchInput.aimDeltaX = 0;
        touchInput.aimDeltaY = 0;
      }
    } else if (!isPointerLocked) return;

    // Simulate bot damage to player (enemy bots shoot at player periodically)
    botDamageTimer.current -= delta;
    if (botDamageTimer.current <= 0) {
      botDamageTimer.current = 2 + Math.random() * 3; // Every 2-5 seconds
      const bots = useGameStore.getState().bots;
      const playerTeam = battle.team || 'alpha';
      const enemyBots = bots.filter((b) => b.team !== playerTeam && !b.isDowned && b.isAlive);

      if (enemyBots.length > 0) {
        // Check if any enemy bot is close enough to shoot
        const closestBot = enemyBots.reduce((closest, bot) => {
          const botPos = new THREE.Vector3(...bot.position);
          const dist = camera.position.distanceTo(botPos);
          if (!closest || dist < closest.dist) return { bot, dist };
          return closest;
        }, null as { bot: typeof enemyBots[0]; dist: number } | null);

        if (closestBot && closestBot.dist < 30) {
          const damage = Math.floor(30 + Math.random() * 50); // 30-80 damage
          const currentHealth = useGameStore.getState().health;
          const newHealth = currentHealth - damage;
          addDamageTaken(damage);

          if (newHealth <= 0) {
            // Player downed!
            setHealth(0);
            setIsDowned(true);
            setRespawnTimer(RESPAWN_TIME);
            addDeath();
            loseCyberSoul();

            // Drop cyber soul at player position
            addCyberSoulDrop({
              position: [camera.position.x, 0.5, camera.position.z],
              collected: false,
              sourceTeam: (playerTeam as 'alpha' | 'bravo'),
            });

            // Damage own team life
            damageTeamLife(playerTeam as 'alpha' | 'bravo', 500);
          } else {
            setHealth(newHealth);
          }
        }
      }
    }

    // Handle touch dash/jump
    if (touchInput.isMobile) {
      keys.current.dash = touchInput.dashing;
      keys.current.jump = touchInput.jumping;
    }

    const speed = isDashing.current ? DASH_SPEED : MOVE_SPEED;
    direction.current.set(0, 0, 0);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // Mobile touch joystick input
    if (touchInput.isMobile && (touchInput.moveX !== 0 || touchInput.moveY !== 0)) {
      direction.current.add(forward.clone().multiplyScalar(touchInput.moveY));
      direction.current.add(right.clone().multiplyScalar(touchInput.moveX));
    } else {
      if (keys.current.forward) direction.current.add(forward);
      if (keys.current.backward) direction.current.sub(forward);
      if (keys.current.left) direction.current.sub(right);
      if (keys.current.right) direction.current.add(right);
    }

    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Dash
    dashCooldown.current = Math.max(0, dashCooldown.current - delta);
    if (keys.current.dash && !isDashing.current && dashCooldown.current <= 0 && direction.current.length() > 0) {
      isDashing.current = true;
      dashTimer.current = DASH_DURATION;
    }
    if (isDashing.current) {
      dashTimer.current -= delta;
      if (dashTimer.current <= 0) {
        isDashing.current = false;
        dashCooldown.current = DASH_COOLDOWN;
      }
    }

    velocity.current.x = direction.current.x * speed;
    velocity.current.z = direction.current.z * speed;

    if (keys.current.jump && isOnGround.current) {
      velocity.current.y = JUMP_FORCE;
      isOnGround.current = false;
    }

    velocity.current.y += GRAVITY * delta;

    camera.position.x += velocity.current.x * delta;
    camera.position.z += velocity.current.z * delta;
    camera.position.y += velocity.current.y * delta;

    if (camera.position.y < PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocity.current.y = 0;
      isOnGround.current = true;
    }

    const BOUND = 48;
    camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
    camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));
  });

  return null;
}
