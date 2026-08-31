---
title: Cloud Runtimes
description: Deploy AI agents in managed containers with lifecycle management, hosting, and auto-stop.
sidebar_label: "Cloud Runtimes — managed containers for agents"
---

# Cloud Runtimes

Cloud Runtimes let you deploy AI agents in managed containers — no Kubernetes, no Docker Compose, no infra management. Push code, get a running agent with a public URL.

## What are runtimes?

A runtime is a managed container that runs your agent code. It includes:

- **Compute** — CPU and memory allocated from a preset
- **Lifecycle** — start, stop, idle-timeout, auto-restart
- **Hosting** — optional public HTTP endpoint at `{slug}.run.1claw.co`
- **Logs** — real-time streaming and historical access
- **Sidecar** — 1Claw sidecar auto-injected for secret access and memory

## Templates

The `template` values below are what you pass to the API. The authoritative list
is served by **`GET /v1/runtimes/templates`** (public, no auth) — prefer reading
it over copying this table, so a client can check a template at build time
rather than discovering it at provision time.

| `template` | Runtime | Chat | Use case |
|---|---|---|---|
| `python` | Python 3.12 + pip | — | LangChain, CrewAI, custom agents |
| `node` | Node 22 + pnpm | — | TypeScript agents, ElizaOS |
| `hermes` | 1Claw Hermes runtime | yes | Built-in MCP + Shroud integration |
| `openclaw` | Rust-based minimal | yes | High-performance agents |
| `openclaude` | OpenClaude + 1Claw sidecar | yes | Automations Assist, NL workflow authoring |
| `opencode` | OpenCode + 1Claw sidecar | yes | Coding agent workflows |
| *(omitted)* + `image` | Any Dockerfile | — | Full control |

"Chat" means `POST /v1/runtimes/{id}/chat` is available for that template.

:::note An unrecognised template does not error

A `template` value that is not in this list resolves to the base runtime rather
than being refused, so a typo provisions a container with none of the tooling
you expected and nothing reports a problem. Check the value against
`GET /v1/runtimes/templates` before provisioning.
:::

## Create via dashboard

1. Go to **Runtimes** in the sidebar
2. Click **Create Runtime**
3. Choose a template (or upload Dockerfile)
4. Select a preset (small / medium / large)
5. Configure environment variables
6. Optionally enable hosting (public URL)
7. Click **Deploy**

## Create via CLI

```bash
# Deploy from current directory
1claw runtime create \
  --name "my-agent" \
  --template python \
  --preset medium \
  --env OPENAI_API_KEY=vault://secrets/openai-key

# Deploy with hosting
1claw runtime create \
  --name "api-agent" \
  --template node \
  --preset large \
  --expose-http \
  --slug "my-api-agent" \
  --inbound-auth api_key

# Shorthand: deploy to cloud
1claw deploy --google-cloud

# Manage lifecycle
1claw runtime start <id>
1claw runtime stop <id>
1claw runtime logs <id> --follow

# Check slug availability
1claw runtime slug-check my-agent-name
```

## Source repository

Runtimes support git-based deployment. Specify a repo URL and the runtime clones it at startup:

```bash
1claw runtime create \
  --name "research-crew" \
  --template python \
  --source "https://github.com/myorg/research-agent.git" \
  --branch main
```

The container runs `pip install -r requirements.txt` (Python) or `npm install` (Node.js) then executes the entrypoint.

### Agent pre-auth at start

When a runtime starts, Vault mints a short-lived agent JWT and mounts it into the container via **Secret Manager** (`secretKeyRef`) as `ONECLAW_AGENT_TOKEN` / `ONECLAW_TOKEN` — so CreateService audit logs never embed plaintext JWTs. Do not put long-lived API keys in `env_public`.

If the bound agent has **`shroud_enabled`**, Vault also enables the sidecar + sets `ONECLAW_SHROUD_*` and points common LLM base URLs at the in-container proxy (`127.0.0.1:8082`).

Pair with **Automations Assist** (`POST /v1/automations/assist/session`) for a short-lived human token when authoring workflows from OpenClaude.

## Hosting

Enable `expose_http` to get a public URL:

```
https://{slug}.run.1claw.co
```

### Inbound authentication

| Mode | Description |
|------|-------------|
| `api_key` | Require `Authorization: Bearer <key>` header |
| `jwt` | Validate 1Claw JWT (agent or user) |
| `public` | No authentication (use with caution) |

### Slug rules

- 3–63 characters, lowercase alphanumeric + hyphens
- Must not start/end with a hyphen
- Reserved words blocked (`api`, `admin`, `status`, etc.)
- 30-day cooldown after release

## Presets and pricing

| Preset | vCPU | Memory | Tier required | Included hours |
|--------|------|--------|---------------|---------------|
| `small` | 0.5 | 512 MB | Free | 10h/mo |
| `medium` | 1 | 1 GB | Pro | 100h/mo |
| `large` | 2 | 4 GB | Pro | 100h/mo |
| `small-cc` | 0.5 | 512 MB | Business | 2000h/mo |
| `medium-cc` | 1 | 2 GB | Business | 2000h/mo |
| `large-cc` | 4 | 8 GB | Business | 2000h/mo |

`-cc` presets run on Confidential Compute (AMD SEV-SNP) for TEE isolation.

### Tier limits

| Tier | Max runtimes | Hours / month |
|------|-------------|---------------|
| Free | 1 | 10 |
| Pro | 3 | 100 |
| Team | 10 | 500 |
| Business | 25 | 2,000 |
| Enterprise | Custom | Custom |

## Runtime Chat (Hermes / OpenClaw / OpenClaude)

On the runtime detail **Terminal** panel, **Chat** sits next to **Shell**. Messages go:

`Dashboard → POST /v1/runtimes/{id}/chat` (Vault proxy, SSE) → in-container OpenAI-compatible bridge on `USER_PORT` → sidecar/Shroud LLM.

```bash
# SDK
client.runtimes.chat(runtimeId, { message: "Reply with OK", stream: true })
```

Stop → Start (or Rebuild) after image updates so the chat-bridge process is present. Prefer `shroud_enabled` on the bound agent for in-container LLM routing.

## Interactive shell

Enable `shell_access_enabled` on the runtime (dashboard Terminal settings or API) to open an interactive PTY in the browser.

```bash
# API: create a short-lived shell session (human-only, step-up auth)
curl -X POST "https://api.1claw.co/v1/runtimes/$RUNTIME_ID/shell/session" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"..."}'
# → { "session_token", "ws_url", "expires_in", "max_session_minutes" }
```

Step-up options: account `password`, `totp_code`, WebAuthn `passkey_credential` (after `POST .../shell/passkey/begin`), or a `reauth_token` from `POST /v1/auth/reauth` with purpose `runtime_shell`.

SDK: `client.runtimes.createShellSession(id, { password })`. The dashboard Terminal tab connects a binary WebSocket to `ws_url`. Vault may auto-repair Cloud Run invoker IAM and reconcile the shroud sidecar on connect; enabling shell while a runtime is already running may require stop/start so the sidecar is injected.

## Logs and monitoring

```bash
# Stream logs in real-time
1claw runtime logs <id> --follow

# Last 100 log lines (API returns `{ entries: [{ timestamp?, message }] }`)
1claw runtime logs <id> --tail 100
```

**Security:**

- GCP Cloud Audit entries are excluded / summarized — full CreateService specs (env vars) are never returned to clients.
- JWTs, API keys, and secret-shaped assignments are redacted server-side (and again in the dashboard as defense-in-depth).
- Dashboard **Unlock logs** requires step-up: account password or passkey reauth (`POST /v1/auth/reauth` with `purpose=runtime_logs`, then `POST /v1/runtimes/{id}/logs/unlock` with `X-Auth-Confirm`). Unlock lasts **15 minutes** per runtime.

API: `GET /v1/runtimes/{id}/logs?tail=N`, SSE `GET .../logs/stream` — both require a prior unlock grant for human callers.

## Idle auto-stop

Runtimes with no inbound requests for `idle_timeout_secs` (default: 300s for Free, 900s for Pro+) are automatically stopped to save resources. They restart on the next request (cold start ~2–5s).

Disable idle timeout for always-on agents:

```bash
1claw runtime update <id> --idle-timeout 0
```

## Trial system (Free tier)

Free tier users get **1 runtime** with **10 hours/month**. The runtime auto-stops when hours are exhausted. Hours reset at the start of each billing cycle.

To unlock more runtimes and hours, upgrade to Pro or higher at **Settings → Billing**.

## Next steps

- [Hosting quickstart](/docs/runtimes/hosting) — expose your runtime to the internet
- [Automations](/docs/automations/overview) — trigger your runtime on a schedule
- [Agent Memory](/docs/agents/memory) — persist state across runtime restarts
- [Shroud](/docs/agents/shroud/overview) — route runtime LLM traffic through the proxy
