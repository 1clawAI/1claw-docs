---
title: Advanced Embedded Wallet Features
description: Deposit destinations, internal ledger, sub-organizations, CMEK, MPC custody, and roadmap items for embedded wallets.
sidebar_position: 10
---

# Advanced Embedded Wallet Features

Beyond core auth and Send/Swap/Receive, 1Claw offers treasury primitives for fintech-style products: tracked deposits, off-chain ledgers, hierarchical orgs, and enterprise custody options.

## Deposit destinations

Unique inbound addresses for attributing deposits and firing webhooks when funds arrive.

```typescript
const { data } = await client.depositDestinations.create({
  chain: "ethereum",
  label: "Invoice #1042",
  treasury_wallet_id: walletUuid, // optional; reuse existing wallet address
  auto_credit_account_id: internalAccountUuid, // optional
});
// data.address, data.id, data.status
```

| Endpoint | Description |
| -------- | ----------- |
| `POST /v1/deposit-destinations` | Create destination |
| `GET /v1/deposit-destinations` | List (`?chain=`, `?status=`) |
| `GET /v1/deposit-destinations/{id}` | Detail + deposit events |
| `PATCH /v1/deposit-destinations/{id}` | Update status (`active`, `paused`, `archived`) |

Human-only. Background monitor records `deposit_events` and emits `wallet.transfer.received` webhooks on confirmation.

**Use case:** Per-checkout deposit address in a marketplace; auto-credit an [internal account](#internal-accounts-ledger) when confirmed.

## Internal accounts (ledger)

Gas-free instant transfers between named accounts within the same org — double-entry bookkeeping without on-chain fees.

```typescript
const { data: account } = await client.internalAccounts.create({
  name: "USD Float",
  description: "Platform liquidity",
});

await client.internalAccounts.transfer({
  from_account_id: fromId,
  to_account_id: toId,
  asset: "USDC",
  amount: "100.00",
  memo: "Payout batch 7",
});
```

Pass an **`Idempotency-Key`** header on the HTTP request for safe retries (recommended for production):

```bash
curl -X POST "https://api.1claw.co/v1/internal-transfers" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account_id": "'"$FROM"'",
    "to_account_id": "'"$TO"'",
    "asset": "USDC",
    "amount": "100.00"
  }'
```

Allowed assets: `USD`, `USDC`, `USDT`, `ETH`, `EUR` (allowlist enforced).

| Endpoint | Description |
| -------- | ----------- |
| `POST /v1/internal-accounts` | Create account |
| `GET /v1/internal-accounts` | List with balances |
| `POST /v1/internal-transfers` | Transfer (caller must own `from_account`) |
| `GET /v1/internal-accounts/{id}/ledger` | Paginated history |

Pair with deposit destinations (`auto_credit_account_id`) for "deposit → ledger credit → user withdrawal" flows.

## Sub-organizations

Hierarchical isolation: each end-user or business unit gets its own sub-org with separate vaults, agents, and policies under a parent org. Limits by tier: Pro 10, Team 50, Business 500, Enterprise unlimited (Free: none).

```bash
# Create (isolation_mode: "full" (default) or "shared_billing")
curl -X POST "https://api.1claw.co/v1/org/sub-orgs" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp - Tenant 42", "isolation_mode": "full"}'

# Add a member by email (creates the user in the sub-org)
curl -X POST "https://api.1claw.co/v1/org/sub-orgs/$SUB_ORG_ID/users" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "role": "member"}'
```

The request types for `client.subOrgs.create` and `addUser` in `@1claw/sdk` 0.62.0 do not match these bodies (they declare `description`/`billing_model` and `user_id`), so use the HTTP API. `POST /v1/org/sub-orgs/{id}/wallets/generate` exists but does not generate wallets yet (it answers `status: "not_yet_implemented"`).

Enable per-user isolation at provision time:

```typescript
await platform.platform.upsertUser({
  email: "user@example.com",
  create_sub_org: true,
});
```

See [Multi-tenant Platform API](/docs/platform-api/multi-tenant).

## CMEK and MPC custody

Server-custody treasury keys in `__treasury-keys` use org envelope encryption (AES-256-GCM DEKs wrapped by KMS KEKs). These options protect how 1Claw stores a key it holds; they do not change who can sign. For keys 1Claw cannot sign with alone (2-of-3 self-custody wallets), see [Key custody](/docs/security/custody). Paid tiers add stronger storage protection:

### MPC (vault-level)

| Mode | Tier default | Behavior |
| ---- | ------------ | -------- |
| XOR 2-of-2 client custody | Pro / Team | Server share + client share on read |
| Shamir 2-of-3 multi-HSM | Business / Enterprise | GCP + AWS + Azure; no client share required |

Enable on a vault: `POST /v1/vaults/{id}/mpc` with `{ "mpc_custody": "2of3_multi_hsm" }` (or `2of2_client_custody`, `2of3_client_custody`).

Details: [MPC](/docs/vaults/mpc).

### CMEK (Business / Enterprise)

Customer-managed AES-256-GCM layer — your key never leaves your environment; only SHA-256 fingerprint stored server-side.

- `POST /v1/vaults/{id}/cmek` — enable
- `POST /v1/vaults/{id}/cmek-rotate` — batch re-wrap with `X-CMEK-Old-Key` / `X-CMEK-New-Key`

Details: [CMEK](/docs/vaults/cmek).

:::note Treasury vault specifics
Vault-level MPC does not apply to `__treasury-keys`: it uses standard envelope encryption under the org KEK, and wallet generation clears any MPC setting on it.
:::

### TEE signing (agents, not treasury sends)

Human treasury sends execute in Vault with HSM-backed keys. **Optional TEE routing** applies to **agent** Intents API traffic via Shroud (`intents_require_tee`, `execution_require_tee`) — not the standard embedded-wallet send path.

Attestation: `GET https://shroud.1claw.co/v1/shroud/attestation`

See [Security overview](/docs/security/security-overview) and [Trust model comparison](/docs/security/trust-model-comparison).

## Portfolio aggregation

Unified balance view across treasury wallets, agent signing keys, and smart accounts:

```typescript
const { data } = await client.portfolio.get({
  chains: "ethereum,solana",
  include_tokens: true,
});
```

Useful for dashboard-style apps serving power users with both embedded wallets and agents.

## Roadmap and v0.53.1 notes

### Wallet access policies (live API)

Role-based grants for send, swap, balance view, and export are available via:

- `POST/GET/DELETE /v1/treasury/wallets/access-policies`
- Dashboard: **Settings → Wallet Access**

See [Wallet access policies](/docs/guides/embedded-wallets/wallet-access-policies). Treasury send, swap, export and the self-custody prepare routes enforce them once the org has at least one policy; **spend policies remain the primary cap for embedded end-user sends**.

### Credential recovery (org admin)

Org owners can configure MFA/passkey recovery escape hatches (`domain/credential_recovery.rs`). Approve + delayed execute flow; requires org owner/admin. No end-user self-service API yet — watch [Changelog 2026](/docs/reference/changelog-2026).

### Shamir org KEK (Business+)

Business/Enterprise orgs can configure Shamir-split org KEKs for multi-HSM custody. Reconstruct forwards to Shroud TEE when configured. Operator runbook: internal docs.

## Migration from other wallet providers

- [Migrate from Turnkey](/docs/integrations/migrate-from-turnkey) — signing + governance mapping
- [Migrate from Privy](/docs/integrations/migrate-from-privy)
- [Migrate from Dynamic](/docs/integrations/migrate-from-dynamic)

## Related

- [Overview](/docs/guides/embedded-wallets) — architecture recap
- [Platform API](/docs/guides/embedded-wallets/platform-api) — bootstrap and grants
- [Treasury overview](/docs/treasury/overview) — wallet API reference
- [HSM architecture](/docs/concepts/hsm-architecture) — key hierarchy
