from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.auth_service import get_current_user
from app.services.wallet_service import (
    get_user_wallet, update_local_balance, record_transaction, get_wallet_balance,
)
from app.models.database import get_db

router = APIRouter(prefix="/api/economy", tags=["economy"])


class WagerRequest(BaseModel):
    amount_matic: float


class ClaimRewardRequest(BaseModel):
    payout_id: str


class WithdrawRequest(BaseModel):
    amount_matic: float
    to_address: str


# --- Economy Dashboard ---

@router.get("/dashboard")
async def economy_dashboard(user: dict = Depends(get_current_user)):
    """Get the full GameFi economy dashboard data."""
    db = await get_db()
    try:
        # Total pool across all battles
        cursor = await db.execute(
            "SELECT COALESCE(SUM(total_pool_matic), 0) as total FROM battles WHERE status = 'ended'"
        )
        total_pool = dict(await cursor.fetchone())["total"]

        # Current month pool
        cursor = await db.execute(
            """SELECT COALESCE(SUM(total_pool_matic), 0) as total
               FROM battles WHERE status = 'ended'
               AND ended_at >= date('now', 'start of month')"""
        )
        monthly_pool = dict(await cursor.fetchone())["total"]

        # Total distributed rewards
        cursor = await db.execute(
            "SELECT COALESCE(SUM(payout_matic), 0) as total FROM reward_payouts"
        )
        total_distributed = dict(await cursor.fetchone())["total"]

        # Total margin collected
        cursor = await db.execute(
            """SELECT COALESCE(SUM(total_pool_matic * margin_percent / 100.0), 0) as total
               FROM reward_distributions"""
        )
        total_margin = dict(await cursor.fetchone())["total"]

        # Active players this month
        cursor = await db.execute(
            """SELECT COUNT(DISTINCT bp.user_id) as total
               FROM battle_participants bp
               JOIN battles b ON bp.battle_id = b.id
               WHERE b.ended_at >= date('now', 'start of month')"""
        )
        monthly_active = dict(await cursor.fetchone())["total"]

        # Total battles this month
        cursor = await db.execute(
            """SELECT COUNT(*) as total FROM battles
               WHERE status = 'ended' AND ended_at >= date('now', 'start of month')"""
        )
        monthly_battles = dict(await cursor.fetchone())["total"]

        # Current margin rate (starts at 3.5%, decreases over time)
        cursor = await db.execute(
            "SELECT COUNT(*) as total FROM reward_distributions"
        )
        dist_count = dict(await cursor.fetchone())["total"]
        # Decrease margin by 0.5% every 3 months, minimum 0%
        current_margin = max(0, 3.5 - (dist_count // 3) * 0.5)

        # Distribution history
        cursor = await db.execute(
            """SELECT * FROM reward_distributions
               ORDER BY distributed_at DESC LIMIT 12"""
        )
        distributions = [dict(r) async for r in cursor]

        return {
            "total_pool_matic": round(total_pool, 6),
            "monthly_pool_matic": round(monthly_pool, 6),
            "total_distributed_matic": round(total_distributed, 6),
            "total_margin_matic": round(total_margin, 6),
            "monthly_active_players": monthly_active,
            "monthly_battles": monthly_battles,
            "current_margin_percent": current_margin,
            "distributions": distributions,
        }
    finally:
        await db.close()


# --- User Economy Profile ---

@router.get("/profile")
async def user_economy_profile(user: dict = Depends(get_current_user)):
    """Get user's economy profile: wallet, BP, rewards, wager history."""
    db = await get_db()
    try:
        # Wallet info
        wallet = await get_user_wallet(user["id"])
        wallet_info = {
            "address": wallet["address"] if wallet else None,
            "balance_matic": wallet["balance_matic"] if wallet else 0,
        }

        # Total BP
        cursor = await db.execute(
            "SELECT total_bp FROM users WHERE id = ?", (user["id"],)
        )
        row = await cursor.fetchone()
        total_bp = dict(row)["total_bp"] if row else 0

        # Total wagered
        cursor = await db.execute(
            """SELECT COALESCE(SUM(bet_amount_matic), 0) as total
               FROM battle_participants WHERE user_id = ?""",
            (user["id"],),
        )
        total_wagered = dict(await cursor.fetchone())["total"]

        # Total earned from rewards
        cursor = await db.execute(
            """SELECT COALESCE(SUM(payout_matic), 0) as total
               FROM reward_payouts WHERE user_id = ?""",
            (user["id"],),
        )
        total_earned = dict(await cursor.fetchone())["total"]

        # Win/Loss ratio
        cursor = await db.execute(
            """SELECT
                 COUNT(CASE WHEN b.winner = bp.team THEN 1 END) as wins,
                 COUNT(CASE WHEN b.winner IS NOT NULL AND b.winner != bp.team THEN 1 END) as losses,
                 COUNT(*) as total_battles
               FROM battle_participants bp
               JOIN battles b ON bp.battle_id = b.id
               WHERE bp.user_id = ? AND b.status = 'ended'""",
            (user["id"],),
        )
        wl = dict(await cursor.fetchone())

        # Recent transactions
        cursor = await db.execute(
            """SELECT * FROM transactions WHERE user_id = ?
               ORDER BY created_at DESC LIMIT 20""",
            (user["id"],),
        )
        transactions = [dict(r) async for r in cursor]

        # Pending reward payouts
        cursor = await db.execute(
            """SELECT rp.*, rd.period_start, rd.period_end
               FROM reward_payouts rp
               JOIN reward_distributions rd ON rp.distribution_id = rd.id
               WHERE rp.user_id = ? AND rp.status = 'pending'
               ORDER BY rp.created_at DESC""",
            (user["id"],),
        )
        pending_rewards = [dict(r) async for r in cursor]

        # Claimed reward payouts
        cursor = await db.execute(
            """SELECT rp.*, rd.period_start, rd.period_end
               FROM reward_payouts rp
               JOIN reward_distributions rd ON rp.distribution_id = rd.id
               WHERE rp.user_id = ? AND rp.status = 'claimed'
               ORDER BY rp.created_at DESC LIMIT 20""",
            (user["id"],),
        )
        claimed_rewards = [dict(r) async for r in cursor]

        # Monthly BP breakdown
        cursor = await db.execute(
            """SELECT strftime('%Y-%m', b.ended_at) as month,
                      SUM(bp.bp_earned) as bp,
                      SUM(bp.bet_amount_matic) as wagered,
                      COUNT(*) as battles
               FROM battle_participants bp
               JOIN battles b ON bp.battle_id = b.id
               WHERE bp.user_id = ? AND b.status = 'ended'
               GROUP BY month
               ORDER BY month DESC LIMIT 6""",
            (user["id"],),
        )
        monthly_stats = [dict(r) async for r in cursor]

        return {
            "wallet": wallet_info,
            "total_bp": total_bp,
            "total_wagered_matic": round(total_wagered, 6),
            "total_earned_matic": round(total_earned, 6),
            "net_profit_matic": round(total_earned - total_wagered, 6),
            "wins": wl["wins"],
            "losses": wl["losses"],
            "total_battles": wl["total_battles"],
            "win_rate": round(wl["wins"] / max(1, wl["total_battles"]) * 100, 1),
            "transactions": transactions,
            "pending_rewards": pending_rewards,
            "claimed_rewards": claimed_rewards,
            "monthly_stats": monthly_stats,
        }
    finally:
        await db.close()


# --- Wager / Escrow ---

@router.post("/wager")
async def place_wager(req: WagerRequest, user: dict = Depends(get_current_user)):
    """Place a wager (escrow MATIC for upcoming battle)."""
    if req.amount_matic <= 0:
        raise HTTPException(status_code=400, detail="Wager amount must be positive")

    wallet = await get_user_wallet(user["id"])
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    if wallet["balance_matic"] < req.amount_matic:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Deduct from wallet (escrow)
    await update_local_balance(user["id"], -req.amount_matic)

    # Record escrow transaction
    tx = await record_transaction(
        user_id=user["id"],
        tx_type="wager_escrow",
        amount_matic=req.amount_matic,
        from_address=wallet["address"],
        to_address="escrow_pool",
        status="confirmed",
    )

    return {
        "message": f"Wager of {req.amount_matic} MATIC placed in escrow",
        "transaction_id": tx["id"],
        "remaining_balance": wallet["balance_matic"] - req.amount_matic,
    }


@router.post("/wager/refund")
async def refund_wager(req: WagerRequest, user: dict = Depends(get_current_user)):
    """Refund a wager (if battle cancelled or timeout)."""
    wallet = await get_user_wallet(user["id"])
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    await update_local_balance(user["id"], req.amount_matic)

    tx = await record_transaction(
        user_id=user["id"],
        tx_type="wager_refund",
        amount_matic=req.amount_matic,
        from_address="escrow_pool",
        to_address=wallet["address"],
        status="confirmed",
    )

    return {
        "message": f"Wager of {req.amount_matic} MATIC refunded",
        "transaction_id": tx["id"],
        "new_balance": wallet["balance_matic"] + req.amount_matic,
    }


# --- Reward Claims ---

@router.post("/claim-reward")
async def claim_reward(req: ClaimRewardRequest, user: dict = Depends(get_current_user)):
    """Claim a pending reward payout."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT * FROM reward_payouts
               WHERE id = ? AND user_id = ? AND status = 'pending'""",
            (req.payout_id, user["id"]),
        )
        payout = await cursor.fetchone()
        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found or already claimed")

        payout_dict = dict(payout)
        payout_amount = payout_dict["payout_matic"]

        # Credit wallet
        await update_local_balance(user["id"], payout_amount)

        # Record transaction
        wallet = await get_user_wallet(user["id"])
        await record_transaction(
            user_id=user["id"],
            tx_type="reward_claim",
            amount_matic=payout_amount,
            from_address="reward_pool",
            to_address=wallet["address"] if wallet else "",
            status="confirmed",
        )

        # Mark payout as claimed
        await db.execute(
            "UPDATE reward_payouts SET status = 'claimed' WHERE id = ?",
            (req.payout_id,),
        )
        await db.commit()

        return {
            "message": f"Reward of {payout_amount} MATIC claimed",
            "amount_matic": payout_amount,
        }
    finally:
        await db.close()


@router.post("/claim-all-rewards")
async def claim_all_rewards(user: dict = Depends(get_current_user)):
    """Claim all pending reward payouts at once."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT * FROM reward_payouts
               WHERE user_id = ? AND status = 'pending'""",
            (user["id"],),
        )
        payouts = [dict(r) async for r in cursor]

        if not payouts:
            return {"message": "No pending rewards", "total_claimed": 0}

        total = sum(p["payout_matic"] for p in payouts)

        # Credit wallet
        await update_local_balance(user["id"], total)

        # Record transaction
        wallet = await get_user_wallet(user["id"])
        await record_transaction(
            user_id=user["id"],
            tx_type="reward_claim_batch",
            amount_matic=total,
            from_address="reward_pool",
            to_address=wallet["address"] if wallet else "",
            status="confirmed",
        )

        # Mark all as claimed
        payout_ids = [p["id"] for p in payouts]
        placeholders = ",".join(["?"] * len(payout_ids))
        await db.execute(
            f"UPDATE reward_payouts SET status = 'claimed' WHERE id IN ({placeholders})",
            payout_ids,
        )
        await db.commit()

        return {
            "message": f"Claimed {len(payouts)} rewards totaling {total} MATIC",
            "total_claimed": round(total, 6),
            "count": len(payouts),
        }
    finally:
        await db.close()


# --- Withdraw ---

@router.post("/withdraw")
async def withdraw(req: WithdrawRequest, user: dict = Depends(get_current_user)):
    """Withdraw MATIC to an external address (simulated for now)."""
    if req.amount_matic <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    wallet = await get_user_wallet(user["id"])
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    if wallet["balance_matic"] < req.amount_matic:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Gas fee estimation
    gas_fee = 0.001
    net_amount = req.amount_matic - gas_fee

    if net_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount too small after gas fees")

    # Deduct from wallet
    await update_local_balance(user["id"], -req.amount_matic)

    # Record transaction
    tx = await record_transaction(
        user_id=user["id"],
        tx_type="withdrawal",
        amount_matic=req.amount_matic,
        from_address=wallet["address"],
        to_address=req.to_address,
        status="pending",  # Would be 'confirmed' after on-chain tx
    )

    return {
        "message": f"Withdrawal of {net_amount} MATIC initiated (gas: {gas_fee} MATIC)",
        "transaction_id": tx["id"],
        "amount_matic": req.amount_matic,
        "gas_fee_matic": gas_fee,
        "net_amount_matic": round(net_amount, 6),
        "status": "pending",
    }


# --- Token info (Middle Finger Token) ---

@router.get("/token-info")
async def token_info():
    """Get Middle Finger Token (MFT) info."""
    return {
        "name": "Middle Finger Token",
        "symbol": "MFT",
        "network": "Polygon",
        "description": "CYBERDIVER in-game reward token distributed monthly based on Battle Points.",
        "total_supply": "10,000,000",
        "distribution_model": "Zero-sum: All wagers go to pool, distributed monthly by BP ratio",
        "margin_schedule": [
            {"phase": "Launch", "margin_percent": 3.5, "note": "Initial operating margin"},
            {"phase": "Growth", "margin_percent": 2.0, "note": "After 6 months"},
            {"phase": "Mature", "margin_percent": 1.0, "note": "After 12 months"},
            {"phase": "Decentralized", "margin_percent": 0.0, "note": "Full community ownership"},
        ],
    }
