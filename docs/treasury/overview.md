---
title: Treasury Wallets
description: Native multi-chain wallets for human users — HSM-backed key generation, MPC custody, export with re-authentication, and rotation.
sidebar_position: 16
---

# Treasury Wallets

Treasury wallets give human users native, HSM-backed wallets across six blockchains — no external wallet provider, no browser extension. Private keys are generated server-side inside the HSM, stored in a dedicated per-org `__treasury-keys` vault with MPC custody, and never leave the secure enclave unless explicitly exported.

:::info Requirements
Treasury wallets are available on **all tiers** and count toward your org **wallet quota** (Free 10, Pro 10,000, Team 250,000, Business 1,000,000, Enterprise unlimited).
Platform admins are unlimited via `effective_billing_tier_for_limits`.
:::

## Supported chains

| Chain    | Curve       | Example address format       |
|----------|-------------|------------------------------|
| Ethereum | secp256k1   | `0x4e83…` (EIP-55 checksum)  |
| Bitcoin  | secp256k1   | `bc1q…` (bech32)             |
| Solana   | Ed25519     | `7xKX…` (base58)             |
| XRP      | Ed25519     | `rN7d…` (base58check)        |
| Cardano  | Ed25519     | `addr1…` (bech32)            |
| Tron     | secp256k1   | `T9yD…` (base58check)        |

## Human-only access

All treasury wallet endpoints enforce `require_human()`. Agents calling any treasury wallet endpoint receive a **403** with `"Treasury wallets are only available to human users."` Agents that need on-chain signing should use the [Intents API](/docs/agents/intents/overview) and [multi-chain signing keys](/docs/agents/intents/multi-chain-signing) instead.

## The `__treasury-keys` vault

When you generate your first treasury wallet, 1claw auto-creates a `__treasury-keys` vault in your org. This vault:

- Is **not** counted toward your vault or secrets quota
- Is **excluded** from the `GET /v1/vaults` listing (never appears in the dashboard vault list)
- Is **excluded** from the admin secrets manifest (private keys are never loaded into Shroud's redaction automata)
- Has **direct API reads blocked** — `GET /v1/vaults/{id}/secrets/{path}` returns 403 for system vaults; use the export endpoint instead
- Has **MPC custody auto-configured** based on your billing tier:

| Tier               | Custody mode            | What it means                                            |
|--------------------|--------------------------|----------------------------------------------------------|
| Pro / Team         | XOR 2-of-2 client custody | One share on the server (GCP KMS), one returned to you  |
| Business / Enterprise | Shamir 2-of-3 multi-HSM | Shares split across GCP KMS, AWS KMS, and Azure Key Vault |

Private keys are stored at the path `users/{user_id}/chains/{chain}/private_key`.

## API endpoints

| Method | Path                                    | Description                          |
|--------|-----------------------------------------|--------------------------------------|
| POST   | `/v1/treasury/wallets/generate`         | Generate wallets for specified chains |
| GET    | `/v1/treasury/wallets`                  | List all active wallets              |
| GET    | `/v1/treasury/wallets/{chain}`          | Get wallet for a specific chain      |
| GET    | `/v1/treasury/wallets/{chain}/balance`  | Query native + ERC-20 balances       |
| GET    | `/v1/treasury/wallets/spend-policy`     | Effective spend policy (user JWT)    |
| POST   | `/v1/treasury/wallets/{chain}/send`     | Send tokens (password re-auth)       |
| POST   | `/v1/treasury/wallets/{chain}/swap`     | Swap tokens via DEX (password re-auth)|
| POST   | `/v1/treasury/wallets/{chain}/export`   | Export wallet (password re-auth)     |
| POST   | `/v1/treasury/wallets/{chain}/import`   | Import existing wallet (BYOK, password re-auth) |
| POST   | `/v1/treasury/wallets/{chain}/rotate`   | Rotate keypair                       |
| DELETE | `/v1/treasury/wallets/{chain}`          | Deactivate wallet                    |
| POST   | `/v1/treasury/wallets/access-policies`  | Create wallet access policy (Pro+)   |
| GET    | `/v1/treasury/wallets/access-policies`  | List wallet access policies          |
| DELETE | `/v1/treasury/wallets/access-policies/{id}` | Delete wallet access policy      |

### Generate wallets

Generate wallets for one or more chains. If you omit `chains`, all six are created. Chains where you already have an active wallet are silently skipped.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chains": ["ethereum", "solana", "bitcoin"]
  }'
```

Response:

```json
{
  "wallets": [
    {
      "id": "a1b2c3d4-...",
      "chain": "ethereum",
      "curve": "secp256k1",
      "public_key_hex": "04abcdef...",
      "address": "0x4e83...",
      "is_active": true,
      "created_at": "2026-05-16T12:00:00Z"
    },
    {
      "id": "e5f6a7b8-...",
      "chain": "solana",
      "curve": "ed25519",
      "public_key_hex": "aabbccdd...",
      "address": "7xKX...",
      "is_active": true,
      "created_at": "2026-05-16T12:00:00Z"
    }
  ]
}
```

### List active wallets

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets" \
  -H "Authorization: Bearer $TOKEN"
```

### Get a specific chain wallet

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/ethereum" \
  -H "Authorization: Bearer $TOKEN"
```

### Query wallet balance

Get the native currency and ERC-20 token balances for a treasury wallet address. Balances are fetched in real time via the chain's RPC.

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/ethereum/balance" \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "chain": "ethereum",
  "address": "0x4e83...",
  "native_balance": "1.234567890000000000",
  "tokens": [
    {
      "contract": "0xA0b8...",
      "symbol": "USDC",
      "decimals": 6,
      "balance": "500.000000"
    }
  ]
}
```

### Send from treasury wallet

Send native currency or ERC-20 tokens from your treasury wallet. Signs an EIP-1559 transaction and broadcasts via RPC. Requires password re-authentication via the `X-Auth-Confirm` header. Audit-logged as `treasury_wallet.send`.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0xRecipient...",
    "value": "0.5"
  }'
```

:::danger
Failed password attempts increment your account's lockout counter (locked after 10 failures for 15 minutes).
:::

### Swap tokens

Swap tokens via the 0x DEX aggregator. Fetches a quote from the 0x API, signs the swap transaction, and broadcasts. Requires password re-authentication. Audit-logged as `treasury_wallet.swap`.

The server requires a `ZERO_X_API_KEY` environment variable to be configured.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/swap" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password" \
  -H "Content-Type: application/json" \
  -d '{
    "sell_token": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "buy_token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "sell_amount": "1000000000000000000"
  }'
```

### Export wallet (with password re-authentication)

Exporting a wallet's private key requires your account password in the `X-Auth-Confirm` header. This is audit-logged as `treasury_wallet.export`.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password"
```

Response:

```json
{
  "chain": "ethereum",
  "address": "0x4e83...",
  "private_key_hex": "0xabc123..."
}
```

:::danger
The private key is returned in plaintext. Treat it as you would any other secret — never log it, never commit it, and store it only in a secure location. Failed password attempts increment your account's lockout counter (locked after 10 failures for 15 minutes).
:::

### Import wallet (BYOK)

Import an existing private key instead of generating one server-side. Human-only, requires password re-authentication via the `X-Auth-Confirm` header. Audit-logged as `treasury_wallet.import`.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/import" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password" \
  -H "Content-Type: application/json" \
  -d '{
    "private_key": "0xabc123...",
    "format": "hex"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `private_key` | string | ✅ | The raw private key |
| `format` | string | ❌ | `"hex"` (default), `"base64"`, or `"wif"` (Bitcoin only) |

The server derives the public key and address, stores the key in `__treasury-keys`, and returns the wallet record.

### Non-EVM send

`POST /v1/treasury/wallets/{chain}/send` supports all six chains, not just EVM. For non-EVM sends, include chain-specific fields:

| Field | Chain | Description |
|-------|-------|-------------|
| `token_mint` | Solana, Tron, Cardano, EVM | Token contract or mint for token transfers |
| `token_decimals` | Solana, Tron | Token decimals (default 6) |
| `memo` | Solana | On-chain memo (Memo Program v2) |
| `destination_tag` | XRP | Destination tag for exchange deposits |
| `fee_rate_sat_per_vbyte` | Bitcoin | Override the auto-fetched fee rate |
| `fee_limit_sun` | Tron | TRC-20 energy fee limit |
| `xrpl_tx_json` | XRP | Full XRPL transaction JSON |
| `ttl` | Cardano | Time-to-live in absolute slots |

```bash
# Send 0.001 BTC from treasury wallet
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/bitcoin/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Auth-Confirm: your-account-password" \
  -H "Content-Type: application/json" \
  -d '{ "to": "bc1q...", "value": "0.001" }'
```

:::note Swap is EVM-only
`POST /v1/treasury/wallets/{chain}/swap` only supports EVM chains. Non-EVM chains return 400.
:::

### Rotate keypair

Deactivates the current wallet and generates a new keypair for the same chain. The old wallet is retained for audit but its key is no longer usable.

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/ethereum/rotate" \
  -H "Authorization: Bearer $TOKEN"
```

### Deactivate wallet

Soft-deletes the wallet. The key material is retained for audit but the wallet no longer appears in listings.

```bash
curl -X DELETE "https://api.1claw.xyz/v1/treasury/wallets/ethereum" \
  -H "Authorization: Bearer $TOKEN"
```

## Dashboard

The Treasury page (`/treasury`) has a **Wallets** tab with a wizard UI for generating wallets:

1. Select which chains you want wallets for
2. Confirm generation — keys are created server-side inside the HSM
3. Each wallet card shows the chain, address (with QR code), and public key
4. **Export** button opens a password confirmation dialog, then reveals the private key
5. **Rotate** and **Deactivate** actions are available per-wallet

The Treasury detail page uses your Ethereum treasury wallet address for signer selection when managing Safe multisigs.

## Safe multisig treasuries

Treasury wallets complement the **Safe multisig** features. You can create a treasury with a Safe address and manage signers, thresholds, and access requests:

- `POST /v1/treasury` — create a treasury (requires `name` + `safe_address`)
- `GET /v1/treasury` — list treasuries
- `GET /v1/treasury/{id}` — treasury detail
- `PATCH /v1/treasury/{id}` — update treasury
- `DELETE /v1/treasury/{id}` — delete treasury

Agents can request access to treasuries; humans approve or deny via the dashboard or API. See the Treasury section of the [API reference](/docs/reference/api-reference) for the full endpoint list.

## Treasury agent delegation

Treasury delegation allows humans to grant agents signing access to their treasury wallets or Safe multisigs. Two signing modes are available, configurable per-agent:

| Mode      | How it works                                                                                     |
|-----------|--------------------------------------------------------------------------------------------------|
| Owner     | Agent's EOA is added as an on-chain Safe signer. Agent signs with its own key; Safe threshold enforced. |
| Delegated | Agent signs using the treasury wallet key through the Intents API. The private key never leaves `__treasury-keys`. |

### Granting delegation

When approving an agent's access request, you can optionally:

1. **Auto-add signer** — adds the agent's EOA as a Safe signer (owner mode)
2. **Set delegation mode** — creates a `treasury_delegations` entry authorizing the agent

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/{id}/access-requests/{rid}/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_add_signer": true,
    "delegation_mode": "delegated",
    "guardrails": {
      "max_value_eth": "1.0",
      "to_allowlist": ["0xrecipient..."]
    }
  }'
```

### Intents API treasury mode

Agents with delegation can submit transactions through the Intents API using treasury keys:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/{id}/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "to": "0xrecipient...",
    "value": "0.5",
    "treasury_id": "uuid-of-treasury",
    "mode": "treasury"
  }'
```

When `treasury_id` is present, the handler verifies the agent has an active delegation, resolves the signing key from `__treasury-keys`, and applies the strictest guardrails (agent-level + delegation-level).

## Multisig proposals

For Safe multisigs with threshold > 1, agents or users can create proposals that collect signatures and auto-execute when threshold is met.

### Endpoint reference

| Method | Path                                        | Who           | Description                              |
|--------|---------------------------------------------|---------------|------------------------------------------|
| POST   | `/v1/treasury/{id}/proposals`               | Agent or User | Create a new proposal                    |
| GET    | `/v1/treasury/{id}/proposals`               | Org member    | List proposals (filter by `?status=`)    |
| GET    | `/v1/treasury/{id}/proposals/{pid}`         | Org member    | Get proposal + collected signatures      |
| POST   | `/v1/treasury/{id}/proposals/{pid}/sign`    | Agent or User | Submit EIP-712 signature                 |
| POST   | `/v1/treasury/{id}/proposals/{pid}/execute` | User          | Force-execute if threshold met           |
| DELETE | `/v1/treasury/{id}/proposals/{pid}`         | Proposer      | Cancel pending proposal                  |

### Creating a proposal

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/{id}/proposals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0xrecipient...",
    "value_wei": "1000000000000000000",
    "data": "0x",
    "operation": 0,
    "safe_tx_hash": "0x...",
    "nonce": 5
  }'
```

### Signing a proposal

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/{id}/proposals/{pid}/sign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "0x...",
    "signer_address": "0xYourAddress",
    "decision": "approve"
  }'
```

When the number of `approve` signatures reaches the Safe threshold, the proposal auto-executes: signatures are sorted by address (Safe requirement), `execTransaction` calldata is built, and the transaction is broadcast via the chain's RPC.

### Auto-approve rules

Treasury delegations can include auto-approve rules that automatically sign proposals when they match predefined criteria:

```json
{
  "auto_approve_rules": [
    {
      "max_value_eth": "0.1",
      "to_allowlist": ["0xKnownContract..."],
      "auto": true
    }
  ]
}
```

When a proposal created by an agent matches a rule, the agent's signature is automatically inserted. If this brings the count to threshold, execution fires immediately — no human in the loop for pre-approved patterns.

### SDK usage

```typescript
// Create a proposal
await client.treasury.propose(treasuryId, {
  to: "0xrecipient...",
  value_wei: "1000000000000000000",
  safe_tx_hash: "0x...",
  nonce: 5,
});

// Sign a proposal
await client.treasury.signProposal(treasuryId, proposalId, {
  signature: "0x...",
  signer_address: "0x...",
  decision: "approve",
});

// List proposals
const { data } = await client.treasury.listProposals(treasuryId, {
  status: "pending",
});

// Force-execute
await client.treasury.executeProposal(treasuryId, proposalId);
```

### MCP tools

| Tool                      | Description                                    |
|---------------------------|------------------------------------------------|
| `treasury_propose`        | Submit a new multisig proposal                 |
| `treasury_sign_proposal`  | Approve or reject with an EIP-712 signature    |
| `treasury_list_proposals` | List proposals with optional status filter     |

## Webhooks

You can register webhooks to receive real-time notifications for treasury and transaction events. Webhooks deliver events via HTTP POST with an HMAC-SHA256 signature for verification.

Treasury-relevant events include `wallet.transfer.sent`, `wallet.transfer.received`, `proposal.*`, `agent.transaction.*`, and `signing_key.rotated`. The full event catalog (40+ types, including deposits, cards, platform lifecycle, and policy backend events) is in **[Webhooks](/docs/platform-api/webhooks)**.

### Registering a webhook

```bash
curl -X POST "https://api.1claw.xyz/v1/webhooks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["wallet.transfer.sent", "proposal.executed"],
    "secret": "your-hmac-secret"
  }'
```

Failed deliveries are retried up to 5 times with exponential backoff.

### Endpoints

| Method | Path                  | Description                  |
|--------|-----------------------|------------------------------|
| POST   | `/v1/webhooks`        | Register a webhook           |
| GET    | `/v1/webhooks`        | List webhooks for the org    |
| GET    | `/v1/webhooks/{id}`   | Get webhook details          |
| PATCH  | `/v1/webhooks/{id}`   | Update webhook               |
| DELETE | `/v1/webhooks/{id}`   | Delete webhook               |

## See also

- [Embedded Wallets guide](/docs/guides/embedded-wallets) — platform integrator flow
- [Spend policies](/docs/treasury/spend-policies) — app and per-user caps
- [Wallet access policies](/docs/treasury/wallet-access-policies) — role-based grants
- [Intents API](/docs/agents/intents/overview) — agent transaction signing
- [Multi-Party Computation (MPC)](/docs/vaults/mpc) — how MPC custody works under the hood
- [Billing and usage](/docs/guides/billing-and-usage) — tier requirements
