from pydantic import BaseModel
from typing import Optional, List


class CreateBattleRequest(BaseModel):
    bet_amount_matic: float = 0.0


class JoinBattleRequest(BaseModel):
    battle_id: str
    bet_amount_matic: float = 0.0


class GateChoiceRequest(BaseModel):
    battle_id: str
    gate: str  # A, B, C, D, E


class BattleParticipantInfo(BaseModel):
    user_id: str
    username: str
    display_name: str
    team: str
    bet_amount_matic: float
    gate_choice: str


class BattleInfo(BaseModel):
    id: str
    status: str
    team_alpha: List[BattleParticipantInfo]
    team_bravo: List[BattleParticipantInfo]
    team_alpha_life: int
    team_bravo_life: int
    timer_seconds: int
    total_pool_matic: float
    winner: Optional[str] = None
    created_at: str


class BattleResultUpdate(BaseModel):
    battle_id: str
    user_id: str
    damage_dealt: int = 0
    damage_taken: int = 0
    respawn_count: int = 0
    cyber_souls_collected: int = 0
    cyber_souls_lost: int = 0
    support_score: int = 0


class TeamLifeUpdate(BaseModel):
    battle_id: str
    team_alpha_life: int
    team_bravo_life: int


class BattleEndResult(BaseModel):
    battle_id: str
    winner: str  # alpha, bravo, draw
    team_alpha_life: int
    team_bravo_life: int
    participants: List[dict]


class MatchmakingStatus(BaseModel):
    status: str  # waiting, matched, in_battle
    battle_id: Optional[str] = None
    players_count: int = 0
    needed: int = 10
