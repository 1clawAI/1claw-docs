---
title: Multi-Chain Signing
description: HSM-backed signing for Ethereum, Bitcoin, Solana, XRP, Cardano, and Tron. Provision keys, sign transactions, and broadcast — the private key never leaves hardware.
sidebar_position: 14
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Multi-Chain Signing

1Claw signs and broadcasts transactions for **six blockchains** from inside the HSM (or the Shroud TEE). The private key never leaves hardware. Agents submit transaction intents; the server signs, optionally broadcasts, and returns the result.

This page consolidates everything you need: key provisioning, supported chains, transaction signing, and guardrails. For the full Intents API reference (EVM-specific features like EIP-712, simulation, gasless transactions), see [Intents API](/docs/agents/intents/overview).

---

## Supported chains

| Chain | Curve | Address format | Mainnet `chain` | Testnet `chain` |
| --- | --- | --- | --- | --- |
| Ethereum | secp256k1 | 0x (EIP-55) | `ethereum`, `base`, `optimism`, `arbitrum`, `polygon` | `sepolia`, `base-sepolia` |
| Bitcoin | secp256k1 | P2WPKH bech32 (`bc1q…`) | `bitcoin` | `bitcoin-testnet`, `bitcoin-signet` |
| Solana | Ed25519 | Base58 | `solana` | `solana-devnet`, `solana-testnet` |
| XRP | Ed25519 | Base58Check (`r…`) | `xrp` | `xrp-testnet` |
| Cardano | Ed25519 | Bech32 enterprise (`addr1…`) | `cardano` | `cardano-preprod`, `cardano-preview` |
| Tron | secp256k1 | Base58Check (`T…`) | `tron` | `tron-shasta`, `tron-nile` |

---

## Provisioning signing keys

Signing keys are provisioned per-agent by a human. The HSM generates the keypair; the private key is stored in the org's `__agent-keys` vault.

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: key } = await client.signingKeys.create(agentId, {
  chain: "ethereum",
});
console.log(key.public_key, key.address);
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
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/signing-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "ethereum" }'
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent keys create $AGENT_ID --chain ethereum
```

</TabItem>
</Tabs>

Repeat for each chain the agent needs (`bitcoin`, `solana`, `xrp`, `cardano`, `tron`).

### Key lifecycle

| Operation | Endpoint | SDK |
| --- | --- | --- |
| Provision | `POST /v1/agents/{id}/signing-keys` | `client.signingKeys.create(agentId, { chain })` |
| List | `GET /v1/agents/{id}/signing-keys` | `client.signingKeys.list(agentId)` |
| Check balance | `GET /v1/agents/{id}/signing-keys/{chain}/balance` | `client.signingKeys.balance(agentId, chain)` |
| Rotate | `POST /v1/agents/{id}/signing-keys/{chain}/rotate` | `client.signingKeys.rotate(agentId, chain)` |
| Deactivate | `DELETE /v1/agents/{id}/signing-keys/{chain}` | `client.signingKeys.deactivate(agentId, chain)` |
| Export | `POST /v1/agents/{id}/signing-keys/{chain}/export` | — (requires `X-Auth-Confirm` password) |
| Import (BYOK) | `POST /v1/agents/{id}/signing-keys/{chain}/import` | `client.signingKeys.importKey(agentId, chain, { private_key, format })` |

Only human users can provision, rotate, export, and import keys — agents receive 403.

### Import (BYOK)

Bring your own key: import an existing private key for a chain instead of generating one server-side. Human-only, requires password re-authentication via the `X-Auth-Confirm` header. Audit-logged as `signing_key.import`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `private_key` | string | ✅ | The raw private key |
| `format` | string | ❌ | `"hex"` (default), `"base64"`, or `"wif"` (Bitcoin only) |

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: key } = await client.signingKeys.importKey(agentId, "ethereum", {
  private_key: "0xabc123...",
  format: "hex",
});
console.log(key.address);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/signing-keys/ethereum/import" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password" \
  -H "Content-Type: application/json" \
  -d '{ "private_key": "0xabc123...", "format": "hex" }'
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent keys import $AGENT_ID ethereum --key 0xabc123... --format hex
```

</TabItem>
</Tabs>

The server derives the public key and address from the imported key, stores it in `__agent-keys`, and returns the same response shape as `create`.

---

## Signing and broadcasting transactions

Use `POST /v1/agents/{id}/transactions` to sign and broadcast, or `POST /v1/agents/{id}/transactions/sign` to sign without broadcasting.

The `chain` field determines which signing module is used. 1Claw automatically fetches chain data (UTXOs, fee rates, blockhashes, sequence numbers) before signing.

### Value format

`value` is always the **human-readable major unit** as a decimal string:

| Chain | Example `value` | Meaning |
| --- | --- | --- |
| Bitcoin | `"0.001"` | 0.001 BTC |
| Solana | `"0.5"` | 0.5 SOL |
| XRP | `"10"` | 10 XRP |
| Cardano | `"5"` | 5 ADA |
| Tron | `"100"` | 100 TRX |

### Chain-specific fields

| Field | Chain | Purpose |
| --- | --- | --- |
| `destination_tag` | XRP | Destination tag for exchange deposits |
| `fee_rate_sat_per_vbyte` | Bitcoin | Override the auto-fetched fee rate |
| `fee_limit_sun` | Tron | TRC-20 energy fee limit (default 100M sun; max 500M) |
| `token_mint` | Solana, Tron, Cardano, EVM | Token contract/mint for token transfers |
| `token_decimals` | Solana, Tron | Token decimals (default 6) |
| `ttl` | Cardano | Time-to-live in absolute slots (default: current + 7200) |
| `xrpl_tx_json` | XRP | Full XRPL transaction JSON for one of [1Claw's 31 supported types](/docs/agents/intents/guardrails#xrpl-tx-types). Submit/sign still require top-level `to` and `value` (use `"0"` for non-Payment types). |
| `memo` | Solana | On-chain memo (Memo Program v2). On XRP the top-level field is not applied — put `Memos` inside `xrpl_tx_json`. |

---

## Examples

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
// Bitcoin: send 0.001 BTC
const btc = await client.agents.submitTransaction(agentId, {
  chain: "bitcoin-signet",
  to: "tb1q...",
  value: "0.001",
});

// Solana: send 0.25 SOL
const sol = await client.agents.submitTransaction(agentId, {
  chain: "solana-devnet",
  to: "9xQ...",
  value: "0.25",
});

// XRP: send 10 XRP with a destination tag
const xrp = await client.agents.submitTransaction(agentId, {
  chain: "xrp-testnet",
  to: "rPT1...",
  value: "10",
  destination_tag: 12345,
});

// Cardano: send 2 ADA
const ada = await client.agents.submitTransaction(agentId, {
  chain: "cardano-preprod",
  to: "addr_test1...",
  value: "2",
});

// Tron: send 100 TRX
const trx = await client.agents.submitTransaction(agentId, {
  chain: "tron-shasta",
  to: "T...",
  value: "100",
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
<TabItem value="curl" label="curl">

```bash
# Bitcoin
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "bitcoin-signet", "to": "tb1q...", "value": "0.001" }'

# Solana
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "solana-devnet", "to": "9xQ...", "value": "0.25" }'

# XRP with destination tag
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "xrp-testnet", "to": "rPT1...", "value": "10", "destination_tag": 12345 }'
```

</TabItem>
</Tabs>

### Token transfers

For SPL, TRC-20, ERC-20, and Cardano native assets, add `token_mint`:

```typescript
// Solana SPL token (USDC)
const spl = await client.agents.submitTransaction(agentId, {
  chain: "solana-devnet",
  to: "9xQ...",
  value: "5",
  token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  token_decimals: 6,
});

// Tron TRC-20 (USDT)
const trc20 = await client.agents.submitTransaction(agentId, {
  chain: "tron",
  to: "TR7NH...",
  value: "5",
  token_mint: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  token_decimals: 6,
});
```

Solana SPL transfers auto-create the recipient's Associated Token Account if it doesn't exist.

---

## XRPL advanced transactions

For any of 1Claw's **31 supported** XRPL types beyond simple Payment, use `xrpl_tx_json`. This is a 1Claw subset — types the ledger accepts but 1Claw does not (DID, oracles, Batch, …) are rejected. Submit/sign still require top-level `to` and `value` (use `"0"` when the JSON is not a Payment).

```typescript
// TrustSet — allow up to 1000 USD from an issuer
const trustSet = await client.agents.submitTransaction(agentId, {
  chain: "xrp-testnet",
  to: "rIssuer...",
  value: "0",
  xrpl_tx_json: {
    TransactionType: "TrustSet",
    LimitAmount: {
      currency: "USD",
      issuer: "rIssuer...",
      value: "1000",
    },
  },
});
```

1Claw auto-fills `Account`, `Sequence`, `Fee` (`"12"` drops), `LastLedgerSequence` (current ledger + 20), `SigningPubKey`, `Flags` (`tfFullyCanonicalSig`), and `SourceTag` `482684816` (caller-supplied value wins). `SetRegularKey`, `SignerListSet`, `AccountSet`, and `AccountDelete` are blocked unless explicitly listed in `xrpl_allowed_tx_types`. See [XRP transaction type allowlist](/docs/agents/intents/guardrails#xrpl-tx-types).

---

## Transaction guardrails

Per-agent controls enforced before signing. Configure via the dashboard, SDK, or CLI.

| Guardrail | Purpose |
| --- | --- |
| `tx_allowed_chains` | Restrict to specific chains |
| `tx_to_allowlist` | Permitted destination addresses |
| `tx_max_value` | Max value per transaction (native major units). Deprecated alias: `tx_max_value_eth`. |
| `tx_daily_limit` | Rolling 24h cumulative spend per chain family. Deprecated alias: `tx_daily_limit_eth`. |
| `xrpl_allowed_tx_types` | Allowed XRPL `TransactionType`s. Empty = all supported except four dangerous types. |
| `tx_token_allowlist` | Allowed token contracts/mints |
| `tx_max_per_day` | Max transactions per UTC day |
| `per_chain_guardrails` | Chain-specific overrides (JSON) |

```typescript
await client.agents.update(agentId, {
  intents_api_enabled: true,
  tx_allowed_chains: ["ethereum", "solana"],
  tx_to_allowlist: ["0x...", "9xQ..."],
  tx_max_value: "1.0",
  tx_daily_limit: "10.0",
});
```

Violations return 403 with a descriptive error before any signing occurs.

---

## UTXO locking (Bitcoin & Cardano)

Concurrent transactions are serialized via UTXO locks to prevent double-spends. Locks auto-expire after 5 minutes and are released on successful broadcast or error.

---

## Testnet faucets

| Chain | Faucet |
| --- | --- |
| Bitcoin Signet | [faucet.coinbin.org](https://faucet.coinbin.org/) |
| Solana Devnet | [faucet.solana.com](https://faucet.solana.com/) or `solana airdrop` |
| XRP Testnet | [xrpl.org/resources/dev-tools/xrp-faucets](https://xrpl.org/resources/dev-tools/xrp-faucets) (default **10 XRP**) |
| Cardano Preprod | [faucet.preprod.world.dev.cardano.org](https://faucet.preprod.world.dev.cardano.org/basic-faucet) |
| Tron Shasta | [shasta.tronex.io](https://shasta.tronex.io/join/getJoinPage) |

---

## Further reading

- [Intents API](/docs/agents/intents/overview) — full reference including EVM features, EIP-712, simulation, and the unified sign endpoint
- [Payment Cards](/docs/cards/overview) — order prepaid cards using the agent's Ethereum signing key via x402
- [Securing Agent Access](/docs/vaults/securing-access) — scoped permissions, vault binding, and token TTL
