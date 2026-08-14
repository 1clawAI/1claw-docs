---
title: Intents API
description: Let agents sign and broadcast blockchain transactions without ever seeing private keys. EVM and multi-chain support with guardrails.
keywords: [Intents API, transaction signing, blockchain agents, EVM, multi-chain]
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Intents API

The Intents API lets an agent submit on-chain transactions — transfers, swaps, contract calls — while **never having access to the raw private key**. The server signs the transaction using keys stored in the vault and broadcasts it through a dedicated RPC for the target chain.

## On this page

- [Quickstart](#quickstart-your-first-transaction-5-min)
- [How it works](#how-it-works)
- [Submitting a transaction](#submitting-a-transaction)
- [Sign-only mode](#sign-only)
- [Transaction simulation](#simulation)
- [Multi-chain signing keys](/docs/guides/intents-signing#signing-keys)
- [Non-EVM signing](/docs/guides/intents-signing#non-evm)
- [Unified sign endpoint](/docs/guides/intents-signing#unified-sign)
- [Transaction guardrails](/docs/guides/intents-guardrails#transaction-guardrails)
- [Execution Intents](/docs/guides/intents-guardrails#execution-intents)
- [Best practices](/docs/guides/intents-guardrails#best-practices)
- [Next steps](#next-steps)

:::tip Try it out
Try out the examples: **[Transaction Simulation](https://github.com/1clawAI/1claw-examples/tree/main/tx-simulation)** (guardrails + Tenderly simulation), **[Shroud Demo](https://github.com/1clawAI/1claw-examples/tree/main/shroud-demo)** (Intents API via Shroud TEE), **[Multi-Chain Keys](https://github.com/1clawAI/1claw-examples/tree/main/multi-chain-keys)** (provision keys for 6 blockchains), **[EVM Signing](https://github.com/1clawAI/1claw-examples/tree/main/evm-signing)** (EIP-191, EIP-712, tx types 0–2), and **[Agentic TX](https://github.com/1clawAI/1claw-examples/tree/main/agentic-tx)** (real mainnet transactions with guardrails).
:::

## Quickstart: Your first transaction (~5 min)

1. **Create an agent** with `intents_api_enabled: true` (Dashboard → Agents → Create, or API below). Note the agent ID and API key.
2. **Store a signing key** in a vault the agent can read: either provision a per-chain signing key via `POST /v1/agents/:id/signing-keys` (recommended), or put a secp256k1 private key at a path like `keys/ethereum-signer` or `wallets/hot-wallet` (see [Secrets](/docs/human-api/secrets/create)). Grant the agent read access to that path via a policy.
3. **Get an agent JWT:** `POST /v1/auth/agent-token` with `agent_id` and `api_key`.
4. **Submit a transaction:** `POST /v1/agents/:agent_id/transactions` with `chain`, `to`, `value`, and optionally `signing_key_path`. Use testnets (e.g. `chain: "sepolia"`) first.
5. **Optional:** Set `simulate_first: true` to run a Tenderly simulation before signing; if the simulation reverts, the API returns **422** and does not sign. See [Transaction simulation (Tenderly)](#simulation) and [Error codes](/docs/reference/error-codes#intents-api-errors).

:::tip
Default signing key path auto-resolves: if the agent has a per-chain signing key provisioned (via `POST /v1/agents/:id/signing-keys`), the key at `agents/{id}/chains/{chain}/private_key` is used; otherwise falls back to `keys/{chain}-signer` (e.g. `keys/base-signer`). Network names like `sepolia` and `base` automatically map to canonical signing key chains like `ethereum`. You can override with `signing_key_path` in the request. Allowed path prefixes: `keys/`, `wallets/`, `agents/{id}/keys/`, `agents/{id}/chains/`.
:::

## How it works

```
Agent                       1claw Vault                  Blockchain
  │                             │                            │
  │  POST /v1/agents/:id/       │                            │
  │    transactions             │                            │
  │  { chain, to, value,        │                            │
  │    data, signing_key_path } │                            │
  │ ─────────────────────────►  │                            │
  │                             │ 1. Decrypt private key     │
  │                             │    from vault via HSM      │
  │                             │ 2. Build & sign tx         │
  │                             │ 3. Broadcast via RPC  ───► │
  │                             │                            │
  │  ◄───────────────────────── │  tx_hash, status           │
  │  { id, tx_hash, status }    │                            │
```

1. The agent calls `POST /v1/agents/:agent_id/transactions` with the chain, recipient, value, calldata, and the vault path to the signing key.
2. The vault decrypts the private key inside the HSM boundary, constructs and signs the transaction, and broadcasts it to the chain's RPC endpoint.
3. The agent receives an `id` and `tx_hash` — it never sees the raw key material.

## Enabling the Intents API

Set `intents_api_enabled: true` when registering or updating an agent:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeFi Bot",
    "intents_api_enabled": true
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_API_KEY,
});

const { data } = await client.agents.create({
  name: "DeFi Bot",
  intents_api_enabled: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "DeFi Bot",
    intents_api_enabled=True,
)
agent_id = resp.data["agent"]["id"]
```

</TabItem>
</Tabs>

### What changes when enabled

| Behaviour                        | `intents_api_enabled: false` | `intents_api_enabled: true` |
| -------------------------------- | ----------------------------- | ---------------------------- |
| Read `api_key`, `password`, etc. | Allowed                       | Allowed                      |
| Read `private_key` or `ssh_key`  | Allowed                       | **Blocked (403)**            |
| Submit proxy transactions        | Not available                 | Allowed                      |
| Audit trail per transaction      | N/A                           | Full trace with `tx_id`      |

The enforcement is two-sided: the flag both **grants** access to the transaction endpoints and **blocks** direct reads of signing keys through the standard secrets endpoint. This guarantees the agent can only use keys through the proxy.

## Submitting a transaction

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "to": "0xRecipientAddress",
    "value": "1.0",
    "data": "0x",
    "signing_key_path": "wallets/hot-wallet"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: tx } = await client.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xRecipientAddress",
  value: "1.0",
  data: "0x",
  signing_key_path: "wallets/hot-wallet",
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="ocv_...")
resp = client.agents.submit_transaction(
    agent_id,
    chain="ethereum",
    to="0xRecipientAddress",
    value="1.0",
    data="0x",
    signing_key_path="wallets/hot-wallet",
)
print(resp.data.get("tx_hash"), resp.data.get("status"))
```

</TabItem>
</Tabs>

### Response

```json
{
    "id": "a7e2c...",
    "tx_hash": "0xabc123...",
    "chain": "ethereum",
    "status": "broadcast"
}
```

## Querying transactions

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# List all transactions for this agent
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN"

# Get a specific transaction
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions/$TX_ID" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
// List transactions
const { data: txList } = await client.agents.listTransactions(agentId);

// Get transaction
const { data: tx } = await client.agents.getTransaction(agentId, txId);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
agents = client.agents.list()
for a in agents.data["agents"]:
    print(a["name"], a["id"])
```

</TabItem>
</Tabs>

## Sign-only mode (BYORPC) {#sign-only}

Sometimes you want the server to sign the transaction inside the HSM (or Shroud TEE) but **not** broadcast it. This lets you:

- Use your own RPC endpoint for broadcasting
- Implement MEV protection (e.g. Flashbots, MEV Blocker)
- Queue transactions for batch submission
- Broadcast to multiple RPCs simultaneously

Call `POST /v1/agents/:agent_id/transactions/sign` with the same request body as submit. The server signs the transaction and returns the raw `signed_tx` hex without broadcasting.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions/sign" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "to": "0xRecipientAddress",
    "value": "0.1",
    "signing_key_path": "keys/ethereum-signer"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: signedTx } = await client.agents.signTransaction(agentId, {
  chain: "ethereum",
  to: "0xRecipientAddress",
  value: "0.1",
  signing_key_path: "keys/ethereum-signer",
});

// Broadcast yourself using ethers, viem, or raw RPC
console.log(signedTx.signed_tx); // 0x02f8...
console.log(signedTx.tx_hash);   // 0xabc123...
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent tx sign $AGENT_ID \
  --to 0xRecipientAddress \
  --value 0.1 \
  --chain ethereum
```

</TabItem>
</Tabs>

### Response

```json
{
    "signed_tx": "0x02f870018203...signed hex...",
    "tx_hash": "0xabc123...",
    "from": "0xDerivedSenderAddress",
    "to": "0xRecipientAddress",
    "chain": "ethereum",
    "chain_id": 1,
    "nonce": 42,
    "value_wei": "100000000000000000",
    "status": "sign_only"
}
```

All agent guardrails (allowlists, value caps, daily limits) are enforced exactly as for submit. The transaction is recorded for audit and daily-limit tracking.

:::tip TEE signing
When using Shroud (`shroud.1claw.xyz`), the `/transactions/sign` endpoint performs signing inside the TEE — the private key never leaves the secure enclave, and you get full control over broadcasting.
:::

## Transaction simulation (Tenderly) {#simulation}

Every transaction can be simulated before signing. Simulation executes the full transaction against the current chain state in a sandboxed environment, returning decoded traces, balance changes, gas estimates, and human-readable error messages — without consuming real gas.

### Standalone simulation

Call the simulate endpoint to preview a transaction without committing:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions/simulate" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "to": "0xRecipientAddress",
    "value": "0.5",
    "data": "0x",
    "signing_key_path": "wallets/hot-wallet"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: sim } = await client.agents.simulateTransaction(agentId, {
  chain: "base",
  to: "0xRecipientAddress",
  value: "0.5",
  data: "0x",
  signing_key_path: "wallets/hot-wallet",
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

The response includes:

```json
{
  "simulation_id": "sim_a7e2c...",
  "status": "success",
  "gas_used": 21000,
  "balance_changes": [
    { "address": "0xSender...", "token": "ETH", "before": "2.5", "after": "1.99", "change": "-0.51" },
    { "address": "0xRecipient...", "token": "ETH", "before": "0.0", "after": "0.5", "change": "+0.5" }
  ],
  "tenderly_dashboard_url": "https://dashboard.tenderly.co/..."
}
```

### Simulate-then-sign (single call)

Add `"simulate_first": true` to the standard transaction submission. The server simulates first; if the simulation reverts, it returns HTTP 422 and does **not** sign or broadcast:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "to": "0xRecipientAddress",
    "value": "0.5",
    "simulate_first": true
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: tx } = await client.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xRecipientAddress",
  value: "0.5",
  simulate_first: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="ocv_...")
resp = client.agents.submit_transaction(
    agent_id,
    chain="ethereum",
    to="0x000000000000000000000000000000000000dEaD",
    value="0",
)
print(resp.data.get("tx_hash"))
```

</TabItem>
</Tabs>

### Bundle simulation

Simulate multiple transactions sequentially (e.g. ERC-20 approve followed by a swap):

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions/simulate-bundle" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      { "chain": "base", "to": "0xToken", "value": "0", "data": "0xapprove..." },
      { "chain": "base", "to": "0xRouter", "value": "0", "data": "0xswap..." }
    ]
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: bundle } = await client.agents.simulateBundle(agentId, {
  transactions: [
    { chain: "base", to: "0xToken", value: "0", data: "0xapprove..." },
    { chain: "base", to: "0xRouter", value: "0", data: "0xswap..." },
  ],
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

### Enforcing simulation

Org admins can require simulation for all agent transactions by setting the `intents_api.require_simulation` org setting to `"true"` via `PUT /v1/admin/settings/intents_api.require_simulation`. When enabled, any transaction submitted without `simulate_first: true` will be automatically simulated, and reverts will block signing.

### EIP-1559 (Type 2) transactions

Set `max_fee_per_gas` and `max_priority_fee_per_gas` instead of `gas_price` to use EIP-1559 fee mode:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "to": "0xRecipientAddress",
    "value": "0.1",
    "max_fee_per_gas": "30000000000",
    "max_priority_fee_per_gas": "1500000000",
    "simulate_first": true
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: tx } = await client.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xRecipientAddress",
  value: "0.1",
  max_fee_per_gas: "30000000000",
  max_priority_fee_per_gas: "1500000000",
  simulate_first: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="ocv_...")
resp = client.agents.submit_transaction(
    agent_id,
    chain="ethereum",
    to="0x000000000000000000000000000000000000dEaD",
    value="0",
)
print(resp.data.get("tx_hash"))
```

</TabItem>
</Tabs>


---

## Split guides

- **[Signing & chains](/docs/guides/intents-signing)** — multi-chain keys, non-EVM, unified sign, MCP tools, supported chains
- **[Guardrails & security](/docs/guides/intents-guardrails)** — transaction guardrails, TEE signing, Execution Intents, best practices

## Next steps

- [Multi-chain signing keys](/docs/guides/multi-chain-signing) — provision per-chain keypairs for agents
- [Shroud TEE signing](/docs/guides/shroud) — route signing through the confidential enclave
- [Treasury](/docs/guides/treasury) — Safe multisigs and delegated agent signing
- [Transaction guardrails](/docs/guides/intents-guardrails#transaction-guardrails) — per-agent spend caps and allowlists
- [Error codes](/docs/reference/error-codes) — Intents API error reference
