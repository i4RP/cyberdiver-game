import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';

// Global touch input state accessible from Three.js components
export const touchInput = {
  moveX: 0,
  moveY: 0,
  aimDeltaX: 0,
  aimDeltaY: 0,
  shooting: false,
  jumping: false,
  reloading: false,
  dashing: false,
  isMobile: isMobileDeviceCheck(),
};

function isMobileDeviceCheck(): boolean {
  if (typeof window === 'undefined') return false;
  // Dev mode: ?mobile=1 forces mobile mode for testing
  if (new URLSearchParams(window.location.search).get('mobile') === '1') return true;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function isMobileDevice(): boolean {
  return isMobileDeviceCheck();
}

export default function TouchControls() {
  const screen = useGameStore((s) => s.screen);
  const isDowned = useGameStore((s) => s.isDowned);
  const currentWeapon = useGameStore((s) => s.currentWeapon);
  const currentWeaponIndex = useGameStore((s) => s.currentWeaponIndex);
  const loadout = useGameStore((s) => s.loadout);
  const switchWeapon = useGameStore((s) => s.switchWeapon);
  const isReloading = useGameStore((s) => s.isReloading);

  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const aimAreaRef = useRef<HTMLDivElement>(null);
  const joystickActive = useRef(false);
  const joystickTouchId = useRef<number | null>(null);
  const aimTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const lastAimPos = useRef({ x: 0, y: 0 });

  const JOYSTICK_RADIUS = 50;

  // Set mobile flag on mount
  useEffect(() => {
    touchInput.isMobile = isMobileDevice();
  }, []);

  // Prevent default touch behaviors on game screen (only touchmove to prevent scroll)
  useEffect(() => {
    if (screen !== 'battle' || !touchInput.isMobile) return;
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [screen]);

  // Joystick touch handlers
  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joystickActive.current = true;
    joystickTouchId.current = touch.identifier;
    updateJoystick(touch.clientX, touch.clientY);
  }, []);

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    // Normalize to -1..1
    touchInput.moveX = clampedX / JOYSTICK_RADIUS;
    touchInput.moveY = -clampedY / JOYSTICK_RADIUS; // Invert Y (up = forward)

    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
      }
    }
  }, [updateJoystick]);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickActive.current = false;
        joystickTouchId.current = null;
        touchInput.moveX = 0;
        touchInput.moveY = 0;
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
        }
      }
    }
  }, []);

  // Aim area touch handlers (right side swipe to look around)
  const handleAimStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    aimTouchId.current = touch.identifier;
    lastAimPos.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleAimMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchId.current) {
        const dx = touch.clientX - lastAimPos.current.x;
        const dy = touch.clientY - lastAimPos.current.y;
        touchInput.aimDeltaX = dx;
        touchInput.aimDeltaY = dy;
        lastAimPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, []);

  const handleAimEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === aimTouchId.current) {
        aimTouchId.current = null;
        touchInput.aimDeltaX = 0;
        touchInput.aimDeltaY = 0;
      }
    }
  }, []);

  // Action button handlers
  // Unified handlers that work with both touch and mouse events (for dev testing)
  const handleShootStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    touchInput.shooting = true;
  }, []);

  const handleShootEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    touchInput.shooting = false;
  }, []);

  const handleJump = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    touchInput.jumping = true;
    setTimeout(() => { touchInput.jumping = false; }, 200);
  }, []);

  const handleReload = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    touchInput.reloading = true;
    setTimeout(() => { touchInput.reloading = false; }, 200);
  }, []);

  const handleDash = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    touchInput.dashing = true;
    setTimeout(() => { touchInput.dashing = false; }, 400);
  }, []);

  const handleSwitchWeapon = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    const next = (currentWeaponIndex + 1) % loadout.length;
    switchWeapon(next);
  }, [currentWeaponIndex, loadout, switchWeapon]);

  if (screen !== 'battle' || !touchInput.isMobile) return null;

  // Detect portrait vs landscape for adaptive layout
  const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Left side - Movement joystick */}
      <div
        ref={joystickRef}
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'bottom-6 left-4 w-24 h-24'
            : 'bottom-4 left-4 w-28 h-28'
        }`}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        {/* Joystick base */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 bg-black/20" />
        {/* Joystick knob */}
        <div
          ref={joystickKnobRef}
          className="absolute top-1/2 left-1/2 -mt-5 -ml-5 w-10 h-10 rounded-full bg-cyan-500/60 border-2 border-cyan-400"
          style={{ transition: 'none' }}
        />
      </div>

      {/* Aim area (invisible touch zone for camera control) */}
      <div
        ref={aimAreaRef}
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'top-0 left-0 w-full h-[60%]'
            : 'top-0 right-0 w-3/5 h-3/4'
        }`}
        onTouchStart={handleAimStart}
        onTouchMove={handleAimMove}
        onTouchEnd={handleAimEnd}
        onTouchCancel={handleAimEnd}
      />

      {/* FIRE button - large */}
      <div
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'bottom-6 right-4 w-16 h-16'
            : 'bottom-4 right-4 w-16 h-16'
        }`}
        onTouchStart={handleShootStart}
        onTouchEnd={handleShootEnd}
        onTouchCancel={handleShootEnd}
        onMouseDown={handleShootStart}
        onMouseUp={handleShootEnd}
      >
        <div className={`w-full h-full rounded-full border-2 flex items-center justify-center ${
          touchInput.shooting ? 'bg-red-600/80 border-red-400' : 'bg-red-900/50 border-red-500/60'
        }`}>
          <div className="w-3 h-3 bg-red-400 rounded-full" />
        </div>
        <div className="text-center text-red-400 text-xs mt-0.5 font-mono">FIRE</div>
      </div>

      {/* JMP button */}
      <div
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'bottom-24 right-20 w-11 h-11'
            : 'bottom-24 right-20 w-12 h-12'
        }`}
        onTouchStart={handleJump}
        onClick={handleJump}
      >
        <div className="w-full h-full rounded-full border-2 border-cyan-500/50 bg-black/40 flex items-center justify-center">
          <span className="text-cyan-400 text-xs font-bold">JMP</span>
        </div>
      </div>

      {/* DSH button */}
      <div
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'bottom-24 right-4 w-11 h-11'
            : 'bottom-24 right-4 w-12 h-12'
        }`}
        onTouchStart={handleDash}
        onClick={handleDash}
      >
        <div className="w-full h-full rounded-full border-2 border-yellow-500/50 bg-black/40 flex items-center justify-center">
          <span className="text-yellow-400 text-xs font-bold">DSH</span>
        </div>
      </div>

      {/* RLD button */}
      <div
        className={`absolute pointer-events-auto ${
          isPortrait
            ? 'bottom-6 right-20 w-11 h-11'
            : 'bottom-4 right-20 w-12 h-12'
        }`}
        onTouchStart={handleReload}
        onClick={handleReload}
      >
        <div className={`w-full h-full rounded-full border-2 flex items-center justify-center ${
          isReloading ? 'border-yellow-400/80 bg-yellow-900/40' : 'border-gray-500/50 bg-black/40'
        }`}>
          <span className="text-gray-300 text-xs font-bold">RLD</span>
        </div>
      </div>

      {/* Weapon switch button - top right */}
      <div
        className="absolute top-14 right-2 pointer-events-auto"
        onTouchStart={handleSwitchWeapon}
        onClick={handleSwitchWeapon}
      >
        <div className="px-2 py-1.5 rounded border border-cyan-600/50 bg-black/60">
          <span className="text-xs font-mono" style={{ color: currentWeapon.accentColor }}>
            {currentWeapon.name.split(' ')[0]}
          </span>
          <span className="text-gray-500 text-xs ml-1">&#x21BB;</span>
        </div>
      </div>

      {/* Downed overlay - no controls when downed */}
      {isDowned && (
        <div className="absolute inset-0 pointer-events-auto" />
      )}
    </div>
  );
}
