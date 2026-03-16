from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio

from app.schemas.battle import (
    CreateBattleRequest, JoinBattleRequest, GateChoiceRequest,
    BattleInfo, BattleParticipantInfo, BattleResultUpdate,
    TeamLifeUpdate, BattleEndResult, MatchmakingStatus,
)
from app.services.auth_service import get_current_user
from app.services.battle_service import (
    create_battle, find_waiting_battle, join_battle,
    set_gate_choice, start_battle, update_battle_stats,
    update_team_life, end_battle, get_battle_info,
    MAX_PLAYERS_PER_BATTLE,
)
from app.services.wallet_service import update_local_balance
from app.models.database import get_db

router = APIRouter(prefix="/api/battle", tags=["battle"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # battle_id -> set of WebSocket connections
        self.battle_connections: Dict[str, List[WebSocket]] = {}
        # user_id -> WebSocket for matchmaking
        self.matchmaking_connections: Dict[str, WebSocket] = {}

    async def connect_battle(self, battle_id: str, websocket: WebSocket):
        await websocket.accept()
        if battle_id not in self.battle_connections:
            self.battle_connections[battle_id] = []
        self.battle_connections[battle_id].append(websocket)

    def disconnect_battle(self, battle_id: str, websocket: WebSocket):
        if battle_id in self.battle_connections:
            self.battle_connections[battle_id] = [
                ws for ws in self.battle_connections[battle_id] if ws != websocket
            ]

    async def broadcast_battle(self, battle_id: str, message: dict):
        if battle_id in self.battle_connections:
            dead = []
            for ws in self.battle_connections[battle_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.battle_connections[battle_id].remove(ws)

    async def connect_matchmaking(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.matchmaking_connections[user_id] = websocket

    def disconnect_matchmaking(self, user_id: str):
        self.matchmaking_connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.matchmaking_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect_matchmaking(user_id)


manager = ConnectionManager()

# Matchmaking queue
matchmaking_queue: List[dict] = []  # [{user_id, bet_amount, websocket}]


@router.post("/create")
async def create_new_battle(req: CreateBattleRequest, user: dict = Depends(get_current_user)):
    """Create a new battle and join it."""
    battle = await create_battle()
    participant = await join_battle(battle["id"], user["id"], req.bet_amount_matic)

    if req.bet_amount_matic > 0:
        await update_local_balance(user["id"], -req.bet_amount_matic)

    return {"battle_id": battle["id"], "team": participant["team"], "status": "waiting"}


@router.post("/join")
async def join_existing_battle(req: JoinBattleRequest, user: dict = Depends(get_current_user)):
    """Join an existing battle."""
    try:
        participant = await join_battle(req.battle_id, user["id"], req.bet_amount_matic)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if req.bet_amount_matic > 0:
        await update_local_balance(user["id"], -req.bet_amount_matic)

    # Notify other players
    await manager.broadcast_battle(req.battle_id, {
        "type": "player_joined",
        "user_id": user["id"],
        "username": user["username"],
        "team": participant["team"],
    })

    return {"battle_id": req.battle_id, "team": participant["team"]}


@router.post("/matchmake")
async def matchmake(req: CreateBattleRequest, user: dict = Depends(get_current_user)):
    """Auto-matchmake: find or create a battle."""
    # Try to find an existing waiting battle
    battle = await find_waiting_battle()

    if battle:
        try:
            participant = await join_battle(battle["id"], user["id"], req.bet_amount_matic)
            if req.bet_amount_matic > 0:
                await update_local_balance(user["id"], -req.bet_amount_matic)

            await manager.broadcast_battle(battle["id"], {
                "type": "player_joined",
                "user_id": user["id"],
                "username": user["username"],
                "team": participant["team"],
            })

            return {"battle_id": battle["id"], "team": participant["team"], "status": battle["status"]}
        except ValueError:
            pass

    # No waiting battle found, create new one
    new_battle = await create_battle()
    participant = await join_battle(new_battle["id"], user["id"], req.bet_amount_matic)

    if req.bet_amount_matic > 0:
        await update_local_balance(user["id"], -req.bet_amount_matic)

    return {"battle_id": new_battle["id"], "team": participant["team"], "status": "waiting"}


@router.post("/gate")
async def choose_gate(req: GateChoiceRequest, user: dict = Depends(get_current_user)):
    """Choose spawn gate during briefing phase."""
    try:
        await set_gate_choice(req.battle_id, user["id"], req.gate)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await manager.broadcast_battle(req.battle_id, {
        "type": "gate_choice",
        "user_id": user["id"],
        "gate": req.gate,
    })

    return {"message": f"Gate {req.gate} selected"}


@router.post("/start/{battle_id}")
async def start_battle_endpoint(battle_id: str, user: dict = Depends(get_current_user)):
    """Start the battle (transition from briefing to active)."""
    await start_battle(battle_id)

    await manager.broadcast_battle(battle_id, {
        "type": "battle_start",
        "battle_id": battle_id,
    })

    return {"message": "Battle started", "battle_id": battle_id}


@router.post("/update-stats")
async def update_stats(req: BattleResultUpdate, user: dict = Depends(get_current_user)):
    """Update player battle stats (called during battle)."""
    await update_battle_stats(
        battle_id=req.battle_id,
        user_id=req.user_id,
        damage_dealt=req.damage_dealt,
        damage_taken=req.damage_taken,
        respawn_count=req.respawn_count,
        cyber_souls_collected=req.cyber_souls_collected,
        cyber_souls_lost=req.cyber_souls_lost,
        support_score=req.support_score,
    )
    return {"message": "Stats updated"}


@router.post("/update-team-life")
async def update_life(req: TeamLifeUpdate, user: dict = Depends(get_current_user)):
    """Update team life values."""
    await update_team_life(req.battle_id, req.team_alpha_life, req.team_bravo_life)

    await manager.broadcast_battle(req.battle_id, {
        "type": "team_life_update",
        "team_alpha_life": req.team_alpha_life,
        "team_bravo_life": req.team_bravo_life,
    })

    return {"message": "Team life updated"}


@router.post("/end/{battle_id}")
async def end_battle_endpoint(battle_id: str, user: dict = Depends(get_current_user)):
    """End a battle and calculate results."""
    try:
        result = await end_battle(battle_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await manager.broadcast_battle(battle_id, {
        "type": "battle_end",
        **result,
    })

    return result


@router.get("/info/{battle_id}")
async def battle_info(battle_id: str, user: dict = Depends(get_current_user)):
    """Get battle info."""
    info = await get_battle_info(battle_id)
    if not info:
        raise HTTPException(status_code=404, detail="Battle not found")
    return info


@router.get("/active")
async def get_active_battles(user: dict = Depends(get_current_user)):
    """Get all active/waiting battles."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT b.*, COUNT(bp.id) as player_count
               FROM battles b
               LEFT JOIN battle_participants bp ON b.id = bp.battle_id
               WHERE b.status IN ('waiting', 'briefing', 'active')
               GROUP BY b.id
               ORDER BY b.created_at DESC"""
        )
        battles = [dict(r) async for r in cursor]
        return {"battles": battles}
    finally:
        await db.close()


@router.get("/history")
async def get_battle_history(user: dict = Depends(get_current_user)):
    """Get user's battle history."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT b.*, bp.team, bp.bp_earned, bp.damage_dealt, bp.damage_taken,
                      bp.cyber_souls_collected, bp.bet_amount_matic
               FROM battle_participants bp
               JOIN battles b ON bp.battle_id = b.id
               WHERE bp.user_id = ? AND b.status = 'ended'
               ORDER BY b.ended_at DESC
               LIMIT 50""",
            (user["id"],),
        )
        battles = [dict(r) async for r in cursor]
        return {"battles": battles}
    finally:
        await db.close()


# WebSocket endpoint for real-time battle communication
@router.websocket("/ws/{battle_id}")
async def battle_websocket(websocket: WebSocket, battle_id: str):
    await manager.connect_battle(battle_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "player_position":
                # Broadcast player position to all in battle
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "player_shoot":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "player_hit":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "player_down":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "cyber_soul_spawn":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "cyber_soul_collect":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "gate_destroyed":
                await manager.broadcast_battle(battle_id, data)

            elif msg_type == "chat":
                await manager.broadcast_battle(battle_id, data)

            else:
                # Forward any other messages
                await manager.broadcast_battle(battle_id, data)

    except WebSocketDisconnect:
        manager.disconnect_battle(battle_id, websocket)
        await manager.broadcast_battle(battle_id, {
            "type": "player_disconnected",
        })
