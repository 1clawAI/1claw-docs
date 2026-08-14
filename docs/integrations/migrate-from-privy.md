---
title: "Migrate from Privy"
description: Integrate 1claw alongside Privy's embedded wallets. Use Privy for user wallets and 1claw for agent signing, treasury operations, and server-side key management.
sidebar_position: 52
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrate from Privy

[Privy](https://privy.io) gives you embedded wallets, server wallets, and auth flows for end users. If your application already uses Privy, this guide shows how to layer 1claw underneath for agent-side operations, server-side key management, and treasury workflows that Privy does not cover.

## When to use which

| Use case | Privy | 1claw |
|----------|-------|-------|
| User login (email, social, passkey) | Privy Auth | Not the primary path. Available via [social login](/docs/treasury/embedded-wallets) for platform apps |
| User-facing embedded wallet | Privy embedded wallets | Not needed for user wallets |
| Server wallets for backend ops | Privy server wallets | Agent signing keys + Intents API |
| AI agent secret management | Not available | Vault + policy engine |
| Transaction guardrails and spend caps | Limited | Full guardrails (allowlists, per-tx caps, daily limits, chain restrictions) |
| LLM traffic inspection | Not available | Shroud TEE proxy |
| Multisig treasury | Not available | Safe-based treasury proposals |
| Audit trail | Limited | Hash-chained audit log with tamper detection |

**The pattern:** Privy handles user authentication and user-owned wallets. 1claw handles everything behind the user: agent credentials, backend signing keys, treasury operations, and LLM security.

## Architecture: Privy + 1claw together

```
End user                           Your app backend               Blockchain
  |                                     |                             |
  |  Privy embedded wallet              |                             |
  |  (login, in-app signing)            |                             |
  |  ---------------------------------> |                             |
  |                                     |                             |
  |                                 1claw vault                       |
  |                                 - Agent API keys                  |
  |                                 - RPC URLs                       |
  |                                 - Signing keys (HSM-backed)      |
  |                                     |                             |
  |                                 Intents API ----sign + broadcast-> |
  |                                     |                             |
  |                                 Shroud (optional)                 |
  |                                 - LLM proxy                      |
  |                                 - Secret redaction                |
```

## Step 1: Move server wallet operations to 1claw

Privy's server wallets use the `@privy-io/server-auth` SDK. The equivalent in 1claw is an agent with a provisioned signing key.

**Privy (before):**

```typescript
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

// Create a server wallet
const wallet = await privy.walletApi.create({
  chainType: "ethereum",
});

// Sign a transaction
const { hash } = await privy.walletApi.ethereum.sendTransaction({
  walletId: wallet.id,
  caip2: "eip155:8453", // Base
  transaction: {
    to: "0xRecipient...",
    value: 1000000000000000n,
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

// Signing key was provisioned by a human via:
//   POST /v1/agents/{agentId}/signing-keys { "chain": "ethereum" }
// The agent never sees the private key.

// Submit a transaction; 1claw signs and broadcasts
const tx = await client.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xRecipient...",
  value: "0.001", // ETH, not wei
});

console.log("tx_hash:", tx.data.tx_hash);
```

Differences worth noting:

- Privy uses CAIP-2 chain identifiers (`eip155:8453`). 1claw uses chain names (`base`, `ethereum`, `sepolia`).
- 1claw takes ETH as the value unit. The server converts to wei.
- 1claw signing keys are provisioned by a human, not created by the agent. This separation is intentional: agents should not be able to create their own keys.

### Transaction guardrails

Privy does not have native transaction guardrails. 1claw lets you set per-agent constraints:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_to_allowlist": ["0xYourContract...", "0xAnotherContract..."],
    "tx_max_value_eth": "0.5",
    "tx_daily_limit_eth": "5.0",
    "tx_allowed_chains": ["base", "ethereum"]
  }'
```

Every transaction is validated against these rules before signing. Violations return 403 with a descriptive error.

## Step 2: Store backend secrets in the vault

If you keep API keys, webhook secrets, or database credentials in environment variables or Privy's dashboard, move them to a 1claw vault.

```bash
# Store your Privy app secret itself in 1claw
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/privy/app-secret" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$PRIVY_APP_SECRET"'",
    "type": "api_key",
    "description": "Privy server auth secret"
  }'
```

Then fetch it at runtime from your agent or backend:

```typescript
const secret = await client.secrets.get(vaultId, "privy/app-secret");
const privySecret = secret.data.value;
```

This way your Privy credentials are HSM-encrypted, access-policy-gated, and audit-logged instead of sitting in an `.env` file or a CI/CD dashboard.

## Step 3: Use 1claw for agent and automation workflows

Privy is designed for user-facing flows. For backend processes that need to sign transactions, manage keys, or call APIs without a user clicking "approve" in a browser, 1claw is the better fit.

**Example: an AI agent that rebalances a portfolio**

```typescript
import { createClient } from "@1claw/sdk";

const agent = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Fetch the swap calldata from your strategy engine
const calldata = await buildSwapCalldata(/* ... */);

// Sign and broadcast through 1claw
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xSwapRouter...",
  value: "0",
  data: calldata,
  simulate_first: true, // Tenderly simulation before signing
});

if (tx.data.status === "broadcast") {
  console.log("Rebalance executed:", tx.data.tx_hash);
}
```

This agent has:

- An HSM-backed signing key it cannot extract
- Guardrails limiting which contracts it can call and how much it can spend
- A full audit trail in 1claw
- Optional Tenderly simulation before committing

## Step 4: Add treasury operations (optional)

If your project manages a multisig treasury, 1claw provides Safe-based proposals that work with agent delegation:

```typescript
// Agent proposes a treasury transaction
const proposal = await agent.treasury.propose(treasuryId, {
  chain: "ethereum",
  to_address: "0xRecipient...",
  value_wei: "500000000000000000", // 0.5 ETH
});

// Human signers approve in the dashboard or via API
// When threshold is met, auto-execute kicks in
```

See the [Treasury guide](/docs/treasury/overview) for the full flow.

## Privy-to-1claw concept map

| Privy concept | 1claw equivalent | Notes |
|---------------|------------------|-------|
| App ID + App Secret | Org + human API key (`1ck_`) | Per-org isolation |
| Server wallet | Agent signing key | HSM-backed, never exposed |
| `walletApi.ethereum.sendTransaction()` | `POST /v1/agents/{id}/transactions` | Server-side sign + broadcast |
| Embedded wallet | Not needed (or: [embedded wallets](/docs/treasury/embedded-wallets)) | Privy handles user wallets |
| Privy dashboard secrets | Vault secrets | HSM-encrypted, policy-gated |
| Webhooks | [Webhooks](/docs/reference/api-reference) | HMAC-signed delivery |
| Access tokens (Privy JWT) | Agent JWT (short-lived, scoped) | Exchanged from `ocv_` key |

## Further reading

- [Intents API](/docs/agents/intents/overview) for full transaction signing docs
- [Multi-chain signing keys](/docs/agents/intents/multi-chain-signing) for provisioning keys on Bitcoin, Solana, and more
- [Shroud](/docs/agents/shroud/overview) for LLM traffic inspection and secret redaction
- [Human-in-the-loop approvals](/docs/treasury/approvals) for agent transaction governance
