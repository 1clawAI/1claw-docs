---
title: Wallet Access Policies
description: Role-based treasury wallet permissions for users, agents, and role tags — create, list, and revoke grants.
sidebar_position: 17
---

# Wallet Access Policies

Wallet access policies control **who** may send, swap, view balances, export, or sign with treasury wallets in your org. They complement [spend policies](/docs/guides/embedded-wallets/spend-policies) (platform-app caps on embedded end-users) and [transaction guardrails](/docs/agents/intents/guardrails) (agent Intents API limits).

:::info Requirements
- **Pro or higher** plan
- **Human JWT** only — agents receive 403 on policy CRUD
:::

## When to use

| Scenario | Policy type |
| -------- | ----------- |
| Cap consumer wallet spend in your app | [Spend policies](/docs/guides/embedded-wallets/spend-policies) |
| Let a specific agent view treasury balances | Wallet access (`can_view_balance`) |
| Restrict which chains an ops role can send on | Wallet access (`allowed_chains`) |
| Autonomous agent on-chain actions | [Agent signing keys](/docs/agents/intents/multi-chain-signing) + guardrails |

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/v1/treasury/wallets/access-policies` | Create policy |
| `GET` | `/v1/treasury/wallets/access-policies` | List (`?scope_type=`, `?scope_id=`) |
| `DELETE` | `/v1/treasury/wallets/access-policies/{id}` | Soft-delete |

## Create example

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/access-policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope_type": "org",
    "principal_type": "user",
    "principal_id": "USER_UUID",
    "can_send": true,
    "can_swap": true,
    "can_view_balance": true,
    "can_export": false,
    "allowed_chains": ["ethereum", "solana"],
    "max_value_per_tx_eth": "0.25",
    "daily_limit_eth": "1.0"
  }'
```

### Scope types

| `scope_type` | `scope_id` | Applies to |
| ------------ | ---------- | ---------- |
| `wallet` | Treasury wallet UUID | One wallet |
| `platform_app` | Platform app UUID | Wallets provisioned by that app |
| `org` | (omit) | All org treasury wallets |

### Principal types

| `principal_type` | `principal_id` |
| ---------------- | -------------- |
| `user` | User UUID |
| `agent` | Agent UUID |
| `role` | Role tag (matches `wallet_roles` on user/agent) |
| `platform_app` | Platform app UUID |

## Dashboard

**Settings → Wallet Access** (`/settings/wallet-access`) — create and revoke policies with a visual form.

## Enforcement status

Policy CRUD and dashboard management are live in v0.53.1. Runtime evaluation (`evaluate_wallet_access`) is implemented in the domain layer; wiring into every treasury send/swap path is part of the v0.53.1 parity sprint. **Spend policies remain the primary enforcement path for embedded wallet end-user sends today.**

## Related

- [Embedded wallet access guide](/docs/guides/embedded-wallets/wallet-access-policies)
- [Treasury wallets overview](/docs/treasury/overview)
- [Spend policies (embedded)](/docs/guides/embedded-wallets/spend-policies)
