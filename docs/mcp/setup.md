---
title: MCP Setup Guide
description: Step-by-step instructions for installing and configuring the 1claw MCP server with Claude Desktop, Cursor, and other MCP clients.
sidebar_position: 1
---

# Setup Guide

## Prerequisites

Before configuring the MCP server, you need:

1. **A 1claw account** — Sign up at [1claw.xyz](https://1claw.xyz)
2. **A vault** — Create one from the dashboard
3. **An agent** — Register an agent and save the API key (`ocv_...`)
4. **A policy** — Grant the agent read access to the secret paths it needs

## Option 1: Hosted server (recommended)

The simplest setup — no local installation needed. The hosted MCP server runs at `mcp.1claw.xyz` and authenticates per-connection.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your-agent-token-here",
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
        "Authorization": "Bearer ocv_your-agent-token-here",
        "X-Vault-ID": "your-vault-uuid-here"
      }
    }
  }
}
```

### Any MCP client

Any client that supports HTTP streaming can connect:

- **Endpoint:** `https://mcp.1claw.xyz/mcp`
- **Headers:** `Authorization: Bearer <agent-token>` and `X-Vault-ID: <vault-uuid>`

## Option 2: Local server (stdio)

Run the MCP server as a local process. Useful for development, air-gapped environments, or when you want full control.

### Install

```bash
cd packages/mcp
pnpm install
pnpm run build
```

### Claude Desktop

```json
{
  "mcpServers": {
    "1claw": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp/dist/index.js"],
      "env": {
        "ONECLAW_AGENT_TOKEN": "ocv_your-agent-token-here",
        "ONECLAW_VAULT_ID": "your-vault-uuid-here"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "1claw": {
      "command": "node",
      "args": ["./packages/mcp/dist/index.js"],
      "env": {
        "ONECLAW_AGENT_TOKEN": "${env:ONECLAW_AGENT_TOKEN}",
        "ONECLAW_VAULT_ID": "${env:ONECLAW_VAULT_ID}"
      }
    }
  }
}
```

Then set the environment variables in your shell:

```bash
export ONECLAW_AGENT_TOKEN="ocv_your-agent-token-here"
export ONECLAW_VAULT_ID="your-vault-uuid-here"
```

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ONECLAW_AGENT_TOKEN` | Yes (stdio) | — | Agent API key (`ocv_...`) |
| `ONECLAW_VAULT_ID` | Yes (stdio) | — | UUID of the vault to operate on |
| `ONECLAW_BASE_URL` | No | `https://api.1claw.xyz` | Override for self-hosted vault |

## Verifying the connection

After configuration, ask your AI agent:

> "List the secrets in my 1claw vault."

The agent should call `list_secrets` and return the paths and metadata of your secrets. If you get an authentication error, verify your agent token and vault ID.

## Development tools

```bash
# Interactive CLI testing
pnpm dev

# MCP Inspector (browser UI for testing tools)
pnpm inspect
```
