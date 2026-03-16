import { useState, useEffect } from 'react';
import { isMobileDevice } from '../game/components/TouchControls';

export default function OrientationLock() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (!mobile) return;

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 100);
    });

    // Try to lock orientation via Screen Orientation API
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch(() => {
          // Orientation lock not supported or not in fullscreen
        });
      }
    } catch {
      // Screen orientation API not available
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] flex flex-col items-center justify-center">
      {/* Rotate phone icon */}
      <div className="mb-6 animate-pulse">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="8" width="40" height="64" rx="6" stroke="#00e5ff" strokeWidth="3" fill="none" />
          <rect x="35" y="64" width="10" height="2" rx="1" fill="#00e5ff" />
          {/* Rotation arrow */}
          <path d="M72 30 C72 18, 60 10, 48 10" stroke="#00e5ff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 6 L48 10 L52 14" stroke="#00e5ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="text-cyan-400 text-xl font-bold mb-2 uppercase tracking-widest">
        ROTATE YOUR DEVICE
      </h2>
      <p className="text-gray-400 text-sm text-center px-8">
        CYBERDIVER is best played in landscape mode.
        Please rotate your device horizontally.
      </p>
    </div>
  );
}
