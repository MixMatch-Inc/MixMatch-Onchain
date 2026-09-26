import decimal
from decimal import Decimal, ROUND_HALF_UP

def normalize_amount(amount: str | Decimal | float | int) -> str:
    """Normalize amount to exactly 7 decimal places using Decimal.
    
    Fixes the floating-point precision bug in TypeScript apps/api where Number(...).toFixed(7)
    corrupted precision for large amounts or high-precision decimals.
    """
    if isinstance(amount, float):
        # Converting float to str before Decimal avoids standard float representation quirks
        d = Decimal(str(amount))
    elif isinstance(amount, Decimal):
        d = amount
    else:
        d = Decimal(str(amount).strip())
    
    # Quantize to 7 decimal places (Stellar Stroop precision: 1 XLM = 10,000,000 stroops)
    quantized = d.quantize(Decimal("0.0000001"), rounding=ROUND_HALF_UP)
    return f"{quantized:.7f}"
