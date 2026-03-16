import sqlite3
import aiosqlite
import os
from pathlib import Path

# Use /data for persistent storage if available (deployed), else local
DATA_DIR = Path("/data") if os.path.exists("/data") else Path(__file__).parent.parent.parent
DB_PATH = str(DATA_DIR / "cyberdiver.db")


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT,
                is_guest INTEGER NOT NULL DEFAULT 0,
                rank TEXT NOT NULL DEFAULT 'ROOKIE',
                total_bp REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS wallets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                address TEXT NOT NULL UNIQUE,
                encrypted_private_key TEXT NOT NULL,
                balance_matic REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS battles (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'waiting',
                team_alpha_ids TEXT NOT NULL DEFAULT '[]',
                team_bravo_ids TEXT NOT NULL DEFAULT '[]',
                team_alpha_life INTEGER NOT NULL DEFAULT 100000,
                team_bravo_life INTEGER NOT NULL DEFAULT 100000,
                timer_seconds INTEGER NOT NULL DEFAULT 300,
                total_pool_matic REAL NOT NULL DEFAULT 0.0,
                winner TEXT,
                started_at TEXT,
                ended_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS battle_participants (
                id TEXT PRIMARY KEY,
                battle_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                team TEXT NOT NULL,
                bet_amount_matic REAL NOT NULL DEFAULT 0.0,
                damage_dealt INTEGER NOT NULL DEFAULT 0,
                damage_taken INTEGER NOT NULL DEFAULT 0,
                respawn_count INTEGER NOT NULL DEFAULT 0,
                cyber_souls_collected INTEGER NOT NULL DEFAULT 0,
                cyber_souls_lost INTEGER NOT NULL DEFAULT 0,
                support_score INTEGER NOT NULL DEFAULT 0,
                bp_earned REAL NOT NULL DEFAULT 0.0,
                gate_choice TEXT NOT NULL DEFAULT 'A',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS bp_ledger (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                battle_id TEXT,
                amount REAL NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                tx_type TEXT NOT NULL,
                amount_matic REAL NOT NULL,
                tx_hash TEXT,
                from_address TEXT,
                to_address TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reward_distributions (
                id TEXT PRIMARY KEY,
                period_start TEXT NOT NULL,
                period_end TEXT NOT NULL,
                total_pool_matic REAL NOT NULL,
                margin_percent REAL NOT NULL DEFAULT 3.5,
                distributed_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS reward_payouts (
                id TEXT PRIMARY KEY,
                distribution_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                bp_total REAL NOT NULL,
                bp_share_percent REAL NOT NULL,
                payout_matic REAL NOT NULL,
                gas_fee_matic REAL NOT NULL DEFAULT 0.0,
                tx_hash TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (distribution_id) REFERENCES reward_distributions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        await db.commit()
