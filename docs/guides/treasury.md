---
title: Treasury Wallets
description: Native multi-chain wallets for human users — HSM-backed key generation, MPC custody, export with re-authentication, and rotation.
sidebar_position: 16
---

# Treasury Wallets

Treasury wallets give human users native, HSM-backed wallets across six blockchains — no external wallet provider, no browser extension. Private keys are generated server-side inside the HSM, stored in a dedicated per-org `__treasury-keys` vault with MPC custody, and never leave the secure enclave unless explicitly exported.

:::info Requirements
Treasury wallets require a **Pro or higher** subscription. Free-tier users receive a 403.
Platform admins bypass the tier check.
:::

## Supported chains

| Chain    | Curve       | Example address format       |
|----------|-------------|------------------------------|
| Ethereum | secp256k1   | `0x4e83…` (EIP-55 checksum)  |
| Bitcoin  | secp256k1   | `bc1q…` (bech32)             |
| Solana   | Ed25519     | `7xKX…` (base58)             |
| XRP      | Ed25519     | `rN7d…` (base58check)        |
| Cardano  | Ed25519     | `addr1…` (bech32)            |
| Tron     | secp256k1   | `T9yD…` (base58check)        |

## Human-only access

All treasury wallet endpoints enforce `require_human()`. Agents calling any treasury wallet endpoint receive a **403** with `"Treasury wallets are only available to human users."` Agents that need on-chain signing should use the [Intents API](./intents-api.md) and [multi-chain signing keys](./crypto-proxy.md) instead.

## The `__treasury-keys` vault

When you generate your first treasury wallet, 1claw auto-creates a `__treasury-keys` vault in your org. This vault:

- Is **not** counted toward your vault or secrets quota
- Is **excluded** from the `GET /v1/vaults` listing (never appears in the dashboard vault list)
- Is **excluded** from the admin secrets manifest (private keys are never loaded into Shroud's redaction automata)
- Has **direct API reads blocked** — `GET /v1/vaults/{id}/secrets/{path}` returns 403 for system vaults; use the export endpoint instead
- Has **MPC custody auto-configured** based on your billing tier:

| Tier               | Custody mode            | What it means                                            |
|--------------------|--------------------------|----------------------------------------------------------|
| Pro / Team         | XOR 2-of-2 client custody | One share on the server (GCP KMS), one returned to you  |
| Business / Enterprise | Shamir 2-of-3 multi-HSM | Shares split across GCP KMS, AWS KMS, and Azure Key Vault |

Private keys are stored at the path `users/{user_id}/chains/{chain}/private_key`.

## API endpoints

| Method | Path                                    | Description                          |
|--------|-----------------------------------------|--------------------------------------|
| POST   | `/v1/treasury/wallets/generate`         | Generate wallets for specified chains |
| GET    | `/v1/treasury/wallets`                  | List all active wallets              |
| GET    | `/v1/treasury/wallets/{chain}`          | Get wallet for a specific chain      |
| POST   | `/v1/treasury/wallets/{chain}/export`   | Export wallet (password re-auth)     |
| POST   | `/v1/treasury/wallets/{chain}/rotate`   | Rotate keypair                       |
| DELETE | `/v1/treasury/wallets/{chain}`          | Deactivate wallet                    |

### Generate wallets

Generate wallets for one or more chains. If you omit `chains`, all six are created. Chains where you already have an active wallet are silently skipped.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chains": ["ethereum", "solana", "bitcoin"]
  }'
```

Response:

```json
{
  "wallets": [
    {
      "id": "a1b2c3d4-...",
      "chain": "ethereum",
      "curve": "secp256k1",
      "public_key_hex": "04abcdef...",
      "address": "0x4e83...",
      "is_active": true,
      "created_at": "2026-05-16T12:00:00Z"
    },
    {
      "id": "e5f6a7b8-...",
      "chain": "solana",
      "curve": "ed25519",
      "public_key_hex": "aabbccdd...",
      "address": "7xKX...",
      "is_active": true,
      "created_at": "2026-05-16T12:00:00Z"
    }
  ]
}
```

### List active wallets

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets" \
  -H "Authorization: Bearer $TOKEN"
```

### Get a specific chain wallet

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/ethereum" \
  -H "Authorization: Bearer $TOKEN"
```

### Export wallet (with password re-authentication)

Exporting a wallet's private key requires your account password in the `X-Auth-Confirm` header. This is audit-logged as `treasury_wallet.export`.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password"
```

Response:

```json
{
  "chain": "ethereum",
  "curve": "secp256k1",
  "private_key": "0xabc123...",
  "public_key": "04abcdef...",
  "address": "0x4e83..."
}
```

:::danger
The private key is returned in plaintext. Treat it as you would any other secret — never log it, never commit it, and store it only in a secure location. Failed password attempts increment your account's lockout counter (locked after 10 failures for 15 minutes).
:::

### Rotate keypair

Deactivates the current wallet and generates a new keypair for the same chain. The old wallet is retained for audit but its key is no longer usable.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/rotate" \
  -H "Authorization: Bearer $TOKEN"
```

### Deactivate wallet

Soft-deletes the wallet. The key material is retained for audit but the wallet no longer appears in listings.

```bash
curl -X DELETE "https://api.1claw.xyz/v1/treasury/wallets/ethereum" \
  -H "Authorization: Bearer $TOKEN"
```

## Dashboard

The Treasury page (`/treasury`) has a **Wallets** tab with a wizard UI for generating wallets:

1. Select which chains you want wallets for
2. Confirm generation — keys are created server-side inside the HSM
3. Each wallet card shows the chain, address (with QR code), and public key
4. **Export** button opens a password confirmation dialog, then reveals the private key
5. **Rotate** and **Deactivate** actions are available per-wallet

The Treasury detail page uses your Ethereum treasury wallet address for signer selection when managing Safe multisigs.

## Safe multisig treasuries

Treasury wallets complement the **Safe multisig** features. You can create a treasury with a Safe address and manage signers, thresholds, and access requests:

- `POST /v1/treasury` — create a treasury (requires `name` + `safe_address`)
- `GET /v1/treasury` — list treasuries
- `GET /v1/treasury/{id}` — treasury detail
- `PATCH /v1/treasury/{id}` — update treasury
- `DELETE /v1/treasury/{id}` — delete treasury

Agents can request access to treasuries; humans approve or deny via the dashboard or API. See the Treasury section of the [API reference](/docs/reference/api-reference) for the full endpoint list.

## See also

- [Intents API](./intents-api.md) — agent transaction signing
- [Multi-Party Computation (MPC)](./mpc.md) — how MPC custody works under the hood
- [Billing and usage](./billing-and-usage.md) — tier requirements
