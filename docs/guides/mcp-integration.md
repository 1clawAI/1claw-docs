---
title: MCP integration
description: Connect AI agents to your 1claw vault using the Model Context Protocol. Hosted at mcp.1claw.xyz or run locally via stdio.
sidebar_position: 4
---

# MCP Integration

The 1claw MCP server gives AI agents (Claude, Cursor, GPT, and others) secure, just-in-time access to secrets stored in your vault via the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick start (hosted)

The fastest way to connect an AI agent to your vault:

1. **Register an agent** in the [1claw dashboard](https://1claw.xyz/agents/new) — save the API key (`ocv_...`).
2. **Create a policy** granting the agent `read` access to the paths it needs.
3. **Configure your MCP client** with the hosted server:

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your-agent-token",
        "X-Vault-ID": "your-vault-uuid"
      }
    }
  }
}
```

That's it. The agent can now call `list_secrets`, `get_secret`, and other tools.

## Quick start (local)

For local/air-gapped setups, run the MCP server via stdio:

```bash
cd packages/mcp && pnpm install && pnpm run build
```

```json
{
  "mcpServers": {
    "1claw": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.js"],
      "env": {
        "ONECLAW_AGENT_TOKEN": "ocv_your-agent-token",
        "ONECLAW_VAULT_ID": "your-vault-uuid"
      }
    }
  }
}
```

## Available tools

| Tool | What it does |
|------|-------------|
| `list_secrets` | List all secrets (metadata only, never values) |
| `get_secret` | Fetch decrypted value by path |
| `put_secret` | Create or update a secret |
| `delete_secret` | Soft-delete a secret |
| `describe_secret` | Get metadata without the value |
| `rotate_and_store` | Store a new version of an existing secret |
| `get_env_bundle` | Fetch and parse a KEY=VALUE env bundle |

## Typical agent workflow

1. **Discover** — `list_secrets` to see what's available.
2. **Check** — `describe_secret` to verify it exists and hasn't expired.
3. **Fetch** — `get_secret` to get the decrypted value.
4. **Use** — Pass the value into the API call.
5. **Forget** — Do not store the value in summaries, logs, or memory.

## Security

- Secrets are fetched just-in-time and never cached by the MCP server.
- Secret values are never logged — only the path is recorded.
- Each hosted connection authenticates independently (per-session isolation).
- All access is recorded in the vault audit log.

## Further reading

- [MCP Server Overview](/docs/mcp/overview) — Architecture and how it works
- [Setup Guide](/docs/mcp/setup) — Detailed config for Claude Desktop, Cursor, and more
- [Tool Reference](/docs/mcp/tools) — Parameters, examples, and errors for each tool
- [Security Model](/docs/mcp/security) — Threat model and best practices
- [Deployment](/docs/mcp/deployment) — Deploy your own hosted MCP server
