# Wallet Linkage Implementation

## Overview

This document describes the implementation of the wallet/account linkage model for Stellar-backed features as specified in Issue 61. The implementation provides a secure, scalable foundation for users to link their Stellar accounts to their MixMatch profiles.

## Architecture

### Core Components

1. **Database Models** (`wallet-linkage.model.ts`)
   - `WalletLinkage`: Main wallet linkage entity
   - `WalletLinkageHistory`: Audit trail for all wallet operations

2. **Business Logic** (`wallet.service.ts`)
   - `WalletService`: Handles all wallet operations and business rules

3. **API Layer** (`wallet.controller.ts`, `wallet.routes.ts`)
   - RESTful endpoints for wallet management
   - Input validation and error handling

4. **Type Definitions** (`@mixmatch/types`)
   - Shared TypeScript interfaces and enums

## Data Model

### WalletLinkage Schema

```typescript
interface IWalletLinkage {
  id: string;
  userId: string;                    // Reference to User document
  stellarAccountId: string;          // Stellar public key (G-prefixed)
  network: StellarNetwork;           // PUBLIC, TESTNET, FUTURENET, STANDALONE
  status: WalletLinkageStatus;       // PENDING_VERIFICATION, ACTIVE, DISABLED, DISCONNECTED
  keyProvenance: KeyProvenance;      // USER_GENERATED, HARDWARE_WALLET, etc.
  featureEligibility: FeatureEligibility[]; // Available features
  verificationSignature?: string;    // Stored securely, not returned by default
  verifiedAt?: Date;                 // When wallet was verified
  lastUsedAt?: Date;                 // Last micro-action usage
  disconnectReason?: string;         // Reason for disconnection
  disconnectedAt?: Date;             // When wallet was disconnected
  metadata: Record<string, any>;     // Flexible metadata storage
  createdAt: Date;
  updatedAt: Date;
}
```

### Security Features

- **Secret Separation**: `verificationSignature` uses `select: false` to prevent accidental exposure
- **Unique Constraints**: One wallet per user per network
- **Audit Trail**: Complete history of all wallet operations
- **Rate Limiting**: Maximum 5 active wallets per user

## API Endpoints

### Authentication
All wallet endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Core Operations

#### POST `/api/wallets/link`
Link a new Stellar wallet to the user account.

**Request Body:**
```json
{
  "stellarAccountId": "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ",
  "network": "TESTNET",
  "keyProvenance": "USER_GENERATED",
  "verificationSignature": "optional-signature-for-immediate-verification",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "stellarAccountId": "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ",
    "network": "TESTNET",
    "status": "ACTIVE",
    "keyProvenance": "USER_GENERATED",
    "featureEligibility": ["MICRO_ACTIONS", "PAYMENTS", "GOVERNANCE"],
    "verifiedAt": "2024-01-15T10:30:00.000Z",
    "metadata": {},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### POST `/api/wallets/:walletId/verify`
Verify wallet ownership using a cryptographic signature.

**Request Body:**
```json
{
  "verificationSignature": "cryptographic-signature-proving-ownership"
}
```

#### PUT `/api/wallets/:walletId`
Update wallet linkage status or metadata.

**Request Body:**
```json
{
  "status": "DISABLED",
  "featureEligibility": ["MICRO_ACTIONS"],
  "metadata": {
    "disconnectReason": "User requested temporary disable"
  }
}
```

#### GET `/api/wallets`
List user's wallet linkages with optional filtering.

**Query Parameters:**
- `status`: Filter by status (ACTIVE, PENDING_VERIFICATION, etc.)
- `network`: Filter by network (PUBLIC, TESTNET, etc.)
- `page`: Pagination page (default: 1)
- `pageSize`: Results per page (default: 20, max: 100)

#### GET `/api/wallets/:walletId`
Get specific wallet linkage details.

#### GET `/api/wallets/:walletId/history`
Get wallet linkage audit history.

**Query Parameters:**
- `limit`: Number of history entries (default: 50, max: 100)

#### POST `/api/wallets/:walletId/use`
Record wallet usage for micro-actions. Updates `lastUsedAt` timestamp.

## Feature Eligibility System

The system automatically assigns feature eligibility based on key provenance:

| Key Provenance | Default Features |
|----------------|------------------|
| USER_GENERATED | MICRO_ACTIONS, PAYMENTS, GOVERNANCE |
| HARDWARE_WALLET | MICRO_ACTIONS, PAYMENTS, GOVERNANCE |
| DERIVED_FROM_SEED | MICRO_ACTIONS, PAYMENTS |
| SOCIAL_RECOVERY | MICRO_ACTIONS, GOVERNANCE |
| EXCHANGE_WALLET | MICRO_ACTIONS (limited) |

## Database Schema

### Collections

1. **wallet_linkages**
   - Compound indexes: `{ userId: 1, status: 1 }`
   - Unique index: `{ stellarAccountId: 1, network: 1 }`
   - Network index: `{ status: 1, network: 1 }`

2. **wallet_linkage_history**
   - Time-series index: `{ walletLinkageId: 1, createdAt: -1 }`
   - User index: `{ userId: 1, createdAt: -1 }`

### Migration

Run the migration script to create collections and indexes:

```bash
npm run migrate:wallets
```

## Security Considerations

### Secret Management
- **Verification Signatures**: Stored in database but excluded from default queries
- **No Private Keys**: System never stores or handles private keys
- **Signature Verification**: Handled by separate Stellar service

### Access Control
- **User Isolation**: Users can only access their own wallets
- **Role-Based Access**: Future admin capabilities for wallet management
- **Audit Trail**: Complete history of all wallet operations

### Rate Limiting
- **Maximum Wallets**: 5 active wallets per user
- **Validation**: Strict Stellar address format validation
- **Duplicate Prevention**: Database constraints prevent duplicate linkages

## Testing

Comprehensive test suite covering:
- Wallet creation and verification
- Status transitions (link/unlink/disable)
- Feature eligibility assignment
- History tracking
- Error handling and edge cases

Run tests:
```bash
npm test
```

## Integration Points

### Stellar Service
The wallet system integrates with the existing Stellar service for:
- Account verification
- Transaction signing
- Network operations

### Authentication System
Integrates with existing JWT-based authentication:
- Uses `userId` from JWT payload
- Maintains user context across operations
- Respects role-based permissions

## Future Enhancements

### Multi-Signature Support
- Support for multisig wallets
- Co-signer management
- Threshold configuration

### Hardware Wallet Integration
- Direct Ledger/Trezor integration
- Hardware-based verification
- Enhanced security features

### Advanced Analytics
- Wallet usage patterns
- Feature adoption metrics
- Network activity analysis

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid Stellar account ID format"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Wallet linkage not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to link wallet"
}
```

## Monitoring and Observability

### Key Metrics
- Wallet linkage creation rate
- Verification success/failure rates
- Feature usage by wallet type
- Network distribution

### Logging
- Structured logging for all operations
- Security event logging
- Performance metrics

## Deployment Considerations

### Environment Variables
- `MONGODB_URI`: Database connection string
- `STELLAR_SERVICE_URL`: Stellar service endpoint
- `JWT_SECRET`: Token signing secret

### Database Requirements
- MongoDB 4.4+ for compound index support
- Sufficient storage for wallet history
- Backup strategy for audit trail

### Scaling
- Horizontal scaling via database sharding
- Read replicas for wallet queries
- Caching for frequently accessed wallets

## Compliance and Legal

### Data Protection
- GDPR compliance for wallet data
- Right to be forgotten (wallet deletion)
- Data portability features

### Financial Regulations
- KYC/AML considerations
- Transaction monitoring integration
- Regulatory reporting capabilities

---

This implementation provides a robust, secure foundation for Stellar wallet integration while maintaining separation of concerns and following best practices for API design and data management.
