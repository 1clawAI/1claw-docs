---
title: Wallet Spend Policies
description: App-level default spend policies and per-user overrides for embedded wallet sends and swaps.
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Wallet Spend Policies

Spend policies constrain what embedded-wallet users can send or swap **before** the server signs a transaction. Platform developers set **app-level defaults**; optional **per-user overrides** tighten or relax limits for individual connected users. Enforcement is server-side in `validate_wallet_send()` — clients cannot bypass policies.

:::tip Distinction from agent guardrails
**Spend policies** govern human treasury wallet sends/swaps for platform end-users. **Agent transaction guardrails** (`tx_to_allowlist`, `tx_daily_limit_eth`, etc.) govern [Intents API](/docs/agents/intents/guardrails) signing for agents. They use different tables and APIs.
:::

## Policy fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `to_allowlist` | `string[]` | Permitted destination addresses (empty = unrestricted) |
| `to_denylist` | `string[]` | Blocked destinations (checked after allowlist) |
| `max_value_per_tx_eth` | string (decimal) | Max native value per transaction (ETH-equivalent enforcement path) |
| `daily_limit_eth` | string | Rolling 24h cumulative spend cap |
| `allowed_chains` | `string[]` | Chain names users may transact on |
| `allowed_tokens` | `string[]` | Token contract/mint allowlist |
| `max_transactions_per_day` | integer | Max send/swap count per UTC day |

When both app default and user override define a field, the **strictest** effective value wins for limits (lowest caps, intersecting allowlists).

## App-level defaults

Create with your **`plt_`** platform key:

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
await platform.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
  to_allowlist: ["0xYourTreasury...", "0xApprovedContract..."],
  allowed_tokens: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  max_transactions_per_day: 50,
});
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/$APP_ID/spend-policies" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_value_per_tx_eth": "0.1",
    "daily_limit_eth": "1.0",
    "allowed_chains": ["ethereum", "base"],
    "to_allowlist": ["0xYourTreasury..."],
    "max_transactions_per_day": 50
  }'
```

</TabItem>
</Tabs>

List policies: `GET /v1/platform/apps/{id}/spend-policies`

Deactivate: `DELETE /v1/platform/apps/{id}/spend-policies/{pid}`

## Per-user overrides

Set a tighter or looser policy for one connected user:

```typescript
await platform.platform.setUserSpendPolicy(connectionId, {
  max_value_per_tx_eth: "0.5",
  daily_limit_eth: "5.0",
  to_allowlist: ["0xUserSpecificDestination..."],
});
```

```bash
curl -X PUT "https://api.1claw.xyz/v1/platform/connections/$CONNECTION_ID/spend-policy" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"daily_limit_eth":"5.0"}'
```

Overrides apply only to that user's treasury wallet sends/swaps while connected to your app.

## Effective policy (user view)

End-users (or your frontend with their JWT) can read the merged result:

```typescript
const { data } = await client.treasuryWallets.getEffectiveSpendPolicy();
// data.to_allowlist, data.daily_limit_eth, data.source, ...
```

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/spend-policy" \
  -H "Authorization: Bearer $USER_JWT"
```

Use this to explain limits in your UI before the user submits a transaction.

## Enforcement behavior

1. User initiates send/swap (widget or API)
2. Server resolves effective policy (user override → app default)
3. `validate_wallet_send()` checks destination, chain, amount, token, daily totals, tx count
4. On violation → **403** with message; no signing attempted
5. On success → step-up auth, sign, broadcast, ledger entry in `wallet_send_ledger`

Swaps are subject to the same checks as sends (including `allowed_tokens`).

## Dashboard management

Platform app detail in the dashboard includes a **Spend Policies** card for visual editing. Connected Apps settings show per-user overrides where configured.

## Example policies

### Marketplace ( payouts to sellers only )

```json
{
  "to_allowlist": ["0xSellerEscrow...", "0xFeeCollector..."],
  "max_value_per_tx_eth": "10.0",
  "daily_limit_eth": "100.0",
  "allowed_chains": ["base"]
}
```

### Consumer app ( low limits )

```json
{
  "max_value_per_tx_eth": "0.05",
  "daily_limit_eth": "0.25",
  "max_transactions_per_day": 10,
  "allowed_chains": ["ethereum", "base", "solana"]
}
```

### VIP user override

```json
{
  "max_value_per_tx_eth": "2.0",
  "daily_limit_eth": "20.0"
}
```

## Related

- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — transaction APIs
- [Platform API](/docs/guides/embedded-wallets/platform-api) — connections and grants
- [Trust model](/docs/security/trust-model-comparison) — spend policy vs signing-only controls
