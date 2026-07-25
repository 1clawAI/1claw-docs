---
title: "Migrate from Dynamic"
description: Move from Dynamic's embedded wallets and server-side key management to 1claw's vault, signing keys, and agent-native architecture.
sidebar_position: 51
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrate from Dynamic

[Dynamic](https://dynamic.xyz) provides embedded wallets, multi-chain auth, and server-side signing for web3 applications. If you are already using Dynamic for user-facing wallets and considering 1claw, this guide explains where each tool fits, what to migrate, and how to run them side by side.

## Where each tool fits

| Concern | Dynamic | 1claw |
|---------|---------|-------|
| User-facing wallet (login, sign in browser) | Embedded wallets via Dynamic SDK | Not the primary use case. Use [embedded wallets](/docs/guides/embedded-wallets-quickstart) if building a platform app |
| Server-side key management | Dynamic's server wallets / Turnkey backend | Vault + HSM-backed signing keys |
| Agent/backend signing | Manual integration needed | Built-in: agent registers, gets signing key, calls Intents API |
| Policy-based access control | Limited server-side controls | Full policy engine (path globs, time windows, IP conditions, per-tx caps) |
| LLM proxy and secret redaction | Not available | Shroud TEE proxy |
| Multi-chain transaction signing | Available for select chains | Six chains (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron) with guardrails |
| Treasury multisig | Not available | Safe-based proposals and signing |

The short version: keep Dynamic for user-facing wallet UX where you need it. Move your server-side key management, agent signing, and backend secret storage to 1claw.

## Migration path

### 1. Move server-side secrets to the vault

If you store API keys, RPC URLs, or signing keys in Dynamic's environment or your own infra, migrate them into a 1claw vault.

```bash
# Create a vault for your production secrets
curl -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production","description":"Migrated from Dynamic server env"}'
```

Store each secret:

```bash
# Example: move an RPC URL
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/rpc/ethereum-mainnet" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "https://eth-mainnet.g.alchemy.com/v2/your-key",
    "type": "api_key",
    "description": "Ethereum mainnet RPC"
  }'
```

Or bulk-import from a `.env` file using the CLI:

```bash
1claw import .env.production --vault-id $VAULT_ID --prefix config/
```

### 2. Replace server wallets with signing keys

Dynamic's server wallets (powered by Turnkey under the hood) hold keys for backend-initiated transactions. In 1claw, you provision per-agent signing keys that live inside the HSM and are never exposed.

**Dynamic (before):**

```typescript
import { DynamicServer } from "@dynamic-labs/sdk-server";

const dynamic = new DynamicServer({
  environmentId: process.env.DYNAMIC_ENV_ID,
  apiKey: process.env.DYNAMIC_API_KEY,
});

// Sign with a server wallet
const signedTx = await dynamic.wallets.signTransaction(walletId, {
  to: "0xRecipient...",
  value: "1000000000000000", // wei
  chainId: 1,
});
```

**1claw (after):**

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY, // ocv_ key
});

// Submit transaction; 1claw signs server-side, broadcasts, returns hash
const tx = await client.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xRecipient...",
  value: "0.001", // ETH, not wei
  simulate_first: true,
});

console.log("tx_hash:", tx.data.tx_hash);
```

Key differences:

- 1claw uses ETH (not wei) for the `value` field. The server handles conversion.
- `simulate_first: true` runs a Tenderly simulation before signing. If the simulation reverts, you get a 422 instead of wasting gas.
- The agent never sees the private key. You do not need to manage key material on your server.

### 3. Map Dynamic's environment-based auth to 1claw policies

Dynamic scopes server wallet access through environment IDs and API keys. 1claw uses explicit policies.

```bash
# Grant the agent read access to signing key paths
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"principal_type\": \"agent\",
    \"principal_id\": \"$AGENT_ID\",
    \"secret_path_pattern\": \"keys/*\",
    \"permissions\": [\"read\"]
  }"
```

Add transaction guardrails that Dynamic does not offer:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_to_allowlist": ["0xYourContract..."],
    "tx_max_value_eth": "1.0",
    "tx_daily_limit_eth": "10.0",
    "tx_allowed_chains": ["ethereum", "base"]
  }'
```

### 4. Keep Dynamic for user-facing wallets

If you use Dynamic's embedded wallet SDK for user login and in-browser signing, keep it. 1claw is not trying to replace the user's wallet. The architecture looks like this:

```
User browser                      Your backend                    Blockchain
    |                                  |                              |
    |  Dynamic embedded wallet         |                              |
    |  (login, user-initiated txs)     |                              |
    |                                  |                              |
    |                              1claw vault                        |
    |                              (agent signing keys)               |
    |                              (API keys, RPC URLs)               |
    |                                  |                              |
    |                              Agent calls Intents API  --------> |
    |                              (server-side signing)              |
```

Your frontend uses Dynamic for wallet connection and user-driven transactions. Your backend uses 1claw for automated/agent-driven operations where no human is clicking "confirm" in a browser.

### 5. Use 1claw's Intents API for backend automation

Anything that runs on a cron, responds to a webhook, or is triggered by an AI agent should go through the Intents API:

```typescript
// Automated rebalancing, triggered by an agent or cron
const rebalance = await client.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xUniswapRouter...",
  value: "0",
  data: "0x...", // swap calldata
  simulate_first: true,
});
```

This gives you:

- Server-side signing with HSM-backed keys
- Transaction guardrails (allowlists, spend caps, chain restrictions)
- Tenderly simulation before signing
- Full audit trail of every transaction
- Optional [Shroud TEE signing](/docs/guides/shroud) for additional isolation

## Side-by-side reference

| Dynamic concept | 1claw equivalent | Notes |
|-----------------|------------------|-------|
| Environment ID | Org ID | Auto-created on signup |
| Server wallet | Agent + signing key | Provisioned via `POST /v1/agents/{id}/signing-keys` |
| `signTransaction()` | `POST /v1/agents/{id}/transactions` | Server-side sign + broadcast |
| API key (Dynamic) | Agent API key (`ocv_`) | Exchanged for short-lived JWT |
| Environment secrets | Vault secrets | HSM-encrypted, policy-gated |
| Webhook signing key | Vault secret | Store in vault, fetch at runtime |

## Further reading

- [Intents API](/docs/guides/intents-api) for the full transaction signing reference
- [Multi-chain signing keys](/docs/guides/multi-chain-signing) for provisioning keys across six chains
- [Five-minute walkthrough](/docs/guides/five-minute-walkthrough) for a quick end-to-end demo
- [Give an agent access](/docs/guides/give-agent-access) for the golden path
