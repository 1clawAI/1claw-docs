---
title: Treasury Spend Policies
description: App-level and per-user spend caps for treasury wallet sends and swaps — API reference from the treasury perspective.
sidebar_position: 18
---

# Treasury Spend Policies

Spend policies constrain treasury wallet **sends** and **swaps** before the server signs. Platform developers set app-level defaults; optional per-user overrides apply to individual connected users.

Full field reference and examples: **[Embedded wallets — Spend policies](/docs/guides/embedded-wallets/spend-policies)**.

## Quick reference

| Endpoint | Who | Purpose |
| -------- | --- | ------- |
| `POST /v1/platform/apps/{id}/spend-policies` | `plt_` or user JWT | App-level default |
| `GET /v1/platform/apps/{id}/spend-policies` | `plt_` or user JWT | List app policies |
| `PUT /v1/platform/connections/{id}/spend-policy` | `plt_` or user JWT | Per-user override |
| `GET /v1/treasury/wallets/spend-policy` | **User JWT** | Effective policy for caller |
| `DELETE /v1/platform/apps/{id}/spend-policies/{pid}` | `plt_` or user JWT | Deactivate policy |

## Effective policy resolution

1. Per-user override (most recently updated active row for that user)
2. App-level default (`user_id = null`)
3. No policy → unrestricted (subject to step-up auth only)

Override **replaces** the app default — fields are not merged.

## User-facing read

```bash
curl "https://api.1claw.co/v1/treasury/wallets/spend-policy" \
  -H "Authorization: Bearer $USER_JWT"
```

Response:

```json
{
  "policy": {
    "max_value_per_tx_eth": "0.1",
    "daily_limit_eth": "1.0",
    "allowed_chains": ["ethereum", "base"],
    "to_allowlist": [],
    "is_active": true
  }
}
```

Or `{ "policy": null }` when no policy applies.

## SDK

```typescript
// Platform operator
await platform.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
});

// End-user effective policy
const { data } = await userClient.treasuryWallets.getEffectiveSpendPolicy();
// data.policy may be null
```

:::note SDK response shape
The HTTP API wraps the policy in `{ "policy": ... }`. The SDK `getEffectiveSpendPolicy()` returns the inner policy object directly when present.
:::

## Enforcement

`validate_wallet_send()` runs on:

- `POST /v1/treasury/wallets/{chain}/send`
- `POST /v1/treasury/wallets/{chain}/swap`

Violations return **403** with a descriptive `detail` message. Sends and swaps are recorded in `wallet_send_ledger` for rolling 24-hour limits.

## Related

- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive)
- [Platform API for embedded wallets](/docs/guides/embedded-wallets/platform-api)
- [Treasury wallets overview](/docs/treasury/overview)
