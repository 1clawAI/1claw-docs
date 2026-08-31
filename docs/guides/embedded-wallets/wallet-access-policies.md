---
title: Wallet Access Policies
description: Role-based grants for who can send, swap, view balance, or export treasury wallets — API, scopes, and tier requirements.
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Wallet Access Policies

Wallet access policies (v0.53.1) extend [spend policies](/docs/guides/embedded-wallets/spend-policies) with **role- and principal-based grants** — control which users, agents, or role tags can send, swap, view balances, or export keys on treasury wallets.

:::info Tier and principal requirements
- **Pro or higher** plan required to create policies
- **Human-only** — agents cannot create or delete wallet access policies
- Distinct from **spend policies** (platform app caps on end-user sends) — see comparison below
:::

## Spend policies vs wallet access policies

| | **Spend policies** | **Wallet access policies** |
| --- | --- | --- |
| **Purpose** | Cap what embedded-wallet **end-users** can send/swap | Grant **specific principals** permission to act on wallets |
| **Set by** | Platform app (`plt_` key) | Org admin (human JWT) |
| **Endpoints** | `/v1/platform/apps/{id}/spend-policies` | `/v1/treasury/wallets/access-policies` |
| **Enforcement** | Live on send/swap | API + dashboard live; runtime enforcement on treasury routes is rolling out with v0.53.1 |

Use **spend policies** for consumer wallet caps in embedded apps. Use **wallet access policies** when agents, team roles, or platform apps need granular wallet permissions inside an org.

## Policy model

Each policy row defines:

| Field | Description |
| ----- | ----------- |
| `scope_type` | `wallet` (specific wallet), `platform_app`, or `org` (org-wide) |
| `scope_id` | UUID when scope is `wallet` or `platform_app`; omit for `org` |
| `principal_type` | `user`, `agent`, `role`, or `platform_app` |
| `principal_id` | User/agent UUID, role tag string, or platform app UUID |
| `can_send` / `can_swap` / `can_view_balance` / `can_export` / `can_sign` | Boolean permission flags |
| `allowed_chains` | Chain allowlist (empty = all) |
| `max_value_per_tx_eth` / `daily_limit_eth` | Optional caps on the grant |
| `conditions` | JSONB for extended conditions |
| `expires_at` | Optional expiry |

Resolution order in the domain evaluator: direct principal match → role tag match → platform app match → org-wide default. **No matching policy = deny** (fail-closed).

## API endpoints

| Method | Path | Auth |
| ------ | ---- | ---- |
| `POST` | `/v1/treasury/wallets/access-policies` | Human JWT |
| `GET` | `/v1/treasury/wallets/access-policies` | Human JWT |
| `DELETE` | `/v1/treasury/wallets/access-policies/{id}` | Human JWT |

Query params on list: `scope_type`, `scope_id`.

### Create a policy

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/treasury/wallets/access-policies" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "scope_type": "org",
    "principal_type": "agent",
    "principal_id": "AGENT_UUID",
    "can_send": true,
    "can_swap": false,
    "can_view_balance": true,
    "can_export": false,
    "allowed_chains": ["ethereum", "base"],
    "max_value_per_tx_eth": "0.5",
    "daily_limit_eth": "2.0"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
// Use fetch or curl until @1claw/sdk adds a walletAccess resource.
// Request body matches the Vault handler DTO (scope_type, principal_type, …).
const res = await fetch("https://api.1claw.co/v1/treasury/wallets/access-policies", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${userJwt}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    scope_type: "org",
    principal_type: "agent",
    principal_id: agentId,
    can_send: true,
    can_view_balance: true,
    allowed_chains: ["ethereum", "base"],
  }),
});
const policy = await res.json();
```

</TabItem>
</Tabs>

Returns **201** with the full policy object.

### List policies

```bash
curl "https://api.1claw.co/v1/treasury/wallets/access-policies?scope_type=org" \
  -H "Authorization: Bearer $USER_JWT"
```

Response: `{ "policies": [ ... ] }` — active policies only.

### Delete (soft-delete)

```bash
curl -X DELETE "https://api.1claw.co/v1/treasury/wallets/access-policies/$POLICY_ID" \
  -H "Authorization: Bearer $USER_JWT"
```

Returns **204**. Sets `is_active = false`.

## Dashboard

Manage policies at **Settings → Wallet Access** (`/settings/wallet-access`). Create grants by chain, target type (agent/user), permissions (`send`, `swap`, `receive`), and optional expiry.

## Example: agent read-only balance

Allow a support agent to view balances but not send:

```json
{
  "scope_type": "org",
  "principal_type": "agent",
  "principal_id": "support-agent-uuid",
  "can_view_balance": true,
  "can_send": false,
  "can_swap": false,
  "can_export": false
}
```

## Example: role-based ops team

Grant all users with wallet role tag `treasury_ops` send access on Ethereum only:

```json
{
  "scope_type": "org",
  "principal_type": "role",
  "principal_id": "treasury_ops",
  "can_send": true,
  "can_swap": true,
  "allowed_chains": ["ethereum"],
  "max_value_per_tx_eth": "1.0"
}
```

Assign roles via `users.wallet_roles` / `agents.wallet_roles` (org admin).

## Related

- [Spend policies](/docs/guides/embedded-wallets/spend-policies) — platform app spend caps
- [Security and custody](/docs/guides/embedded-wallets/security-and-custody)
- [Treasury wallet access](/docs/treasury/wallet-access-policies) — same API from treasury docs angle
- [Changelog 2026](/docs/reference/changelog-2026) — v0.53.1 wallet access release notes
