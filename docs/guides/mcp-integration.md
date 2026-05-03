---
title: MCP integration
description: Connect AI agents to your 1claw vault using the Model Context Protocol. Hosted at mcp.1claw.xyz or run locally via stdio.
sidebar_position: 4
---

# MCP Integration

The 1claw MCP server gives AI agents (Claude, Cursor, GPT, and others) secure, just-in-time access to secrets stored in your vault via the [Model Context Protocol](https://modelcontextprotocol.io).

:::tip Try it out
Try out the examples in this repo: **[FastMCP Tool Server](https://github.com/1clawAI/1claw-examples/tree/main/fastmcp-tool-server)** (custom MCP server with domain tools) and **[LangChain Agent](https://github.com/1clawAI/1claw-examples/tree/main/langchain-agent)** (LangChain + 1Claw MCP tools).
:::

## Quick start (hosted)

The fastest way to connect an AI agent to your vault:

1. **Register an agent** in the [1claw dashboard](https://1claw.xyz/agents/new) — save the API key (`ocv_...`).
2. **Create a policy** granting the agent `read` access to the paths it needs.
3. **Configure your MCP client** with the hosted server using the agent API key directly:

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your_agent_api_key"
      }
    }
  }
}
```

That's it. The server automatically exchanges the API key for a short-lived JWT, refreshes it before expiry, and auto-discovers the vault when the agent is bound to exactly one. No manual token rotation needed.

:::tip Vault override
If the agent has access to multiple vaults, add `"X-Vault-ID": "your-vault-uuid"` to the headers to pick one explicitly.
:::

<details>
<summary>Legacy: using a pre-minted JWT</summary>

If you prefer to manage tokens yourself, exchange the API key for a JWT and pass it directly. Note that JWTs expire (~1 hour) and you'll need to refresh them manually.

```bash
curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<uuid>","api_key":"ocv_..."}' | jq -r '.access_token'
```

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer <jwt-from-agent-token-endpoint>",
        "X-Vault-ID": "your-vault-uuid"
      }
    }
  }
}
```

</details>

## Quick start (local)

For local/air-gapped setups, run the MCP server via stdio. Use **agent ID + API key** so the server can refresh the JWT automatically:

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
        "ONECLAW_AGENT_ID": "your-agent-uuid",
        "ONECLAW_AGENT_API_KEY": "ocv_your_agent_api_key",
        "ONECLAW_VAULT_ID": "your-vault-uuid"
      }
    }
  }
}
```

## Available tools

### Secrets

| Tool | What it does |
|------|-------------|
| `list_secrets` | List all secrets (metadata only, never values) |
| `get_secret` | Fetch decrypted value by path |
| `put_secret` | Create or update a secret (creates a new version) |
| `delete_secret` | Soft-delete a secret |
| `describe_secret` | Get metadata without the value |
| `rotate_and_store` | Store a new value for an existing secret (new version) |
| `rotate_generate` | Server-side rotation — generates a random value that never leaves the server |
| `list_versions` | List all versions of a secret with creation dates and disabled status |
| `get_env_bundle` | Fetch and parse a KEY=VALUE env bundle into JSON |

### Vaults & access

| Tool | What it does |
|------|-------------|
| `create_vault` | Create a new vault for organising secrets |
| `list_vaults` | List all vaults accessible to you |
| `grant_access` | Grant a user or agent access to a vault you own |
| `share_secret` | Share a specific secret with a user, agent, or your creator |

### Transactions (Intents API)

| Tool | What it does |
|------|-------------|
| `submit_transaction` | Sign and optionally broadcast an EVM transaction |
| `sign_transaction` | Sign without broadcasting — returns raw signed tx hex |
| `simulate_transaction` | Simulate a transaction via Tenderly (no signing) |
| `simulate_bundle` | Simulate a sequence of transactions in order |
| `list_transactions` | List recent transactions for the current agent |
| `get_transaction` | Get details of a specific transaction by ID |

### Security

| Tool | What it does |
|------|-------------|
| `inspect_content` | Scan text for injection, obfuscation, social engineering, and PII |

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
