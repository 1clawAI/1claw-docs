---
title: Dashboard overview
description: The 1Claw web UI at 1claw.co for managing vaults, agents, treasury, platform apps, billing, and security settings.
sidebar_position: 0
---

# Dashboard

The **Dashboard** at [1claw.co](https://1claw.co) is the primary interface for humans. It proxies `/api/v1/*` to the Vault API and exposes every product area through a consistent sidebar.

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
| **Dashboard home** | Control plane: Topology first, then **Overview** (needs-attention, activity, inventory, spend, trend), Threats, Metrics, Flows, Shroud, Risk, Audit, Live |
| **Vaults** | Create vaults, browse secrets, policies, CMEK/MPC settings |
| **Agents** | The agent wizard (one way to create; auth method, scopes, TTL, expiry under Advanced), Shroud/Intents, guardrails, delegations |
| **Automations** | Workflow builder, presets, run history |
| **Runtimes** | Deploy containers, hosting, terminal shell |
| **Treasury** | Native wallets, Safe multisigs, proposals |
| **Cards** | Payment card orders, reveal, void |
| **Inbox** | Everything waiting on a person: agent approvals, team consensus decisions, wallet signing proposals (the old Approvals / Consensus / Proposals pages redirect here) |
| **Platform** | Platform apps, templates, connected users |
| **Security** | Risk events, honeytokens, Shroud activity |
| **Settings** | Grouped (You · Organization · Security · Developers · Billing) with a search box; Billing has Plan / Usage / Payments / Add-ons tabs, Security has Sign-in / Data protection / Guardrails / Honeytokens |

### Getting around

- **Command palette** — `⌘K` / `Ctrl+K` (or the Search button in the header) jumps to any page, agent, vault, runtime, automation or pending approval, starts a create flow, and toggles theme and wizard mode. Type `?` anywhere for the shortcut list.
- **Two-key shortcuts** — `g` then a letter goes somewhere (`g a` agents, `g v` vaults, `g r` runtimes, `g w` automations, `g p` approvals, `g c` consensus, `g d` dashboard, `g s` settings, `g t` treasury); `n` then a letter starts a wizard (`n a` agent, `n v` vault, `n r` runtime, `n w` automation). They are ignored while you type in a field.
- **On a phone** — the sidebar folds away under a hamburger and a bottom tab bar (Home · Vaults · Agents · Runtimes · Approvals, with the pending count, and **More** for the rest). Long tab strips scroll sideways.
- **Setup checklist** — the Overview tab keeps a six-item checklist (vault, secret, agent + grant, runtime, AI budget, telemetry export) until everything is done; hide it any time.
- **Simple and Advanced** — every wizard, the agent / vault / platform-app pages, the policy and secret forms and Security settings carry one **Advanced** switch (remembered per browser). Simple mode asks only for what cannot be guessed and shows the defaults for the rest with a **Customise** button; Advanced shows every option. The same switch is in the command palette.
- **Approvals** — when the pending count rises while you are elsewhere, a toast offers to open the queue; the sidebar and bottom-bar badges update every 30 seconds.
- **Deleting things** — every detail page ends with a red **Danger Zone**; deletes ask you to type the resource name.

## Related docs

- [Vaults & secrets in the dashboard](/docs/dashboard/vaults-secrets)
- [Agents & policies](/docs/dashboard/agents-policies)
- [Treasury & cards](/docs/dashboard/treasury-cards)
- [Settings & billing](/docs/dashboard/settings-billing)
- [Platform wizard](/docs/dashboard/platform-wizard)

## When to use the dashboard vs API

Use the **dashboard** for setup, policy editing, one-time key reveals, and visual workflow builders. Use the **API, CLI, or SDK** for CI/CD, agent runtime, and infrastructure-as-code.
