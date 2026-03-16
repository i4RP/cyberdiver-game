import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import aiosqlite
from app.models.database import get_db

SECRET_KEY = "cyberdiver-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

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
