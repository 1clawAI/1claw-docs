---
title: 1claw OpenClaw Plugin
description: Install and configure the official OpenClaw gateway plugin for native 1claw tools, secret redaction, Shroud routing, and slash commands.
sidebar_position: 8
---

# 1claw OpenClaw Plugin

The **@1claw/openclaw-plugin** runs inside your OpenClaw gateway. It adds native 1claw tools, secret redaction, optional secret injection, Shroud TEE routing, key-rotation monitoring, and slash commands. No separate MCP process is required for the tools this plugin provides.

Use it when your agent lives in OpenClaw and you want vault access, signing, and LLM inspection in one install. For a lighter setup that only teaches the agent how to use 1claw via an external MCP server, see [Using 1claw with OpenClaw](/docs/integrations/openclaw) (skill-only path).

**Repository:** [github.com/1clawAI/1claw-openclaw-plugin](https://github.com/1clawAI/1claw-openclaw-plugin)  
**npm:** [@1claw/openclaw-plugin](https://www.npmjs.com/package/@1claw/openclaw-plugin)

---

## What the plugin provides

| Feature | Default | Description |
|--------|---------|-------------|
| **Native agent tools** | On | 13 tools: secrets, vaults, policies, sharing, EVM simulate/submit. Prefix: `oneclaw_*`. |
| **Secret redaction** | On | Scans outbound messages and redacts leaked secret values before they leave the gateway. |
| **Secret injection** | Off | Replaces `{{1claw:path/to/secret}}` placeholders with real values at prompt time. |
| **Shroud routing** | Off | When the agent has `shroud_enabled`, routes LLM traffic through [Shroud](https://shroud.1claw.co). |
| **Key rotation monitor** | Off | Background service that warns when secrets expire within 7 days. |
| **Slash commands** | On | `/oneclaw`, `/oneclaw-list`, `/oneclaw-rotate`. |
| **Gateway RPC** | — | `1claw.status` for programmatic health/status. |
| **Bundled skill** | — | 1claw skill (`skills/1claw/SKILL.md`) is auto-discovered by OpenClaw. |

All of these are configurable via `plugins.entries.1claw.config.features`.

---

## Install

From your OpenClaw environment:

```bash
openclaw plugins install @1claw/openclaw-plugin
```

Restart the OpenClaw Gateway after install. The plugin is enabled by default; configure it under `plugins.entries.1claw.config` (see [Config](#config) below).

To install from a local path (e.g. the [1claw submodule](https://github.com/1clawAI/1claw) or a clone of the plugin repo):

```bash
openclaw plugins install -l ./path/to/1claw-openclaw-plugin
```

---

## Config

Minimal config: set the agent API key (from [enrollment](/docs/agents/self-enrollment) or the [dashboard](https://1claw.co/agents)) in the plugin config or via environment variables.

### Config file

In your OpenClaw config (e.g. `config.json5` or the file your gateway loads):

```json5
{
  plugins: {
    entries: {
      "1claw": {
        enabled: true,
        config: {
          apiKey: "ocv_..."
          // Optional: agentId, vaultId, baseUrl, shroudUrl
          // Optional: features: { tools: true, secretRedaction: true, slashCommands: true, ... }
          // Optional: securityMode: "block" | "surgical" | "log_only"
        }
      }
    }
  }
}
```

### Environment variables

You can rely on env vars instead of (or as fallback for) the config file:

| Variable | Description |
|----------|-------------|
| `ONECLAW_AGENT_API_KEY` | Agent API key (`ocv_...`). Required. |
| `ONECLAW_AGENT_ID` | Agent UUID. Optional; resolved from the key if omitted. |
| `ONECLAW_VAULT_ID` | Default vault UUID. Optional; auto-discovered from the token response or first vault. |
| `ONECLAW_BASE_URL` | 1claw API base URL. Default: `https://api.1claw.co`. |
| `ONECLAW_SHROUD_URL` | Shroud proxy URL. Default: `https://shroud.1claw.co`. |
| `ONECLAW_MCP_SANITIZATION_MODE` | Security mode for tool input inspection: `block`, `surgical`, or `log_only`. Default: `block`. |

Config file values take precedence over env vars.

---

## Enabling tools for your agent

When the plugin’s **tools** feature is on, it registers tools with an `oneclaw_` prefix (e.g. `oneclaw_list_secrets`, `oneclaw_get_secret`, `oneclaw_put_secret`). To allow your OpenClaw agent to call them, add the plugin or specific tool names to the agent’s tool allowlist in your config, for example:

```json5
agents: {
  list: [{
    id: "main",
    tools: {
      allow: ["1claw"]   // all 1claw plugin tools
      // or list specific tools: ["oneclaw_list_secrets", "oneclaw_get_secret", ...]
    }
  }
}
```

See [OpenClaw plugin docs](https://docs.openclaw.ai/tools/plugin) for the full tool-allowlist syntax.

---

## Slash commands

When **slash commands** are enabled, the plugin registers:

| Command | Description |
|--------|-------------|
| `/oneclaw` | Connection status, vault info, token TTL, and which features are on. |
| `/oneclaw-list` | List secret paths in the vault (metadata only). Optional argument: path prefix. |
| `/oneclaw-rotate <path> <new-value>` | Rotate a secret at `path` to a new value. |

These run without invoking the AI agent. Require auth by default.

---

## Gateway RPC

The plugin registers a single RPC method for programmatic checks:

- **`1claw.status`** — Returns authentication state, agent ID, vault ID, token TTL, vault count, enabled features, and security mode. Useful for health checks or admin tooling.

See [OpenClaw Gateway RPC](https://docs.openclaw.ai) for how to call it from your stack.

---

## Feature toggles

To turn features on or off, set `plugins.entries.1claw.config.features`:

```json5
{
  plugins: {
    entries: {
      "1claw": {
        enabled: true,
        config: {
          apiKey: "ocv_...",
          features: {
            tools: true,
            secretRedaction: true,
            secretInjection: false,
            shroudRouting: false,
            keyRotationMonitor: false,
            slashCommands: true
          }
        }
      }
    }
  }
}
```

- **Secret injection** and **Shroud routing** modify prompt or provider behavior; they can also be restricted by the operator via `plugins.entries.1claw.hooks.allowPromptInjection: false` if needed.
- **Key rotation monitor** runs a background job that lists secrets and logs warnings for any expiring within 7 days.

---

## Security and tool input inspection

The plugin runs the same threat checks as the [1claw MCP server](/docs/vaults/mcp/security) on tool inputs (command injection, encoding obfuscation, social-engineering patterns, etc.). The mode is controlled by `plugins.entries.1claw.config.securityMode` or `ONECLAW_MCP_SANITIZATION_MODE`:

- **`block`** (default) — Reject tool calls when high/critical threats are detected.
- **`surgical`** — Normalize Unicode and confusables where possible; still block on critical.
- **`log_only`** — Log threats but do not block.

---

## Plugin vs skill-only

| | **Plugin** (@1claw/openclaw-plugin) | **Skill only** (e.g. clawhub install 1claw) |
|---|--------------------------------------|---------------------------------------------|
| **Install** | `openclaw plugins install @1claw/openclaw-plugin` | `clawhub install 1claw` (or add skill manually) |
| **Tools** | Native gateway tools (`oneclaw_*`) in-process | Uses 1claw MCP server (stdio or hosted); agent calls MCP tools |
| **Redaction / injection** | Built-in hooks | Not provided by the skill |
| **Shroud routing** | Built-in when agent has `shroud_enabled` | Configure separately if needed |
| **Slash commands** | `/oneclaw`, `/oneclaw-list`, `/oneclaw-rotate` | None |
| **Best for** | Full 1claw integration inside OpenClaw | Simple “agent knows how to use 1claw” with minimal gateway changes |

You can use the plugin and still point the agent at an external MCP server for other tools; the plugin simply adds native 1claw capabilities and optional safety (redaction, Shroud) inside the gateway.

---

## Next steps

- [Using 1claw with OpenClaw](/docs/integrations/openclaw) — Skill-only setup and credential configuration.
- [OpenClaw Plugins](https://docs.openclaw.ai/tools/plugin) — Plugin system reference.
- [MCP Server](/docs/vaults/mcp/overview) — 1claw MCP tools and when to use them alongside or instead of the plugin.
- [Give an agent access](/docs/vaults/golden-path) — Policies so the agent can access the right vault and paths.
