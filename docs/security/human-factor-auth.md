---
title: Human Factor Auth (HFA)
description: Step-up authentication for treasury wallet send, swap, and export — password, passkey, or passkey-only modes.
sidebar_position: 6
---

# Human Factor Auth (HFA)

Human Factor Auth adds a configurable step-up requirement before treasury wallet **send**, **swap**, and **export** operations. It applies to human users only — agents cannot configure or bypass HFA policies.

## Policy resolution

Effective policy is resolved in order (strictest wins where applicable):

1. **User policy** — `GET/PUT /v1/auth/human-factor-auth` (`human_factor_auth_policies` table)
2. **Spend policy override** — optional `human_factor_auth` JSON on `wallet_spend_policies`
3. **Platform defaults**

Embedded clients can read the resolved policy via `GET /v1/treasury/wallets/auth-policy`.

## Auth modes

| Mode | Behavior |
| ---- | -------- |
| `password_or_passkey` | Password (`X-Auth-Confirm`) or passkey tx-assert |
| `passkey_only` | Passkey tx-assert only |
| `passkey_required` | Passkey required; password fallback disabled |
| `password_only` | Password via `X-Auth-Confirm` |
| `reauth_token_only` | Short-lived reauth token from `POST /v1/auth/reauth` |

## Passkey tx-assert (v0.56.2)

Treasury send and swap support passkey authorization as an alternative to password re-auth:

- **Send:** `POST /v1/auth/passkeys/tx-assert/begin` with `{ tx_digest }` where `tx_digest` is SHA-256 hex of `chain|to|value_wei|data` (server recomputes from the send body).
- **Swap:** same endpoint with `{ action: "swap", treasury_swap_digest }` over sell/buy tokens and amount.
- Complete via `POST /v1/auth/passkeys/tx-assert/complete`, then pass the resulting token in `X-Passkey-Token` on `POST /v1/treasury/wallets/{chain}/send` or `.../swap`.

Export continues to require password re-auth via `X-Auth-Confirm` unless policy allows passkey modes above.

## Dashboard and embedded wallet

- **Settings → Security** — Wallet human factor auth card (`GET/PUT /v1/auth/human-factor-auth`)
- **Treasury Send/Swap** — `TreasuryTxConfirmDialog` honors passkey-only mode
- **`@1claw/wallet-react`** — `sendWithPasskey()` and passkey nudge when policy requires it

## Audit and webhooks

Failed or satisfied step-up emits audit events `human_factor_auth.denied` and `human_factor_auth.satisfied`. Failed password re-auth on send/swap/export increments `failed_login_attempts` and triggers account lockout at 10 failures (same as export).

## SDK

```typescript
await client.auth.getHumanFactorAuth();
await client.auth.setHumanFactorAuth({ require_passkey: true, require_totp: false });
const policy = await client.treasuryWallets.getAuthPolicy();
```

See also [Treasury spend policies](/docs/treasury/spend-policies) and [Embedded wallets — authentication](/docs/guides/embedded-wallets/authentication).
