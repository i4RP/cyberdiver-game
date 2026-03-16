import uuid
import json
import math
from datetime import datetime, timezone
from typing import Optional, List

import aiosqlite
from app.models.database import get_db

MAX_PLAYERS_PER_TEAM = 5
MAX_PLAYERS_PER_BATTLE = 10
BATTLE_TIMER_SECONDS = 300
INITIAL_TEAM_LIFE = 100000
BRIEFING_SECONDS = 60


async def create_battle() -> dict:
    """Create a new battle room."""
    db = await get_db()
    try:
        battle_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO battles (id, status, team_alpha_ids, team_bravo_ids,
               team_alpha_life, team_bravo_life, timer_seconds)
               VALUES (?, 'waiting', '[]', '[]', ?, ?, ?)""",
            (battle_id, INITIAL_TEAM_LIFE, INITIAL_TEAM_LIFE, BATTLE_TIMER_SECONDS),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM battles WHERE id = ?", (battle_id,))
        battle = await cursor.fetchone()
        return dict(battle)
    finally:
        await db.close()


async def find_waiting_battle() -> Optional[dict]:
    """Find a battle that's waiting for players."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT b.*, COUNT(bp.id) as player_count
               FROM battles b
               LEFT JOIN battle_participants bp ON b.id = bp.battle_id
               WHERE b.status = 'waiting'
               GROUP BY b.id
               HAVING player_count < ?
               ORDER BY b.created_at ASC
               LIMIT 1""",
            (MAX_PLAYERS_PER_BATTLE,),
        )
        battle = await cursor.fetchone()
        if battle:
            return dict(battle)
        return None
    finally:
        await db.close()


async def join_battle(battle_id: str, user_id: str, bet_amount: float = 0.0) -> dict:
    """Join a battle."""
    db = await get_db()
    try:
        # Check battle exists and is waiting
        cursor = await db.execute("SELECT * FROM battles WHERE id = ?", (battle_id,))
        battle = await cursor.fetchone()
        if not battle:
            raise ValueError("Battle not found")
        battle_dict = dict(battle)
        if battle_dict["status"] not in ("waiting", "briefing"):
            raise ValueError("Battle is not accepting players")

        # Check if user already in this battle
        cursor = await db.execute(
            "SELECT id FROM battle_participants WHERE battle_id = ? AND user_id = ?",
            (battle_id, user_id),
        )
        if await cursor.fetchone():
            raise ValueError("Already in this battle")

        # Count current participants per team
        cursor = await db.execute(
            "SELECT team, COUNT(*) as cnt FROM battle_participants WHERE battle_id = ? GROUP BY team",
            (battle_id,),
        )
        team_counts = {"alpha": 0, "bravo": 0}
        async for row in cursor:
            team_counts[row["team"]] = row["cnt"]

        # Assign to team with fewer players
        team = "alpha" if team_counts["alpha"] <= team_counts["bravo"] else "bravo"

        participant_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO battle_participants (id, battle_id, user_id, team, bet_amount_matic)
               VALUES (?, ?, ?, ?, ?)""",
            (participant_id, battle_id, user_id, team, bet_amount),
        )

        # Update total pool
        await db.execute(
            "UPDATE battles SET total_pool_matic = total_pool_matic + ? WHERE id = ?",
            (bet_amount, battle_id),
        )

        # Update team IDs list
        team_col = "team_alpha_ids" if team == "alpha" else "team_bravo_ids"
        current_ids = json.loads(battle_dict[team_col])
        current_ids.append(user_id)
        await db.execute(
            f"UPDATE battles SET {team_col} = ? WHERE id = ?",
            (json.dumps(current_ids), battle_id),
        )

        # Check if battle is full -> start briefing
        total = team_counts["alpha"] + team_counts["bravo"] + 1
        if total >= MAX_PLAYERS_PER_BATTLE:
            await db.execute(
                "UPDATE battles SET status = 'briefing' WHERE id = ?",
                (battle_id,),
            )

        await db.commit()

        cursor = await db.execute(
            "SELECT * FROM battle_participants WHERE id = ?", (participant_id,)
        )
        participant = await cursor.fetchone()
        return dict(participant)
    finally:
        await db.close()


async def set_gate_choice(battle_id: str, user_id: str, gate: str):
    """Set player's gate choice during briefing."""
    if gate not in ("A", "B", "C", "D", "E"):
        raise ValueError("Invalid gate. Choose A, B, C, D, or E")

    db = await get_db()
    try:
        await db.execute(
            "UPDATE battle_participants SET gate_choice = ? WHERE battle_id = ? AND user_id = ?",
            (gate, battle_id, user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def start_battle(battle_id: str):
    """Transition battle from briefing to active."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE battles SET status = 'active', started_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), battle_id),
        )
        await db.commit()
    finally:
        await db.close()


async def update_battle_stats(
    battle_id: str,
    user_id: str,
    damage_dealt: int = 0,
    damage_taken: int = 0,
    respawn_count: int = 0,
    cyber_souls_collected: int = 0,
    cyber_souls_lost: int = 0,
    support_score: int = 0,
):
    """Update player stats during battle."""
    db = await get_db()
    try:
        await db.execute(
            """UPDATE battle_participants SET
               damage_dealt = damage_dealt + ?,
               damage_taken = damage_taken + ?,
               respawn_count = respawn_count + ?,
               cyber_souls_collected = cyber_souls_collected + ?,
               cyber_souls_lost = cyber_souls_lost + ?,
               support_score = support_score + ?
               WHERE battle_id = ? AND user_id = ?""",
            (damage_dealt, damage_taken, respawn_count,
             cyber_souls_collected, cyber_souls_lost, support_score,
             battle_id, user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def update_team_life(battle_id: str, team_alpha_life: int, team_bravo_life: int):
    """Update team life values."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE battles SET team_alpha_life = ?, team_bravo_life = ? WHERE id = ?",
            (team_alpha_life, team_bravo_life, battle_id),
        )
        await db.commit()
    finally:
        await db.close()


def calculate_bp(
    damage_dealt: int,
    damage_taken: int,
    respawn_count: int,
    cyber_souls_collected: int,
    cyber_souls_lost: int,
    won: bool,
    final_team_life: int,
    perfect_victory: bool,
    support_score: int,
    rank_multiplier: float = 1.0,
    penalty: float = 0.0,
    bet_amount: float = 0.0,
) -> float:
    """
    Calculate Battle Points based on 11 variables from the PDF spec.

    Variables:
    - damage_dealt: Damage dealt to enemies
    - damage_taken: Damage received
    - respawn_count: Number of respawns (fewer is better)
    - cyber_souls_collected: Cyber Souls picked up
    - cyber_souls_lost: Cyber Souls lost when downed
    - won: Whether the player's team won
    - final_team_life: Remaining team life
    - perfect_victory: Enemy team life reduced to 0
    - support_score: Support actions for teammates
    - rank_multiplier: Based on rank tier
    - penalty: Deduction for bad behavior
    - bet_amount: Wagered MATIC (higher bet = higher BP potential)
    """
    # Base combat score
    combat_score = (damage_dealt * 0.1) - (damage_taken * 0.03) - (respawn_count * 50)

    # Cyber Soul score
    soul_score = (cyber_souls_collected * 200) - (cyber_souls_lost * 100)

    # Win/loss bonus
    win_bonus = 500 if won else 0

    # Team life bonus (percentage of remaining life)
    life_bonus = (final_team_life / INITIAL_TEAM_LIFE) * 300

    # Perfect victory bonus
    perfect_bonus = 1000 if perfect_victory else 0

    # Support bonus
    support_bonus = support_score * 50

    # Combine all factors
    raw_bp = combat_score + soul_score + win_bonus + life_bonus + perfect_bonus + support_bonus

    # Apply rank multiplier
    raw_bp *= rank_multiplier

    # Apply bet multiplier (higher bet = more BP, but also more risk)
    bet_multiplier = 1.0 + (math.log(1 + bet_amount) * 0.5) if bet_amount > 0 else 1.0
    raw_bp *= bet_multiplier

    # Apply penalty
    raw_bp -= penalty

    # Minimum 0 BP
    return max(0.0, round(raw_bp, 2))


async def end_battle(battle_id: str) -> dict:
    """End a battle and calculate results."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM battles WHERE id = ?", (battle_id,))
        battle = await cursor.fetchone()
        if not battle:
            raise ValueError("Battle not found")
        battle_dict = dict(battle)

        # Determine winner
        alpha_life = battle_dict["team_alpha_life"]
        bravo_life = battle_dict["team_bravo_life"]

        if alpha_life > bravo_life:
            winner = "alpha"
        elif bravo_life > alpha_life:
            winner = "bravo"
        else:
            winner = "draw"

        perfect_alpha = bravo_life <= 0
        perfect_bravo = alpha_life <= 0

        # Get all participants
        cursor = await db.execute(
            "SELECT * FROM battle_participants WHERE battle_id = ?", (battle_id,)
        )
        participants = [dict(row) async for row in cursor]

        # Calculate BP for each participant
        results = []
        for p in participants:
            is_alpha = p["team"] == "alpha"
            won = (winner == "alpha" and is_alpha) or (winner == "bravo" and not is_alpha)
            final_life = alpha_life if is_alpha else bravo_life
            perfect = perfect_alpha if is_alpha else perfect_bravo

            bp = calculate_bp(
                damage_dealt=p["damage_dealt"],
                damage_taken=p["damage_taken"],
                respawn_count=p["respawn_count"],
                cyber_souls_collected=p["cyber_souls_collected"],
                cyber_souls_lost=p["cyber_souls_lost"],
                won=won,
                final_team_life=final_life,
                perfect_victory=perfect,
                support_score=p["support_score"],
                bet_amount=p["bet_amount_matic"],
            )

            # Update participant BP
            await db.execute(
                "UPDATE battle_participants SET bp_earned = ? WHERE id = ?",
                (bp, p["id"]),
            )

            # Update user total BP
            await db.execute(
                "UPDATE users SET total_bp = total_bp + ? WHERE id = ?",
                (bp, p["user_id"]),
            )

            # Record in BP ledger
            ledger_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO bp_ledger (id, user_id, battle_id, amount, reason) VALUES (?, ?, ?, ?, ?)",
                (ledger_id, p["user_id"], battle_id, bp, f"battle_{'win' if won else 'loss'}"),
            )

            results.append({
                "user_id": p["user_id"],
                "team": p["team"],
                "bp_earned": bp,
                "damage_dealt": p["damage_dealt"],
                "damage_taken": p["damage_taken"],
                "cyber_souls_collected": p["cyber_souls_collected"],
                "won": won,
            })

        # Update battle status
        await db.execute(
            """UPDATE battles SET status = 'ended', winner = ?,
               ended_at = ?, team_alpha_life = ?, team_bravo_life = ?
               WHERE id = ?""",
            (winner, datetime.now(timezone.utc).isoformat(), alpha_life, bravo_life, battle_id),
        )
        await db.commit()

        return {
            "battle_id": battle_id,
            "winner": winner,
            "team_alpha_life": alpha_life,
            "team_bravo_life": bravo_life,
            "participants": results,
        }
    finally:
        await db.close()


async def get_battle_info(battle_id: str) -> Optional[dict]:
    """Get full battle info with participants."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM battles WHERE id = ?", (battle_id,))
        battle = await cursor.fetchone()
        if not battle:
            return None

        battle_dict = dict(battle)

        cursor = await db.execute(
            """SELECT bp.*, u.username, u.display_name
               FROM battle_participants bp
               JOIN users u ON bp.user_id = u.id
               WHERE bp.battle_id = ?""",
            (battle_id,),
        )
        participants = [dict(row) async for row in cursor]

        battle_dict["participants"] = participants
        return battle_dict
    finally:
        await db.close()
