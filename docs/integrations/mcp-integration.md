---
title: MCP integration
description: Connect AI agents to your 1claw vault using the Model Context Protocol. Hosted at mcp.1claw.co or run locally via stdio.
sidebar_position: 4
---

# MCP Integration

The 1claw MCP server connects AI clients (Claude, Cursor, GPT, and others) to your vault through the [Model Context Protocol](https://modelcontextprotocol.io). Secrets are fetched at tool-call time, not pasted into system prompts or config files.

This is the fastest path for IDE agents: register an agent in the dashboard, grant read access to the paths it needs, and point your MCP client at `mcp.1claw.co` with the agent API key. The server exchanges the key for a short-lived JWT, refreshes it automatically, and discovers the vault when the agent is bound to one.

For local-only security inspection (no vault account), run the MCP server in `ONECLAW_LOCAL_ONLY` mode. For secrets that never leave your laptop, use [local daemon mode](/docs/integrations/cli#local-daemon-secret-proxy) with `ONECLAW_LOCAL_VAULT=true`.

:::tip Try it out
Try out the examples in this repo: **[FastMCP Tool Server](https://github.com/1clawAI/1claw-examples/tree/main/fastmcp-tool-server)** (custom MCP server with domain tools) and **[LangChain Agent](https://github.com/1clawAI/1claw-examples/tree/main/langchain-agent)** (LangChain + 1Claw MCP tools).
:::

## Quick start (hosted)

The fastest way to connect an AI agent to your vault:

1. **Register an agent** in the [1claw dashboard](https://1claw.co/agents/new) — save the API key (`ocv_...`).
2. **Create a policy** granting the agent `read` access to the paths it needs.
3. **Configure your MCP client** with the hosted server using the agent API key directly:

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.co/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your_agent_api_key"
      }
    }
  }
}
```

That's it. The server automatically exchanges the API key for a short-lived JWT, refreshes it before expiry, and auto-discovers the vault when the agent is bound to exactly one. No manual token rotation needed.

For OIDC, MCP server cards, auth.md, x402, and other machine-readable endpoints, see [Agent discovery](/docs/integrations/agent-discovery) and [1claw.co/for-ai](https://1claw.co/for-ai).

:::tip Vault override
If the agent has access to multiple vaults, add `"X-Vault-ID": "your-vault-uuid"` to the headers to pick one explicitly.
:::

<details>
<summary>Legacy: using a pre-minted JWT</summary>

If you prefer to manage tokens yourself, exchange the API key for a JWT and pass it directly. Note that JWTs expire (~15 minutes by default) and you'll need to refresh them manually.

```bash
curl -s -X POST https://api.1claw.co/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<uuid>","api_key":"ocv_..."}' | jq -r '.access_token'
```

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.co/mcp",
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

For local setups, run the MCP server via stdio. Only `ONECLAW_AGENT_API_KEY` is needed — the server auto-discovers the agent ID and vault, and handles JWT refresh:

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

Or auto-configure with the CLI: `1claw setup --client cursor` (or `--client claude`).

## Quick start (local daemon — offline, zero-knowledge)

For fully offline use where the model should never see secret values:

```json
{
  "mcpServers": {
    "1claw": {
      "command": "npx",
      "args": ["-y", "@1claw/mcp"],
      "env": {
        "ONECLAW_LOCAL_VAULT": "true"
      }
    }
  }
}
```

Or auto-configure: `1claw setup --local --client cursor`. The model gets `list_secrets` (names only) and `proxy_request` (inject a secret into an HTTP call without exposing the value). See [Local Vault & Daemon](/docs/integrations/cli#local-vault-offline-encrypted) for setup.

## Toolsets — what a session actually sees

The server ships 156 tools, but a session is only offered the **toolsets its agent is entitled to**. A vault-only agent sees ~24 tools; an agent with intents and execution enabled sees ~50. The MCP configuration is unchanged — the shaping comes from the agent's own flags in the dashboard.

| Toolset | Offered when | What's in it |
| --- | --- | --- |
| `inspect` | always | `inspect_content` |
| `vault` | any agent | secrets, versions, rotation, env bundles, vaults, sharing, connected accounts |
| `approvals` | any agent | `request_approval`, `get_approval_status`, `get_approval`, `list_approvals`, `list_pending_approvals` |
| `intents` | agent has **Intents API** enabled | signing, simulation, submission, signing keys, portfolio, Safe accounts |
| `execute` | agent has **Execution Intents** enabled | bindings, `execute_http`, `execute_intent`, executions, connectors |
| `cards` | agent has **Cards** enabled | cards and gift cards |
| `memory` | agent has **Memory** enabled | memory tools + `get_peer_context` |
| `channels` | agent has **Shroud** enabled | Telegram / WhatsApp / Discord channels |
| `directory` | agent is **discoverable** | agent directory + job board |
| `treasury`, `delegation`, `chat`, `automations`, `runtimes`, `notification` | opt-in only | no per-agent flag exists for these — request them explicitly |
| `admin` | never on an agent session | human-only endpoints (policies, sub-orgs, approval votes, Safe migration) |
| `platform` | never | `plt_` endpoints; the MCP server does not accept platform keys |

**Requesting toolsets.** Over stdio set `ONECLAW_MCP_TOOLSETS`; hosted, send the `X-1Claw-Toolsets` header. Both take a comma list (`vault,intents,automations`) or `all`. A request can narrow the defaults or opt into the opt-in sets; it never adds a toolset the agent is not entitled to, and `all` still excludes `admin` and `platform`.

**`execution_require_tee`.** When this flag is on, the vault refuses to return secret *values* to the agent outside a TEE, so `get_secret`, `get_env_bundle` and `resolve_env` are hidden. Writes and metadata (`put_secret`, `rotate_and_store`, `rotate_generate`, `describe_secret`, `list_secrets`, `list_versions`) remain.

**Keeping up with flag changes.** Hosted sessions re-check entitlements every 15 minutes and immediately after a `403` from the vault, then send `notifications/tools/list_changed` so the client re-lists. Over stdio the toolset is fixed at startup — restart the MCP server after changing an agent's flags.

**Degraded lookups.** Each session logs `toolsets=… lookup=full|jwt_only|failed`. `jwt_only` means only the flags carried in the signed token were honoured (intents, execute, shroud); `failed` means the agent defaults were used. A degraded lookup only ever narrows what is offered.

## Available tools

The groups below list every tool; which ones a given agent sees is decided by the toolsets above.

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
| `resolve_env` | Resolve per-key env vars for a vault and environment (precedence applied). Omit `environment` when the agent has `env_auto_resolve: true` |

### Environment variables (v0.51)

Per-key encrypted env vars on vaults replace path-based `config/prod/*` bundles for deployment configs. See [Environment Variables](/docs/guides/environment-variables). Agents with `env_auto_resolve: true` can call `resolve_env` without specifying an environment — the server uses the agent's JWT `environment` claim.

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

### Signing keys

| Tool | What it does |
|------|-------------|
| `provision_signing_key` | Generate a multi-chain signing key (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron) |
| `list_signing_keys` | List all active signing keys for an agent |
| `sign_message` | EIP-191 personal_sign with an agent's signing key |
| `sign_typed_data` | EIP-712 typed data signing with domain-aware hashing |

### Platform

| Tool | What it does |
|------|-------------|
| `platform_list_apps` | List platform apps in the org |
| `platform_create_app` | Register a new platform app |
| `platform_bootstrap_user` | Provision resources from a bootstrap template |
| `platform_reissue_claim` | Mint a fresh claim URL for a bootstrapped connection |
| `platform_rotate_key` | Rotate a platform app's `plt_` API key |

### Treasury

| Tool | What it does |
|------|-------------|
| `treasury_propose` | Create a Safe multisig proposal |
| `treasury_sign_proposal` | Approve or reject with an EIP-712 signature |
| `treasury_list_proposals` | List proposals filtered by status |

### Approvals

| Tool | What it does |
|------|-------------|
| `request_approval` | Ask a human to approve a policy change or sensitive action |
| `list_approvals` | List approval requests by status |
| `get_approval` | Poll a specific approval request |

### Bankr

| Tool | What it does |
|------|-------------|
| `lease_bankr_key` | Lease a scoped Bankr wallet API key (metadata only — key never in tool output) |
| `spend_from_passkey_safe` | Spend from a human's passkey-owned Safe under an on-chain Allowance Module grant (cap enforced by the module; guardrails + sanctions first) |

### Safe accounts & guardrail governance (v0.56+)

| Tool | What it does |
|------|-------------|
| `list_agent_accounts` | List agent EOA/Safe accounts per chain |
| `migrate_agent_to_safe` | Build EOA→Safe migration plan (human-only) |
| `deprecate_agent_eoa` | Deprecate agent EOA signing path (human-only) |
| `get_safe_module_registry` | Pinned Safe/Zodiac module addresses (public) |
| `sync_org_safe_allowances` | Org allowance reconciliation report (owner/admin) |
| `get_guardrail_shadow_report` | Convention 6 shadow would-deny aggregate |
| `list_guardrail_revisions` | Guardrail change audit trail |
| `replay_agent_guardrails` | Dry-run draft guardrails against recent txs |

### Security

| Tool | What it does |
|------|-------------|
| `inspect_content` | Scan text for injection, obfuscation, social engineering, and PII |

### Local daemon mode

| Tool | What it does |
|------|-------------|
| `proxy_request` | Make an HTTP request with a secret injected — value never enters the context window |
| `list_secrets` | List secret names in the local vault (names only, no values) |

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

- [MCP Server Overview](/docs/vaults/mcp/overview) — Architecture and how it works
- [Setup Guide](/docs/vaults/mcp/setup) — Detailed config for Claude Desktop, Cursor, and more
- [Tool Reference](/docs/vaults/mcp/tools) — Parameters, examples, and errors for each tool
- [Security Model](/docs/vaults/mcp/security) — Threat model and best practices
- [Deployment](/docs/vaults/mcp/deployment) — Deploy your own hosted MCP server
