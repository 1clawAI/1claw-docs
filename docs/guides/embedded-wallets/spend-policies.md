---
title: Wallet Spend Policies
description: App-level default spend policies and per-user overrides for embedded wallet sends and swaps — field reference, API, SDK, and enforcement.
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Wallet Spend Policies

Spend policies constrain what embedded-wallet users can **send** or **swap** before the server signs a transaction. Platform developers set **app-level defaults**; optional **per-user overrides** replace those defaults for individual connected users. Enforcement is server-side in `validate_wallet_send()` — clients and widgets cannot bypass policies.

:::tip Spend policies vs agent guardrails
These are different systems with different APIs and enforcement paths:

| | **Wallet spend policies** | **Agent transaction guardrails** |
| --- | --- | --- |
| **Who** | Human treasury wallets (embedded wallet end-users) | Agents via [Intents API](/docs/agents/intents/guardrails) |
| **What** | `POST /v1/treasury/wallets/{chain}/send` and `.../swap` | `POST /v1/agents/{id}/transactions`, `/sign`, unified `/sign` |
| **Storage** | `wallet_spend_policies`, `wallet_send_ledger` | `agents` table columns + `agent_transactions` |
| **Set by** | Platform app (`plt_` key) or dashboard | Human on agent record |

Agents receive **403** on all treasury wallet endpoints. If you need programmatic signing for bots, provision [agent signing keys](/docs/agents/intents/multi-chain-signing) separately.
:::

## Two-level policy model

```
┌─────────────────────────────────────────────────────────────┐
│  Platform app (your backend, plt_ key)                      │
│  POST /v1/platform/apps/{appId}/spend-policies              │
│  → App-level default (user_id = null)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ applies to all connected users
                           │ unless overridden
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Per-user override (optional)                               │
│  PUT /v1/platform/connections/{connectionId}/spend-policy   │
│  → user_id scoped policy                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ wins at resolution time
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Effective policy at send/swap time                         │
│  GET /v1/treasury/wallets/spend-policy (user JWT)           │
└─────────────────────────────────────────────────────────────┘
```

**Resolution order** (implemented in `get_effective_policy`):

1. **Per-user override** — active policy where `user_id` matches the sending user (most recently updated wins).
2. **App-level default** — active policy where `platform_app_id` matches the app and `user_id` is `null`.
3. **No policy** — unrestricted (subject to global treasury send caps and step-up auth).

:::info Override replaces, not merges
When a per-user override exists, it **fully replaces** the app default for that user. Fields are **not** intersected or merged — the effective policy is exactly one row from `wallet_spend_policies`.
:::

Policies are **soft-deleted**: `DELETE` sets `is_active = false`. Inactive policies are ignored.

## Complete field reference

### Policy constraint fields

These fields appear in create/update requests and in API responses. Empty arrays mean **unrestricted** for list fields; `null` means **unlimited** for numeric caps.

| Field | Type | Default | Enforced on | Description |
| ----- | ---- | ------- | ----------- | ----------- |
| `to_allowlist` | `string[]` | `[]` | Send | Permitted destination addresses. When non-empty, `to` must match one entry (case-insensitive). Does not apply to DEX router targets on swap (router address is not user-chosen). |
| `to_denylist` | `string[]` | `[]` | Send | Blocked destinations. Checked after allowlist; deny wins. Case-insensitive. |
| `max_value_per_tx_eth` | decimal string | `null` | Send, swap | Maximum value per transaction. For EVM chains, compared against ETH-equivalent amount. For non-EVM chains, compared against native major units (SOL, BTC, etc.). |
| `daily_limit_eth` | decimal string | `null` | Send, swap | Rolling **24-hour** cumulative spend cap. Pre-check sums all chains; authoritative check at record time uses per-chain totals under an advisory lock. |
| `allowed_chains` | `string[]` | `[]` | Send, swap | Chain names users may transact on (e.g. `ethereum`, `base`, `solana`). When non-empty, requests on other chains return **403**. |
| `allowed_tokens` | `string[]` | `[]` | Send (token), swap | Permitted ERC-20 contract addresses, SPL mints, or TRC-20 contracts. **Enforced as of v0.53.** When non-empty, token sends must use a listed `token_contract` / `token_mint`; swaps must use listed `sell_token` and `buy_token`. Native-only sends skip this check. Case-insensitive. |
| `max_transactions_per_day` | integer | `null` | Send, swap | Maximum send/swap count per rolling **24-hour** window. |

### Request-only field (app-level create)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `user_id` | UUID | Optional on `POST /v1/platform/apps/{id}/spend-policies`. Scopes the policy to a specific user instead of app-wide default. Prefer `PUT .../connections/{id}/spend-policy` for per-user overrides tied to a connection. |

### Response metadata fields

Returned on create, list, and effective-policy reads (`SpendPolicyResponse` / `WalletSpendPolicy`):

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | UUID | Policy record ID (use for deactivate/delete). |
| `platform_app_id` | UUID | Owning platform app. |
| `user_id` | UUID \| null | `null` = app-level default; set = per-user override. |
| `is_active` | boolean | `false` after soft-delete. |
| `created_at` | ISO 8601 | Creation timestamp. |
| `updated_at` | ISO 8601 | Last update (used to break ties when multiple active user policies exist). |

### Supported chain names (dashboard UI)

The dashboard Spend Policies card offers: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`. EVM L2s and testnets (e.g. `base`, `sepolia`) are also valid when registered in the [chain registry](/docs/reference/api-reference).

## API endpoints

All platform management endpoints require a **`plt_`** platform API key or an org-member user JWT. Agents and platform-delegated principals receive **403**.

### Create app-level default

`POST /v1/platform/apps/{appId}/spend-policies`

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const platform = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.PLATFORM_KEY, // plt_...
});

const { data: policy } = await platform.platform.createSpendPolicy(appId, {
  to_allowlist: ["0xYourTreasury...", "0xApprovedMerchant..."],
  to_denylist: ["0xKnownScam..."],
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
  allowed_tokens: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"], // Base USDC
  max_transactions_per_day: 50,
});

console.log(policy.id, policy.created_at);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/$APP_ID/spend-policies" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to_allowlist": ["0xYourTreasury...", "0xApprovedMerchant..."],
    "to_denylist": ["0xKnownScam..."],
    "max_value_per_tx_eth": "0.1",
    "daily_limit_eth": "1.0",
    "allowed_chains": ["ethereum", "base"],
    "allowed_tokens": ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
    "max_transactions_per_day": 50
  }'
```

</TabItem>
</Tabs>

Returns **201** with the full policy object.

### List app policies

`GET /v1/platform/apps/{appId}/spend-policies`

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await platform.platform.listSpendPolicies(appId);
console.log(data.policies);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl "https://api.1claw.xyz/v1/platform/apps/$APP_ID/spend-policies" \
  -H "Authorization: Bearer $PLT_KEY"
```

</TabItem>
</Tabs>

Returns `{ "policies": [ ... ] }` — active policies only, newest first.

### Set per-user override

`PUT /v1/platform/connections/{connectionId}/spend-policy`

Creates a user-scoped policy for the connection's user. Takes the same body as create (minus `user_id` — inferred from the connection).

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
await platform.platform.setUserSpendPolicy(connectionId, {
  max_value_per_tx_eth: "0.05",
  daily_limit_eth: "0.25",
  max_transactions_per_day: 10,
  allowed_chains: ["base"],
});
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X PUT "https://api.1claw.xyz/v1/platform/connections/$CONNECTION_ID/spend-policy" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_value_per_tx_eth": "0.05",
    "daily_limit_eth": "0.25",
    "max_transactions_per_day": 10,
    "allowed_chains": ["base"]
  }'
```

</TabItem>
</Tabs>

Returns **201** with the new override policy. Each call creates a new row; resolution uses the most recently updated active policy for that user.

### Get effective policy (end-user)

`GET /v1/treasury/wallets/spend-policy`

Requires the **end-user's JWT** (not `plt_`). Returns the resolved policy or `{ "policy": null }`.

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const userClient = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: userJwt,
});

const { data } = await userClient.treasuryWallets.getEffectiveSpendPolicy();
// data.policy?.max_value_per_tx_eth, data.policy?.allowed_chains, ...
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/spend-policy" \
  -H "Authorization: Bearer $USER_JWT"
```

</TabItem>
</Tabs>

Use this in your UI to show limits **before** the user submits a send or swap. The embedded wallet widget does not currently pre-fetch limits — consider calling this from your app shell if you need inline cap display.

### Deactivate a policy

`DELETE /v1/platform/apps/{appId}/spend-policies/{policyId}`

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
await platform.platform.deleteSpendPolicy(appId, policyId);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X DELETE "https://api.1claw.xyz/v1/platform/apps/$APP_ID/spend-policies/$POLICY_ID" \
  -H "Authorization: Bearer $PLT_KEY"
```

</TabItem>
</Tabs>

Returns **204 No Content**. Deactivating a per-user override causes resolution to fall back to the app default (if one exists).

## Enforcement

Spend policies are evaluated in `validate_wallet_send()` before any signing occurs on treasury wallet endpoints:

| Endpoint | Checks |
| -------- | ------ |
| `POST /v1/treasury/wallets/{chain}/send` | Full policy: destination, chain, amount, token, daily spend, tx count |
| `POST /v1/treasury/wallets/{chain}/swap` | `allowed_chains`, `allowed_tokens` (sell + buy), then full policy on quoted swap value and `sell_token` |

### Enforcement flow

1. User initiates send or swap (widget, dashboard, or API).
2. Server resolves effective policy (`get_effective_policy`).
3. **Pre-check** — allowlist, denylist, chain, token, per-tx cap, optimistic daily spend/count.
4. Step-up auth — password (`X-Auth-Confirm`) or [passkey tx token](/docs/guides/embedded-wallets/authentication#passkey-transaction-authorization).
5. Sign and broadcast (or gasless UserOp).
6. **Atomic record** — `record_send_atomic()` re-validates daily limits under a Postgres advisory lock, then inserts into `wallet_send_ledger`.

The ledger drives rolling 24h spend and transaction-count limits. Successful sends and swaps both count toward limits.

### Violations

All policy violations return **403 Forbidden** with a descriptive `detail` message. Signing never starts. Examples:

| Condition | Example `detail` |
| --------- | ---------------- |
| Allowlist miss | `Recipient address is not in your allowlist` |
| Denylist hit | `Recipient address is on the denylist` |
| Chain blocked | `Chain 'polygon' is not in your allowed chains list` |
| Token blocked | `Token '0xabc...' is not in your allowed tokens list` |
| Per-tx cap | `Transaction value 0.5 ETH exceeds per-transaction cap of 0.1 ETH` |
| Daily spend | `Transaction would exceed daily limit of 1.0 ETH (spent today: 0.9 ETH)` |
| Tx count | `Daily transaction limit of 50 reached` |
| Swap token | `Swap involves a token that is not in your allowed tokens list` |

:::caution Client-side validation is advisory only
You may mirror limits in your UI for better UX, but only server enforcement matters. The `@1claw/wallet-react` Send and Swap views surface API errors — a **403** from send/swap displays the server message to the user.
:::

## Dashboard management

Platform app detail (`/platform/[appId]`) includes a **Spend Policies** card (`SpendPoliciesCard`) for creating and deactivating app-level policies. The create dialog exposes:

- Address allowlist (one per line)
- Max value per tx (ETH)
- Daily limit (ETH)
- Max transactions per day
- Allowed chains (multi-select)

`to_denylist` and `allowed_tokens` are supported via API but not yet in the dashboard create form — use the SDK or curl for those fields.

## Example policies

### E-commerce checkout cap

Limit in-app payments to your merchant addresses on Base with moderate caps:

```json
{
  "to_allowlist": ["0xMerchantWallet...", "0xEscrowContract..."],
  "max_value_per_tx_eth": "0.5",
  "daily_limit_eth": "2.0",
  "allowed_chains": ["base"],
  "max_transactions_per_day": 20
}
```

### DeFi allowlist (router + stablecoins)

Restrict swaps and token sends to USDC/USDT on Ethereum and Base:

```json
{
  "allowed_chains": ["ethereum", "base"],
  "allowed_tokens": [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  ],
  "max_value_per_tx_eth": "1.0",
  "daily_limit_eth": "5.0"
}
```

### Child account daily limit (per-user override)

Tight override via connection after bootstrap:

```json
{
  "max_value_per_tx_eth": "0.01",
  "daily_limit_eth": "0.05",
  "max_transactions_per_day": 5,
  "allowed_chains": ["base"]
}
```

Set with `setUserSpendPolicy(connectionId, { ... })` — replaces the app default for that user only.

### Token-restricted rewards app

Only allow payouts in your app token; block arbitrary destinations:

```json
{
  "to_allowlist": ["0xRewardsPool...", "0xUserWalletFromKyc..."],
  "allowed_tokens": ["0xYourAppToken..."],
  "max_value_per_tx_eth": "100.0",
  "daily_limit_eth": "1000.0",
  "allowed_chains": ["ethereum"]
}
```

Native ETH sends are still allowed when `allowed_tokens` is set but no token is specified — combine with low `max_value_per_tx_eth` or use allowlist-only destinations if you need to block native transfers.

## React and `@1claw/wallet-react`

The embedded wallet widget calls treasury wallet send/swap APIs with the user's session JWT. Spend policies apply automatically — no widget configuration is required.

```tsx
import { OneclawWalletProvider, OneclawTreasuryWidget } from "@1claw/wallet-react";

<OneclawWalletProvider appId="your-app-id" baseUrl="https://api.1claw.xyz">
  <OneclawTreasuryWidget theme="dark" chains={["ethereum", "base"]} />
</OneclawWalletProvider>
```

**Recommended integration patterns:**

1. **Pre-flight limits** — Call `getEffectiveSpendPolicy()` when the user opens the wallet and show caps near Send/Swap buttons.
2. **Error handling** — Catch **403** responses and map `detail` to user-friendly copy (e.g. "Daily limit reached — try again tomorrow").
3. **Per-user tiers** — After KYC or subscription upgrade, call `setUserSpendPolicy()` to raise caps without redeploying your app.

See [React integration](/docs/guides/embedded-wallets/react-integration) for provider props and theming.

## Data model

Policies live in `wallet_spend_policies` (migration 115); spend tracking in `wallet_send_ledger`. Both tables have RLS enabled.

```
wallet_spend_policies          wallet_send_ledger
├── id                         ├── id
├── org_id                     ├── user_id
├── platform_app_id (nullable) ├── chain
├── user_id (nullable)         ├── to_address
├── to_allowlist[]             ├── value_wei
├── to_denylist[]              ├── value_eth
├── max_value_per_tx_eth       ├── tx_hash
├── daily_limit_eth            └── created_at
├── allowed_chains[]
├── allowed_tokens[]
├── max_transactions_per_day
├── is_active
├── created_at
└── updated_at
```

## Related

- [Getting started](/docs/guides/embedded-wallets/getting-started) — platform app, bootstrap, connections
- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — transaction APIs and step-up auth
- [Platform API](/docs/guides/embedded-wallets/platform-api) — upsert, bootstrap, grants
- [React integration](/docs/guides/embedded-wallets/react-integration) — `@1claw/wallet-react`
- [Trust model](/docs/security/trust-model-comparison) — spend policy vs signing-only controls
- [Security overview](/docs/security/security-overview) — audit and policy enforcement plane
