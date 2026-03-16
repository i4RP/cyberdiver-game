from fastapi import APIRouter, Depends

from app.schemas.auth import (
    RegisterRequest, LoginRequest, GuestLoginRequest,
    PrivyAuthRequest, TokenResponse, UserProfile,
)
from app.services.auth_service import (
    register_user, login_user, create_guest_user,
    create_access_token, get_current_user,
    verify_privy_token, get_or_create_privy_user,
)
from app.services.wallet_service import create_wallet_for_user, get_user_wallet

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    user = await register_user(req.username, req.password, req.display_name)
    # Auto-create wallet on registration
    await create_wallet_for_user(user["id"])
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
        is_guest=bool(user["is_guest"]),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await login_user(req.username, req.password)
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
        is_guest=bool(user["is_guest"]),
    )


@router.post("/guest", response_model=TokenResponse)
async def guest_login(req: GuestLoginRequest):
    user = await create_guest_user(req.display_name)
    # Auto-create wallet for guests too
    await create_wallet_for_user(user["id"])
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
        is_guest=bool(user["is_guest"]),
    )


@router.post("/privy", response_model=TokenResponse)
async def privy_auth(req: PrivyAuthRequest):
    privy_data = await verify_privy_token(req.privy_token)

    privy_user_id = (
        privy_data.get("id")
        or privy_data.get("userId")
        or privy_data.get("user_id")
        or privy_data.get("sub", "")
    )
    email = None
    wallet_address = None

    # Extract email and wallet from Privy user data
    linked_accounts = privy_data.get("linked_accounts", privy_data.get("linkedAccounts", []))
    for account in linked_accounts:
        acc_type = account.get("type", "")
        if acc_type == "email" and not email:
            email = account.get("address")
        if acc_type in ("wallet", "smart_wallet") and not wallet_address:
            wallet_address = account.get("address")

    user = await get_or_create_privy_user(privy_user_id, email=email, wallet_address=wallet_address)
    await create_wallet_for_user(user["id"])
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
        is_guest=False,
    )


@router.get("/me", response_model=UserProfile)
async def get_profile(user: dict = Depends(get_current_user)):
    wallet = await get_user_wallet(user["id"])
    return UserProfile(
        id=user["id"],
        username=user["username"],
        display_name=user["display_name"],
        is_guest=bool(user["is_guest"]),
        rank=user["rank"],
        total_bp=user["total_bp"],
        wallet_address=wallet["address"] if wallet else None,
        wallet_balance_matic=wallet["balance_matic"] if wallet else None,
        created_at=user["created_at"],
    )
