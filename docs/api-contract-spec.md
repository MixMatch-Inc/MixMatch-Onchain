# API Contract: Regeneration Spec and Known Mismatches

> Issue #1479 – documents verified mismatches and the CI generation plan.

## Verified Mismatches in `docs/api-contract.md`

| Documented | Actual | Fix |
|---|---|---|
| `GET /payments/status/{id}` | `GET /payments/{id}/status` | Update doc |
| `GET /anchor/rates` | Does not exist | Remove |
| `/admin/payments/{id}/approve` | `/admin/transactions/{id}/approve` | Update doc |
| `/escrow/create` | `POST /escrows` | Update doc |
| `/escrow/{id}/dispute` | Does not exist | Remove |
| Cursor pagination | Actual: `page` / `limit` query params | Update doc |
| Missing routes | `/payments/path-quote`, `/users/*`, `/taste/*` | Add |

## Target CI Generation

```yaml
# .github/workflows/api-contract.yml  (to be added)
jobs:
  generate-contract:
    steps:
      - name: Start api-py
        run: docker compose up -d api-py
      - name: Fetch openapi.json
        run: curl http://localhost:8000/openapi.json -o openapi.json
      - name: Generate markdown
        run: npx @redocly/cli build-docs openapi.json --output docs/api-contract.md
      - name: Fail on drift
        run: git diff --exit-code docs/api-contract.md
```

## Error Envelope

All error responses follow:
```json
{
  "code": "PAYMENT_NOT_FOUND",
  "message": "Payment abc-123 does not exist",
  "details": {}
}
```
Defined in `apps/api-py/src/modules/payments/errors.py` (`BaseDomainError`).

## Request/Response Examples

### POST /api/payments
```json
// Request
{ "destination": "G...", "amount": "10.0000000", "asset_code": "XLM", "memo": "invoice-42" }

// 200 Response
{ "id": "uuid", "status": "PENDING", "stellar_tx_hash": null, "created_at": "2024-01-01T00:00:00Z" }
```

### GET /api/payments/{id}/status
```json
// 200 Response
{ "id": "uuid", "status": "COMPLETED", "stellar_tx_hash": "abc..." }
```
