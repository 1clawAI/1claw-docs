---
title: MCP Security
description: Security model, best practices, and threat mitigations for the 1claw MCP server.
sidebar_position: 3
---

# MCP Security

## Security model

The 1claw MCP server is designed around the principle that **secrets should exist in an agent's context for the shortest possible time**.

### Secret value handling

- **Values are never logged.** When `get_secret` is called, only `"secret accessed: <path>"` appears in the MCP server logs. The actual value is never written to disk or stdout.
- **Values are never cached.** Each `get_secret` call makes a fresh request to the vault API. No secret values are stored in memory between tool calls.
- **Values are returned directly.** The decrypted value passes from the vault API through the MCP server to the agent in a single request cycle.

### Authentication

| Transport | How auth works |
|-----------|---------------|
| **stdio** | Agent token and vault ID are set as environment variables at startup. A single client is created for the process lifetime. |
| **httpStream** | Each HTTP streaming connection sends `Authorization` and `X-Vault-ID` headers. A new client is created per session. Sessions are isolated — no shared state. |

### Authorization

The MCP server itself does not enforce access control. Authorization is handled by the vault API's policy engine:

1. The MCP server authenticates as an **agent** using the agent token.
2. Every API call (list, read, write, delete) is checked against the **policies** attached to that agent.
3. If the agent doesn't have a policy granting access to a path, the vault returns `403 Forbidden`.

This means you control what the AI agent can access by configuring policies in the 1claw dashboard — the MCP server just relays requests.

### Audit trail

Every secret access through the MCP server is recorded in the vault's audit log. You can view audit events in the dashboard or query them via `GET /v1/audit/events`.

## Best practices

### Token scoping

Create dedicated agents for each use case with the minimum permissions needed:

- **Read-only agent** — Policy with only `read` permission on specific paths
- **CI/CD agent** — Policy with `read` on `config/*` and `api-keys/*`
- **Rotation agent** — Policy with `read` and `write` on paths it manages

### Path prefix isolation

Use path prefixes to organize secrets and scope agent access:

```
api-keys/stripe          → Agent A (read)
api-keys/openai          → Agent A (read)
config/prod-env          → Agent B (read)
internal/db-credentials  → No agent access
```

### Expiry and access limits

Set `expires_at` and `max_access_count` on sensitive secrets:

```
put_secret(
  path: "temp/deploy-key",
  value: "...",
  expires_at: "2026-03-01T00:00:00Z",
  max_access_count: 5
)
```

The secret auto-expires after the date or after 5 reads, whichever comes first.

### Hosted vs local

| Consideration | Hosted (`mcp.1claw.xyz`) | Local (stdio) |
|--------------|--------------------------|---------------|
| Setup complexity | Minimal (URL + headers) | Requires Node.js, build step |
| Network path | Agent → MCP server → Vault API | Agent → local MCP → Vault API |
| Token exposure | Headers sent over HTTPS | Env vars on local machine |
| Isolation | Per-session, stateless | Single process, single client |

For most use cases, the hosted mode is recommended. Use local mode when you need air-gapped operation or want to run against a self-hosted vault.

## Error handling

The MCP server translates vault API errors into clear, actionable messages:

| HTTP status | MCP error message |
|------------|-------------------|
| 404 | `No secret found at path '<path>'.` |
| 410 | `Secret at path '<path>' is expired or has exceeded its maximum access count.` |
| 402 | `Free tier quota exhausted. Upgrade your plan or add payment at https://1claw.xyz/settings/billing` |
| 403 | `Access denied` (agent doesn't have a policy for this path) |
