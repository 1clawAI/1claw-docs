---
title: Treasury
description: Multi-chain treasury wallets and Safe multisig management for organizations — generate wallets across 6 chains, manage signers, and control agent access.
sidebar_label: Treasury
sidebar_position: 0
tags: [treasury, safe, multisig, wallets]
---

# Treasury

The Treasury feature provides two capabilities:

1. **Native multi-chain wallets** — HSM-backed wallet generation across 6 chains for human users
2. **Safe multisig management** — track Gnosis Safe treasuries with signer lists, thresholds, and agent access requests

## Multi-chain treasury wallets

Generate wallets for **Ethereum**, **Bitcoin**, **Solana**, **XRP**, **Cardano**, and **Tron** — all backed by HSM key storage with MPC custody auto-configured per billing tier.

**Requirements:** Pro+ subscription. Human-only (agents receive 403).

### Custody modes by tier

| Tier | Custody mode |
|------|-------------|
| Pro / Team | XOR 2-of-2 (client custody) |
| Business / Enterprise | Shamir 2-of-3 (multi-HSM) |

Private keys are stored in a per-org `__treasury-keys` vault that is auto-created on first wallet generation. Direct API reads from this vault are blocked (403) — keys are only accessible through the export endpoint.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/treasury/wallets/generate` | Generate wallets for specified chains (or all 6) |
| `GET` | `/v1/treasury/wallets` | List all active wallets |
| `GET` | `/v1/treasury/wallets/{chain}` | Get wallet for a specific chain |
| `POST` | `/v1/treasury/wallets/{chain}/export` | Export wallet with private key (requires `X-Auth-Confirm` password header; audit-logged) |
| `POST` | `/v1/treasury/wallets/{chain}/rotate` | Rotate wallet keypair |
| `DELETE` | `/v1/treasury/wallets/{chain}` | Deactivate wallet |

### Generate wallets

```bash
curl -X POST https://api.1claw.xyz/v1/treasury/wallets/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chains": ["ethereum", "bitcoin", "solana"]}'
```

Response:

```json
{
  "wallets": [
    {
      "id": "...",
      "chain": "ethereum",
      "curve": "secp256k1",
      "public_key_hex": "04...",
      "address": "0x...",
      "is_active": true,
      "created_at": "2026-05-12T..."
    }
  ]
}
```

### SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({ token: "..." });

// Generate wallets for all supported chains
const { wallets } = await client.treasury.generateWallets();

// List existing wallets
const { wallets: all } = await client.treasury.listWallets();

// Export a private key (requires password re-authentication, audit-logged)
const { private_key_hex } = await client.treasury.exportWallet("ethereum", { password: "your-account-password" });
```

### CLI

```bash
# Generate wallets
1claw treasury generate --chains ethereum,bitcoin,solana

# List wallets
1claw treasury list

# Export private key (prompts for account password)
1claw treasury export ethereum

# Rotate a wallet
1claw treasury rotate ethereum
```

### Dashboard

Open **Treasury** (`/treasury`) to use the wallet generation wizard. The UI provides QR codes for public addresses and key export functionality.

## Safe multisig management

Track Safe multisig treasuries with name, chain, Safe address, signer list, and threshold. Humans manage treasuries in the dashboard; agents can request access, and owners approve or deny.

### Endpoints

- **Create** a treasury: **`POST /v1/treasury`** (name, `safe_address`, optional chain / `chain_id`, threshold, signers)
- **List** treasuries: **`GET /v1/treasury`**
- **Get / update / delete**: **`GET`**, **`PATCH`**, **`DELETE /v1/treasury/{id}`**
- **Add or remove signers** on a treasury
- **Access requests:** agent **`POST .../access-requests`**, human **`GET .../access-requests`**, **`.../approve`**, **`.../deny`**

Full REST details live in the **[API reference](/docs/reference/api-reference)**.

The user's Ethereum treasury wallet address is used as the default signer when creating new Safe multisigs.

## Related

- [Intents API](/docs/guides/intents-api) — signing and guardrails
- [Human API overview](/docs/human-api/overview) — authentication for treasury endpoints
