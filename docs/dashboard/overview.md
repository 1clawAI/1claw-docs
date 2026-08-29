---
title: Dashboard overview
description: The 1Claw web UI at 1claw.xyz for managing vaults, agents, treasury, platform apps, billing, and security settings.
sidebar_position: 0
---

# Dashboard

The **Dashboard** at [1claw.xyz](https://1claw.co) is the primary interface for humans. It proxies `/api/v1/*` to the Vault API and exposes every product area through a consistent sidebar.

## Sign in

| Method | Notes |
|--------|-------|
| Email + password | Standard login; MFA optional on all tiers |
| Google OAuth | One-click sign-in |
| Passkey | Passwordless WebAuthn login |
| SSO | WorkOS/OIDC for Team+ |

After login, your session is stored in an **httpOnly cookie** (`_claims`); the dashboard never stores JWTs in `localStorage`.

## Main navigation

| Section | What you manage |
|---------|-----------------|
| **Dashboard home** | Usage summary, getting-started banner, quick links |
| **Vaults** | Create vaults, browse secrets, policies, CMEK/MPC settings |
| **Agents** | Register agents, enable Shroud/Intents, guardrails, delegations |
| **Automations** | Workflow builder, presets, run history |
| **Runtimes** | Deploy containers, hosting, terminal shell |
| **Treasury** | Native wallets, Safe multisigs, proposals |
| **Cards** | Payment card orders, reveal, void |
| **Approvals** | Inbox for agent approval requests |
| **Platform** | Platform apps, templates, connected users |
| **Security** | Risk events, honeytokens, Shroud activity |
| **Settings** | Account, team, billing, MFA, passkeys, API keys |

## Related docs

- [Vaults & secrets in the dashboard](/docs/dashboard/vaults-secrets)
- [Agents & policies](/docs/dashboard/agents-policies)
- [Treasury & cards](/docs/dashboard/treasury-cards)
- [Settings & billing](/docs/dashboard/settings-billing)
- [Platform wizard](/docs/dashboard/platform-wizard)

## When to use the dashboard vs API

Use the **dashboard** for setup, policy editing, one-time key reveals, and visual workflow builders. Use the **API, CLI, or SDK** for CI/CD, agent runtime, and infrastructure-as-code.
