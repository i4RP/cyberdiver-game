import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const MOVE_SPEED = 15;
const DASH_SPEED = 30;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const PLAYER_HEIGHT = 1.7;
const DASH_DURATION = 0.3;
const DASH_COOLDOWN = 2;

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

  // Set initial camera position
  useEffect(() => {
    camera.position.set(-40, PLAYER_HEIGHT, 0);
    euler.current.setFromQuaternion(camera.quaternion);
  }, [camera]);

  // Pointer lock
  const requestPointerLock = useCallback(() => {
    if (screen === 'battle') {
      gl.domElement.requestPointerLock();
    }
  }, [gl, screen]);

  useEffect(() => {
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === gl.domElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, [gl, setPointerLocked]);

  // Mouse movement for camera rotation
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked) return;
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * sensitivity;
      euler.current.x -= e.movementY * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [camera, sensitivity, isPointerLocked]);

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
    if (screen !== 'battle' || !isPointerLocked) return;

    const speed = isDashing.current ? DASH_SPEED : MOVE_SPEED;
    direction.current.set(0, 0, 0);

    // Get camera forward/right vectors (horizontal only)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (keys.current.forward) direction.current.add(forward);
    if (keys.current.backward) direction.current.sub(forward);
    if (keys.current.left) direction.current.sub(right);
    if (keys.current.right) direction.current.add(right);

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

    // Apply horizontal movement
    velocity.current.x = direction.current.x * speed;
    velocity.current.z = direction.current.z * speed;

    // Jump
    if (keys.current.jump && isOnGround.current) {
      velocity.current.y = JUMP_FORCE;
      isOnGround.current = false;
    }

    // Gravity
    velocity.current.y += GRAVITY * delta;

    // Update position
    camera.position.x += velocity.current.x * delta;
    camera.position.z += velocity.current.z * delta;
    camera.position.y += velocity.current.y * delta;

    // Ground collision
    if (camera.position.y < PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocity.current.y = 0;
      isOnGround.current = true;
    }

    // Map boundaries
    const BOUND = 48;
    camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
    camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));
  });

  return null;
}
