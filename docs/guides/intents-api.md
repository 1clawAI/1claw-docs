---
title: Intents API
description: Let agents sign and broadcast blockchain transactions without ever seeing private keys. Includes the full list of supported chains.
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Intents API

The Intents API lets an agent submit on-chain transactions — transfers, swaps, contract calls — while **never having access to the raw private key**. The server signs the transaction using keys stored in the vault and broadcasts it through a dedicated RPC for the target chain.

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
import os
import requests

BASE = "https://api.1claw.xyz"
headers = {"Authorization": f"Bearer {os.environ['ONECLAW_TOKEN']}"}
r = requests.post(
    f"{BASE}/v1/agents",
    json={"name": "DeFi Bot", "intents_api_enabled": True},
    headers=headers,
)
r.raise_for_status()
agent = r.json()
agent_id = agent["id"]
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
r = requests.post(
    f"{BASE}/v1/agents/{agent_id}/transactions",
    json={
        "chain": "ethereum",
        "to": "0xRecipientAddress",
        "value": "1.0",
        "data": "0x",
        "signing_key_path": "wallets/hot-wallet",
    },
    headers=headers,
)
r.raise_for_status()
tx = r.json()
print(tx["tx_hash"], tx["status"])
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
</Tabs>

## Multi-chain signing keys {#signing-keys}

Instead of manually storing a raw private key in a vault, you can provision HSM-backed signing keys directly on the agent. 1claw generates the keypair inside the HSM and stores the private key in the org's `__agent-keys` vault — the key never leaves hardware.

### Supported chains

| Chain | Curve | Address format |
| --- | --- | --- |
| Ethereum | secp256k1 | 0x (EIP-55 checksum) |
| Bitcoin | secp256k1 | P2WPKH (bech32, bc1q…) |
| Solana | Ed25519 | Base58 |
| XRP | Ed25519 | Base58Check (r…) |
| Cardano | Ed25519 | Bech32 enterprise (addr1…) |
| Tron | secp256k1 | Base58Check (T…) |

### Provisioning a key

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "ethereum" }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: key } = await client.signingKeys.create(agentId, {
  chain: "ethereum",
});
console.log(key.public_key, key.address); // 0x04abc...  0x1234...
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent signing-keys create $AGENT_ID --chain ethereum
```

</TabItem>
</Tabs>

The response includes the `public_key`, derived `address`, `curve`, and `key_version`. The private key is stored in the HSM-backed `__agent-keys` vault.

### Key lifecycle

| Operation | Endpoint | SDK |
| --- | --- | --- |
| Provision | `POST /v1/agents/{id}/signing-keys` | `client.signingKeys.create(agentId, { chain })` |
| List | `GET /v1/agents/{id}/signing-keys` | `client.signingKeys.list(agentId)` |
| Rotate | `POST /v1/agents/{id}/signing-keys/{chain}/rotate` | `client.signingKeys.rotate(agentId, chain)` |
| Deactivate | `DELETE /v1/agents/{id}/signing-keys/{chain}` | `client.signingKeys.deactivate(agentId, chain)` |

Only human users can provision and rotate keys — agents get 403. Keys for non-EVM chains (Bitcoin, Solana, XRP, Cardano, Tron) support address derivation; on-chain signing for those chains is on the roadmap.

:::tip Platform API auto-provisioning
If you're using the [Platform API](/docs/guides/platform-api), signing keys can be auto-provisioned during bootstrap by including a `signing_keys` array in your template spec — no separate API call needed.
:::

---

## Unified sign endpoint {#unified-sign}

The unified `POST /v1/agents/{id}/sign` endpoint supports three intent types: EIP-191 message signing, EIP-712 typed data signing, and transaction signing across all EIP-2718 types.

### EIP-191 personal_sign {#eip191}

Sign an arbitrary human-readable message. Requires `message_signing_enabled: true` on the agent.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/sign" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent_type": "personal_sign",
    "chain": "ethereum",
    "message": "Hello from my agent!"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.sign(agentId, {
  intent_type: "personal_sign",
  chain: "ethereum",
  message: "Hello from my agent!",
});
console.log(data.signature, data.message_hash, data.from);
```

</TabItem>
</Tabs>

### EIP-712 typed data {#eip712}

Sign structured typed data (e.g. ERC-20 Permit, gasless approvals). The agent's `eip712_domain_allowlist` must include the `verifyingContract`, or `eip712_default_policy` must be `"allow"`.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/sign" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent_type": "typed_data",
    "chain": "ethereum",
    "typed_data": {
      "types": { "Permit": [{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}] },
      "primaryType": "Permit",
      "domain": { "name": "USD Coin", "version": "2", "chainId": 1, "verifyingContract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      "message": { "owner": "0x...", "spender": "0x...", "value": "1000000", "nonce": "0", "deadline": "1735689600" }
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.sign(agentId, {
  intent_type: "typed_data",
  chain: "ethereum",
  typed_data: {
    types: { Permit: [/* ... */] },
    primaryType: "Permit",
    domain: { name: "USD Coin", version: "2", chainId: 1, verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    message: { owner: "0x...", spender: "0x...", value: "1000000", nonce: "0", deadline: "1735689600" },
  },
});
console.log(data.signature, data.typed_data_hash, data.from);
```

</TabItem>
</Tabs>

### Transaction types (EIP-2718) {#tx-types}

The unified sign endpoint supports all EIP-2718 envelope types via the `tx_type` field:

| tx_type | Name | Key fields |
| --- | --- | --- |
| 0 | Legacy (EIP-155) | `gas_price` |
| 1 | EIP-2930 (access list) | `gas_price`, `access_list` |
| 2 | EIP-1559 | `max_fee_per_gas`, `max_priority_fee_per_gas` |
| 3 | EIP-4844 (blob) | `max_fee_per_blob_gas`, `blob_versioned_hashes` |
| 4 | EIP-7702 | `authorization_list` |

```typescript
const { data } = await client.agents.sign(agentId, {
  intent_type: "transaction",
  chain: "sepolia",
  tx_type: 2,
  to: "0xRecipient",
  value: "0",
  max_fee_per_gas: "30000000000",
  max_priority_fee_per_gas: "2000000000",
  gas_limit: 21000,
});
```

### Message signing guardrails {#message-guardrails}

| Field | Type | Description |
| --- | --- | --- |
| `message_signing_enabled` | `boolean` | Must be `true` for EIP-191 personal_sign (default: `false`). |
| `eip712_default_policy` | `"deny"` \| `"allow"` | Default policy for EIP-712 domains not in the allowlist (default: `"deny"`). |
| `eip712_domain_allowlist` | `JSON[]` | List of allowed domains, e.g. `[{"verifying_contract": "0xA0b..."}]`. Known dangerous types (Permit, Permit2) always require explicit allowlisting. |

---

## MCP tools

The MCP server provides transaction tools for the full lifecycle:

**`simulate_transaction`** — simulate without signing:
```
Tool: simulate_transaction
Args:
  chain: "base"
  to: "0xRecipientAddress"
  value: "0.5"
  signing_key_path: "wallets/hot-wallet"
```

**`submit_transaction`** — sign and broadcast (simulation on by default):
```
Tool: submit_transaction
Args:
  chain: "base"
  to: "0xRecipientAddress"
  value: "0.5"
  signing_key_path: "wallets/hot-wallet"
  simulate_first: true
```

**`sign_transaction`** — sign only, no broadcast (for BYORPC):
```
Tool: sign_transaction
Args:
  chain: "base"
  to: "0xRecipientAddress"
  value: "0.5"
  signing_key_path: "wallets/hot-wallet"
  simulate_first: true
```

**`list_transactions`** — list recent transactions:
```
Tool: list_transactions
Args:
  include_signed_tx: false
```

**`get_transaction`** — get details of a specific transaction:
```
Tool: get_transaction
Args:
  transaction_id: "uuid-of-transaction"
  include_signed_tx: false
```

**`provision_signing_key`** — provision an HSM-backed signing key for a chain:
```
Tool: provision_signing_key
Args:
  chain: "ethereum"
```

**`list_signing_keys`** — list all signing keys for the current agent:
```
Tool: list_signing_keys
```

**`sign_message`** — sign an EIP-191 personal message:
```
Tool: sign_message
Args:
  message: "Hello from my agent"
  chain: "ethereum"
```

**`sign_typed_data`** — sign EIP-712 typed structured data:
```
Tool: sign_typed_data
Args:
  chain: "ethereum"
  typed_data: { types: {...}, primaryType: "Permit", domain: {...}, message: {...} }
```

---

## Supported chains {#supported-chains}

The proxy can broadcast transactions to any chain in the registry. All mainnet chains below are configured with dedicated dRPC endpoints for reliable transaction delivery.

:::tip Querying chains via API
You can always fetch the live list with `GET /v1/chains`. The response includes `chain_id`, `rpc_url`, `explorer_url`, and `native_currency` for every chain.
:::

### Mainnet chains (28)

| Chain             | Chain ID | Native token | Explorer                                                           |
| ----------------- | -------- | ------------ | ------------------------------------------------------------------ |
| Ethereum          | 1        | ETH          | [etherscan.io](https://etherscan.io)                               |
| Optimism          | 10       | ETH          | [optimistic.etherscan.io](https://optimistic.etherscan.io)         |
| Cronos            | 25       | CRO          | [cronoscan.com](https://cronoscan.com)                             |
| BNB Smart Chain   | 56       | BNB          | [bscscan.com](https://bscscan.com)                                 |
| Gnosis            | 100      | xDAI         | [gnosisscan.io](https://gnosisscan.io)                             |
| Polygon           | 137      | POL          | [polygonscan.com](https://polygonscan.com)                         |
| Sonic             | 146      | S            | [sonicscan.org](https://sonicscan.org)                             |
| Fantom            | 250      | FTM          | [ftmscan.com](https://ftmscan.com)                                 |
| zkSync Era        | 324      | ETH          | [explorer.zksync.io](https://explorer.zksync.io)                   |
| World Chain       | 480      | ETH          | [worldscan.org](https://worldscan.org)                             |
| Metis             | 1088     | METIS        | [andromeda-explorer.metis.io](https://andromeda-explorer.metis.io) |
| Polygon zkEVM     | 1101     | ETH          | [zkevm.polygonscan.com](https://zkevm.polygonscan.com)             |
| Moonbeam          | 1284     | GLMR         | [moonscan.io](https://moonscan.io)                                 |
| Sei               | 1329     | SEI          | [seitrace.com](https://seitrace.com)                               |
| Mantle            | 5000     | MNT          | [mantlescan.xyz](https://mantlescan.xyz)                           |
| Kaia              | 8217     | KAIA         | [kaiascan.io](https://kaiascan.io)                                 |
| Base              | 8453     | ETH          | [basescan.org](https://basescan.org)                               |
| Mode              | 34443    | ETH          | [modescan.io](https://modescan.io)                                 |
| Arbitrum One      | 42161    | ETH          | [arbiscan.io](https://arbiscan.io)                                 |
| Arbitrum Nova     | 42170    | ETH          | [nova.arbiscan.io](https://nova.arbiscan.io)                       |
| Celo              | 42220    | CELO         | [celoscan.io](https://celoscan.io)                                 |
| Avalanche C-Chain | 43114    | AVAX         | [snowtrace.io](https://snowtrace.io)                               |
| Linea             | 59144    | ETH          | [lineascan.build](https://lineascan.build)                         |
| Berachain         | 80094    | BERA         | [berascan.com](https://berascan.com)                               |
| Blast             | 81457    | ETH          | [blastscan.io](https://blastscan.io)                               |
| Taiko             | 167000   | ETH          | [taikoscan.io](https://taikoscan.io)                               |
| Scroll            | 534352   | ETH          | [scrollscan.com](https://scrollscan.com)                           |
| Zora              | 7777777  | ETH          | [explorer.zora.energy](https://explorer.zora.energy)               |

### Testnet chains

| Chain        | Chain ID | Native token |
| ------------ | -------- | ------------ |
| Sepolia      | 11155111 | ETH          |
| Base Sepolia | 84532    | ETH          |

### Adding a chain

Admins can add new chains via the admin API:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/admin/chains" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-chain",
    "display_name": "My Chain",
    "chain_id": 12345,
    "rpc_url": "https://rpc.mychain.io",
    "explorer_url": "https://explorer.mychain.io",
    "native_currency": "MCH"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
// Admin chain management requires direct API calls
const response = await fetch("https://api.1claw.xyz/v1/admin/chains", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "my-chain",
    display_name: "My Chain",
    chain_id: 12345,
    rpc_url: "https://rpc.mychain.io",
    explorer_url: "https://explorer.mychain.io",
    native_currency: "MCH",
  }),
});
```

</TabItem>
</Tabs>

See the [Admin API reference](/docs/reference/api-reference#admin) for update and delete endpoints.

---

## Transaction guardrails

Per-agent controls can be set when registering or updating an agent to limit what transactions the proxy will sign:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `tx_allowed_chains` | `string[]` | Restrict to specific chain names (e.g. `["ethereum", "base"]`). Empty = all chains allowed. |
| `tx_to_allowlist` | `string[]` | Restrict recipient addresses. Empty = any address allowed. |
| `tx_max_value_eth` | `string` | Maximum value per transaction in ETH (e.g. `"1.0"`). Null = no per-tx limit. |
| `tx_daily_limit_eth` | `string` | Rolling 24-hour spend limit in ETH. Null = no daily limit. |

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_allowed_chains": ["ethereum", "base"],
    "tx_to_allowlist": ["0xSafeAddress1", "0xSafeAddress2"],
    "tx_max_value_eth": "0.5",
    "tx_daily_limit_eth": "5.0"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: agent } = await client.agents.update(agentId, {
  tx_allowed_chains: ["ethereum", "base"],
  tx_to_allowlist: ["0xSafeAddress1", "0xSafeAddress2"],
  tx_max_value_eth: "0.5",
  tx_daily_limit_eth: "5.0",
});
```

</TabItem>
</Tabs>

When a transaction violates any guardrail, the proxy returns **403 Forbidden** with a descriptive `detail` message.

---

## Shroud TEE signing (optional)

When [Shroud](/docs/guides/shroud) is deployed, transaction signing moves into a Trusted Execution Environment (AMD SEV-SNP on GKE). The `POST /v1/agents/:id/transactions` endpoint on `shroud.1claw.xyz` uses Shroud's own signing engine — private keys are only decrypted inside confidential memory. All other Intents API endpoints (list, get, simulate, simulate-bundle) are proxied to the Vault API.

Both `api.1claw.xyz` and the TEE hosts serve the full Intents API. Choose based on your security requirements:

| Surface | Submit | List/Get/Simulate | Key isolation |
| --- | --- | --- | --- |
| `api.1claw.xyz` | HSM-backed signing (Cloud Run) | Direct | Cloud KMS HSM |
| `shroud.1claw.xyz` | TEE signing (GKE SEV-SNP) | Proxied to Vault API | TEE + KMS |
| `intents.1claw.xyz` | TEE signing (same backend as Shroud) | Proxied to Vault API | TEE + KMS |

`intents.1claw.xyz` is an alias for the same GKE backend as `shroud.1claw.xyz` — use it when you want a dedicated hostname for the Intents API. Shroud also provides LLM proxy capabilities; see the [Shroud guide](/docs/guides/shroud).

## Security model

- **Keys never leave the HSM boundary** — the vault decrypts the key, signs the transaction, and zeroes the memory. The plaintext key is never returned to the caller.
- **Full audit trail** — every transaction is logged with the agent ID, chain, recipient, value, and resulting `tx_hash`.
- **Policy enforcement** — the agent still needs a policy granting access to the vault path that holds the signing key. The proxy doesn't bypass access control.
- **Transaction guardrails** — per-agent chain allowlists, recipient allowlists, per-tx caps, and daily spend limits enforced server-side before signing.
- **Rate limiting** — standard rate limits apply to transaction endpoints.

## Replay protection

### Idempotency-Key header

Submit an `Idempotency-Key` header (e.g. a UUID) with `POST /v1/agents/:id/transactions` to prevent duplicate submissions. If the same key is sent within 24 hours, the server returns the cached transaction response instead of signing and broadcasting again.

The SDK and MCP server auto-generate an idempotency key on every `submitTransaction` call. You can override with your own key for explicit retry control.

| Scenario | Response |
| --- | --- |
| First request with key | `201 Created` (normal flow) |
| Duplicate request (completed) | `200 OK` (cached response) |
| Duplicate request (in progress) | `409 Conflict` (retry later) |
| No header | No idempotency enforcement |

### Server-side nonce management

When the `nonce` field is omitted, the server atomically reserves the next nonce per agent+chain+address combination. This prevents nonce collisions when multiple transactions are submitted concurrently. The server tracks the highest nonce used and takes the maximum of its tracked value and the on-chain pending nonce.

### Response field gating

By default, the `signed_tx` field (raw signed transaction hex) is **omitted** from GET responses to reduce exfiltration risk. Pass `?include_signed_tx=true` to include it:

```bash
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions?include_signed_tx=true" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

The initial POST submission always returns `signed_tx` for the originating caller.

## Best practices

1. **One key per agent** — give each agent its own signing key in its own vault path so you can revoke independently.
2. **Set `expires_at`** — register agents with an expiry so leaked API keys have a bounded blast radius.
3. **Use scoped policies** — grant the agent access only to the specific vault path containing its signing key, not the entire vault.
4. **Monitor transactions** — query `GET /v1/agents/:id/transactions` regularly or set up audit webhooks.
5. **Use testnets first** — store a testnet key (Sepolia, Base Sepolia) and verify the flow before moving to mainnet.
