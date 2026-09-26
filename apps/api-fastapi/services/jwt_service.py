import time

class JwtService:
    def __init__(self, secret: str = "secret-key", ttl_seconds: int = 3600):
        self.secret = secret
        self.ttl_seconds = ttl_seconds

    def create_access_token(self, user_id: str, email: str, role: str = "USER") -> dict:
        now = int(time.time())
        claims = {
            "sub": user_id,
            "email": email,
            "role": role,
            "iat": now,
            "exp": now + self.ttl_seconds,
        }
        return {
            "access_token": f"token_stub_{user_id}",
            "token_type": "bearer",
            "expires_in": self.ttl_seconds,
            "claims": claims,
        }
