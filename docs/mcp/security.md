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

## Inspection pipeline

All tool calls pass through a security inspection pipeline. It runs **by default** (opt-out, not opt-in) and covers both inputs (before execution) and outputs (after execution).

### Input inspection

Before a tool runs, the server inspects the arguments for:

| Check | What it catches | Severity |
|-------|----------------|----------|
| **Command injection** | Shell chaining, command substitution, reverse shells, path traversal | Critical/High |
| **Encoding obfuscation** | Long base64, hex escapes, Unicode escapes | Medium |
| **Social engineering** | Urgency, authority claims, secrecy, bypass requests, credential fishing | High/Critical |
| **Network threats** | ngrok/pastebin URLs, IP-based URLs, `curl`/`wget` exfiltration | High/Critical |
| **Unicode normalization** | Zero-width chars, Cyrillic/Greek homoglyphs | Medium |
| **PII detection** | Email addresses, SSNs, credit card numbers, phone numbers, AWS keys, private key headers | Medium–Critical |
| **Exfiltration protection** | Previously fetched secret values appearing in non-secret tool inputs | Critical |

In the default `block` mode, critical or high-severity threats reject the tool call. In `surgical` mode, Unicode is normalized but the call proceeds. In `log_only` mode, threats are logged but never blocked.

### Output inspection

After a tool returns, the server inspects the result for:

| Check | What it does |
|-------|-------------|
| **Threat detection** | Same patterns as input (logged, not blocked) |
| **PII detection** | Same patterns as input (logged) |
| **Secret redaction** | If a known secret value (fetched via `get_secret` or `get_env_bundle`) appears in the output of a **non-secret** tool, it is replaced with `[REDACTED:path]` before the result reaches the LLM context window |

Secret redaction tracks every value retrieved during the session. This means if an agent fetches `api-keys/stripe` and later a tool accidentally includes that value in its output, the value is scrubbed.

### Exfiltration protection

When an agent fetches a secret, the server remembers the value. If that value later appears as input to a tool that shouldn't handle raw secrets (e.g., `share_secret`, `grant_access`), the server flags it as a potential exfiltration attempt.

| Mode | Behavior |
|------|----------|
| `warn` (default) | Logs the threat, allows the call |
| `block` | Rejects the call with a security error |
| `off` | Disables exfiltration checks |

Tools that legitimately handle secrets (`get_secret`, `get_env_bundle`, `put_secret`, `rotate_and_store`) are exempt from exfiltration checks.

### Configuration

All features are on by default and can be tuned via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ONECLAW_MCP_SECURITY_ENABLED` | `true` | Master switch — set to `false` to disable all inspection |
| `ONECLAW_MCP_SANITIZATION_MODE` | `block` | `block`, `surgical`, or `log_only` |
| `ONECLAW_MCP_REDACT_SECRETS` | `true` | Redact known secret values from non-secret tool outputs |
| `ONECLAW_MCP_PII_DETECTION` | `true` | Detect PII patterns in inputs and outputs |
| `ONECLAW_MCP_EXFIL_PROTECTION` | `warn` | `block`, `warn`, or `off` for secret exfiltration checks |

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
