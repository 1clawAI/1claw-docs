---
title: Setup by client
description: Connect 1claw to your preferred AI assistant or IDE — Claude Desktop, Cursor, Claude Code, OpenClaw, ChatGPT, or any MCP client.
sidebar_position: 1
---

# Setup by client

Use this page to jump to the right setup for your environment. Every path assumes you have a [1claw account](https://1claw.xyz), a vault, an **agent** (with API key), and a **policy** granting the agent access to the vault. See [Give an agent access](/docs/guides/give-agent-access) if you haven’t set that up yet.

## Quick reference

| Client | How to connect | Guide |
|--------|----------------|-------|
| **Claude Desktop** | MCP (hosted or local stdio) | [MCP Setup](/docs/mcp/setup) — Claude Desktop section |
| **Cursor** | MCP (hosted or local stdio) | [MCP Setup](/docs/mcp/setup) — Cursor section |
| **Claude Code** | MCP + optional 1claw skill | [Claude Code](/docs/guides/claude-code) |
| **OpenClaw** | 1claw skill via ClawHub | [Using 1claw with OpenClaw](/docs/guides/openclaw) |
| **ChatGPT / Custom GPTs** | REST API or Custom GPT Action | [ChatGPT & other API clients](/docs/guides/setup-by-client#chatgpt-and-other-api-clients) below |
| **Any MCP client** | Hosted URL or stdio | [MCP Setup](/docs/mcp/setup) — Option 1 or 2 |

## Claude Desktop

Configure the 1claw MCP server in Claude Desktop so the assistant can list and fetch secrets from your vault. Use either the **hosted** server (no local install) or a **local** stdio process.

**→ [MCP Setup Guide](/docs/mcp/setup)** — see the “Claude Desktop” sections for both options.

## Cursor

Add the 1claw MCP server to your project (e.g. `.cursor/mcp.json`) so Cursor’s AI can use vault secrets via MCP tools. Hosted or local stdio.

**→ [MCP Setup Guide](/docs/mcp/setup)** — see the “Cursor” sections.

## Claude Code

[Claude Code](https://code.claude.com) supports MCP and the same [Agent Skills](https://agentskills.io/) style skills as OpenClaw. To use 1claw from Claude Code:

1. **Connect via MCP** — Same configuration as Cursor (hosted or local). See [MCP Setup](/docs/mcp/setup).
2. **Optional: install the 1claw skill** — So Claude knows when and how to use 1claw (tools, auth, best practices). The same `SKILL.md` we use for OpenClaw works in Claude Code.

**→ [Setup 1claw with Claude Code](/docs/guides/claude-code)** for step-by-step MCP config and skill install.

## OpenClaw

If you run an [OpenClaw](https://docs.openclaw.ai) gateway (WhatsApp, Telegram, Discord, etc.), install the **1claw skill** via ClawHub. The skill teaches your OpenClaw agent to use the 1Claw vault (list, get, put, share secrets) via the 1Claw MCP server.

**→ [Using 1claw with OpenClaw](/docs/guides/openclaw)** — enrollment, `clawhub install 1claw`, and credentials.

## ChatGPT and other API clients

ChatGPT does not support MCP. To use 1claw from ChatGPT or similar tools you can:

- **REST API** — Use the [Agent API](/docs/agent-api/overview): get a JWT via `POST /v1/auth/agent-token` with your agent ID and API key, then call the vault endpoints (e.g. list secrets, get secret by path). Use from a Custom GPT **Action** (OpenAPI schema pointing at `https://api.1claw.xyz`) or from your own backend that proxies requests.
- **SDK** — Use [@1claw/sdk](https://www.npmjs.com/package/@1claw/sdk) in a small Node/TS service that your GPT or app calls.

We don’t yet have a dedicated “ChatGPT Custom GPT” step-by-step. If you build one, the same [agent quickstart](/docs/quickstart/agents) and [Agent API](/docs/agent-api/overview) apply.

## Any other MCP client

Any client that supports MCP over HTTP or stdio can connect:

- **Hosted:** `https://mcp.1claw.xyz/mcp` with headers `Authorization: Bearer <jwt>` and `X-Vault-ID: <vault-uuid>`. Get the JWT from `POST /v1/auth/agent-token`.
- **Local:** Run the [1claw MCP server](https://www.npmjs.com/package/@1claw/mcp) with env vars `ONECLAW_AGENT_ID`, `ONECLAW_AGENT_API_KEY`, `ONECLAW_VAULT_ID`.

**→ [MCP Setup](/docs/mcp/setup)** and [MCP integration](/docs/guides/mcp-integration) for details.
