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
curl -X POST "https://api.1claw.xyz/v1/internal-transfers" \
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

Enterprise hierarchical isolation — each end-user or business unit gets its own sub-org with separate vaults, agents, and policies under a parent org.

```typescript
await client.subOrgs.create({
  name: "Acme Corp — Tenant 42",
  description: "Isolated resources",
  billing_model: "user_pays",
});

await client.subOrgs.addUser(subOrgId, { user_id: userUuid });
await client.subOrgs.generateWallets(subOrgId, { chains: ["ethereum"] });
```

Enable per-user isolation at provision time:

```typescript
await platform.platform.upsertUser({
  email: "user@example.com",
  external_subject: "tenant:42",
  create_sub_org: true,
});
```

See [Multi-tenant Platform API](/docs/platform-api/multi-tenant).

## CMEK and MPC custody

Treasury keys in `__treasury-keys` use org envelope encryption (AES-256-GCM DEKs wrapped by KMS KEKs). Paid tiers add stronger custody:

### MPC (vault-level)

| Mode | Tier default | Behavior |
| ---- | ------------ | -------- |
| XOR 2-of-2 client custody | Pro / Team | Server share + client share on read |
| Shamir 2-of-3 multi-HSM | Business / Enterprise | GCP + AWS + Azure; no client share required |

Enable on a vault: `POST /v1/vaults/{id}/mpc` with `{ custody_mode, providers? }`.

Details: [MPC](/docs/vaults/mpc).

### CMEK (Business / Enterprise)

Customer-managed AES-256-GCM layer — your key never leaves your environment; only SHA-256 fingerprint stored server-side.

- `POST /v1/vaults/{id}/cmek` — enable
- `POST /v1/vaults/{id}/cmek-rotate` — batch re-wrap with `X-CMEK-Old-Key` / `X-CMEK-New-Key`

Details: [CMEK](/docs/vaults/cmek).

:::note Treasury vault specifics
`__treasury-keys` MPC mode is auto-selected from billing tier at first wallet generation. CMEK applies when enabled on the underlying vault infrastructure your org uses for treasury storage.
:::

### TEE signing (agents, not treasury sends)

Human treasury sends execute in Vault with HSM-backed keys. **Optional TEE routing** applies to **agent** Intents API traffic via Shroud (`intents_require_tee`, `execution_require_tee`) — not the standard embedded-wallet send path.

Attestation: `GET https://shroud.1claw.xyz/v1/shroud/attestation`

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

## Roadmap (domain-only today)

The following exist as **domain modules and migrations** but do **not** yet have public HTTP handlers documented for embedded-wallet integrators:

| Feature | Status |
| ------- | ------ |
| **Wallet access policies** (`wallet_access_policies`, migration 205) | Domain evaluator only — no public CRUD API yet |
| **Credential recovery escape hatch** (`credential_recovery_requests`, migration 204) | Org setting + domain logic — no end-user API yet |

Do not build product flows against these until API endpoints ship. Watch [Changelog 2026](/docs/reference/changelog-2026) for releases.

## Migration from other wallet providers

- [Migrate from Turnkey](/docs/integrations/migrate-from-turnkey) — signing + governance mapping
- [Migrate from Privy](/docs/integrations/migrate-from-privy)
- [Migrate from Dynamic](/docs/integrations/migrate-from-dynamic)
- [Why 1Claw for embedded wallets](/docs/security/why-1claw-embedded-wallets)

## Related

- [Overview](/docs/guides/embedded-wallets) — architecture recap
- [Platform API](/docs/guides/embedded-wallets/platform-api) — bootstrap and grants
- [Treasury overview](/docs/treasury/overview) — wallet API reference
- [HSM architecture](/docs/concepts/hsm-architecture) — key hierarchy
