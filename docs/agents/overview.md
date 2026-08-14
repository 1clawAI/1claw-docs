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

## Signing keys

Humans provision per-chain signing keys (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron). Private keys live in `__agent-keys`; agents sign via Intents API only.

See [Multi-chain signing](/docs/agents/intents/multi-chain-signing).

## Next steps

- [Register an agent](/docs/vaults/human-api/agents/register-agent)
- [Enable Intents API](/docs/agents/intents/overview)
- [Fleet management](/docs/agents/fleet-management)
