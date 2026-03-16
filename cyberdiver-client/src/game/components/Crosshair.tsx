import { useGameStore } from '../../stores/gameStore';

export default function Crosshair() {
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const screen = useGameStore((s) => s.screen);

  if (!isPointerLocked || screen !== 'battle') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Crosshair */}
      <div className="relative">
        <div className="absolute w-6 h-0.5 bg-cyan-400 opacity-80" style={{ left: '-20px', top: '-1px' }} />
        <div className="absolute w-6 h-0.5 bg-cyan-400 opacity-80" style={{ left: '8px', top: '-1px' }} />
        <div className="absolute w-0.5 h-6 bg-cyan-400 opacity-80" style={{ top: '-20px', left: '-1px' }} />
        <div className="absolute w-0.5 h-6 bg-cyan-400 opacity-80" style={{ top: '8px', left: '-1px' }} />
        <div className="absolute w-1 h-1 rounded-full bg-red-500" style={{ top: '-2px', left: '-2px' }} />
      </div>
    </div>
  );
}
