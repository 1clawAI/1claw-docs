---
title: Introduction
description: 1claw is a cloud HSM secrets manager that lets humans grant AI agents scoped, audited, revocable access to secrets without exposing raw credentials.
sidebar_position: 0
---

# Introduction

1claw is a **cloud-hosted Hardware Security Module (HSM) secrets manager** for humans and AI agents. It lets you store API keys, tokens, and other credentials in a vault encrypted by keys that never leave the HSM. You control which agents can access which secrets, with what permissions, and for how long — and agents fetch secrets at runtime instead of holding them in context or environment.

## The problem 1claw solves

AI agents often need secrets (API keys, tokens, DB credentials) to call external services. If you paste a secret into a chat or put it in an agent's environment, it can be logged, leaked, or retained. 1claw keeps secrets in an HSM-backed vault and gives agents **scoped, audited, revocable** access: the agent authenticates to 1claw and requests a secret by path; 1claw returns the decrypted value only if the agent is allowed. The agent never stores the secret; you can revoke access or rotate the secret at any time.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  Vault API  │◀────│  MCP Server │
│  (Next.js)  │     │  (Rust)     │     │  (Node.js)  │
│  1claw.xyz  │     │ api.1claw.xyz│    │mcp.1claw.xyz│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
          ┌──────────┐ ┌──────┐ ┌──────────┐
          │ Supabase │ │ KMS  │ │  Audit   │
          │ Postgres │ │(keys)│ │  (log)   │
          └──────────┘ └──────┘ └──────────┘
```

- **Dashboard** — The web UI at [1claw.xyz](https://1claw.xyz) where humans manage vaults, secrets, agents, and policies. After you sign in, the left sidebar gives you: **Dashboard**, **Vaults**, **Agents**, **Sharing**, **Audit Log**, **Security**, **API Keys**, **Billing**, and **Team**.
- **Vault API** — The Rust backend that handles authentication, envelope encryption, policy enforcement, and all CRUD operations. Both the dashboard and MCP server talk to it.
- **MCP Server** — A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents (Claude, Cursor, GPT) just-in-time access to vault secrets. Available hosted at `mcp.1claw.xyz` or as a local stdio process.

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

## What you'll find in these docs

- **Concepts** — Vaults, secrets, policies, agents, HSM architecture.
- **Quickstart** — Get a token (human or agent) and read/write a secret.
- **Human API** — Every endpoint for vaults, secrets, policies, agents, billing, audit.
- **Agent API** — Auth and fetching secrets; same endpoints with agent JWT.
- **MCP Server** — Give AI agents (Claude, Cursor, GPT) direct access to secrets via the Model Context Protocol. Hosted at `mcp.1claw.xyz` or run locally.
- **SDKs** — TypeScript/JavaScript and curl examples.
- **Guides** — Give an agent access, rotate secrets, revoke access, billing & usage, deploying updates, audit.
- **Security** — HSM, key hierarchy, zero-trust, compliance.
- **Reference** — Error codes, rate limits, changelog.

## Next steps

- [What is 1claw?](/docs/concepts/what-is-1claw) — Core concepts in more detail.
- [Quickstart for humans](/docs/quickstart/humans) — Log in and store your first secret.
- [Quickstart for agents](/docs/quickstart/agents) — Get an agent token and fetch a secret.
- [MCP Server](/docs/mcp/overview) — Connect AI agents to your vault via MCP.
