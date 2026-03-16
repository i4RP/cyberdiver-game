import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function BattleTimer() {
  const screen = useGameStore((s) => s.screen);
  const battle = useGameStore((s) => s.battle);
  const setBattle = useGameStore((s) => s.setBattle);
  const setScreen = useGameStore((s) => s.setScreen);

  useEffect(() => {
    if (screen !== 'battle') return;

    const interval = setInterval(() => {
      const newTimer = battle.timer - 1;
      if (newTimer <= 0) {
        setBattle({ timer: 0, status: 'completed' });
        setScreen('results');
        clearInterval(interval);
      } else {
        setBattle({ timer: newTimer });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, battle.timer, setBattle, setScreen]);

  return null;
}
