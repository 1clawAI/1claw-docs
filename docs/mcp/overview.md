---
title: MCP Server Overview
description: The 1claw MCP server gives AI agents secure, just-in-time access to secrets via the Model Context Protocol. Available as a hosted service or local stdio process.
keywords: [MCP, Model Context Protocol, Claude Desktop, Cursor, agent secrets]
sidebar_position: 0
---

# MCP Server

The **1claw MCP server** (`@1claw/mcp`) implements the [Model Context Protocol](https://modelcontextprotocol.io) to give AI agents secure, just-in-time access to secrets stored in a 1claw vault — and a standalone security scanner for detecting malicious LLM content.

Secrets are fetched at runtime and never persisted in the LLM context window beyond the moment they are used. The `inspect_content` tool can run **without vault credentials**, making it available to anyone running local models.

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
2. The MCP server authenticates with the vault API using an agent JWT (from agent ID + API key, or a static token).
3. The vault returns the decrypted secret value.
4. The MCP server passes the value back to the agent.
5. The agent uses the secret and discards it.

## Transport modes

| Mode           | Use case                                            | Auth                | URL                         |
| -------------- | --------------------------------------------------- | ------------------- | --------------------------- |
| **stdio**      | Local — Claude Desktop, Cursor, any MCP client      | Env vars            | N/A (runs locally)          |
| **httpStream** | Hosted — any MCP client with HTTP streaming support | Per-request headers | `https://mcp.1claw.xyz/mcp` |
| **local-only** | Security tools only — no vault credentials needed   | None                | N/A (runs locally)          |

### Local-only mode

Set `ONECLAW_LOCAL_ONLY=true` to start the server with only the `inspect_content` tool. No 1claw account or API keys required. Useful for users running local models (Ollama, LM Studio, llama.cpp) who want threat detection without secret management.

```json
{
    "mcpServers": {
        "1claw": {
            "command": "npx",
            "args": ["-y", "@1claw/mcp"],
            "env": {
                "ONECLAW_LOCAL_ONLY": "true"
            }
        }
    }
}
```

## Tools

| Tool               | Description                                                         | Read/Write |
| ------------------ | ------------------------------------------------------------------- | ---------- |
| `list_secrets`     | List all secrets in the vault (metadata only, never values)         | Read       |
| `get_secret`       | Fetch the decrypted value of a secret by path                       | Read       |
| `put_secret`       | Create or update a secret (creates a new version)                   | Write      |
| `delete_secret`    | Soft-delete a secret at a given path                                | Write      |
| `describe_secret`  | Get metadata (type, version, expiry) without fetching the value     | Read       |
| `rotate_and_store` | Store a new value for an existing secret and return the new version | Write      |
| `rotate_generate`  | Server-side rotation: generate a cryptographically random value     | Write      |
| `list_versions`    | List all versions of a secret (newest first)                        | Read       |
| `get_env_bundle`   | Fetch an `env_bundle` secret and parse its KEY=VALUE lines as JSON  | Read       |
| `create_vault`     | Create a new vault                                                  | Write      |
| `list_vaults`      | List all accessible vaults                                          | Read       |
| `grant_access`     | Grant a user or agent access to a vault                             | Write      |
| `share_secret`     | Share a secret with someone by email                                | Write      |
| `simulate_transaction` | Simulate a transaction via Tenderly (no signing)                | Read       |
| `simulate_bundle`  | Simulate multiple transactions sequentially                         | Read       |
| `submit_transaction` | Sign and broadcast a transaction                                  | Write      |
| `sign_transaction` | Sign a transaction without broadcasting (BYORPC)                    | Write      |
| `list_transactions` | List recent transactions for the current agent                     | Read       |
| `get_transaction`  | Get details of a specific transaction                               | Read       |
| `provision_signing_key` | Provision an HSM-backed signing key for a blockchain           | Write      |
| `list_signing_keys` | List all active signing keys for the current agent                 | Read       |
| `sign_message`     | Sign an EIP-191 personal message                                    | Write      |
| `sign_typed_data`  | Sign EIP-712 typed structured data                                  | Write      |
| `sign_digest`      | Sign a raw 32-byte digest (blind signing, requires `raw_signing_enabled`) | Write |
| `lease_bankr_key`  | Lease a short-lived Bankr wallet API key                            | Write      |
| `platform_list_apps` | List platform apps in the organization                            | Read       |
| `platform_create_app` | Register a new platform app                                      | Write      |
| `platform_bootstrap_user` | Bootstrap resources for a connected user from a template    | Write      |
| `platform_reissue_claim` | Reissue an expired claim URL for a connection                | Write      |
| `platform_rotate_key` | Rotate a platform app's API key                                  | Write      |
| `list_approvals`   | List pending approval requests                                      | Read       |
| `get_approval`     | Get details of an approval request                                  | Read       |
| `request_approval` | Submit an approval request (agent-only)                             | Write      |
| `treasury_propose` | Create a treasury multisig proposal                                 | Write      |
| `treasury_sign_proposal` | Sign a treasury proposal                                      | Write      |
| `treasury_list_proposals` | List proposals for a treasury                                | Read       |
| `inspect_content`  | Analyze text for prompt injection, command injection, PII, and more | Read       |

## Resources

| URI               | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `vault://secrets` | Browsable listing of all secret paths (metadata only, no values) |

## Next steps

- [Setup Guide](/docs/mcp/setup) — Install and configure the MCP server
- [Tool Reference](/docs/mcp/tools) — Detailed documentation for each tool
- [Security](/docs/mcp/security) — Security model and best practices
- [Deployment](/docs/mcp/deployment) — Deploy the hosted MCP server
