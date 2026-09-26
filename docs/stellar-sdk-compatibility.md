# Python Stellar SDK Pin & Compatibility Notes

## Version Pin
- **Package**: `stellar-sdk>=9.3.0`
- **Official Repository**: https://github.com/StellarCN/py-stellar-base
- **Network Protocol Version**: 21+ (Soroban and Stellar Core compatible)

## JavaScript vs Python SDK Parity Notes

| Feature | JavaScript SDK (\`@mixmatch/stellar\`) | Python SDK (\`stellar-sdk\`) |
| :--- | :--- | :--- |
| **Server Client** | \`new StellarSdk.Horizon.Server(url)\` | \`stellar_sdk.Server(horizon_url=...)\` or async \`Server\` |
| **Keypair Loading** | \`Keypair.fromSecret(secret)\` | \`Keypair.from_secret(secret)\` |
| **Envelope XDR** | \`tx.toXDR()\` returns base64 string | \`te.to_xdr()\` returns base64 string |
| **SEP-10 Auth** | \`Utils.buildChallengeTx(...)\` | Handled via custom canonical builder in \`src/stellar/sep10.py\` |
| **Streaming** | \`server.payments().forAccount(acc).stream({onmessage})\` | \`subscribe_payment_stream\` async generator via HTTP SSE stream |
| **Decimal Precision** | Uses \`bignumber.js\` / 7-decimal stroop string | Python exact \`decimal.Decimal("0.0000001")\` precision |

## Error Mapping
- Horizon \`404 Not Found\` -> Raised as descriptive \`ValueError("Account/Tx not found on Horizon")\`
- Horizon \`400 Bad Request\` -> Captures \`extras.result_codes\` (e.g. \`op_underfunded\`, \`op_bad_auth\`)
