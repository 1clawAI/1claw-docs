---
title: Settings & billing
description: Account settings, MFA, passkeys, team, API keys, and billing in the 1Claw dashboard.
sidebar_position: 4
---

# Settings & billing

## Account (`/settings/account`)

- Display name, email change (verified 6-digit code flow)
- Set password (for OIDC-only users)
- Delete account (danger zone)

## Security (`/settings/security`)

| Feature | Tier | Notes |
|---------|------|-------|
| **TOTP MFA** | All tiers | QR setup, recovery codes |
| **Passkeys** | All | Register/delete WebAuthn credentials; optional login prompt |
| **Vault unlock** | All | Require passkey to reveal secrets (`require_passkey_for_vaults`) |
| **DPoP enforcement** | Team+ | Org-wide `off` / `warn` / `required` |
| **API keys** | All | Personal `1ck_` keys with optional expiry |

## Team (`/settings/team`)

Invite members, manage roles. Seat limits vary by tier (Free: owner only).

## Billing (`/settings/billing`)

- Current tier, usage meters (requests, vaults, secrets, agents, signatures)
- Stripe Checkout for subscribe/upgrade
- Customer Portal for payment method and invoices
- Prepaid credits balance and top-up
- Overage method toggle (credits vs x402)
- LLM token billing add-on (Stripe AI Gateway)

See [Billing & usage](/docs/guides/billing-and-usage) and [x402](/docs/guides/x402).

## Connected apps (`/settings/connected-apps`)

Revoke platform app access, view granted vaults/agents, manage resource grants.

## Org settings

- **Bankr config** — BYOK partner key for key vending
- **Policy backend** — Cedar/OPA shadow vs enforce mode
- **SSO** — WorkOS connection (Team+)

See also: [Dashboard overview](/docs/dashboard/overview), [Two-factor auth](/docs/security/two-factor-auth).
