---
title: Parts of 1claw
description: Three products (Vault, Shroud, Intents) and the ways to use them — Dashboard, API, MCP, CLI, SDK.
sidebar_position: 4
---

# Parts of 1claw

1claw is built around **three products** and several **ways to use them**. Pick by product first, then by interface.

## Three products

| Product | What it does |
|--------|----------------|
| **Vault** | Store and manage secrets. Human API, Agent API, and MCP give you just-in-time access. Dashboard, CLI, and SDK all talk to the same vault. |
| **Shroud** | LLM proxy: your agent sends requests to Shroud instead of directly to OpenAI, Anthropic, Google (Gemini), etc. Shroud inspects, redacts secrets, and blocks prompt injection before forwarding. |
| **Intents** | Let agents sign and broadcast blockchain transactions. The server signs in the HSM (or in Shroud’s TEE); the private key never leaves the vault. |

Vault is the foundation: Shroud and Intents extend it (Shroud for LLM traffic, Intents for on-chain transactions). You can use Vault only, or add Shroud and/or Intents per agent.

---

## Ways to use 1claw

### Vault API

**What it is:** The REST API that everything else talks to. Base URL: `https://api.1claw.co`. Handles auth, vaults, secrets, policies, agents, sharing, billing, and audit.

**When to use it:** When you're integrating 1claw into your own app, script, or service. You send HTTP requests with a Bearer token (JWT or API key). Use the [API reference](/docs/reference/api-reference) and the [OpenAPI spec](https://github.com/1clawAI/1claw-openapi-spec) for full details.

**You need:** A user JWT (from login or device flow) or a personal API key (`1ck_`), or an agent JWT (from `POST /v1/auth/agent-token` with an agent API key `ocv_`).

---

### Dashboard

**What it is:** The web UI at [1claw.co](https://1claw.co). Sign in with email/password or Google, then manage vaults, secrets, agents, policies, sharing, audit log, API keys, billing, and team. You can enable **Shroud** and **Intents** per agent and configure guardrails.

**When to use it:** For day-to-day setup and management — creating vaults, storing secrets, registering agents, granting access, configuring Shroud/Intents, viewing audit logs, and billing.

**You need:** An account (sign up at 1claw.co). Optional: MFA and API keys for extra security.

---

### Shroud (LLM proxy)

**What it is:** A proxy at [shroud.1claw.co](https://shroud.1claw.co). Your agent sends LLM requests to Shroud with `X-Shroud-Agent-Key` and `X-Shroud-Provider`; Shroud authenticates the agent, (optionally) pulls the provider API key from the vault, runs threat detection and secret redaction, then forwards to the upstream provider. Supports OpenAI, Anthropic, Google (Gemini), Mistral, Cohere, and OpenRouter.

**When to use it:** When you want to prevent prompt injection, redact secrets from prompts, or centralize provider API keys in the vault. See [Shroud](/docs/agents/shroud/overview).

**You need:** An agent with Shroud enabled; provider API key in the vault or sent via `X-Shroud-Api-Key`.

---

### Intents API

**What it is:** Endpoints for submitting and simulating transactions. The agent calls `POST /v1/agents/:id/transactions` with chain, recipient, value, and signing key path; the server signs and broadcasts. Optional: run in Shroud’s TEE for signing inside a confidential environment.

**When to use it:** When your agent needs to send on-chain transactions (transfers, contract calls) without ever holding the private key. See [Intents API](/docs/agents/intents/overview).

**You need:** An agent with `intents_api_enabled: true`; a signing key stored in a vault path the agent can read; policies that allow the agent to use that path.

---

### MCP Server

**What it is:** A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes 1claw as tools (e.g. `list_secrets`, `get_secret`, `put_secret`, `create_vault`, `share_secret`, `simulate_transaction`, `submit_transaction`). AI assistants (Claude, Cursor, GPT, etc.) call these tools so they can use secrets and submit transactions at runtime.

**When to use it:** When you want an AI agent to read or write secrets, create vaults, or sign transactions through 1claw. Configure your AI tool to use the 1claw MCP server (hosted at `mcp.1claw.co` or run locally). The agent uses its own API key; you control what it can do via policies.

**You need:** An agent registered in the dashboard (or via API), with policies that grant the agent access to the vaults and paths it needs. See [MCP Setup](/docs/vaults/mcp/setup) and [Give an agent access](/docs/vaults/golden-path).

---

### CLI

**What it is:** A command-line tool (`@1claw/cli`) for CI/CD, servers, and local scripts. Log in via browser (device flow) or with email/password, then run commands for vaults, secrets, agents, policies, and shares. Can inject secrets into env or run a command with secrets loaded.

**When to use it:** For scripts, cron jobs, deploy pipelines, or any environment where you want to pull secrets or run a process with secrets without building API calls yourself. Use `1claw env run -- your-command` to run a command with vault secrets as environment variables.

**You need:** Node.js 20+; install with `npm i -g @1claw/cli`. Then `1claw login` (device flow) or set `ONECLAW_TOKEN` / `ONECLAW_API_KEY`. See [CLI guide](/docs/integrations/cli).

---

### SDK

**What it is:** TypeScript/JavaScript client (`@1claw/sdk`) that wraps the REST API. Methods for auth, vaults, secrets, policies, agents, sharing, billing, audit, chains, and (for agents) transaction simulation and submission.

**When to use it:** When you're writing an app or service in Node/TS and want typed, high-level calls instead of raw `fetch`. Same auth as the API (user or agent token, or API key). Supports x402 payment flow if you need to pay per request.

**You need:** `npm i @1claw/sdk` or `pnpm add @1claw/sdk`. Configure with `baseUrl` and either a token or credentials to obtain one. See [JavaScript / TypeScript SDK](/docs/sdks/javascript).

---

### Mobile App (beta)

**What it is:** A companion app for iOS and Android (Expo/React Native) that gives humans a secure, always-available channel for approving irreversible agent actions. Supports passkey authentication, biometric unlock, and push notifications for real-time approval requests.

**When to use it:** When your agents perform high-risk or irreversible operations (e.g. large transactions, policy changes, secret deletion) and you want human-in-the-loop approval before they proceed. The app provides a queue of pending approval requests with risk-tier badges, and requires step-up authentication (biometric or passkey attestation) for critical decisions.

**You need:** The mobile app (available via TestFlight for iOS, beta). Log in with your 1claw credentials, register a passkey on the device, and your pending approvals will appear in real time via push notifications.

---

## How they fit together

| You are…                    | Best starting point        |
| --------------------------- | -------------------------- |
| A human setting things up   | **Dashboard**              |
| A human in a script/CI      | **CLI** or **SDK**         |
| A human approving agent ops | **Mobile App** (iOS/Android) |
| An AI agent (MCP client)    | **MCP Server** (hosted or local) |
| An agent calling LLMs       | **Shroud** (optional) + Vault |
| An agent signing txs        | **Intents API** + Vault   |
| A custom app or backend     | **SDK** or **Vault API**   |

All of them talk to the same Vault API and the same data. Create a vault in the dashboard, store a secret via the API or CLI, and an agent using MCP can read it — as long as you’ve granted that agent access with a policy. Enable Shroud so the agent’s LLM traffic is inspected; enable Intents so the agent can submit transactions without ever seeing the key.

For definitions of terms (vault, secret, policy, agent, etc.), see the [Glossary](/docs/reference/glossary). For common errors and fixes, see [Troubleshooting](/docs/guides/troubleshooting).
