import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import api from '../../services/api';

interface PlayerState {
  userId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  health: number;
  isDowned: boolean;
}

interface BattleEvent {
  type: string;
  data: Record<string, unknown>;
}

export default function WebSocketSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const battle = useGameStore((s) => s.battle);
  const setBattle = useGameStore((s) => s.setBattle);
  const screen = useGameStore((s) => s.screen);

  const connectWs = useCallback(() => {
    if (!battle.battleId || battle.battleId.startsWith('local-')) return;

    const token = api.getToken();
    if (!token) return;

    const wsUrl = api.getBattleWsUrl(battle.battleId);
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => {
      console.log('[WS] Connected to battle server');
    };

    ws.onmessage = (event) => {
      try {
        const msg: BattleEvent = JSON.parse(event.data);
        handleBattleEvent(msg);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from battle server');
    };

    ws.onerror = (err) => {
      console.error('[WS] WebSocket error:', err);
    };

    wsRef.current = ws;
  }, [battle.battleId]);

  const handleBattleEvent = (event: BattleEvent) => {
    switch (event.type) {
      case 'player_joined':
        console.log('[WS] Player joined:', event.data);
        break;

      case 'battle_start':
        setBattle({ status: 'active' });
        break;

      case 'player_state':
        // Update remote player positions (future: update EnemyPlayers)
        break;

      case 'damage':
        // Handle damage events
        break;

      case 'cyber_soul_collected':
        // Handle cyber soul pickup events
        break;

      case 'team_life_update':
        if (event.data.team === 'alpha') {
          setBattle({ teamAlphaLife: event.data.life as number });
        } else {
          setBattle({ teamBravoLife: event.data.life as number });
        }
        break;

      case 'battle_end':
        setBattle({ status: 'completed' });
        break;

      default:
        console.log('[WS] Unknown event:', event.type);
    }
  };

  // Send player state to server (exported for use by FPSController)
  const sendPlayerState = useCallback((state: PlayerState) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'player_state',
        data: state,
      }));
    }
  }, []);

  // Expose sendPlayerState globally for other components
  useEffect(() => {
    (window as any).__cyberdiverSendState = sendPlayerState;
    return () => { delete (window as any).__cyberdiverSendState; };
  }, [sendPlayerState]);

  // Connect when battle starts
  useEffect(() => {
    if (screen === 'battle' && battle.battleId) {
      connectWs();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [screen, battle.battleId, connectWs]);

  return null;
}

export type { PlayerState, BattleEvent };
