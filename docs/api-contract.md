# MixMatch Payments & Web3 API Contract (OpenAPI Specification)

## Overview
The MixMatch FastAPI backend exposes fully typed REST and SSE endpoints adhering to OpenAPI 3.1.
Interactive API documentation is generated automatically and accessible at:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/openapi.json`

## Tagged Module Endpoints

### 1. Payments (`/payments`)
- `POST /payments/send`: Submit a Stellar payment transaction.
  - Request: `SendPaymentRequest` (sender_wallet_id, destination_address, amount in XLM/USDC, asset_code, memo, client_reference_id)
  - Response: `201 Created` with `PaymentResponse` (id, status, hash, amount, fee)
  - Error Responses: `400 Bad Request`, `422 Unprocessable Entity`
- `GET /payments/status/{id}`: Poll status of a specific payment by UUID.
  - Response: `200 OK` with `PaymentStatusResponse`
- `GET /payments/history`: Query transaction history with pagination (`limit`, `cursor`).
  - Response: `200 OK` with paginated transaction items.
- `GET /payments/stream`: Server-Sent Events (SSE) live updates for a wallet account.
  - Response: `text/event-stream` with versioned event envelope (`payment.update.v1`, `ping`).

### 2. Admin (`/admin`)
- `POST /admin/payments/{id}/approve`: Manually approve a pending/held transaction. Requires `admin` role.
  - Response: `200 OK`
- `POST /admin/payments/{id}/reject`: Reject a held transaction with reason. Requires `admin` role.
  - Response: `200 OK`

### 3. Anchor & Off-Ramps (`/anchor`)
- `GET /anchor/rates`: Query current conversion rates across supported anchor fiat/crypto assets.
  - Response: `200 OK` with `AnchorRateResponse`
- `POST /anchor/deposit`: Initiate SEP-24 / SEP-6 interactive deposit.
  - Response: `200 OK` with interactive flow URL.
- `POST /anchor/withdraw`: Initiate anchor withdrawal flow.
  - Response: `200 OK`

### 4. Escrow (`/escrow`)
- `POST /escrow/create`: Lock funds into a multi-sig or conditional escrow agreement.
  - Response: `201 Created` with `EscrowResponse`
- `POST /escrow/{id}/release`: Release locked escrow funds to recipient.
  - Response: `200 OK`
- `POST /escrow/{id}/dispute`: Dispute active escrow agreement.
  - Response: `200 OK`

### 5. Streaming Connections (`/streaming`)
- `DELETE /streaming/connections/{connection_id}`: Revoke OAuth connection and securely delete stored access tokens.
  - Response: `204 No Content`
