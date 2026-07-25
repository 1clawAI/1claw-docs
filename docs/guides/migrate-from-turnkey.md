---
title: "Migrate from Turnkey"
description: Move from Turnkey's API-based key infrastructure to 1claw's HSM-backed signing keys and vault. Side-by-side comparison and migration steps.
sidebar_position: 56
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrate from Turnkey

[Turnkey](https://turnkey.com) provides non-custodial key infrastructure through an API. If you use Turnkey for programmatic signing and are evaluating 1claw, this guide walks through the differences and shows how to migrate.

## Feature comparison

| Feature | Turnkey | 1claw |
|---------|---------|-------|
| Key storage | Secure enclaves (AWS Nitro) | Google Cloud KMS HSM (FIPS 140-2 L3) |
| Key generation | API-driven, user-controlled | Human-provisioned per agent, HSM-generated |
| Signing API | `signTransaction`, `signRawPayload` | Intents API (`POST /v1/agents/{id}/transactions`, unified `/sign`) |
| Policy model | Organization policies, approvals | Per-agent policies with path globs, time windows, IP conditions |
| Transaction guardrails | Activity policies | Allowlists, per-tx caps, daily limits, chain restrictions, token allowlists |
| Multi-chain | Ethereum and Solana | Ethereum, Bitcoin, Solana, XRP, Cardano, Tron |
| Agent-native | Requires custom integration | Built-in agent auth, JWT scoping, self-enrollment |
| Secret management | Not included | Full vault with HSM encryption |
| LLM proxy | Not included | Shroud TEE proxy |
| Multisig treasury | Not built in | Safe-based proposals |

The main architectural difference: Turnkey gives you fine-grained control over key management operations (create, export, import, rotate). 1claw abstracts key management away entirely. The agent asks "sign this transaction" and the vault handles key lifecycle. You never import, export, or directly manage key material through the API.

## Migration steps

### 1. Map Turnkey organizations to 1claw orgs

Turnkey uses organizations as the top-level grouping. In 1claw, your account has one org. If you run multiple Turnkey orgs for different environments (staging, production), use separate vaults within your 1claw org.

```bash
# Create vaults for each environment
curl -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Keys","description":"Migrated from Turnkey prod org"}'

curl -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Staging Keys","description":"Migrated from Turnkey staging org"}'
```

### 2. Replace Turnkey wallets with signing keys

In Turnkey, you create wallets and sign with specific accounts derived from those wallets. In 1claw, you provision per-agent signing keys.

**Turnkey (before):**

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORG_ID!,
});

const client = turnkey.apiClient();

// Sign a transaction
const { signedTransaction } = await client.signTransaction({
  type: "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
  organizationId: orgId,
  parameters: {
    signWith: walletAccountAddress,
    unsignedTransaction: serializedTx,
    type: "TRANSACTION_TYPE_ETHEREUM",
  },
});
```

**1claw (after):**

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!, // ocv_ key
});

// Submit a transaction directly; 1claw handles serialization, signing, broadcast
const tx = await client.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xRecipient...",
  value: "0.1",
  simulate_first: true,
});

console.log("tx_hash:", tx.data.tx_hash);
```

Key difference: Turnkey requires you to serialize the transaction yourself and pass the raw bytes. 1claw accepts high-level parameters (chain, to, value, data) and handles serialization, nonce management, gas estimation, and broadcasting.

### 3. Replace Turnkey activity policies with 1claw guardrails

Turnkey's activity policies control what operations are allowed. 1claw's equivalent is a combination of access policies and transaction guardrails.

**Turnkey policy (before):**

```json
{
  "policyName": "Limit ETH transfers",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.count() >= 1",
  "condition": "eth.tx.value > '1000000000000000000'"
}
```

**1claw guardrails (after):**

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_max_value_eth": "1.0",
    "tx_daily_limit_eth": "10.0",
    "tx_to_allowlist": ["0xAllowedContract..."],
    "tx_allowed_chains": ["ethereum", "base"],
    "tx_max_per_day": 100
  }'
```

1claw guardrails are per-agent, not organization-wide. Each agent can have different constraints.

### 4. Migrate signing key material (if needed)

If you need to keep existing Turnkey addresses (e.g., they hold funds or are registered in contracts), you have two options:

**Option A: Export from Turnkey, import to 1claw vault (recommended for funded accounts)**

```bash
# After exporting the private key from Turnkey:
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/keys/ethereum-signer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "0xYourPrivateKey...",
    "type": "private_key",
    "description": "Migrated from Turnkey wallet"
  }'
```

:::warning
Handle private keys carefully during export/import. Use a secure environment, never log the key, and delete the plaintext immediately after import. Once in the vault, the key is HSM-encrypted and policy-gated.
:::

**Option B: Generate fresh keys in 1claw (recommended for new deployments)**

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum"}'
```

This generates a new keypair inside the HSM. You get the public key and address back. Fund the new address and update any contract registrations.

### 5. Replace Turnkey API key auth with 1claw agent auth

Turnkey uses API public/private key pairs (stamped requests). 1claw uses agent API keys exchanged for JWTs.

**Turnkey auth:**
- API key pair (public key registered, private key signs requests)
- Stamped headers on every request
- Organization-scoped

**1claw auth:**
- Agent API key (`ocv_`) exchanged for short-lived JWT
- JWT includes scopes derived from policies
- Agent-scoped with vault binding

```typescript
// 1claw: agent authenticates with one call
const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "ocv_your_agent_key", // auto-exchanges for JWT
});

// All subsequent calls use the JWT automatically
// JWT refreshes before expiry
```

## Concept map

| Turnkey concept | 1claw equivalent |
|-----------------|------------------|
| Organization | Org (auto-created) |
| Wallet | Signing key (per-agent, per-chain) |
| Account (derived address) | Agent EOA / signing key address |
| API key pair (stamp) | Agent API key (`ocv_`) + JWT |
| Activity policy | Transaction guardrails + access policies |
| `signTransaction()` | `POST /v1/agents/{id}/transactions` |
| `signRawPayload()` | `POST /v1/agents/{id}/sign` (unified, supports personal_sign, typed_data, digest) |
| Sub-organization | Separate vault within same org |
| User (Turnkey) | Human user in 1claw |

## Hybrid approach

If you want to keep Turnkey for some operations (e.g., user-facing wallet signing via their iframe) and use 1claw for backend/agent operations, that works fine. Store your Turnkey API credentials in a 1claw vault:

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/turnkey/api-private-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$TURNKEY_API_PRIVATE_KEY"'",
    "type": "private_key",
    "description": "Turnkey API private key"
  }'
```

Your agent fetches the Turnkey key from the vault at runtime, signs Turnkey requests, and you get audit logging on every access.

## Further reading

- [Intents API](/docs/guides/intents-api) for the full transaction signing reference
- [Multi-chain signing keys](/docs/guides/multi-chain-signing) for provisioning keys across six chains
- [Account Abstraction](/docs/guides/account-abstraction) for ERC-4337 smart accounts
- [Five-minute walkthrough](/docs/guides/five-minute-walkthrough) for a quick end-to-end demo
