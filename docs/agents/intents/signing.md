---
title: Intents API — Signing
description: Multi-chain signing keys, non-EVM transactions, unified sign endpoint (EIP-191, EIP-712, raw digest), MCP tools, and supported chains.
keywords: [Intents API, signing keys, EIP-712, multi-chain, Solana, Bitcoin]
sidebar_label: Signing & chains
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Part of the [Intents API](/docs/agents/intents/overview) guide.

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
1claw agent keys create $AGENT_ID --chain ethereum
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
If you're using the [Platform API](/docs/platform-api/overview), signing keys can be auto-provisioned during bootstrap by including a `signing_keys` array in your template spec — no separate API call needed.
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
| `xrpl_tx_json` | object | XRP | Full XRPL transaction JSON for [30+ transaction types](/docs/agents/intents/guardrails#xrpl-tx-types) (e.g. TrustSet, OfferCreate, NFTokenMint). Overrides `to`/`value`/`destination_tag` when present. |

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

