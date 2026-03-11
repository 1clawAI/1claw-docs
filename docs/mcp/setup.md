---
title: MCP Setup Guide
description: Step-by-step instructions for installing and configuring the 1claw MCP server with Claude Desktop, Cursor, and other MCP clients.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Setup Guide

## Prerequisites

Before configuring the MCP server, you need:

1. **A 1claw account** — Sign up at [1claw.xyz](https://1claw.xyz)
2. **A vault** — Create one from the dashboard
3. **An agent** — Register an agent and save the API key (`ocv_...`)
4. **A policy** — Grant the agent read access to the secret paths it needs

## Option 1: Hosted server (recommended)

The simplest setup — no local installation needed. The hosted MCP server runs at `mcp.1claw.xyz` and authenticates per-connection with a **Bearer JWT**. You get the JWT by calling the 1claw API with your **agent ID** and **API key** (`ocv_...`):

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<your-agent-uuid>","api_key":"ocv_..."}' | jq -r '.access_token'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: "<your-agent-uuid>",
  apiKey: "ocv_...",
});
// The SDK manages token exchange and refresh automatically.
// For manual token retrieval:
const { data } = await client.auth.agentToken({
  agent_id: "<your-agent-uuid>",
  api_key: "ocv_...",
});
console.log(data.access_token);
```

</TabItem>
</Tabs>

Use the returned `access_token` as the Bearer value below. The token expires in about an hour; for long-lived use, your client may need to refresh it by calling the agent-token endpoint again.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer <jwt-from-agent-token-endpoint>",
        "X-Vault-ID": "your-vault-uuid-here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer <jwt-from-agent-token-endpoint>",
        "X-Vault-ID": "your-vault-uuid-here"
      }
    }
  }
}
```

### Claude Code

Claude Code uses the same MCP configuration as Cursor. Use either the **hosted** or **local (stdio)** config above (Cursor section). Then optionally [install the 1claw skill](/docs/guides/claude-code#2-optional-install-the-1claw-skill) so Claude knows when and how to use 1claw.

### Any MCP client

Any client that supports HTTP streaming can connect:

- **Endpoint:** `https://mcp.1claw.xyz/mcp`
- **Headers:** `Authorization: Bearer <jwt>` (from `POST /v1/auth/agent-token` with `agent_id` and `api_key`) and `X-Vault-ID: <vault-uuid>`

## Option 2: Local server (stdio)

Run the MCP server as a local process. Useful for development, air-gapped environments, or when you want full control. The server can use **agent ID + API key** (recommended; it exchanges them for a JWT and refreshes automatically) or a static **JWT** (expires in ~1 hour).

### Install

```bash
cd packages/mcp
pnpm install
pnpm run build
```

### Claude Desktop (recommended: agent ID + API key)

```json
{
  "mcpServers": {
    "1claw": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp/dist/index.js"],
      "env": {
        "ONECLAW_AGENT_ID": "your-agent-uuid",
        "ONECLAW_AGENT_API_KEY": "ocv_your_agent_api_key",
        "ONECLAW_VAULT_ID": "your-vault-uuid-here"
      }
    }
  }
}
```

### Cursor (recommended: agent ID + API key)

```json
{
  "mcpServers": {
    "1claw": {
      "command": "node",
      "args": ["./packages/mcp/dist/index.js"],
      "env": {
        "ONECLAW_AGENT_ID": "${env:ONECLAW_AGENT_ID}",
        "ONECLAW_AGENT_API_KEY": "${env:ONECLAW_AGENT_API_KEY}",
        "ONECLAW_VAULT_ID": "${env:ONECLAW_VAULT_ID}"
      }
    }
  }
}
```

Then set the environment variables in your shell:

```bash
export ONECLAW_AGENT_ID="your-agent-uuid"
export ONECLAW_AGENT_API_KEY="ocv_your_agent_api_key"
export ONECLAW_VAULT_ID="your-vault-uuid-here"
```

**Alternative (static JWT):** If you prefer to pass a token yourself, set `ONECLAW_AGENT_TOKEN` to a JWT from `POST /v1/auth/agent-token` (with `agent_id` and `api_key`). The token expires in about an hour; you must refresh it manually.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ONECLAW_AGENT_ID` | Yes* (stdio) | — | Agent UUID (from dashboard). Use with `ONECLAW_AGENT_API_KEY`. |
| `ONECLAW_AGENT_API_KEY` | Yes* (stdio) | — | Agent API key (`ocv_...`). Server exchanges for JWT and auto-refreshes. |
| `ONECLAW_AGENT_TOKEN` | Yes* (stdio) | — | Static JWT from `POST /v1/auth/agent-token` (alternative to ID + key; expires ~1 h). |
| `ONECLAW_VAULT_ID` | Yes (stdio) | — | UUID of the vault to operate on |
| `ONECLAW_BASE_URL` | No | `https://api.1claw.xyz` | Override for self-hosted vault |

\* Set either **`ONECLAW_AGENT_ID` + `ONECLAW_AGENT_API_KEY`** (recommended) or **`ONECLAW_AGENT_TOKEN`**.

## Verifying the connection

After configuration, ask your AI agent:

> "List the secrets in my 1claw vault."

The agent should call `list_secrets` and return the paths and metadata of your secrets. If you get an authentication error, verify your agent credentials (agent ID + API key, or JWT) and vault ID.

## Development tools

```bash
# Interactive CLI testing
pnpm dev

# MCP Inspector (browser UI for testing tools)
pnpm inspect
```
