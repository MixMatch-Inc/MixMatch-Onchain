"""locustfile_extended.py – extended load tests with auth + SSE soak (issue #1469).

Runs authenticated scenarios including send-payment, history, taste and SSE
streaming. Fails the run when p95 latency or error rate exceeds thresholds.

Usage:
    locust -f loadtests/locustfile_extended.py --headless \
           -u 50 -r 5 --run-time 120s \
           --host http://localhost:8000
"""
from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

from locust import HttpUser, TaskSet, between, events, task
from locust.env import Environment

# ---------------------------------------------------------------------------
# Thresholds (SLO enforcement)
# ---------------------------------------------------------------------------

P95_LATENCY_MS = int(os.environ.get("LOAD_TEST_P95_MS", "800"))  # 800 ms
ERROR_RATE_PCT = float(os.environ.get("LOAD_TEST_ERROR_RATE", "1.0"))  # 1 %


@events.quitting.add_listener
def check_thresholds(environment: Environment, **_: Any) -> None:
    stats = environment.runner.stats.total if environment.runner else None
    if stats is None:
        return
    p95 = stats.get_response_time_percentile(0.95)
    error_pct = (stats.num_failures / max(stats.num_requests, 1)) * 100
    failures: list[str] = []
    if p95 and p95 > P95_LATENCY_MS:
        failures.append(f"p95 latency {p95:.0f} ms exceeds {P95_LATENCY_MS} ms")
    if error_pct > ERROR_RATE_PCT:
        failures.append(f"error rate {error_pct:.2f}% exceeds {ERROR_RATE_PCT}%")
    if failures:
        environment.process_exit_code = 1
        for msg in failures:
            print(f"[THRESHOLD BREACH] {msg}")


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _get_token(client: Any, email: str, password: str) -> str | None:
    resp = client.post("/api/auth/login", json={"email": email, "password": password}, name="auth/login")
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None


# ---------------------------------------------------------------------------
# Task sets
# ---------------------------------------------------------------------------

class AuthenticatedTasks(TaskSet):
    token: str | None = None

    def on_start(self) -> None:
        self.token = _get_token(
            self.client,
            os.environ.get("LOAD_TEST_EMAIL", "loadtest@mixmatch.app"),
            os.environ.get("LOAD_TEST_PASSWORD", "loadtest-password"),
        )

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def payment_history(self) -> None:
        self.client.get("/api/payments?page=1&limit=20", headers=self._auth_headers(), name="payments/history")

    @task(2)
    def taste_profile(self) -> None:
        self.client.get("/api/taste/profile/me", headers=self._auth_headers(), name="taste/profile")

    @task(1)
    def send_payment(self) -> None:
        self.client.post(
            "/api/payments",
            json={
                "destination": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
                "amount": "0.0100000",
                "asset_code": "XLM",
                "memo": f"load-test-{uuid.uuid4().hex[:8]}",
            },
            headers=self._auth_headers(),
            name="payments/send",
        )

    @task(1)
    def health_check(self) -> None:
        self.client.get("/health", name="health")


class SseSoakTask(TaskSet):
    """Hold an SSE connection open for a few seconds to test connection handling."""

    @task
    def sse_soak(self) -> None:
        token = _get_token(
            self.client,
            os.environ.get("LOAD_TEST_EMAIL", "loadtest@mixmatch.app"),
            os.environ.get("LOAD_TEST_PASSWORD", "loadtest-password"),
        )
        if not token:
            return
        start = time.time()
        with self.client.get(
            "/api/streaming/events",
            headers={"Authorization": f"Bearer {token}"},
            stream=True,
            catch_response=True,
            name="streaming/sse",
        ) as resp:
            # Read for up to 5 s then close
            for chunk in resp.iter_content(chunk_size=512):
                if time.time() - start > 5:
                    break
            resp.success()


class MixMatchUser(HttpUser):
    tasks = {AuthenticatedTasks: 9, SseSoakTask: 1}
    wait_time = between(0.5, 2.0)
