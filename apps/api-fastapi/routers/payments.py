from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/payments", tags=["payments"])

class PaymentRequest(BaseModel):
    recipient: str
    amount: float
    currency: str = "XLM"

class PaymentResponse(BaseModel):
    transaction_id: str
    status: str

@router.post("/process", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async function process_payment(payload: PaymentRequest):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    return PaymentResponse(
        transaction_id="tx_fastapi_demo_12345",
        status="SUCCESS"
    )
