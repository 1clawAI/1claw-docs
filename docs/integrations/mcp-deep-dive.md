---
title: "MCP for AI coding tools"
description: Connect any AI coding tool (Cursor, Claude Desktop, VS Code Copilot, Windsurf, Claude Code) to 1claw via MCP for agent-driven secret management and transactions.
sidebar_position: 59
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# MCP for AI Coding Tools

The [Model Context Protocol](https://modelcontextprotocol.io) (MCP) is a standard for connecting AI tools to external data sources and actions. 1claw ships an MCP server that exposes vault operations, transaction signing, and more as tools that any MCP-compatible AI assistant can call.

This guide goes beyond the [basic MCP setup](/docs/integrations/mcp-integration) to cover configuration for specific tools, security best practices, and advanced usage patterns.

:::tip Already set up?
If you just need the quick config, see [MCP integration](/docs/integrations/mcp-integration). This guide covers deeper integration patterns and per-client configuration.
:::

## Supported AI tools

| Tool | Transport | Config location |
|------|-----------|-----------------|
| Claude Desktop | HTTP streaming | `~/.claude/claude_desktop_config.json` |
| Cursor | HTTP streaming | `.cursor/mcp.json` (project) or global settings |
| VS Code (Copilot) | HTTP streaming | `.vscode/mcp.json` |
| Claude Code | HTTP streaming | `~/.claude/claude_code_config.json` |
| Windsurf | HTTP streaming | `.windsurf/mcp.json` |
| Zed | HTTP streaming | `settings.json` |

## Automatic setup with the CLI

The fastest path is `1claw setup`. It detects installed AI clients and configures MCP for each one:

```bash
brew install 1clawAI/tap/oneclaw
1claw setup
```

This creates an agent, vault, and policy if you do not have them, then writes MCP config files for every detected client. You can target a specific client:

```bash
1claw setup --client cursor
1claw setup --client claude-desktop
1claw setup --client vscode
```

To use an existing agent key:

```bash
1claw setup --agent-key ocv_your_existing_key
```

## Manual configuration

### Hosted MCP server (recommended)

The hosted server at `mcp.1claw.xyz` requires no local setup. Configure your AI tool to connect:

<Tabs groupId="ai-tool">
<TabItem value="cursor" label="Cursor">

Create or edit `.cursor/mcp.json` in your project root:

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

</TabItem>
<TabItem value="claude-desktop" label="Claude Desktop">

Edit `~/.claude/claude_desktop_config.json`:

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

</TabItem>
<TabItem value="vscode" label="VS Code">

Create or edit `.vscode/mcp.json`:

```json
{
  "servers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your_agent_api_key"
      }
    }
  }
}
```

</TabItem>
<TabItem value="claude-code" label="Claude Code">

```bash
claude mcp add 1claw \
  --transport http \
  --url https://mcp.1claw.xyz/mcp \
  --header "Authorization: Bearer ocv_your_agent_api_key"
```

</TabItem>
</Tabs>

### Local MCP server (stdio)

Run the MCP server locally for lower latency or air-gapped environments:

```bash
npm install -g @1claw/mcp
```

<Tabs groupId="ai-tool">
<TabItem value="cursor" label="Cursor">

```json
{
  "mcpServers": {
    "1claw": {
      "command": "npx",
      "args": ["-y", "@1claw/mcp"],
      "env": {
        "ONECLAW_AGENT_API_KEY": "ocv_your_agent_api_key"
      }
    }
  }
}
```

</TabItem>
<TabItem value="claude-desktop" label="Claude Desktop">

```json
{
  "mcpServers": {
    "1claw": {
      "command": "npx",
      "args": ["-y", "@1claw/mcp"],
      "env": {
        "ONECLAW_AGENT_API_KEY": "ocv_your_agent_api_key"
      }
    }
  }
}
```

</TabItem>
</Tabs>

### Local daemon mode (offline-capable)

For fully local operation with encrypted secret storage:

```bash
1claw local init         # initialize local vault
1claw daemon start       # start the daemon
1claw setup --local      # configure AI clients for local mode
```

In local mode, the MCP server connects to the daemon via Unix socket. Secrets are stored in an AES-256-GCM encrypted file at `~/.config/1claw/local-vault.enc`. No network calls to the 1claw API unless you explicitly sync.

## Available MCP tools

When connected, your AI assistant has access to these tools:

| Tool | Description |
|------|-------------|
| `list_secrets` | List secrets in the vault |
| `get_secret` | Fetch a secret value |
| `put_secret` | Store a secret |
| `delete_secret` | Delete a secret |
| `create_vault` | Create a new vault |
| `list_vaults` | List available vaults |
| `grant_access` | Create an access policy |
| `submit_transaction` | Sign and broadcast a transaction |
| `sign_transaction` | Sign without broadcasting (BYORPC) |
| `simulate_transaction` | Run a Tenderly simulation |
| `list_signing_keys` | List provisioned signing keys |
| `provision_signing_key` | Provision a new signing key |
| `sign_message` | EIP-191 personal_sign |
| `sign_typed_data` | EIP-712 typed data signing |
| `rotate_generate` | Server-side secret rotation |
| `get_env_bundle` | Fetch multiple secrets as env vars |
| `inspect_content` | Run content through Shroud inspection |

## Security considerations

### Exfiltration protection

The MCP server defaults to `block` mode for exfiltration protection. If a tool response contains what looks like a secret being exfiltrated (e.g., the AI tries to include a private key in a response to the user), the server blocks it.

To switch to warn mode (logs but does not block):

```bash
ONECLAW_MCP_EXFIL_PROTECTION=warn
```

### Secret caching

The MCP server caches secrets for 5 minutes with a 1000-entry LRU limit. This reduces API calls but means recently rotated secrets may be stale for up to 5 minutes.

### Agent scope

The MCP server respects the agent's policies. If the agent does not have a policy granting read access to a path, `get_secret` returns a 403. Configure policies carefully to follow least-privilege.

### Rate limiting

The hosted MCP server enforces 60 requests per minute per IP on the HTTP streaming transport. For higher throughput, run the local server.

## Usage patterns

### Fetch secrets during development

Ask your AI assistant:

> "Get the Stripe API key from the vault and use it to list recent charges"

The assistant calls `get_secret` to fetch the key, then uses it in a subsequent API call. The key stays within the tool context and is not persisted in your code.

### Sign transactions from the IDE

> "Sign and broadcast a transaction sending 0.001 ETH to 0xdead...beef on Sepolia"

The assistant calls `submit_transaction` with the parameters. 1claw signs server-side and returns the tx hash.

### Rotate credentials

> "Rotate the database password in the vault at db/postgres-password and generate a new 32-character alphanumeric value"

The assistant calls `rotate_generate` with the path and charset parameters.

## Further reading

- [MCP integration](/docs/integrations/mcp-integration) for the basic setup guide
- [MCP tools reference](/docs/vaults/mcp/tools) for detailed tool documentation
- [MCP security](/docs/vaults/mcp/security) for security model details
- [CLI guide](/docs/integrations/cli) for `1claw setup` options
