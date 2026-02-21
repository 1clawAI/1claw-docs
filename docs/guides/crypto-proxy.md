---
title: Crypto Transaction Proxy
description: Let agents sign and broadcast blockchain transactions without ever seeing private keys. Includes the full list of supported chains.
sidebar_position: 3
---

# Crypto Transaction Proxy

The Crypto Transaction Proxy lets an agent submit on-chain transactions — transfers, swaps, contract calls — while **never having access to the raw private key**. The server signs the transaction using keys stored in the vault and broadcasts it through a dedicated RPC for the target chain.

## How it works

```
Agent                       1claw Vault                  Blockchain
  │                             │                            │
  │  POST /v1/agents/:id/       │                            │
  │    transactions             │                            │
  │  { chain_id, to, value,     │                            │
  │    data, secret_path }      │                            │
  │ ─────────────────────────►  │                            │
  │                             │ 1. Decrypt private key     │
  │                             │    from vault via HSM      │
  │                             │ 2. Build & sign tx         │
  │                             │ 3. Broadcast via RPC  ───► │
  │                             │                            │
  │  ◄───────────────────────── │  tx_hash, status           │
  │  { tx_id, tx_hash, status } │                            │
```

1. The agent calls `POST /v1/agents/:agent_id/transactions` with the chain, recipient, value, calldata, and the vault path to the signing key.
2. The vault decrypts the private key inside the HSM boundary, constructs and signs the transaction, and broadcasts it to the chain's RPC endpoint.
3. The agent receives a `tx_id` and `tx_hash` — it never sees the raw key material.

## Enabling the proxy

Set `crypto_proxy_enabled: true` when registering or updating an agent:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeFi Bot",
    "crypto_proxy_enabled": true
  }'
```

### What changes when enabled

| Behaviour                        | `crypto_proxy_enabled: false` | `crypto_proxy_enabled: true` |
| -------------------------------- | ----------------------------- | ---------------------------- |
| Read `api_key`, `password`, etc. | Allowed                       | Allowed                      |
| Read `private_key` or `ssh_key`  | Allowed                       | **Blocked (403)**            |
| Submit proxy transactions        | Not available                 | Allowed                      |
| Audit trail per transaction      | N/A                           | Full trace with `tx_id`      |

The enforcement is two-sided: the flag both **grants** access to the transaction endpoints and **blocks** direct reads of signing keys through the standard secrets endpoint. This guarantees the agent can only use keys through the proxy.

## Submitting a transaction

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": 1,
    "to": "0xRecipientAddress",
    "value": "1000000000000000000",
    "data": "0x",
    "secret_path": "wallets/hot-wallet"
  }'
```

### Response

```json
{
    "tx_id": "a7e2c...",
    "tx_hash": "0xabc123...",
    "chain_id": 1,
    "status": "submitted"
}
```

## Querying transactions

```bash
# List all transactions for this agent
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN"

# Get a specific transaction
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions/$TX_ID" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

## MCP tool

If you're using the MCP server, the `submit_transaction` tool wraps the same endpoint:

```
Tool: submit_transaction
Args:
  chain_id: 8453
  to: "0xRecipientAddress"
  value: "500000000000000000"
  data: "0x"
  secret_path: "wallets/hot-wallet"
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

See the [Admin API reference](/docs/reference/api-reference#admin) for update and delete endpoints.

---

## Security model

- **Keys never leave the HSM boundary** — the vault decrypts the key, signs the transaction, and zeroes the memory. The plaintext key is never returned to the caller.
- **Full audit trail** — every transaction is logged with the agent ID, chain, recipient, value, and resulting `tx_hash`.
- **Policy enforcement** — the agent still needs a policy granting access to the vault path that holds the signing key. The proxy doesn't bypass access control.
- **Rate limiting** — standard rate limits apply to transaction endpoints.

## Best practices

1. **One key per agent** — give each agent its own signing key in its own vault path so you can revoke independently.
2. **Set `expires_at`** — register agents with an expiry so leaked API keys have a bounded blast radius.
3. **Use scoped policies** — grant the agent access only to the specific vault path containing its signing key, not the entire vault.
4. **Monitor transactions** — query `GET /v1/agents/:id/transactions` regularly or set up audit webhooks.
5. **Use testnets first** — store a testnet key (Sepolia, Base Sepolia) and verify the flow before moving to mainnet.
