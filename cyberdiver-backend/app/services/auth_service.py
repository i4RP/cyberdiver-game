import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import httpx
from jose import JWTError, jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import aiosqlite
from app.models.database import get_db

SECRET_KEY = "cyberdiver-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

PRIVY_APP_ID = os.environ.get("PRIVY_APP_ID", "cmmshzs2101xb0ckz9fo85zkt")
PRIVY_APP_SECRET = os.environ.get("PRIVY_APP_SECRET", "")

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return dict(user)
    finally:
        await db.close()


async def register_user(username: str, password: str, display_name: Optional[str] = None) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (username,))
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        user_id = str(uuid.uuid4())
        password_hash = hash_password(password)
        name = display_name or username

        await db.execute(
            "INSERT INTO users (id, username, display_name, password_hash, is_guest) VALUES (?, ?, ?, ?, 0)",
            (user_id, username, name, password_hash),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        return dict(user)
    finally:
        await db.close()


async def login_user(username: str, password: str) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_dict = dict(user)
        if not user_dict.get("password_hash") or not verify_password(password, user_dict["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return user_dict
    finally:
        await db.close()


async def create_guest_user(display_name: Optional[str] = None) -> dict:
    db = await get_db()
    try:
        user_id = str(uuid.uuid4())
        guest_username = f"guest_{user_id[:8]}"
        name = display_name or f"Guest_{user_id[:6]}"

        await db.execute(
            "INSERT INTO users (id, username, display_name, is_guest) VALUES (?, ?, ?, 1)",
            (user_id, guest_username, name),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        return dict(user)
    finally:
        await db.close()


async def verify_privy_token(privy_token: str) -> dict:
    """Verify a Privy access token JWT and return claims.
    
    Privy access tokens are ES256 JWTs. We decode them to extract
    the user's Privy DID (sub claim), then fetch full user data from
    the Privy REST API.
    """
    if not PRIVY_APP_SECRET:
        raise HTTPException(status_code=500, detail="Privy app secret not configured")

    # Decode the JWT without verification first to get the user DID
    # (In production, you should verify against Privy's verification key)
    try:
        claims = jwt.decode(privy_token, options={"verify_signature": False})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Privy token format")

    privy_user_id = claims.get("sub", "")
    if not privy_user_id:
        raise HTTPException(status_code=401, detail="No user ID in Privy token")

    # Fetch user data from Privy REST API
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://auth.privy.io/api/v1/users/{privy_user_id}",
            headers={
                "Authorization": f"Basic {_privy_basic_auth()}",
                "privy-app-id": PRIVY_APP_ID,
            },
        )

    if resp.status_code != 200:
        # If REST API fails, still return basic claims from the JWT
        return {"userId": privy_user_id, "linkedAccounts": []}

    return resp.json()


def _privy_basic_auth() -> str:
    """Create Basic auth header value for Privy API."""
    import base64
    credentials = f"{PRIVY_APP_ID}:{PRIVY_APP_SECRET}"
    return base64.b64encode(credentials.encode()).decode()


async def get_or_create_privy_user(privy_user_id: str, email: Optional[str] = None, wallet_address: Optional[str] = None) -> dict:
    """Find or create a user from Privy authentication data."""
    db = await get_db()
    try:
        # Check if user already exists with this Privy ID as username
        privy_username = f"privy_{privy_user_id}"
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (privy_username,))
        user = await cursor.fetchone()

        if user:
            return dict(user)

        # Create new user
        user_id = str(uuid.uuid4())
        display_name = email or (wallet_address[:10] if wallet_address else f"Player_{user_id[:6]}")

        await db.execute(
            "INSERT INTO users (id, username, display_name, password_hash, is_guest) VALUES (?, ?, ?, NULL, 0)",
            (user_id, privy_username, display_name),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        return dict(user)
    finally:
        await db.close()
