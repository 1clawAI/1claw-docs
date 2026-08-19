---
title: Testing and Production
description: Checklist for testing embedded wallet flows locally, staging spend policies, webhooks, and going live with @1claw/wallet-react.
sidebar_position: 12
---

# Testing and Production

Use this checklist before launching embedded wallets to real users.

## Prerequisites

| Requirement | Verify |
| ----------- | ------ |
| Pro+ subscription | Platform API enabled on your org |
| Platform app | `plt_` key created; stored server-side only |
| Redirect URIs | OAuth redirect URIs registered on platform app |
| Chain RPCs | Target chains enabled in [chain registry](/docs/reference/api-reference) |
| Spend policies | App default (and per-user overrides if needed) configured |

## Local and staging test flow

### 1. Auth smoke test

```bash
# Send OTP
curl -X POST "https://api.1claw.xyz/v1/auth/email-otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+wallet@yourdomain.com","platform_app_id":"APP_UUID"}'

# Verify (use code from email)
curl -X POST "https://api.1claw.xyz/v1/auth/email-otp/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test+wallet@yourdomain.com",
    "code":"123456",
    "auto_provision_chains":["ethereum","base"]
  }'
```

Expect `token`, `user_id`, `is_new_user`, and optional `wallet_address` in the response.

### 2. Wallet provisioning

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets" \
  -H "Authorization: Bearer $USER_JWT"
```

Confirm wallets exist for each requested chain.

### 3. Balance read

```bash
curl "https://api.1claw.xyz/v1/treasury/wallets/ethereum/balance" \
  -H "Authorization: Bearer $USER_JWT"
```

### 4. Send on testnet

Use Sepolia or Base Sepolia. Fund the wallet via faucet, then send with step-up auth:

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/wallets/sepolia/send" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "X-Auth-Confirm: $PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "value_wei": "0.001"
  }'
```

### 5. Spend policy violation

Configure a tight allowlist, attempt send to a non-listed address, confirm **403** with descriptive `detail`.

### 6. Widget integration

```tsx
<OneclawWalletProvider apiKey={process.env.NEXT_PUBLIC_PLT_KEY!} baseUrl="https://api.1claw.xyz">
  <OneclawEmbeddedWallet
    chains={["ethereum"]}
    features={["send", "receive"]}
    socialProviders={["email"]}
  />
</OneclawWalletProvider>
```

Verify: login → balance load → send → policy error toast on violation.

## Production checklist

### Security

- [ ] `plt_` key only in server env or `NEXT_PUBLIC_` for widget (never human `1ck_` keys in browser)
- [ ] Spend policies defined (`max_value_per_tx_eth`, `daily_limit_eth`, `allowed_chains`)
- [ ] OAuth PKCE (S256) enabled for Sign in with 1Claw
- [ ] HTTPS on all redirect URIs
- [ ] Webhook HMAC secret configured and verified in your receiver

### Platform API

- [ ] `max_connected_users` set appropriately
- [ ] `billing_model` matches your commercial model (`platform_pays` vs `user_pays`)
- [ ] Bootstrap templates use `platform_locked: true` for end-user secrets
- [ ] Claim flow tested (`claim_url` → user claims resources)

### Operations

- [ ] Webhooks subscribed: `platform.user.connected`, `wallet.transfer.sent`, `wallet.transfer.received`
- [ ] Error monitoring on 403 spend policy rejections and 401 auth failures
- [ ] Support runbook for cross-org linking (409 + consent URL)

### Optional production features

| Feature | When to enable |
| ------- | -------------- |
| Passkey tx auth | High-value sends |
| Gasless (`gasless: true`) | Consumer UX on EVM; requires Pimlico |
| Fiat on-ramp (`buy` feature) | Operator configures `COINBASE_ONRAMP_APP_ID` / `MOONPAY_API_KEY` |
| Deposit destinations | Per-invoice inbound tracking |
| Internal ledger | Off-chain balances between org accounts |

## Environment variables (operator)

| Variable | Service | Purpose |
| -------- | ------- | ------- |
| `ZERO_X_API_KEY` | Vault | DEX swaps |
| `PIMLICO_API_KEY` | Vault | Gasless ERC-4337 |
| `COINBASE_ONRAMP_APP_ID` | Vault | Fiat on-ramp |
| `MOONPAY_API_KEY` / `MOONPAY_SECRET_KEY` | Vault | MoonPay widget + webhook verify |
| `ONECLAW_GOOGLE_CLIENT_ID` | Vault | Google social login |
| `ONECLAW_APPLE_CLIENT_ID` | Vault | Apple social login |
| `ONECLAW_DISCORD_CLIENT_ID` + `SECRET` | Vault | Discord OAuth code exchange |

## Monitoring

- Dashboard **Treasury** — wallet balances and send history
- `GET /v1/treasury/wallets/spend-policy` — effective policy for a user session
- Platform app audit: `GET /v1/platform/apps/{id}/audit`
- [Status page](https://1claw.xyz/status) — API and dashboard health

## Related

- [Getting started](/docs/guides/embedded-wallets/getting-started)
- [Security and custody](/docs/guides/embedded-wallets/security-and-custody)
- [Platform webhooks](/docs/platform-api/webhooks)
- [Troubleshooting](/docs/guides/troubleshooting)
