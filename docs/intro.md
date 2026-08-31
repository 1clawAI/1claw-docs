---
title: Introduction
description: 1claw is a cloud HSM secrets manager that lets humans grant AI agents scoped, audited, revocable access to secrets without exposing raw credentials.
keywords: [1claw, HSM, secrets manager, AI agents, vault, zero trust, cloud HSM]
sidebar_position: 0
---

# Introduction

1claw is a **cloud-hosted Hardware Security Module (HSM) secrets manager** for humans and AI agents. It lets you store API keys, tokens, and other credentials in a vault encrypted by keys that never leave the HSM. You control which agents can access which secrets, with what permissions, and for how long — and agents fetch secrets at runtime instead of holding them in context or environment.

:::tip Try it out
Try out the examples in this repo: **[Basic](https://github.com/1clawAI/1claw-examples/tree/main/basic)** (vault, secrets, billing, sharing), **[LangChain Agent](https://github.com/1clawAI/1claw-examples/tree/main/langchain-agent)** (agent + vault), **[Shroud Demo](https://github.com/1clawAI/1claw-examples/tree/main/shroud-demo)** (LLM proxy + Intents). See the [examples README](https://github.com/1clawAI/1claw-examples) for the full list.
:::

## Products

1claw is built around these products (they work together):

| Product | What it does | Docs |
|--------|----------------|------|
| **Vault** | Store and manage secrets; Human API, Agent API, and MCP for just-in-time secret access | [Vaults →](/docs/vaults/overview) |
| **Agents** | Register agents, Shroud LLM proxy, Intents signing, memory, channels | [Agents →](/docs/agents/overview) |
| **Shroud** | LLM proxy that inspects and redacts before forwarding to OpenAI, Anthropic, Google (Gemini), and others | [Shroud →](/docs/agents/shroud/overview) |
| **Intents** | Let agents sign and broadcast blockchain transactions without ever seeing private keys | [Intents →](/docs/agents/intents/overview) |
| **Treasury** | Native multi-chain wallets, embedded wallets, Safe multisigs, and policy engine | [Treasury →](/docs/treasury/overview) |
| **Automations** | Cron, webhook, and event-driven workflows | [Automations →](/docs/automations/overview) |
| **Runtimes** | Managed containers for agents with optional public hosting | [Runtimes →](/docs/runtimes/overview) |
| **Cards** | Agent-ordered prepaid/gift cards via x402 (PAN never exposed) | [Cards →](/docs/cards/overview) |
| **Platform API** | Build products on 1Claw with bootstrap templates | [Platform →](/docs/platform-api/overview) |
| **Dashboard** | Web UI at 1claw.co for humans | [Dashboard →](/docs/dashboard/overview) |

- **Vault** is the core: dashboard, REST API, MCP server, CLI, and SDKs all talk to the same vault. Create vaults, store secrets at paths, register agents, and attach policies that grant read/write access. Advanced encryption options include [CMEK](/docs/vaults/cmek) (client-side encryption layer) and [MPC](/docs/vaults/mpc) (split DEKs across multiple HSM providers so no single provider holds the complete key).
- **Shroud** sits between your agent and the LLM provider. Send requests to `shroud.1claw.co` instead of directly to the provider; Shroud enforces policies, redacts secrets, and detects prompt injection.
- **Intents** extends the vault with transaction signing. Enable the Intents API on an agent; the agent submits transaction intents; the server signs in the HSM (or in Shroud’s TEE) and broadcasts. The private key never leaves the vault.
- **Treasury** provides native multi-chain wallet generation (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron) for human users and tracks onchain multisig treasuries with agent access requests.

**Task walkthroughs** (setup, billing, compliance, troubleshooting) live under **[Guides](/docs/category/guides)**. Product docs are organized by area in the sidebar.

## How to navigate these docs

| Section | Start here |
|---------|------------|
| [Vaults](/docs/vaults/overview) | Secrets, policies, CMEK, MPC, Human API, MCP |
| [Agents](/docs/agents/overview) | Lifecycle, Shroud, Intents, memory, channels |
| [Automations](/docs/automations/overview) | Workflow spec, triggers, presets |
| [Runtimes](/docs/runtimes/overview) | Containers, hosting, shell |
| [Cards](/docs/cards/overview) | x402 card ordering and guardrails |
| [Treasury](/docs/treasury/overview) | Wallets, embedded wallets, approvals, Cedar/OPA |
| [Sharing](/docs/sharing/overview) | Share links and inbound flow |
| [Risk Engine](/docs/risk-engine/overview) | Adaptive auth scoring, honeytokens |
| [Platform API](/docs/platform-api/overview) | Apps, templates, bootstrap, webhooks |
| [Dashboard](/docs/dashboard/overview) | Web UI walkthrough |
| [Guides](/docs/category/guides) | Cross-cutting workflows |
| [SDKs](/docs/sdks/overview) | TypeScript, Python, Go, curl |
| [Integrations](/docs/integrations/overview) | LangChain, MCP, migrations |
| [Security](/docs/security/hsm-overview) | HSM, zero-trust, compliance |
| [Reference](/docs/reference/api-reference) | API reference, glossary, changelog |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  Vault API  │◀────│  MCP Server │
│  (Next.js)  │     │  (Rust)     │     │  (Node.js)  │
│  1claw.co  │     │ api.1claw.co     │ mcp.1claw.co
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────┐ ┌──────────┐
        │ Supabase │ │ KMS  │ │  Audit   │
        │ Postgres │ │(keys)│ │  (log)   │
        └──────────┘ └──────┘ └──────────┘
              ▲
              │
     ┌────────┴────────┐
     │  Mobile App     │
     │  (Expo/RN)      │
     │  iOS + Android  │
     └─────────────────┘
```

- **Dashboard** — The web UI at [1claw.co](https://1claw.co) where humans manage vaults, secrets, agents, and policies.
- **Vault API** — The Rust backend that handles authentication, envelope encryption, policy enforcement, and all CRUD operations. Both the dashboard and MCP server talk to it.
- **Shroud** — Optional LLM proxy at [shroud.1claw.co](https://shroud.1claw.co); agents can send LLM traffic through Shroud for inspection and redaction. Transaction signing can also run in Shroud’s TEE.
- **MCP Server** — A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents (Claude, Cursor, GPT) just-in-time access to vault secrets and Intents. Hosted at `mcp.1claw.co` or run locally.

### How humans and agents interact

- **Humans** log in (email/password or Google) or use a personal API key (`1ck_`). They create vaults, store secrets at paths, register agents, and attach policies that grant agents (or users) read/write access to path patterns.
- **Agents** authenticate with an agent API key (`ocv_`) via `POST /v1/auth/agent-token` to get a short-lived JWT, then call the same API to list secrets and fetch secret values by path. Access is enforced by policies; all access is audited.

## Two APIs, one base URL

The same REST API serves both personas:

| Persona   | Auth                                                      | Typical operations                                                                       |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Human** | Email/password or Google → JWT; or personal API key → JWT | Create vaults, PUT/GET/DELETE secrets, create/list policies, register agents, audit logs |
| **Agent** | Agent API key → JWT via `/v1/auth/agent-token`            | GET secret by path, list secrets in a vault (subject to policies)                        |

Base URL: `https://api.1claw.co` (or your Cloud Run URL). The dashboard at [1claw.co](https://1claw.co) proxies `/api/v1/*` to the same API.

## Next steps

- [What is 1claw?](/docs/concepts/what-is-1claw) — Core concepts in more detail.
- [Parts of 1claw](/docs/concepts/parts-of-1claw) — Three products (Vault, Shroud, Intents) and how to use them (Dashboard, API, MCP, CLI, SDK).
- [Quickstart](/docs/quickstart) — Fastest path: `1claw setup`, human path, or agent path.
- [Shroud](/docs/agents/shroud/overview) — Route LLM traffic through Shroud for inspection and redaction.
- [Intents API](/docs/agents/intents/overview) — Let agents sign transactions without seeing keys.
- [Glossary](/docs/reference/glossary) — Definitions of vault, secret, policy, agent, and other terms.
