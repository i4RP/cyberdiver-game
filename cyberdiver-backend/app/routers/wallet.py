from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.schemas.wallet import WalletInfo, DepositRequest, TransactionInfo
from app.services.auth_service import get_current_user
from app.services.wallet_service import (
    get_user_wallet, create_wallet_for_user,
    update_local_balance, record_transaction,
    get_wallet_balance,
)
from app.models.database import get_db

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("/", response_model=WalletInfo)
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await get_user_wallet(user["id"])
    if not wallet:
        wallet = await create_wallet_for_user(user["id"])
    return WalletInfo(
        address=wallet["address"],
        balance_matic=wallet["balance_matic"],
    )


@router.post("/sync-balance")
async def sync_balance(user: dict = Depends(get_current_user)):
    """Sync local balance with on-chain balance."""
    wallet = await get_user_wallet(user["id"])
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    on_chain_balance = await get_wallet_balance(wallet["address"])

    db = await get_db()
    try:
        await db.execute(
            "UPDATE wallets SET balance_matic = ? WHERE user_id = ?",
            (on_chain_balance, user["id"]),
        )
        await db.commit()
    finally:
        await db.close()

    return {"address": wallet["address"], "balance_matic": on_chain_balance}


@router.post("/deposit")
async def deposit(req: DepositRequest, user: dict = Depends(get_current_user)):
    """Record a deposit (in production, verify on-chain tx)."""
    if req.amount_matic <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    wallet = await get_user_wallet(user["id"])
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    await update_local_balance(user["id"], req.amount_matic)
    tx = await record_transaction(
        user_id=user["id"],
        tx_type="deposit",
        amount_matic=req.amount_matic,
        to_address=wallet["address"],
        status="confirmed",
    )
    return {"message": "Deposit recorded", "transaction": tx}


@router.get("/transactions", response_model=List[TransactionInfo])
async def get_transactions(user: dict = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user["id"],),
        )
        rows = [dict(r) async for r in cursor]
        return [TransactionInfo(**r) for r in rows]
    finally:
        await db.close()
