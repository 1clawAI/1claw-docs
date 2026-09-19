---
title: Agents overview
description: Register AI agents, scope their vault access, enable Shroud LLM proxy, Intents signing, memory, channels, and delegation.
sidebar_position: 0
---

# Agents

An **agent** is a registered identity in your org — a bot, service, or runtime that needs scoped, audited access to secrets and optional on-chain signing or LLM proxying.

Agents do **not** get blanket vault access. Humans attach **policies** that grant specific path patterns; JWT scopes are derived from those policies when `agents.scopes` is empty.

## Lifecycle

1. **Register** — Human creates agent via dashboard, API, or [self-enrollment](/docs/agents/self-enrollment)
2. **Policy** — Human grants read/write on secret paths ([golden path](/docs/vaults/golden-path))
3. **Authenticate** — Agent exchanges `ocv_` API key for short-lived JWT
4. **Operate** — Fetch secrets, sign transactions, route LLM traffic, run automations
5. **Offboard** — Revoke policies, deactivate agent, rotate keys ([revoking access](/docs/vaults/revoking-access))

## Capabilities (per-agent toggles)

| Feature | Description | Docs |
|---------|-------------|------|
| **Secret access** | JIT fetch via Agent API or MCP | [Agent API](/docs/agents/api/overview) |
| **Shroud** | LLM proxy with redaction and threat detection | [Shroud](/docs/agents/shroud/overview) |
| **Intents** | Sign transactions without raw private keys | [Intents](/docs/agents/intents/overview) |
| **Execution Intents** | HTTP/GraphQL/DB via credential bindings | [Guardrails & Execution](/docs/agents/intents/guardrails) |
| **Memory** | Scratch, durable, and semantic agent memory | [Memory](/docs/agents/memory) |
| **Channels** | Telegram, WhatsApp, Discord messaging | [Communication](/docs/agents/communication) |
| **Delegation** | Inter-agent task delegation (human-approved) | [Delegation](/docs/agents/delegation) |
| **OIDC federation** | Exchange agent JWT for RS256 tokens (WIF) | [OIDC federation](/docs/agents/oidc-federation) |

## Child agents

A parent agent can be given cheap sub-agents for fan-out work — one child per document to summarise, one per lead to qualify — without each one being a full, human-registered agent.

- **Created by a human** with `POST /v1/agents/{agent_id}/children` (`agents.createChild` in the SDK, `create_child` in Python). Up to 50 per parent; a child cannot have children.
- **Bounded by the parent.** A child's `vault_ids` and `scopes` default to the parent's and must be a subset of them — a superset is refused. Vault policies and guardrails are inherited from the parent (policy lookups include the parent's), so a child can never do more than its parent.
- **Its own identity.** Each child has its own `ocv_` API key, its own memory namespaces (default `child:{child_id}`) and its own `action_approval_policy`, so its actions are attributable and its approvals are separate.
- **Free of the agent cap.** Children do not count against the plan's agent limit. Agent responses carry `agent_type` (`standard` | `child`) and `parent_agent_id`; `GET /v1/agents/{agent_id}/children` lists a parent's children.

```bash
1claw agent create-child $PARENT summariser-7 --scopes secrets:read --namespaces child:doc-7
1claw agent children $PARENT

curl -X POST https://api.1claw.co/v1/agents/$PARENT/children \
  -H "Authorization: Bearer $USER_JWT" -H "Content-Type: application/json" \
  -d '{"name":"summariser-7","scopes":["secrets:read"],"memory_namespace_allowlist":["child:doc-7"]}'
```

## Signing keys

Humans provision per-chain signing keys (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron). Private keys live in `__agent-keys`; agents sign via Intents API only.

See [Multi-chain signing](/docs/agents/intents/multi-chain-signing).

## Next steps

- [Register an agent](/docs/vaults/human-api/agents/register-agent)
- [Enable Intents API](/docs/agents/intents/overview)
- [Fleet management](/docs/agents/fleet-management)
