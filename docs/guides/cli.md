---
title: CLI
description: Use the 1Claw CLI for CI/CD, DevOps, and servers. Browser-based login, env pull/push/run, and full API coverage.
sidebar_position: 11
---

# 1Claw CLI

The `@1claw/cli` package provides a full-featured command-line interface for 1Claw. It is designed for CI/CD pipelines, DevOps workflows, and server environments.

## Installation

```bash
npm install -g @1claw/cli
```

Or run with npx:

```bash
npx @1claw/cli login
```

## Authentication

### Browser-based login (recommended)

```bash
1claw login
```

This opens your browser to 1claw.xyz where you approve the login. The CLI polls until you confirm. Your token is stored in `~/.config/1claw/`.

### Email/password

```bash
1claw login --email
```

Supports MFA if enabled on your account.

### CI/CD (non-interactive)

Set environment variables — no login needed:

```bash
export ONECLAW_TOKEN="your-jwt"
# or
export ONECLAW_API_KEY="1ck_..."
export ONECLAW_VAULT_ID="your-vault-uuid"   # optional; required for vault-scoped commands
```

## Main commands

| Area         | Commands                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| **Auth**     | `login`, `logout`, `whoami`                                                                    |
| **Vaults**   | `vault list`, `vault create`, `vault get`, `vault link`, `vault delete`                        |
| **Secrets**  | `secret list`, `secret get`, `secret set`, `secret delete`, `secret rotate`, `secret describe` |
| **CI/CD**    | `env pull`, `env push`, `env run -- <command>`                                                 |
| **Agents**   | `agent list`, `agent create`, `agent get`, `agent token`                                       |
| **Policies** | `policy list`, `policy create`, `policy delete`                                                |
| **Sharing**  | `share create`, `share list`, `share accept`, `share revoke`                                   |
| **Billing**  | `billing status`, `billing credits`, `billing usage`                                           |
| **Audit**    | `audit list`                                                                                   |
| **MFA**      | `mfa status`, `mfa enable`, `mfa disable`                                                      |
| **Config**   | `config list`, `config set`, `config get`                                                      |
| **Proxy**    | `proxy` — local OpenAI-compatible proxy that routes through [Shroud](/docs/guides/shroud)       |

## LLM Proxy (`1claw proxy`)

Start a local OpenAI-compatible server that forwards all requests through Shroud. Use this to route LLM traffic from **Cursor**, **VS Code + Continue**, **Zed**, or any tool that supports a custom OpenAI base URL — with full Shroud inspection, secret redaction, and optional [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on).

### Quick start

```bash
export ONECLAW_AGENT_API_KEY="ocv_..."   # same env as MCP — no flag needed
1claw proxy
```

Or pass the key explicitly:

```bash
1claw proxy --agent-key "AGENT_ID:ocv_YOUR_KEY"
# or key-only (Vault resolves agent by prefix):
1claw proxy --agent-key "ocv_YOUR_KEY"
```

The proxy listens on `http://127.0.0.1:11434` (or the next free port) and prints **Cursor, Claude Code, Copilot, and extension** snippets on startup. Key-only / env mode calls `POST /v1/auth/agent-token` once at startup (uses `ONECLAW_API_URL`, default `https://api.1claw.xyz`).

**Full IDE walkthrough:** [IDE & tool setup (Shroud proxy)](/docs/guides/ide-shroud-setup).

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--agent-key <id:key>` or `ocv_...` | env fallback | If omitted, uses `ONECLAW_AGENT_API_KEY` (+ optional `ONECLAW_AGENT_ID`) |
| `--port <n>` | `11434` | Local port; if busy, tries up to 32 higher ports; `0` = OS-assigned |
| `--provider <name>` | auto-detect | Force a provider instead of detecting from model name |
| `--shroud-url <url>` | `https://shroud.1claw.xyz` | Override Shroud endpoint |
| `--verbose` | off | Log each request with timestamp, method, provider, and status |

### Auto-detection

The proxy detects the provider from the `model` field in the request body:

| Model prefix | Provider |
|-------------|----------|
| `gpt-*`, `o1*`, `o3*`, `o4*`, `chatgpt-*` | `openai` |
| `claude-*` | `anthropic` |
| `gemini-*` | `google` |
| `mistral-*` | `mistral` |
| `command-*` | `cohere` |

Override with `--provider` if needed.

### Editor setup

#### Cursor

1. Run the proxy:
   ```bash
   1claw proxy --agent-key "AGENT_ID:ocv_..."
   ```
2. In Cursor **Settings → Models → OpenAI**:
   - **Base URL**: `http://127.0.0.1:11434/v1`
   - **API Key**: `1claw` (any value — the proxy ignores it)

#### VS Code + Continue

Add to `~/.continue/config.json`:

```json
{
  "models": [{
    "title": "1Claw Shroud",
    "provider": "openai",
    "model": "gpt-4o",
    "apiBase": "http://127.0.0.1:11434/v1",
    "apiKey": "1claw"
  }]
}
```

#### Any OpenAI-compatible client

Point the base URL to `http://127.0.0.1:11434/v1`. The proxy accepts any `Authorization` header (or none) and replaces it with the Shroud agent credentials.

### How it works

```
Editor (Cursor, VS Code, etc.)
  │  POST /v1/chat/completions
  │  Authorization: Bearer <ignored>
  ▼
1claw proxy (localhost:11434)
  │  Replaces auth with X-Shroud-Agent-Key
  │  Auto-detects X-Shroud-Provider from model name
  │  Forwards request, streams response back
  ▼
shroud.1claw.xyz (TEE)
  │  Auth → Inspect → Redact → Route
  ▼
LLM provider (or Stripe AI Gateway if token billing enabled)
```

### LLM Token Billing

When your org has **LLM Token Billing** enabled (Settings → Billing), the proxy works without any provider API keys. Shroud routes through Stripe AI Gateway and bills token usage to your org automatically. See [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on).

### Built-in endpoints

| Path | Description |
|------|-------------|
| `/health` | Health check (`{"status":"ok","proxy":"1claw"}`) |
| `/v1/models` | Returns available models (editors probe this on startup) |

## CI/CD examples

### GitHub Actions

```yaml
- name: Deploy with secrets
  env:
      ONECLAW_TOKEN: ${{ secrets.ONECLAW_TOKEN }}
      ONECLAW_VAULT_ID: ${{ secrets.ONECLAW_VAULT_ID }}
  run: |
      npx @1claw/cli env pull -o .env.production
      npm run deploy
```

### Run a command with secrets injected

```bash
1claw env run -- npm start
```

Secrets from the linked (or `ONECLAW_VAULT_ID`) vault are injected as environment variables for the child process.

## Configuration

Config file: `~/.config/1claw/config.json`.

- `api-url` — API base URL (default: `https://api.1claw.xyz`)
- `output-format` — `table`, `json`, or `plain`
- `default-vault` — Default vault ID for commands that need one

Use `1claw config list` and `1claw config set <key> <value>` to view and update.

## Device authorization flow

When you run `1claw login` (without `--email`), the CLI:

1. Calls `POST /v1/auth/device/code` to get a device code and user code.
2. Opens the dashboard at `https://1claw.xyz/cli/verify?code=<user_code>`.
3. You approve the request in the browser (while logged in to 1Claw).
4. The CLI polls `POST /v1/auth/device/token` until the backend marks the code approved, then receives a JWT and stores it.

This flow does not require typing your password in the terminal.

## See also

- [JavaScript SDK](/docs/sdks/javascript) — Programmatic access from Node.js or browsers
- [MCP Server](/docs/mcp/overview) — AI agents accessing secrets via tools
- [Two-factor authentication](/docs/security/two-factor-auth) — Optional 2FA for human logins
