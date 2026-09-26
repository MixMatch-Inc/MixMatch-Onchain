import time
from fastapi import Request, HTTPException, status

class AuthRateLimiter:
    def __init__(self, limit: int = 5, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = {}

    def check_rate_limit(self, client_ip: str):
        now = time.time()
        timestamps = [ts for ts in self.requests.get(client_ip, []) if now - ts < self.window_seconds]
        if len(timestamps) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please try again later."
            )
        timestamps.append(now)
        self.requests[client_ip] = timestamps
