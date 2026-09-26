# HashiCorp Vault KMS Configuration & Security Runbook

## Overview
MixMatch utilizes HashiCorp Vault's **Transit Secrets Engine** for signing Stellar transactions for custodial wallets without exposing secret keys in application memory or databases.

## Environment Variables

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :--- |
| \`VAULT_ADDR\` | URL of the HashiCorp Vault cluster | \`http://127.0.0.1:8200\` | **Yes** |
| \`VAULT_TOKEN\` | Service token or AppRole secret ID | None | **Yes** |
| \`VAULT_TRANSIT_MOUNT\` | Mount path for Transit engine | \`transit\` | No |
| \`VAULT_KEY_PREFIX\` | Prefix for custodial wallet transit keys | \`mixmatch-wallet-\` | No |

## Authentication Method
1. **Local Development**: Developer root token or local dev mode (\`vault server -dev\`).
2. **Production / Kubernetes**: Vault Agent with Kubernetes Auth or AppRole rotation. Tokens should possess strict transit signing policies:
   \`\`\`hcl
   path "transit/sign/mixmatch-wallet-*" {
     capabilities = ["update"]
   }
   path "transit/verify/mixmatch-wallet-*" {
     capabilities = ["read", "update"]
   }
   \`\`\`

## Failure Behavior
If the Vault cluster is unreachable or responds with 5xx/403, signing operations fail immediately with \`KmsUnavailableError\` (HTTP 503). There is **no fallback** to plaintext keys or unauthenticated signers.
