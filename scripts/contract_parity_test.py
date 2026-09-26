import json
import sys
import httpx

ENDPOINTS = [
    {"method": "GET", "path": "/health", "expected_status": 200},
    {"method": "GET", "path": "/api/taste/health", "expected_status": 200},
    {"method": "GET", "path": "/api/payments/history?limit=10", "expected_status": 200},
]

def verify_contract_parity(fastapi_url: str = "http://localhost:8000"):
    print(f"Running Contract Parity Tests against {fastapi_url}...")
    passed = 0
    with httpx.Client(base_url=fastapi_url, timeout=5.0) as client:
        for ep in ENDPOINTS:
            method = ep["method"]
            path = ep["path"]
            resp = client.request(method, path)
            print(f"[{method}] {path} -> {resp.status_code}")
            if resp.status_code == ep["expected_status"]:
                passed += 1
            else:
                print(f"FAILURE on {path}: expected {ep['expected_status']}, got {resp.status_code}")

    print(f"Contract Parity: {passed}/{len(ENDPOINTS)} passed.")
    return passed == len(ENDPOINTS)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    sys.exit(0 if verify_contract_parity(url) else 1)
