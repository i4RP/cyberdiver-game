import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function BattleTimer() {
  const screen = useGameStore((s) => s.screen);
  const setBattle = useGameStore((s) => s.setBattle);
  const setScreen = useGameStore((s) => s.setScreen);
  const cyberGates = useGameStore((s) => s.cyberGates);
  const respawnGate = useGameStore((s) => s.respawnGate);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (screen !== 'battle') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const state = useGameStore.getState();
      const newTimer = state.battle.timer - 1;

      // Check end conditions
      const alphaLife = state.battle.teamAlphaLife;
      const bravoLife = state.battle.teamBravoLife;

      if (newTimer <= 0 || alphaLife <= 0 || bravoLife <= 0) {
        // Determine perfect victory
        const playerTeam = state.battle.team || 'alpha';
        const won = playerTeam === 'alpha'
          ? alphaLife > bravoLife
          : bravoLife > alphaLife;
        const ownLife = playerTeam === 'alpha' ? alphaLife : bravoLife;

        // Perfect victory: won AND own team life is still at 100%
        if (won && ownLife >= 100000) {
          useGameStore.setState({ perfectVictory: true });
        }

        setBattle({ timer: Math.max(0, newTimer), status: 'completed' });
        setScreen('results');
        clearInterval(interval);
        return;
      }

      setBattle({ timer: newTimer });

      // Update gate respawn timers
      cyberGates.forEach((gate) => {
        if (gate.isDestroyed && gate.respawnTimer > 0) {
          const newRespawnTimer = gate.respawnTimer - elapsed;
          if (newRespawnTimer <= 0) {
            respawnGate(gate.id);
          } else {
            // Update timer via store
            useGameStore.setState((s) => ({
              cyberGates: s.cyberGates.map((g) =>
                g.id === gate.id ? { ...g, respawnTimer: newRespawnTimer } : g
              ),
            }));
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, setBattle, setScreen, cyberGates, respawnGate]);

  return null;
}
