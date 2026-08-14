---
title: Agents & policies
description: Register agents, configure Shroud, Intents, guardrails, delegations, and policies from the dashboard.
sidebar_position: 2
---

# Agents & policies in the dashboard

## Agent list

**Agents → All agents** shows name, status, Intents/Shroud badges, and created date. Empty state links to the **agent wizard** and self-enrollment docs.

## Agent detail tabs

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

1. Name, description, optional vault binding
2. Auth method (`api_key` default)
3. Optional: enable Intents, Shroud, memory, execution intents
4. Guardrail fields when Intents is on
5. One-time API key display — copy before leaving the page

## Approvals inbox

**Approvals** (`/approvals`) lists pending agent requests with risk tier badges. Approve or reject; policy-change approvals auto-execute on approval.

Mobile app shares the same approval queue with passkey/TOTP step-up.

See also: [Agents overview](/docs/agents/overview), [Approvals](/docs/treasury/approvals), [Policy engine](/docs/treasury/policy-engine).
