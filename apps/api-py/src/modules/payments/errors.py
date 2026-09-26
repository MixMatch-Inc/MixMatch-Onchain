from typing import Optional, Dict, Any

class BaseDomainError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class PaymentFailedError(BaseDomainError):
    """Port #1125: Domain error for Stellar payment execution failures."""
    def __init__(self, message: str, kind: str = "payment_failed", status_code: int = 422):
        super().__init__(message=message, code=kind.upper(), status_code=status_code)
        self.kind = kind

class AnchorError(BaseDomainError):
    """Port #1125: Domain error for SEP-24 anchor failures."""
    def __init__(self, message: str, code: str = "ANCHOR_ERROR", status_code: int = 502):
        super().__init__(message=message, code=code, status_code=status_code)

class EscrowFailedError(BaseDomainError):
    """Port #1125: Domain error for Soroban escrow failures."""
    def __init__(self, message: str, code: str = "ESCROW_FAILED", status_code: int = 422):
        super().__init__(message=message, code=code, status_code=status_code)

class WalletResolutionError(BaseDomainError):
    """Port #1124 & #1125: Controlled error for wallet decryption / resolution issues."""
    def __init__(self, message: str, code: str = "WALLET_RESOLUTION_ERROR", status_code: int = 422):
        super().__init__(message=message, code=code, status_code=status_code)
