from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class GuestLoginRequest(BaseModel):
    display_name: Optional[str] = None


class PrivyAuthRequest(BaseModel):
    privy_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    is_guest: bool


class UserProfile(BaseModel):
    id: str
    username: str
    display_name: str
    is_guest: bool
    rank: str
    total_bp: float
    wallet_address: Optional[str] = None
    wallet_balance_matic: Optional[float] = None
    created_at: str
