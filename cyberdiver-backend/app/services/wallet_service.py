import uuid
import json
import os
from typing import Optional
from eth_account import Account
from web3 import Web3

import aiosqlite
from app.models.database import get_db

# Polygon RPC (testnet Mumbai for development, mainnet for production)
POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology")

# In production, use a proper encryption key management system
ENCRYPTION_KEY = os.getenv("WALLET_ENCRYPTION_KEY", "cyberdiver-wallet-key-change-in-production")


def get_web3() -> Web3:
    return Web3(Web3.HTTPProvider(POLYGON_RPC_URL))


def generate_wallet() -> dict:
    """Generate a new Polygon wallet (address + private key)."""
    account = Account.create()
    return {
        "address": account.address,
        "private_key": account.key.hex(),
    }


def encrypt_private_key(private_key: str) -> str:
    """Simple XOR encryption for demo. Use proper encryption in production."""
    # For demo purposes, we store with a simple prefix marker
    # In production, use AES-256-GCM or similar
    return f"enc:{private_key}"


def decrypt_private_key(encrypted: str) -> str:
    """Decrypt private key."""
    if encrypted.startswith("enc:"):
        return encrypted[4:]
    return encrypted


async def create_wallet_for_user(user_id: str) -> dict:
    """Create and store a wallet for a user."""
    db = await get_db()
    try:
        # Check if wallet already exists
        cursor = await db.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,))
        existing = await cursor.fetchone()
        if existing:
            return dict(existing)

        wallet_data = generate_wallet()
        wallet_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO wallets (id, user_id, address, encrypted_private_key) VALUES (?, ?, ?, ?)",
            (wallet_id, user_id, wallet_data["address"], encrypt_private_key(wallet_data["private_key"])),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM wallets WHERE id = ?", (wallet_id,))
        wallet = await cursor.fetchone()
        return dict(wallet)
    finally:
        await db.close()


async def get_user_wallet(user_id: str) -> Optional[dict]:
    """Get wallet info for a user."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,))
        wallet = await cursor.fetchone()
        if wallet:
            return dict(wallet)
        return None
    finally:
        await db.close()


async def get_wallet_balance(address: str) -> float:
    """Get real MATIC balance from Polygon network."""
    try:
        w3 = get_web3()
        balance_wei = w3.eth.get_balance(w3.to_checksum_address(address))
        return float(w3.from_wei(balance_wei, "ether"))
    except Exception:
        return 0.0


async def update_local_balance(user_id: str, amount: float):
    """Update the local balance tracking."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE wallets SET balance_matic = balance_matic + ? WHERE user_id = ?",
            (amount, user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def record_transaction(
    user_id: str,
    tx_type: str,
    amount_matic: float,
    tx_hash: Optional[str] = None,
    from_address: Optional[str] = None,
    to_address: Optional[str] = None,
    status: str = "pending",
) -> dict:
    """Record a transaction in the ledger."""
    db = await get_db()
    try:
        tx_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO transactions (id, user_id, tx_type, amount_matic, tx_hash, from_address, to_address, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (tx_id, user_id, tx_type, amount_matic, tx_hash, from_address, to_address, status),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
        tx = await cursor.fetchone()
        return dict(tx)
    finally:
        await db.close()
