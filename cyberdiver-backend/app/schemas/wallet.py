from pydantic import BaseModel
from typing import Optional


class WalletInfo(BaseModel):
    address: str
    balance_matic: float


class DepositRequest(BaseModel):
    amount_matic: float


class WithdrawRequest(BaseModel):
    to_address: str
    amount_matic: float


class TransactionInfo(BaseModel):
    id: str
    tx_type: str
    amount_matic: float
    tx_hash: Optional[str] = None
    status: str
    created_at: str
