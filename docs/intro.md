---
title: Introduction
description: 1claw is a cloud HSM secrets manager that lets humans grant AI agents scoped, audited, revocable access to secrets without exposing raw credentials.
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
| **Vault** | Store and manage secrets; Human API, Agent API, and MCP for just-in-time secret access | [Vault →](/docs/human-api/overview) |
| **Shroud** | LLM proxy that inspects and redacts before forwarding to OpenAI, Anthropic, Google (Gemini), and others; blocks prompt injection and hides secrets | [Shroud →](/docs/guides/shroud) |
| **Intents** | Let agents sign and broadcast blockchain transactions without ever seeing private keys | [Intents →](/docs/guides/intents-api) |
| **Treasury** | Organization Safe multisigs—signers, thresholds, and agent access requests | [Treasury →](/docs/guides/treasury) |

- **Vault** is the core: dashboard, REST API, MCP server, CLI, and SDKs all talk to the same vault. Create vaults, store secrets at paths, register agents, and attach policies that grant read/write access.
- **Shroud** sits between your agent and the LLM provider. Send requests to `shroud.1claw.xyz` instead of directly to the provider; Shroud enforces policies, redacts secrets, and detects prompt injection.
- **Intents** extends the vault with transaction signing. Enable the Intents API on an agent; the agent submits transaction intents; the server signs in the HSM (or in Shroud’s TEE) and broadcasts. The private key never leaves the vault.
- **Treasury** tracks onchain multisig treasuries and lets agents request access for human approval.

**Task walkthroughs** (golden paths, CLI, MCP, Scaffold-Agent, billing, and more) live under **[Guides](/docs/category/guides)** in the sidebar.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  Vault API  │◀────│  MCP Server │
│  (Next.js)  │     │  (Rust)     │     │  (Node.js)  │
│  1claw.xyz  │     │ api.1claw.xyz     │ mcp.1claw.xyz
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
          ┌──────────┐ ┌──────┐ ┌──────────┐
          │ Supabase │ │ KMS  │ │  Audit   │
          │ Postgres │ │(keys)│ │  (log)   │
          └──────────┘ └──────┘ └──────────┘
```

- **Dashboard** — The web UI at [1claw.xyz](https://1claw.xyz) where humans manage vaults, secrets, agents, and policies.
- **Vault API** — The Rust backend that handles authentication, envelope encryption, policy enforcement, and all CRUD operations. Both the dashboard and MCP server talk to it.
- **Shroud** — Optional LLM proxy at [shroud.1claw.xyz](https://shroud.1claw.xyz); agents can send LLM traffic through Shroud for inspection and redaction. Transaction signing can also run in Shroud’s TEE.
- **MCP Server** — A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents (Claude, Cursor, GPT) just-in-time access to vault secrets and Intents. Hosted at `mcp.1claw.xyz` or run locally.

### How humans and agents interact

- **Humans** log in (email/password or Google) or use a personal API key (`1ck_`). They create vaults, store secrets at paths, register agents, and attach policies that grant agents (or users) read/write access to path patterns.
- **Agents** authenticate with an agent API key (`ocv_`) via `POST /v1/auth/agent-token` to get a short-lived JWT, then call the same API to list secrets and fetch secret values by path. Access is enforced by policies; all access is audited.

## Two APIs, one base URL

The same REST API serves both personas:

| Persona   | Auth                                                      | Typical operations                                                                       |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Human** | Email/password or Google → JWT; or personal API key → JWT | Create vaults, PUT/GET/DELETE secrets, create/list policies, register agents, audit logs |
| **Agent** | Agent API key → JWT via `/v1/auth/agent-token`            | GET secret by path, list secrets in a vault (subject to policies)                        |

Base URL: `https://api.1claw.xyz` (or your Cloud Run URL). The dashboard at [1claw.xyz](https://1claw.xyz) proxies `/api/v1/*` to the same API.

## How to navigate these docs

- **[Concepts](/docs/concepts/what-is-1claw)** — Vaults, secrets, policies, agents, HSM architecture, and [parts of 1claw](/docs/concepts/parts-of-1claw) (three products + Dashboard, API, MCP, CLI, SDK).
- **[Vault](/docs/human-api/overview)** — Quickstart, Human API, Agent API, MCP Server, and all vault-related guides (access control, rotation, CMEK, sharing, CLI, billing, troubleshooting).
- **[Shroud](/docs/guides/shroud)** — LLM proxy setup, supported providers (OpenAI, Anthropic, Google/Gemini, OpenRouter, etc.), threat detection, and vault-backed API keys.
- **[Intents](/docs/guides/intents-api)** — Enabling the Intents API, submitting transactions, guardrails, simulation, and supported chains.
- **[SDKs](/docs/sdks/overview)** — TypeScript/JavaScript, Python, and curl examples.
- **[Security](/docs/security/hsm-overview)** — HSM, key hierarchy, zero-trust, compliance.
- **[Reference](/docs/reference/api-reference)** — API reference, request pipeline, error codes, rate limits, [glossary](/docs/reference/glossary), changelog.

## Next steps

- [What is 1claw?](/docs/concepts/what-is-1claw) — Core concepts in more detail.
- [Parts of 1claw](/docs/concepts/parts-of-1claw) — Three products (Vault, Shroud, Intents) and how to use them (Dashboard, API, MCP, CLI, SDK).
- [Quickstart for humans](/docs/quickstart/humans) — Log in and store your first secret.
- [Quickstart for agents](/docs/quickstart/agents) — Get an agent token and fetch a secret.
- [Shroud](/docs/guides/shroud) — Route LLM traffic through Shroud for inspection and redaction.
- [Intents API](/docs/guides/intents-api) — Let agents sign transactions without seeing keys.
- [Glossary](/docs/reference/glossary) — Definitions of vault, secret, policy, agent, and other terms.
