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
- **Hosting** — optional public HTTP endpoint at `{slug}.run.1claw.xyz`
- **Logs** — real-time streaming and historical access
- **Sidecar** — 1Claw sidecar auto-injected for secret access and memory

## Templates

| Template | Runtime | Use case |
|----------|---------|----------|
| **Python** | Python 3.12 + pip | LangChain, CrewAI, custom agents |
| **Node.js** | Node 22 + pnpm | TypeScript agents, ElizaOS |
| **Hermes** | 1Claw Hermes runtime | Built-in MCP + Shroud integration |
| **OpenClaw** | Rust-based minimal | High-performance agents |
| **Custom Docker** | Any Dockerfile | Full control |

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
1claw deploy --cloud

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

## Hosting

Enable `expose_http` to get a public URL:

```
https://{slug}.run.1claw.xyz
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

## Interactive shell

Enable `shell_access_enabled` on the runtime (dashboard Terminal settings or API) to open an interactive PTY in the browser.

```bash
# API: create a short-lived shell session (human-only, step-up auth)
curl -X POST "https://api.1claw.xyz/v1/runtimes/$RUNTIME_ID/shell/session" \
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

# Last 100 lines
1claw runtime logs <id> --tail 100
```

In the dashboard, the runtime detail page shows a live log viewer with search and severity filtering.

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

- [Hosting quickstart](/docs/guides/hosting) — expose your runtime to the internet
- [Automations](/docs/guides/automations) — trigger your runtime on a schedule
- [Agent Memory](/docs/guides/agent-memory) — persist state across runtime restarts
- [Shroud](/docs/guides/shroud) — route runtime LLM traffic through the proxy
