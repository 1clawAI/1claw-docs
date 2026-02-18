---
title: MCP Server Overview
description: The 1claw MCP server gives AI agents secure, just-in-time access to secrets via the Model Context Protocol. Available as a hosted service or local stdio process.
sidebar_position: 0
---

# MCP Server

The **1claw MCP server** (`@1claw/mcp`) implements the [Model Context Protocol](https://modelcontextprotocol.io) to give AI agents secure, just-in-time access to secrets stored in a 1claw vault.

Secrets are fetched at runtime and never persisted in the LLM context window beyond the moment they are used.

## How it works

```
┌──────────────┐         MCP protocol          ┌──────────────┐
│  AI Agent    │ ◀─────────────────────────────▶│  1claw MCP   │
│  (Claude,    │   list_secrets, get_secret,    │  Server      │
│   Cursor,    │   put_secret, rotate_and_store │              │
│   GPT, etc.) │                                └──────┬───────┘
└──────────────┘                                       │
                                                       │ HTTPS
                                                       ▼
                                                ┌──────────────┐
                                                │  Vault API   │
                                                │ api.1claw.xyz│
                                                └──────────────┘
```

1. The AI agent calls an MCP tool (e.g. `get_secret`).
2. The MCP server authenticates with the vault API using an agent token.
3. The vault returns the decrypted secret value.
4. The MCP server passes the value back to the agent.
5. The agent uses the secret and discards it.

## Transport modes

| Mode | Use case | Auth | URL |
|------|----------|------|-----|
| **stdio** | Local — Claude Desktop, Cursor, any MCP client | Env vars | N/A (runs locally) |
| **httpStream** | Hosted — any MCP client with HTTP streaming support | Per-request headers | `https://mcp.1claw.xyz/mcp` |

## Tools

| Tool | Description | Read/Write |
|------|-------------|------------|
| `list_secrets` | List all secrets in the vault (metadata only, never values) | Read |
| `get_secret` | Fetch the decrypted value of a secret by path | Read |
| `put_secret` | Create or update a secret (creates a new version) | Write |
| `delete_secret` | Soft-delete a secret at a given path | Write |
| `describe_secret` | Get metadata (type, version, expiry) without fetching the value | Read |
| `rotate_and_store` | Store a new value for an existing secret and return the new version | Write |
| `get_env_bundle` | Fetch an `env_bundle` secret and parse its KEY=VALUE lines as JSON | Read |

## Resources

| URI | Description |
|-----|-------------|
| `vault://secrets` | Browsable listing of all secret paths (metadata only, no values) |

## Next steps

- [Setup Guide](/docs/mcp/setup) — Install and configure the MCP server
- [Tool Reference](/docs/mcp/tools) — Detailed documentation for each tool
- [Security](/docs/mcp/security) — Security model and best practices
- [Deployment](/docs/mcp/deployment) — Deploy the hosted MCP server
