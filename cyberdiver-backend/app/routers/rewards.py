from fastapi import APIRouter, Depends
from typing import List

from app.services.auth_service import get_current_user
from app.services.reward_service import calculate_monthly_distribution, get_user_rewards
from app.models.database import get_db

router = APIRouter(prefix="/api/rewards", tags=["rewards"])


@router.get("/my")
async def my_rewards(user: dict = Depends(get_current_user)):
    """Get current user's reward history."""
    rewards = await get_user_rewards(user["id"])
    return {"rewards": rewards}


@router.get("/leaderboard")
async def leaderboard(user: dict = Depends(get_current_user)):
    """Get BP leaderboard."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, username, display_name, rank, total_bp
               FROM users
               WHERE total_bp > 0
               ORDER BY total_bp DESC
               LIMIT 100"""
        )
        players = [dict(r) async for r in cursor]
        return {"leaderboard": players}
    finally:
        await db.close()


@router.post("/distribute")
async def trigger_distribution(
    period_start: str,
    period_end: str,
    margin_percent: float = 3.5,
    user: dict = Depends(get_current_user),
):
    """Trigger monthly reward distribution (admin endpoint)."""
    result = await calculate_monthly_distribution(period_start, period_end, margin_percent)
    return result


@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """Get overall game stats."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as total FROM users")
        users_count = dict(await cursor.fetchone())["total"]

        cursor = await db.execute("SELECT COUNT(*) as total FROM battles WHERE status = 'ended'")
        battles_count = dict(await cursor.fetchone())["total"]

        cursor = await db.execute(
            "SELECT COALESCE(SUM(total_pool_matic), 0) as total FROM battles WHERE status = 'ended'"
        )
        total_pool = dict(await cursor.fetchone())["total"]

        cursor = await db.execute("SELECT COALESCE(SUM(total_bp), 0) as total FROM users")
        total_bp = dict(await cursor.fetchone())["total"]

        cursor = await db.execute(
            "SELECT COUNT(*) as total FROM battles WHERE status IN ('waiting', 'briefing', 'active')"
        )
        active_battles = dict(await cursor.fetchone())["total"]

        return {
            "total_users": users_count,
            "total_battles_completed": battles_count,
            "total_pool_matic": total_pool,
            "total_bp_distributed": total_bp,
            "active_battles": active_battles,
        }
    finally:
        await db.close()
