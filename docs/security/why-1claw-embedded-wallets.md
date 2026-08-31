---
title: Why 1Claw for Embedded Wallets
description: "How 1Claw embedded wallets fit into a unified agent-security platform — policy engine, Shroud LLM inspection, spend controls, and live verification endpoints."
sidebar_position: 11
---

# Why 1Claw for Embedded Wallets

## Embedded Wallets Inside a Unified Agent-Security Platform

1Claw is not a wallet SDK bolted onto something else. It is a secrets management and agent governance platform that includes embedded wallets as one surface among many — all governed by the same policy engine, audited in the same hash-chained log, and inspected by the same TEE proxy.

When you choose 1Claw for embedded wallets, you get:

- **Secrets + signing under one roof**: API keys, database credentials, signing keys, and wallet keys all protected by the same HSM-backed envelope encryption and policy engine
- **LLM traffic inspection (Shroud)**: Agent LLM requests pass through an AMD SEV-SNP enclave that redacts secrets, scores for prompt injection, enforces content policies, and blocks credential exfiltration before upstream transmission
- **Control-plane governance**: Policy changes, key exports, and member mutations can require multi-party approval with per-role minimums and credential-type requirements
- **Deep transaction inspection**: `deep_inspect` unwraps multicall, Safe `execTransaction`, and ERC-4337 `handleOps` to evaluate conditions against inner calls
- **Multi-chain coverage**: Ethereum, Bitcoin, Solana, XRP, Cardano, and Tron with transaction decoding for each chain family
- **Agent memory, automations, and channels**: Persistent encrypted memory, cron/webhook/event workflows, and Telegram/WhatsApp/Discord channels, all audited and policy-gated

## What Signing-Only Infrastructure Misses

A signing-only platform protects the moment of key usage. It does not protect:

| Attack Vector | Signing-Only | 1Claw |
|--------------|-------------|-------|
| Secret leakage via LLM context | Unprotected | Shroud redacts before upstream |
| Prompt injection → unauthorized action | Unprotected | Injection scoring + semantic policy |
| Credential exfiltration via tool calls | Unprotected | Tool call inspection + MCP exfil protection (default `block`) |
| Policy change without approval | Typically unprotected | `consensus_trigger` with `action_in` / `action_kind_in` |
| Spend policy bypass on token transfers | Varies | `allowed_tokens` + `validate_wallet_send()` on treasury send/swap |
| Wallet role bypass | Varies | `wallet_access_policies` on send/swap/export |
| Agent memory poisoning | Not applicable | Encrypted, namespace-isolated, org-scoped |
| Automation webhook abuse | Not applicable | SSRF protection + host allowlists + rate limits |

## Platform Capabilities

### Social Login + Email OTP

Google, Apple, and Discord social login. Email OTP passwordless flow. New users can auto-provision treasury wallets on first login.

### Spend Policies

Per-app and per-user spend policies with `to_allowlist`, `to_denylist`, `max_value_per_tx_eth`, `daily_limit_eth`, `allowed_chains`, `allowed_tokens`, and `max_transactions_per_day`. Per-user overrides beat app defaults. Strictest effective policy wins at send/swap time.

### Sub-Organizations

Hierarchical org management for isolating resources per end-user or business unit. Each sub-org has independent vaults, agents, and policies.

### Multi-Chain Treasury Wallets

HSM-backed wallet generation for 6 chains. Send, swap (via 0x DEX aggregator), receive, import, export. Vault-level MPC custody optional; org Shamir KEK on Team+.

### OAuth2 / "Sign in with 1Claw"

Full OAuth2 authorization server. Third-party apps implement "Sign in with 1Claw" to access user wallets with scoped consent. React component: `<SignInWith1Claw />` in `@1claw/wallet-react`.

### Fiat On/Off Ramps

Coinbase Onramp + MoonPay widget integration for fiat-to-crypto and crypto-to-fiat.

### Platform API

Developers build on 1Claw via the Platform API (Pro+): provision users, bootstrap resources from declarative templates, issue claim tokens, and manage connected users. When `platform_locked = true`, platform operators cannot read end-user secret values.

## Security Verification

Unlike proprietary infrastructure where trust is assumed, 1Claw provides live verification endpoints:

```bash
# Verify TEE attestation (public)
curl -s https://shroud.1claw.co/v1/shroud/attestation | jq .

# Verify audit hash chain integrity (authenticated)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/audit/verify | jq .

# Verify OIDC public keys (public)
curl -s https://api.1claw.co/.well-known/jwks.json | jq .
```

## Getting Started

1. Create a platform app: `POST /v1/platform/apps`
2. Define a bootstrap template with wallet provisioning (`provision_eoa: true` or treasury wallet generation)
3. Provision users via `POST /v1/platform/users/upsert`
4. Bootstrap resources: `POST /v1/platform/connections/{id}/bootstrap`
5. Embed `<OneclawEmbeddedWallet />` or `<SignInWith1Claw />` in your app

See the [Platform API docs](/docs/platform-api/overview) and the [`@1claw/wallet-react` package](/docs/treasury/wallet-react) for integration guides.
