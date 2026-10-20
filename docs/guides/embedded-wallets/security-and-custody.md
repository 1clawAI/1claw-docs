---
title: Security and Custody
description: How embedded wallet keys are stored, who can access them, spend policy enforcement, and platform custody guarantees.
sidebar_position: 11
---

# Security and Custody

Embedded wallets inherit 1Claw's HSM-backed key hierarchy, envelope encryption, and audit hash chain. This page explains what your users' keys are protected by, what your platform can and cannot do, and how step-up auth fits in.

## Who can sign

Every treasury wallet carries a `custody` label (on `GET /v1/treasury/wallets`):

- **`server`** (the default, and every wallet the widget auto-provisions): 1Claw holds the whole private key (envelope-encrypted, HSM-wrapped) and can sign after policy and approvals without a second party. That is custodial, and the controls below limit who *else* can reach the key, not whether 1Claw can.
- **`client_tss`**: a 2-of-3 FROST key on Solana, XRP, Cardano or Bitcoin (Taproot). The vault holds share 1; shares 2 and 3 are made on the user's device. Share 2 is wrapped under the user's passkey (WebAuthn PRF) and share 3 lives only in an offline recovery kit sealed under a recovery code. 1Claw cannot sign alone, and kit plus code can spend without 1Claw.
- **`client_multisig`** (beta): a Tron 2-of-3 native multisig or an EVM 2-of-3 Safe, with the same device key, recovery kit and code.

Self-custody wallets are created from the 1Claw dashboard, not auto-provisioned, and which chains an org can create is set by per-org rollout flags (`GET /v1/keys/tss/chains`). A wallet counts as backed up only once a passkey holds its share and a recovery kit for its current shares is confirmed; runtimes and agents refuse one that is not. Recovery (restore from kit, share refresh, the offline `oneclaw-recover` tool) is on [Key custody](/docs/security/custody); read it before making a non-custodial claim about wallets built on this API.

## Key storage model

| Layer | What it protects |
| ----- | ---------------- |
| **HSM / KMS** | Org KEK wraps per-secret DEKs; tier-aware HSM vs software protection |
| **`__treasury-keys` vault** | Per-org vault at `users/{user_id}/chains/{chain}/private_key` |
| **Self-custody (optional)** | `client_tss` / `client_multisig` wallets: 1Claw holds one share or key of three (vault-level MPC is not used for `__treasury-keys`) |
| **Direct secret reads** | Blocked — keys are never returned via `GET /v1/vaults/.../secrets/...` |

For `server` wallets, private keys are only exposed through:

- `POST /v1/treasury/wallets/{chain}/export` (password re-auth, audit-logged)
- Server-side signing on send/swap (user never sees the key)

A self-custody wallet has no private key anywhere, so export answers `409`.

:::info Agents cannot use treasury wallets
All treasury wallet endpoints enforce `require_human()`. Autonomous signing uses [agent signing keys](/docs/agents/intents/multi-chain-signing), not embedded treasury wallets.
:::

## Platform custody guarantee

Bootstrap marks the vaults and agents it creates **`platform_locked`** (not a template option; it is always set), so your platform operator account can manage lifecycle (create, delete, rotate) but **cannot read** end-user secret values, including treasury private keys.

See [Platform API — custody](/docs/platform-api/multi-tenant#custody-guarantee).

## Enforcement layers for sends and swaps

Before any treasury wallet transaction is signed, the server evaluates guardrails in order:

1. **Human step-up** — `X-Auth-Confirm` (password) or `X-Passkey-Token` (WebAuthn bound to tx digest)
2. **Sanctions screen** — destination and any ERC-20 recipient in the calldata checked against the OFAC SDN list (EVM addresses with or without the `0x` prefix); refused with `403` and audited as `sanctions.blocked`; fails closed (`503`) if the list is older than 7 days. Not configurable. See [Key custody](/docs/security/custody).
3. **[Spend policies](/docs/guides/embedded-wallets/spend-policies)** — app default + optional per-user override (`validate_wallet_send()`)
4. **[Wallet access policies](/docs/guides/embedded-wallets/wallet-access-policies)** — principal grants (Pro+), enforced once the org has at least one policy
5. **Account lockout** — failed re-auth on export/send/swap increments lockout counter (10 failures → 15-minute lock)

Clients and widgets cannot bypass server-side checks — a blocked transaction never reaches signing.

## Authentication security

| Method | Notes |
| ------ | ----- |
| Email OTP | 5-minute TTL, auth-rate-limited (5 burst / 1 sec per IP) |
| Social login | Server-verified ID tokens; no email auto-linking (409 on conflict) |
| Sign in with 1Claw | PKCE (S256) required in production; RS256 ID tokens |
| Passkey tx auth | 5-minute token bound to a SHA-256 digest of the send (`chain`, `to`, value, `data` and the chain-specific fields) |

See [Authentication](/docs/guides/embedded-wallets/authentication).

## Audit and compliance

- Every export, send, swap, and import is audit-logged (`treasury_wallet.*` events)
- Audit log uses hash-chained integrity (`integrity_hash`, `prev_event_id`)
- Verify org audit chain: `GET /v1/audit/verify` (org-scoped)

See [Audit and compliance](/docs/guides/audit-and-compliance) and [Security overview](/docs/security/security-overview).

## Enterprise options

| Feature | Tier | Purpose |
| ------- | ---- | ------- |
| CMEK | Business / Enterprise | Customer-managed AES layer; fingerprint only on server |
| Shamir org KEK | Business / Enterprise | Multi-HSM key encryption for org KEK |
| Sub-organizations | Enterprise | Per-tenant isolation under a parent org |

Details: [Advanced features](/docs/guides/embedded-wallets/advanced#cmek-and-mpc-custody).

## Threat model summary

```mermaid
flowchart LR
    subgraph UserDevice["User device"]
        Widget["wallet-react / your UI"]
    end

    subgraph PlatformBackend["Your backend (plt_ key)"]
        Upsert["users/upsert"]
        Spend["spend policies"]
    end

    subgraph OneClaw["1Claw Vault"]
        Auth["Auth + step-up"]
        Policy["Spend + access policies"]
        HSM["HSM signing"]
    end

    Widget -->|"User JWT only"| Auth
    Widget -->|"Send/swap"| Policy
    Policy --> HSM
    PlatformBackend -->|"No key reads when platform_locked"| Upsert
    PlatformBackend --> Spend
    Spend --> Policy
```

**Your responsibilities as a platform developer:**

- Never ship `plt_` keys in frontend bundles — use `@1claw/wallet-react` or server-side Platform API calls
- Set spend policies before production
- Use HTTPS and secure OAuth redirect URIs
- Monitor webhooks for anomalous transfer patterns

## Related

- [Trust model comparison](/docs/security/trust-model-comparison)
- [HSM architecture](/docs/concepts/hsm-architecture)
- [Testing and production](/docs/guides/embedded-wallets/testing-production)
