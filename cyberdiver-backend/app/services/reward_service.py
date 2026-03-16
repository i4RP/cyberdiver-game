import uuid
from datetime import datetime, timezone, timedelta
from typing import List

import aiosqlite
from app.models.database import get_db

DEFAULT_MARGIN_PERCENT = 3.5


async def calculate_monthly_distribution(
    period_start: str,
    period_end: str,
    margin_percent: float = DEFAULT_MARGIN_PERCENT,
) -> dict:
    """
    Calculate and execute monthly reward distribution.

    Zero-sum model:
    - Total pool = sum of all MATIC bet during the period
    - Margin = margin_percent of total pool (goes to operations)
    - Distributable = total pool - margin
    - Each player gets: (their BP / total BP) * distributable amount
    - Gas fees deducted from each payout
    """
    db = await get_db()
    try:
        # Get total pool from battles in the period
        cursor = await db.execute(
            """SELECT COALESCE(SUM(total_pool_matic), 0) as total_pool
               FROM battles
               WHERE status = 'ended'
               AND ended_at >= ? AND ended_at < ?""",
            (period_start, period_end),
        )
        row = await cursor.fetchone()
        total_pool = dict(row)["total_pool"]

        if total_pool <= 0:
            return {"message": "No pool to distribute", "total_pool": 0}

        # Calculate margin and distributable
        margin_amount = total_pool * (margin_percent / 100.0)
        distributable = total_pool - margin_amount

        # Get total BP earned in the period
        cursor = await db.execute(
            """SELECT bp.user_id, SUM(bp.bp_earned) as total_bp
               FROM battle_participants bp
               JOIN battles b ON bp.battle_id = b.id
               WHERE b.status = 'ended'
               AND b.ended_at >= ? AND b.ended_at < ?
               GROUP BY bp.user_id
               HAVING total_bp > 0""",
            (period_start, period_end),
        )
        user_bps = [dict(r) async for r in cursor]

        if not user_bps:
            return {"message": "No BP earned in period", "total_pool": total_pool}

        total_bp = sum(u["total_bp"] for u in user_bps)

        # Create distribution record
        dist_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO reward_distributions (id, period_start, period_end, total_pool_matic, margin_percent)
               VALUES (?, ?, ?, ?, ?)""",
            (dist_id, period_start, period_end, total_pool, margin_percent),
        )

        # Calculate and record each payout
        payouts = []
        estimated_gas = 0.001  # Estimated gas fee per transaction in MATIC

        for user_bp in user_bps:
            bp_share = user_bp["total_bp"] / total_bp
            gross_payout = distributable * bp_share
            net_payout = max(0, gross_payout - estimated_gas)

            payout_id = str(uuid.uuid4())
            await db.execute(
                """INSERT INTO reward_payouts
                   (id, distribution_id, user_id, bp_total, bp_share_percent, payout_matic, gas_fee_matic)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (payout_id, dist_id, user_bp["user_id"],
                 user_bp["total_bp"], bp_share * 100,
                 net_payout, estimated_gas),
            )

            payouts.append({
                "user_id": user_bp["user_id"],
                "bp_total": user_bp["total_bp"],
                "bp_share_percent": round(bp_share * 100, 4),
                "gross_payout_matic": round(gross_payout, 6),
                "gas_fee_matic": estimated_gas,
                "net_payout_matic": round(net_payout, 6),
            })

        await db.commit()

        return {
            "distribution_id": dist_id,
            "period_start": period_start,
            "period_end": period_end,
            "total_pool_matic": total_pool,
            "margin_percent": margin_percent,
            "margin_amount_matic": round(margin_amount, 6),
            "distributable_matic": round(distributable, 6),
            "total_bp": total_bp,
            "payouts": payouts,
        }
    finally:
        await db.close()


async def get_user_rewards(user_id: str) -> List[dict]:
    """Get reward history for a user."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT rp.*, rd.period_start, rd.period_end, rd.total_pool_matic
               FROM reward_payouts rp
               JOIN reward_distributions rd ON rp.distribution_id = rd.id
               WHERE rp.user_id = ?
               ORDER BY rp.created_at DESC""",
            (user_id,),
        )
        return [dict(r) async for r in cursor]
    finally:
        await db.close()
