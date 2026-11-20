# Multi-stage production image for the MixMatch FastAPI backend.
# Pin by digest so rebuilds are reproducible; Dependabot (docker ecosystem) proposes bumps.
FROM python:3.11-slim-bookworm@sha256:a83ba18aef0f865b1a4a611c2cf460fe446f2795673bbb9fe43be570439e3b39 AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
RUN pip install --upgrade pip && \
    pip install .

# Production runtime stage
FROM python:3.11-slim-bookworm@sha256:a83ba18aef0f865b1a4a611c2cf460fe446f2795673bbb9fe43be570439e3b39 AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Worker processes; keep below the DB pool size divided by connections per worker.
    UVICORN_WORKERS=2 \
    # Trust X-Forwarded-* only from these peers. Set to the proxy's address (or "*" on a private network).
    FORWARDED_ALLOW_IPS=127.0.0.1

RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY src ./src

USER appuser

EXPOSE 8000

# curl is not installed in the runtime image; the interpreter is, so probe with it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).status == 200 else 1)"]

# Shell form via sh -c so the environment variables above are expanded; exec keeps uvicorn as PID 1.
CMD ["sh", "-c", "exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS} --proxy-headers --forwarded-allow-ips \"${FORWARDED_ALLOW_IPS}\""]
