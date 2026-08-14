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
- [Multi-chain signing keys](#signing-keys)
- [Non-EVM signing](#non-evm)
- [Unified sign endpoint](#unified-sign)
- [Transaction guardrails](#transaction-guardrails)
- [Execution Intents](#execution-intents)
- [Best practices](#best-practices)
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

## Multi-chain signing keys {#signing-keys}

Instead of manually storing a raw private key in a vault, you can provision HSM-backed signing keys directly on the agent. 1claw generates the keypair inside the HSM and stores the private key in the org's `__agent-keys` vault — the key never leaves hardware.

### Supported chains

| Chain | Curve | Address format |
| --- | --- | --- |
| Ethereum | secp256k1 | 0x (EIP-55 checksum) |
| Bitcoin | secp256k1 | P2WPKH bech32 (`bc1q…` / `tb1q…`) — via `rust-bitcoin` |
| Solana | Ed25519 | Base58 — via `solana-sdk` |
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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.signing_keys.create(agent_id, chain="ethereum")
print(resp.data["address"])
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
| Export | `POST /v1/agents/{id}/signing-keys/{chain}/export` | `client.signingKeys.export(agentId, chain, { password })` |

Only human users can provision, rotate, and export keys — agents get 403. Export requires password re-authentication via the `X-Auth-Confirm` header and is audit-logged as `signing_key.export`. Failed re-auth increments `failed_login_attempts` and can trigger account lockout. Keys for non-EVM chains (Bitcoin, Solana, XRP, Cardano, Tron) support both address derivation **and on-chain transaction signing + broadcast** — see [Non-EVM transaction signing](#non-evm) below.

:::tip Platform API auto-provisioning
If you're using the [Platform API](/docs/guides/platform-api), signing keys can be auto-provisioned during bootstrap by including a `signing_keys` array in your template spec — no separate API call needed.
:::

---

## Non-EVM transaction signing {#non-evm}

The Intents API signs and broadcasts native transactions for **Bitcoin, Solana, XRP, Cardano, and Tron** in addition to EVM chains. The same endpoints (`POST /v1/agents/:id/transactions` for sign + broadcast, `POST /v1/agents/:id/transactions/sign` for sign-only) dispatch by chain family — you only change the `chain` and provide chain-appropriate fields. Signing happens in the HSM (or the Shroud TEE); the private key never leaves hardware.

Bitcoin signing uses the official [`rust-bitcoin`](https://github.com/rust-bitcoin/rust-bitcoin) crate (v0.32) with full support for P2PKH, P2SH, P2WPKH, P2WSH, and P2TR (Taproot) recipient addresses. Solana signing uses the official [`solana-sdk`](https://docs.rs/solana-sdk) crate (v4) with native PDA derivation and SPL token transfer support. XRP uses [`xrpl-rust`](https://crates.io/crates/xrpl) for 30+ transaction types.

1claw fetches the chain-specific data it needs automatically (UTXOs and fee rate for Bitcoin, latest blockhash for Solana, account sequence for XRP, protocol parameters and UTXOs for Cardano, the reference block for Tron), signs, and (unless you use the sign-only endpoint) broadcasts via the chain's RPC.

### Value units

`value` is always the **human-readable major unit** as a decimal string (e.g. `"0.5"` for 0.5 BTC). 1claw converts to base units internally:

| Chain | Base unit | Decimals | Address format |
| --- | --- | --- | --- |
| Bitcoin | satoshi | 8 | bech32 P2WPKH (`bc1q…`) |
| Solana | lamport | 9 | Base58 |
| XRP | drop | 6 | Base58Check (`r…`) |
| Cardano | lovelace | 6 | Bech32 enterprise (`addr1…`) |
| Tron | sun | 6 | Base58Check (`T…`) |

### Chain-specific request fields

All fields are optional and ignored on chains where they don't apply:

| Field | Type | Chain | Purpose |
| --- | --- | --- | --- |
| `destination_tag` | number | XRP | Destination tag for exchange deposits |
| `memo` | string | XRP, Solana | Optional memo (planned; currently accepted but not applied — use `Memos` inside `xrpl_tx_json` for XRP) |
| `fee_rate_sat_per_vbyte` | number | Bitcoin | Override the fetched fee rate |
| `fee_limit_sun` | number | Tron | TRC-20 energy fee limit (default: 100,000,000 = 100 TRX) |
| `token_mint` | string | Solana (SPL), Tron (TRC-20) | Token mint / contract address |
| `token_decimals` | number | Solana, Tron | Token decimals (default 6) |
| `ttl` | number | Cardano | Time-to-live (absolute slot; default: current slot + 7200) |
| `xrpl_tx_json` | object | XRP | Full XRPL transaction JSON for [30+ transaction types](#xrpl-tx-types) (e.g. TrustSet, OfferCreate, NFTokenMint). Overrides `to`/`value`/`destination_tag` when present. |

For a token transfer, set `token_mint` (and `token_decimals`); omit it for a native transfer.

### Supported networks & testnets {#non-evm-networks}

All non-EVM chains support both mainnet and testnet signing. Use the `chain` field to select the network:

| Chain | Mainnet `chain` | Testnet `chain` | Testnet explorer | Faucet |
| --- | --- | --- | --- | --- |
| Bitcoin | `bitcoin` | `bitcoin-testnet`, `bitcoin-signet` | [mempool.space/signet](https://mempool.space/signet) | [faucet.coinbin.org](https://faucet.coinbin.org/) (signet, no captcha, 0.001–0.09 sBTC), [signetfaucet.com](https://signetfaucet.com/) (captcha) |
| Solana | `solana` | `solana-devnet`, `solana-testnet` | [explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet) | [faucet.solana.com](https://faucet.solana.com/) (GitHub login), `solana airdrop <SOL> <address> --url devnet` |
| XRP | `xrp` | `xrp-testnet` | [testnet.xrpl.org](https://testnet.xrpl.org/) | [xrpl.org/resources/dev-tools/xrp-faucets](https://xrpl.org/resources/dev-tools/xrp-faucets) |
| Cardano | `cardano` | `cardano-preprod`, `cardano-preview` | [explorer.cardano.org/preprod](https://explorer.cardano.org/preprod) | [faucet.preprod.world.dev.cardano.org](https://faucet.preprod.world.dev.cardano.org/basic-faucet) (web or API) |
| Tron | `tron` | `tron-shasta`, `tron-nile` | [shasta.tronscan.org](https://shasta.tronscan.org/) | [shasta.tronex.io](https://shasta.tronex.io/join/getJoinPage) (2,000 TRX + 1,000 USDT) |

:::tip Testnet address formats
Bitcoin testnet/signet addresses use the `tb1q…` prefix (derived from the same key as mainnet `bc1q…`). Cardano preprod addresses use `addr_test1…` (derived from the same key as mainnet `addr1…`). Solana, XRP, and Tron use the same address format on all networks.
:::

#### External API dependencies

| Chain | External service | Required config |
| --- | --- | --- |
| Bitcoin | [mempool.space](https://mempool.space/) | None (public API) |
| Solana | Solana JSON-RPC | None (public endpoints: `api.devnet.solana.com`, `api.mainnet-beta.solana.com`) |
| XRP | XRPL HTTP JSON-RPC | None (public: `xrplcluster.com`, `s.altnet.rippletest.net:51234`) |
| Cardano | [Blockfrost](https://blockfrost.io/) | `BLOCKFROST_PROJECT_ID` (generic fallback), or per-network: `BLOCKFROST_PROJECT_ID_PREPROD`, `BLOCKFROST_PROJECT_ID_PREVIEW`, `BLOCKFROST_PROJECT_ID_MAINNET`. Also accepts `BLOCKFROST_API_KEY` as an alias. Free tier: 50k req/day. |
| Tron | [TronGrid](https://www.trongrid.io/) | None (public API: `api.trongrid.io`, `api.shasta.trongrid.io`) |

#### Cardano Preprod faucet (API)

The Cardano preprod faucet supports programmatic requests (api key is optional):

```bash
curl -X POST "https://faucet.preprod.world.dev.cardano.org/send-money/<YOUR_ADDR_TEST1_ADDRESS>?api_key=ooseiteiquo7Wie9oochooyiequi4ooc"
```

Rate limit: one request per address per 24 hours. The default API key above is public; you can also submit without one.

### Example — native transfers

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Bitcoin (testnet): send 0.001 BTC
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "bitcoin-testnet",
    "to": "tb1q...",
    "value": "0.001"
  }'

# Solana (devnet): send 0.25 SOL
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "solana-devnet", "to": "9xQ...", "value": "0.25" }'

# XRP (testnet): send 10 XRP with a destination tag
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "xrp-testnet", "to": "rPT1...", "value": "10", "destination_tag": 12345 }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
// Solana: send 0.25 SOL
const { data: sol } = await client.agents.submitTransaction(agentId, {
  chain: "solana-devnet",
  to: "9xQ...",
  value: "0.25",
});
console.log(sol.tx_hash, sol.status); // base58 signature, "broadcast"

// Cardano: send 2 ADA with a TTL
const { data: ada } = await client.agents.submitTransaction(agentId, {
  chain: "cardano-preprod",
  to: "addr_test1...",
  value: "2",
  ttl: 90_000_000,
});

// Tron TRC-20 (USDT): send 5 tokens, sign only (no broadcast)
const { data: usdt } = await client.agents.signTransaction(agentId, {
  chain: "tron",
  to: "TR7NH...",
  value: "5",
  token_mint: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  token_decimals: 6,
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

The response shape matches EVM: `{ tx_hash, signed_tx, from, to, value_wei, status }`. For non-EVM chains, the `value_wei` field contains the chain-native base unit (satoshis for Bitcoin, lamports for Solana, drops for XRP, lovelace for Cardano, sun for Tron), `signed_tx` contains the signed payload (hex or base64 depending on the chain), and `tx_hash` is the chain-native transaction id (reversed-hex txid for Bitcoin, base58 signature for Solana, uppercase hex for XRP, blake2b-256 hex for Cardano, SHA-256 txID hex for Tron). For sign-only responses, `chain_id` and `nonce` are `0` for non-EVM chains.

:::note Tenderly simulation is EVM-only
`simulate_first` and the `/simulate` endpoints only apply to EVM chains. For non-EVM chains they are a no-op — use the sign-only endpoint if you want to inspect the signed transaction before broadcasting it yourself.
:::

---

## Unified sign endpoint {#unified-sign}

The unified `POST /v1/agents/{id}/sign` endpoint supports four intent types: EIP-191 message signing (`personal_sign`), EIP-712 typed data signing (`typed_data`), raw digest signing (`eip712_digest` / `digest`), and transaction signing across all EIP-2718 types.

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

### Raw digest signing (ERC-1271 / ERC-7739) {#eip712-digest}

Some protocols compute a **canonical** EIP-712 digest client-side — notably **ERC-1271 / ERC-7739 nested `TypedDataSign`** payloads used by smart-contract accounts (e.g. **Polymarket** CLOB orders). For these, re-deriving the hash server-side from `typed_data` can diverge from the verifier's expected hash and cause the signature to be rejected. The `eip712_digest` intent signs a pre-computed 32-byte digest **directly**, returning a 65-byte `r‖s‖v` signature that recovers to the agent's EOA.

:::warning Blind signing
`eip712_digest` is **blind signing**: 1Claw cannot inspect what the digest authorizes, so transaction guardrails are bypassed. It is gated behind the per-agent **`raw_signing_enabled`** flag (off by default — a human must enable it; agents cannot self-enable), and every use is audit-logged as `signing_key.raw_digest_sign`. Only enable it for agents that genuinely need ERC-1271/ERC-7739 flows.
:::

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/sign" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent_type": "eip712_digest",
    "chain": "ethereum",
    "hash": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  }'
```

```typescript
const { data } = await client.agents.sign(agentId, {
  intent_type: "eip712_digest",
  chain: "ethereum",
  hash: "0x59c6...690d", // client-computed canonical 32-byte digest
});
console.log(data.signature, data.from);
```

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
| `raw_signing_enabled` | `boolean` | Must be `true` for the `eip712_digest` (raw/blind digest) intent (default: `false`). Human-set only; agents cannot enable it. |

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

**`sign_digest`** — sign a client-computed 32-byte digest directly (raw/blind signing; requires `raw_signing_enabled`). For ERC-1271 / ERC-7739 nested EIP-712 flows (e.g. Polymarket):
```
Tool: sign_digest
Args:
  chain: "ethereum"
  hash: "0x59c6...690d"   // canonical 32-byte digest computed client-side
```

---

## Supported chains {#supported-chains}

The proxy can broadcast transactions to any chain in the registry. All mainnet chains below are configured with dedicated dRPC endpoints for reliable transaction delivery.

:::tip Querying chains via API
You can always fetch the live list with `GET /v1/chains`. The response includes `chain_id`, `rpc_url`, `explorer_url`, and `native_currency` for every chain.
:::

### Mainnet chains (29)

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
| Robinhood Chain   | 4663     | RBH          | [robinhoodchain.com](https://robinhoodchain.com)                   |

### Testnet chains

#### EVM testnets

| Chain        | Chain ID | Native token | Explorer |
| ------------ | -------- | ------------ | -------- |
| Sepolia      | 11155111 | ETH          | [sepolia.etherscan.io](https://sepolia.etherscan.io) |
| Base Sepolia | 84532    | ETH          | [sepolia.basescan.org](https://sepolia.basescan.org) |
| Arc Testnet  | 5042002  | USDC         | [testnet.arcscan.app](https://testnet.arcscan.app) |
| Robinhood Testnet | 46630    | RBH          | [testnet.robinhoodchain.com](https://testnet.robinhoodchain.com) |

#### Non-EVM testnets

| Chain | Network | Native token | Explorer | Faucet |
| --- | --- | --- | --- | --- |
| Bitcoin | `bitcoin-signet` | sBTC | [mempool.space/signet](https://mempool.space/signet) | [faucet.coinbin.org](https://faucet.coinbin.org/) (no captcha), [signetfaucet.com](https://signetfaucet.com/) |
| Bitcoin | `bitcoin-testnet` | tBTC | [mempool.space/testnet](https://mempool.space/testnet) | — (testnet3 faucets are scarce) |
| Solana | `solana-devnet` | SOL | [explorer.solana.com (devnet)](https://explorer.solana.com/?cluster=devnet) | [faucet.solana.com](https://faucet.solana.com/) |
| XRP | `xrp-testnet` | XRP | [testnet.xrpl.org](https://testnet.xrpl.org/) | [xrpl.org faucets](https://xrpl.org/resources/dev-tools/xrp-faucets) |
| Cardano | `cardano-preprod` | tADA | [explorer.cardano.org/preprod](https://explorer.cardano.org/preprod) | [Cardano faucet](https://faucet.preprod.world.dev.cardano.org/basic-faucet) |
| Tron | `tron-shasta` | TRX | [shasta.tronscan.org](https://shasta.tronscan.org/) | [shasta.tronex.io](https://shasta.tronex.io/join/getJoinPage) |
| Tron | `tron-nile` | TRX | [nile.tronscan.org](https://nile.tronscan.org/) | [nileex.io](https://nileex.io/join/getJoinPage) |

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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
# See the curl / TypeScript tabs for the equivalent call.
# Install: pip install oneclaw — https://docs.1claw.xyz/docs/sdks/python
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
| `tx_max_value` | `string` | Maximum value per transaction in **native major units** for the chain family (e.g. `"0.01"` = 0.01 BTC on Bitcoin, 0.5 ETH on EVM, 2 SOL on Solana). Null = no per-tx limit. |
| `tx_daily_limit` | `string` | Rolling 24-hour spend cap in native major units, enforced **per chain family** (Bitcoin spend does not count against EVM limit). Null = no daily limit. See [Per-chain spend tracking](#per-chain-spend). |
| `tx_max_value_eth` | `string` | **Deprecated.** Alias for `tx_max_value` (same unit semantics). |
| `tx_daily_limit_eth` | `string` | **Deprecated.** Alias for `tx_daily_limit`. |
| `tx_token_allowlist` | `string[]` | Restrict token contracts/mints the agent can interact with (e.g. `["0xA0b8..."]`). Empty = all tokens. |
| `tx_known_tokens_only` | `boolean` | Restrict to tokens in the [known tokens registry](#token-registry). Default: `false`. |
| `xrpl_allowed_tx_types` | `string[]` | Restrict XRPL transaction types (e.g. `["Payment", "TrustSet"]`). Empty = all supported types. |
| `per_chain_guardrails` | `object` | Chain-specific overrides. See [Per-chain guardrails](#per-chain-guardrails) below. |

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_allowed_chains": ["ethereum", "base"],
    "tx_to_allowlist": ["0xSafeAddress1", "0xSafeAddress2"],
    "tx_max_value": "0.5",
    "tx_daily_limit": "5.0",
    "tx_token_allowlist": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    "tx_known_tokens_only": true
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: agent } = await client.agents.update(agentId, {
  tx_allowed_chains: ["ethereum", "base"],
  tx_to_allowlist: ["0xSafeAddress1", "0xSafeAddress2"],
  tx_max_value: "0.5",
  tx_daily_limit: "5.0",
  tx_token_allowlist: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  tx_known_tokens_only: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.deactivate(agent_id)
```

</TabItem>
</Tabs>

When a transaction violates any guardrail, the proxy returns **403 Forbidden** with a descriptive `detail` message.

### Token guardrails {#token-guardrails}

Two complementary controls restrict which tokens an agent can transfer:

**Token allowlist** (`tx_token_allowlist`): An explicit list of token contract addresses or mints the agent may interact with. Applied to `token_mint` on non-EVM chains and the ERC-20 contract address on EVM token transfers. Case-insensitive. When empty, all tokens are permitted.

**Known tokens only** (`tx_known_tokens_only`): When enabled, the agent can only transact with tokens present in the [known tokens registry](#token-registry). This is useful for restricting agents to verified, well-known tokens without maintaining a per-agent allowlist.

Both guardrails can be used together — the token must pass **both** checks (allowlist AND known registry) when both are set.

### Per-chain guardrails {#per-chain-guardrails}

Override global guardrails on a per-chain basis using `per_chain_guardrails`. This is useful when an agent operates across multiple chains with different risk profiles — for example, a higher spend limit on a testnet than on mainnet.

```json
{
  "per_chain_guardrails": {
    "ethereum": {
      "max_value": "1.0",
      "to_allowlist": ["0xSafeContract"],
      "token_allowlist": ["0xUSDC"]
    },
    "solana": {
      "max_value": "100"
    }
  }
}
```

Supported per-chain fields: `max_value`, `daily_limit`, `to_allowlist`, `token_allowlist` (legacy `*_eth` keys accepted). Keys are signing chains: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`. When both global and per-chain values are set, the **strictest** wins. Daily limits compare against **that chain family's** spend today (`tx_spent_today_by_chain`), not a cross-chain total.

### XRP transaction type allowlist {#xrpl-tx-types}

When using `xrpl_tx_json` for advanced XRP transactions, you can restrict which transaction types are permitted:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "xrpl_allowed_tx_types": ["Payment", "TrustSet", "OfferCreate"] }'
```

If the agent submits an `xrpl_tx_json` with a `TransactionType` not in the allowlist, the request is rejected with 403.

### Known tokens registry {#token-registry}

A curated registry of verified token contracts. Use `GET /v1/tokens` (filterable by `?chain=`) or `GET /v1/chains/{chain}/tokens` to query it.

Admins can manage the registry via `POST /v1/admin/tokens` (add) and `DELETE /v1/admin/tokens/{id}` (remove). Each entry includes `chain`, `contract_address`, `symbol`, `name`, `decimals`, and an optional `logo_url`.

### Extended token balance {#token-balance}

The signing key balance endpoint now supports querying specific token balances alongside native balance:

```bash
# Query native + specific ERC-20 token balances
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys/ethereum/balance?tokens=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0xdAC17F958D2ee523a2206206994597C13D831ec7" \
  -H "Authorization: Bearer $TOKEN"
```

The `?tokens=` parameter accepts comma-separated contract addresses or mints. Works across all chains: ERC-20 (EVM), SPL (Solana), TRC-20 (Tron).

### Per-chain daily spend tracking {#per-chain-spend}

`GET /v1/agents/{id}` returns `tx_spent_today_by_chain` (keys: `evm`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`) and `tx_spent_today` (cross-family sum). Daily limits (`tx_daily_limit`) compare against **that chain family's** spend from `tx_spent_today_by_chain`, not the cross-chain total. Legacy `tx_spent_today_eth` is a deprecated alias for `tx_spent_today`.

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
5. **Use testnets first** — use testnets to verify the flow before moving to mainnet. For EVM: Sepolia, Base Sepolia. For non-EVM: Bitcoin Signet, Solana Devnet, XRP Testnet, Cardano Preprod, Tron Shasta. See [Non-EVM networks](#non-evm-networks) for faucet links.

---

## Execution Intents (Pro+) {#execution-intents}

Execution Intents extend the Intents API beyond blockchain transactions. Agents can make **HTTP calls, database queries, and external service interactions** through pre-configured **bindings** — without ever seeing the underlying credentials.

:::info Tier requirements
- **Pro:** HTTP and GraphQL binding types
- **Team+:** All binding types (Postgres, MySQL, Redis, gRPC, SMTP, Cloud SDK, S3, Custom)
- **Business+:** TEE execution mode (requests execute inside Shroud's confidential enclave)
:::

### How it works

1. A **human** creates a binding on the agent — a named credential handle (e.g. `stripe-api`, `analytics-db`) with connection details and authentication.
2. The agent calls `POST /v1/agents/:id/execute` with the binding name and request parameters.
3. The server injects credentials server-side, executes the request, and returns the response — the agent never sees API keys, database passwords, or tokens.

### Enabling Execution Intents

Set `execution_intents_enabled: true` when creating or updating an agent:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "execution_intents_enabled": true }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.update(agentId, {
  execution_intents_enabled: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.deactivate(agent_id)
```

</TabItem>
</Tabs>

### Creating a binding

Bindings are human-only — agents cannot create or modify their own bindings.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe-api",
    "binding_type": "http",
    "credential": "sk_live_...",
    "config": {
      "base_url": "https://api.stripe.com",
      "auth_type": "bearer",
      "allowed_hosts": ["api.stripe.com"],
      "allowed_paths": ["/v1/*"],
      "timeout_ms": 10000
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: binding } = await client.bindings.create(agentId, {
  name: "stripe-api",
  binding_type: "http",
  credential: "sk_live_...",
  config: {
    base_url: "https://api.stripe.com",
    auth_type: "bearer",
    allowed_hosts: ["api.stripe.com"],
    allowed_paths: ["/v1/*"],
    timeout_ms: 10000,
  },
});
// binding.credential_set === true; credential value is never returned
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

### Vault-ref credentials (live pointers)

Instead of copying a credential into the binding, you can **reference an existing vault secret**. The server resolves the secret at execution time — if you rotate the upstream secret, every binding referencing it picks up the new value automatically.

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { CredentialSource } from "@1claw/sdk";

const vaultRef: CredentialSource = {
  type: "vault_ref",
  vault_id: "550e8400-e29b-41d4-a716-446655440000",
  path: "integrations/stripe-key",
};

const { data: binding } = await client.bindings.create(agentId, {
  name: "stripe-api",
  binding_type: "http",
  config: { base_url: "https://api.stripe.com", auth_type: "bearer" },
  credential_source: vaultRef,
});
// binding.credential_source_type === "vault_ref"
// binding.credential_vault_id, binding.credential_path are set
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
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe-api",
    "binding_type": "http",
    "config": { "base_url": "https://api.stripe.com", "auth_type": "bearer" },
    "credential_source": {
      "type": "vault_ref",
      "vault_id": "550e8400-e29b-41d4-a716-446655440000",
      "path": "integrations/stripe-key"
    }
  }'
```

</TabItem>
</Tabs>

:::tip
Use vault-ref credentials when multiple bindings share the same upstream API key, or when you have an existing secret rotation workflow. Changes to the vault secret are reflected immediately — no manual credential rotation needed.
:::

### Executing a request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "stripe-api",
    "intent_type": "http",
    "params": {
      "method": "GET",
      "path": "/v1/customers?limit=10"
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: result } = await client.bindings.execute(agentId, {
  binding: "stripe-api",
  intent_type: "http",
  params: {
    method: "GET",
    path: "/v1/customers?limit=10",
  },
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

### Binding types

| Type | Tier | Description |
| --- | --- | --- |
| `http` | Pro | REST API calls with credential injection |
| `graphql` | Pro | GraphQL queries/mutations |
| `postgres` | Team+ | PostgreSQL queries |
| `mysql` | Team+ | MySQL queries |
| `redis` | Team+ | Redis commands |
| `grpc` | Team+ | gRPC calls |
| `smtp` | Team+ | Email sending |
| `cloud_sdk` | Team+ | Cloud provider SDK calls |
| `s3` | Team+ | S3-compatible storage operations |
| `custom` | Team+ | Custom integrations |

### Binding lifecycle

| Operation | Endpoint | SDK |
| --- | --- | --- |
| Create | `POST /v1/agents/{id}/bindings` | `client.bindings.create(agentId, data)` |
| List | `GET /v1/agents/{id}/bindings` | `client.bindings.list(agentId)` |
| Get | `GET /v1/agents/{id}/bindings/{bid}` | `client.bindings.get(agentId, bindingId)` |
| Update | `PATCH /v1/agents/{id}/bindings/{bid}` | `client.bindings.update(agentId, bindingId, data)` |
| Delete | `DELETE /v1/agents/{id}/bindings/{bid}` | `client.bindings.delete(agentId, bindingId)` |
| Test | `POST /v1/agents/{id}/bindings/{bid}/test` | `client.bindings.test(agentId, bindingId)` |
| Rotate credential | `POST /v1/agents/{id}/bindings/{bid}/rotate-credential` | `client.bindings.rotateCredential(agentId, bindingId, { credential })` |
| Execute | `POST /v1/agents/{id}/execute` | `client.bindings.execute(agentId, data)` |
| List executions | `GET /v1/agents/{id}/executions` | `client.bindings.listExecutions(agentId)` |

Binding responses include **`credential_set`** (boolean) so you can confirm a credential is stored without ever exposing the value. Deleting a binding **purges** the stored credential.

### GraphQL example

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "github-graphql",
    "intent_type": "graphql",
    "params": {
      "query": "query { viewer { login } }"
    }
  }'
```

The GraphQL executor POSTs `{ query, variables, operationName }`, surfaces `errors[]` from the upstream API, and uses introspection for connectivity tests.

### Agent execution guardrails

Set per-agent limits with `execution_guardrails` (JSON) on create/update:

```json
{
  "allowed_hosts": ["api.stripe.com"],
  "allowed_binding_types": ["http", "graphql"],
  "max_duration_ms": 15000,
  "max_requests_per_minute": 30
}
```

At execute time the server enforces the **strictest** of binding-level and agent-level guardrails. Violations are recorded as `denied` in `execution_events`.

### MCP tools

| Tool | Description |
| --- | --- |
| `execute_http` | HTTP request through a binding (`binding`, `method`, `path`, optional `body`/`headers`) |
| `execute_intent` | Generic execute (`binding`, `intent_type`, `params`) — HTTP, GraphQL, etc. |
| `list_bindings` | List bindings for the current agent |
| `create_binding` | Create a binding (human-only; privileged) |
| `test_binding` | Connectivity test (same SSRF/allowlist checks as execute) |
| `list_executions` | Recent execution events for the agent |

### CLI

```bash
1claw agent binding create <agent-id> --name stripe-api --type http \
  --config '{"base_url":"https://api.stripe.com","auth_type":"bearer","allowed_hosts":["api.stripe.com"]}' \
  --credential sk_live_...
1claw agent binding list <agent-id>
1claw agent binding test <agent-id> <binding-id>
1claw agent binding rotate-credential <agent-id> <binding-id> --credential sk_live_new_...
1claw agent binding execute <agent-id> --binding stripe-api --intent-type http \
  --params '{"method":"GET","path":"/v1/customers?limit=5"}'
1claw agent binding executions <agent-id>
```

Enable on the agent: `1claw agent update <id> --execution-intents true --execution-guardrails '{"max_requests_per_minute":30}'`

### Security model

- **Credentials never exposed:** Binding credentials are stored in the `__agent-keys` vault at `agents/{id}/bindings/{name}`. Agents cannot read them directly. Responses use `credential_set`, not the secret value.
- **SSRF protection:** `validate_audience_url` blocks requests to cloud metadata endpoints, private CIDRs, and internal hostnames. Connectivity tests use the same checks as execute.
- **Host and path allowlists:** Each binding defines `allowed_hosts` and optional `allowed_paths` (trailing-`*` wildcard). Agent `execution_guardrails.allowed_hosts` can further restrict destinations.
- **Binding type gating:** Agent `execution_guardrails.allowed_binding_types` is enforced at execute time, not only at create.
- **Audit trail:** Every execution is recorded in `execution_events` with sanitized request/response metadata (`success` / `error` / `denied`). Only successful runs count toward the monthly quota.
- **Execution surface:** Execute responses include `execution_surface`: `vault` (default) or `tee` when a Shroud execution endpoint is configured and `execution_mode: "tee"` is requested.
- **TEE mode (Business+):** Optional TEE execution inside Shroud's confidential enclave. Set `ONECLAW_EXECUTION_TEE_REQUIRE_SHROUD=true` to return 501 when TEE is requested but no enclave endpoint is configured (fail-closed).

## Next steps

- [Multi-chain signing keys](/docs/guides/multi-chain-signing) — provision per-chain keypairs for agents
- [Shroud TEE signing](/docs/guides/shroud) — route signing through the confidential enclave
- [Treasury](/docs/guides/treasury) — Safe multisigs and delegated agent signing
- [Transaction guardrails](/docs/guides/intents-api#transaction-guardrails) — per-agent spend caps and allowlists
- [Error codes](/docs/reference/error-codes) — Intents API error reference
