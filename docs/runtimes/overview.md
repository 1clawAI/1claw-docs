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

| `template` | Runtime | Chat | Licence | Needs your own vendor account |
|---|---|---|---|---|
| `python` | Python 3.12 + pip | — | Apache-2.0 | no |
| `node` | Node 24 + pnpm | — | Apache-2.0 | no |
| `hermes` | 1Claw Hermes runtime | yes | Apache-2.0 | no |
| `openclaw` | Rust-based minimal | yes | Apache-2.0 | no |
| `openclaude` | OpenClaude + 1Claw sidecar | yes | Apache-2.0 | no |
| `opencode` | OpenCode + 1Claw sidecar | yes | Apache-2.0 | no |
| `claude-code` | Anthropic's Claude Code CLI | yes | proprietary | yes — Claude subscription or `ANTHROPIC_API_KEY` |
| `codex` | OpenAI's Codex CLI | yes | Apache-2.0 | yes — ChatGPT plan or `OPENAI_API_KEY` |
| `amp` | Sourcegraph Amp | yes | proprietary | yes — paid Amp subscription |
| `binary` | A compiled program you ship (Go, Rust, …) — a release asset from `env_public.BINARY_URL` (`https://`, pinned by `BINARY_SHA256`; `.tar.gz`/`.zip` are unpacked to `bin/unpacked/`) or a `startup_command` after a `source_repo` clone; 1Claw CLI, curl, git and the sidecar are in the image | — | Apache-2.0 | no |
| *(omitted)* + `image` | Any Dockerfile | — | — | — |

```bash
# A Go program published as a GitHub release asset
1claw runtime create my-bot --template binary --agent-id <id> \
  --env BINARY_URL=https://github.com/acme/bot/releases/download/v1.2.0/bot-linux-amd64 \
  --env BINARY_SHA256=3f0c…e91a
```

"Chat" means `POST /v1/runtimes/{id}/chat` is available for that template.

:::note Open source and "no subscription" are different questions

The image ships the CLI, never a credential. The Codex CLI is Apache-2.0 **and**
still requires a ChatGPT plan or an API key at run time, so the two columns are
tracked separately in `GET /v1/runtimes/templates` (`license` and
`requires_vendor_subscription`) rather than collapsed into one flag. Provisioning
a runtime whose vendor account you do not have gives you a container that starts
and then cannot do anything.

:::

### What cannot run as a runtime

Editor extensions — **Cline** and **Kilo Code** among them — have no headless
binary to containerise. They are MCP clients, so they belong on the
[coding-agent path](/docs/guides/setup-by-client) where they read secrets from
your vault over MCP, not here.

:::note An unrecognised template does not error

A `template` value that is not in this list resolves to the base runtime rather
than being refused, so a typo provisions a container with none of the tooling
you expected and nothing reports a problem. Check the value against
`GET /v1/runtimes/templates` before provisioning.
:::

### NemoClaw and NanoClaw

[NVIDIA NemoClaw](https://www.nvidia.com/en-us/ai/nemoclaw) (OpenClaw inside an
OpenShell sandbox) and [NanoClaw](https://nanoclaw.dev/) are themselves sandbox
runtimes: each needs a container runtime on the host (OpenShell runs a K3s
cluster in Docker with Landlock/seccomp; NanoClaw starts one container per
chat), so neither can be nested inside a hosted 1Claw runtime. Run them on your
own machine and give the agent 1Claw from inside the sandbox instead: the
[1claw-nemoclaw](https://github.com/1clawAI/1claw-nemoclaw) policy, plugin and
blueprint for NemoClaw, or the [1Claw CLI/MCP](/docs/guides/setup-by-client)
inside a NanoClaw agent container. An OpenShell-backed *provider* (1Claw
starting sandboxes on your OpenShell host) is on the roadmap.

## Create via dashboard

The wizard is built to fit on one screen per step. **Simple** mode (the
default) is three steps plus a review; the **Advanced** switch in the header
adds a Runtime Options step and the model/tool tuning.

1. **Choose a template** — agent frameworks first (Hermes, OpenClaw, OpenCode,
   OpenClaude), then bring-your-own-code (Python, Node, compiled binary,
   custom Docker).
2. **Choose a size** — small / medium / large, with confidential (TEE)
   variants; an included slot shows as *Included with your plan*.
3. **Agent & behaviour** — name (pre-filled), the agent it runs as (an
   existing one, or **New agent** to create one with keys and a default-vault
   grant in the same call), the chat channel for framework templates, and a
   system prompt.
4. *(Advanced only)* **Runtime options** — source repo and startup command,
   public HTTP endpoint and auth mode, env vars, shell access, idle timeout.
5. **Review & create** — the review lists the defaults in use with a
   **Customise** button that jumps to the options step.

A greyed **Next** always says what is missing ("To continue: pick an agent").

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

| Preset | vCPU | Memory | Tier required | Billing |
|--------|------|--------|---------------|---------|
| `small` | 0.5 | 512 MB | Pro | **Included** for your first runtime (Pro+), otherwise $15/mo add-on |
| `medium` | 1 | 2 GB | Pro | **Included** for your first runtime (Pro+), otherwise $39/mo add-on |
| `large` | 2 | 4 GB | Pro | $99/mo add-on |
| `small-cc` | 0.5 | 512 MB | Business | add-on (TEE) |
| `medium-cc` | 1 | 2 GB | Business | add-on (TEE) |
| `large-cc` | 4 | 8 GB | Business | add-on (TEE) |

**Every plan from Pro up includes one runtime at no charge** — Small or Medium (up to 1 vCPU / 2 GB), with no monthly hour cap and no subscription item. The vault assigns the included slot automatically to the first small/medium runtime you create (`billing_kind: included` on the runtime; `GET /v1/runtimes` returns `included_runtime: { allowance, used, presets }`). Deleting it frees the slot. Large and the `-cc` presets are always paid add-ons; additional small/medium runtimes beyond the included one are add-ons too. Runtimes without an add-on or the included slot (`billing_kind: pool`) draw from the plan's pool hours below.

`-cc` presets run on Confidential Compute (AMD SEV-SNP) for TEE isolation.

### Tier limits

| Tier | Max runtimes | Included runtime (no hour cap) | Pool hours / month |
|------|-------------|-------------------------------|--------------------|
| Free | — (Cloud Runtimes need Pro or higher) | — | — |
| Pro | 3 | 1 (small or medium) | 100 |
| Team | 10 | 1 (small or medium) | 500 |
| Business | 25 | 1 (small or medium) | 2,000 |
| Enterprise | Custom | 1 (small or medium) | Custom |

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

Step-up options: account `password`, `totp_code`, WebAuthn `passkey_credential` (after `POST .../shell/passkey/begin`), or a `reauth_token` from `POST /v1/auth/reauth/begin` then `POST /v1/auth/reauth/complete` with purpose `runtime_shell`.

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
- Dashboard **Unlock logs** requires step-up: account password or passkey reauth (`POST /v1/auth/reauth/begin` then `/complete` with `purpose=runtime_logs`, then `POST /v1/runtimes/{id}/logs/unlock` with `X-Auth-Confirm`). Unlock lasts **15 minutes** per runtime.

API: `GET /v1/runtimes/{id}/logs?tail=N`, SSE `GET .../logs/stream` — both require a prior unlock grant for human callers.

## One call from "what does the agent do" to running

`POST /v1/runtimes/provision` creates (or reuses) the agent, its keys and default-vault
grant, the runtime, and starts it:

```json
{ "name": "nightly-reporter", "template": "python", "agent": { "name": "nightly-reporter" }, "start": true }
```

Every step is the same code the individual endpoints run — the `agent.create` consensus
gate, plan caps, image allowlist and included-slot logic apply unchanged. The new agent's
API key comes back once. The dashboard's **New runtime → Agent → New agent** does this.

## The console

The runtime page opens on **Overview**: status and last heartbeat, the idle auto-stop
countdown, hours and egress this month, the last image scan, the image it is running (the
attested digest, and the previous one with **Roll back & restart** —
`POST /v1/runtimes/{id}/rollback`), the schedule, and the **resolved environment**
(`GET /v1/runtimes/{id}/env/resolved`): every variable the container is started with,
by source — `platform`, `env_public`, `vault_env`, `agent`, `secret` — and which wins on
a collision. Vault-derived values and the minted token are named, never shown. Then
Chat, Channels, Logs & Shell, Agent and Configuration.

## Scheduled start and stop

A runtime can run on a clock without a workflow around it:

```
PATCH /v1/runtimes/{id}
{ "schedule": { "start_cron": "0 2 * * *", "timezone": "America/Chicago", "stop_after_secs": 3600 } }
```

The scheduler starts the container when `start_cron` fires (5-field cron, minimum
one minute, IANA `timezone`) and stops it `stop_after_secs` later (60 s – 24 h);
leave `stop_after_secs` null to let the idle reconciler stop it. A scheduled start
goes through exactly the gates a manual start does (plan, included slot, provider),
and `next_scheduled_start_at` / `scheduled_stop_at` on the runtime say what is
coming. `"schedule": null` clears it.

## Attested image

Every runtime records the image it is actually running (`image_digest`, digest form
when the provider reports one, else the reference it started from), and agent
tokens minted for that runtime carry it as the `runtime_image` claim. An access
policy can require it:

```json
{ "conditions": { "runtime_image_in": ["us-west1-docker.pkg.dev/…/runtime-base@sha256:…"] } }
```

Only tokens from a runtime running one of the listed images pass; a bare API key
or a token with no runtime image is refused. Exact match — pin the digest.

## Idle auto-stop

Runtimes with no inbound requests for `idle_timeout_secs` (default: 300s for Free, 900s for Pro+) are automatically stopped to save resources. They restart on the next request (cold start ~2–5s).

Disable idle timeout for always-on agents:

```bash
1claw runtime update <id> --idle-timeout 0
```

## Free tier

Cloud Runtimes require Pro or higher — `POST /v1/runtimes` returns 403 `upgrade_required` on Free. Upgrade at **Settings → Billing** — every paid plan includes one runtime (Small or Medium, up to 1 vCPU / 2 GB, no hour cap) at no charge; further runtimes, Large and Confidential Compute presets are monthly add-ons. An org that downgrades to Free keeps existing runtimes but can only run them for 10 hours in a 3-day window before they auto-stop.

## Next steps

- [Hosting quickstart](/docs/runtimes/hosting) — expose your runtime to the internet
- [Automations](/docs/automations/overview) — trigger your runtime on a schedule
- [Agent Memory](/docs/agents/memory) — persist state across runtime restarts
- [Shroud](/docs/agents/shroud/overview) — route runtime LLM traffic through the proxy
