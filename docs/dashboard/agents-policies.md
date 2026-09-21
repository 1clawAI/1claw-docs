---
title: Agents & policies
description: Register agents, configure Shroud, Intents, guardrails, delegations, and policies from the dashboard.
sidebar_position: 2
---

# Agents & policies in the dashboard

## Agent list

**Agents → All agents** shows name, status, Intents/Shroud badges, and created date. Empty state links to the **agent wizard** and self-enrollment docs.

## Agent detail tabs

In **Simple** mode the page shows Overview, Access, Wallets and Channels; the
rest sit under **More ▾**. Flip the **Advanced** switch (top right, remembered
per browser) to see every tab. Rotate key and Delete live in the **Danger
Zone** at the foot of the page, whichever tab is open.

| Tab | Contents |
|-----|----------|
| **Overview** | API key prefix, auth method, vault binding, scopes, federation, token TTL |
| **Policies** | Linked vault policies (jump to vault policy editor) |
| **Signing** | Intents API toggle, TEE requirements, transaction guardrails, card ordering guardrails |
| **Shroud** | Enable proxy, full `shroud_config` editor (threat detectors, rate limits, budgets) |
| **Identity** | SSH/ECDH key reveal, rotate identity keys |
| **Signing keys** | Per-chain keys: provision, rotate, export (password re-auth) |
| **Smart accounts** | Safe addresses per chain, import/deploy |
| **Execution Intents** | Bindings, guardrails, execution log, playground |
| **Memory** | Namespace browser when `memory_enabled` |
| **Channels** | Telegram/WhatsApp/Discord setup |
| **Delegations** | Outbound/inbound delegation tables |
| **Bankr** | Key lease management |
| **Connected accounts** | OAuth provider connections |

## Creating an agent

**Agents → Create** or the **agent wizard**:

1. Name, description, auth method (`api_key` default), scopes
2. *(Advanced)* expiry, token scoping and vault binding, transaction policy,
   Shroud, execution intents, environment tag — all have safe defaults and
   are folded away in Simple mode with a one-line summary and **Customise**
3. One-time API key display — copy before leaving the page

The wizard's Capabilities block (Shroud proxy, Intents API, execution
intents) is likewise Advanced-only; Simple mode uses *Shroud on, Intents on,
execution intents off*.

## Approvals inbox

**Approvals** (`/approvals`) lists pending agent requests with risk tier badges. Approve or reject; policy-change approvals auto-execute on approval.

Mobile app shares the same approval queue with passkey/TOTP step-up.

See also: [Agents overview](/docs/agents/overview), [Approvals](/docs/treasury/approvals), [Policy engine](/docs/treasury/policy-engine).
