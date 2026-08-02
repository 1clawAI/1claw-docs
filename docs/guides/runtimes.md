---
title: Cloud Runtimes
description: Deploy AI agents in managed Docker containers with secret injection, Shroud sidecar, public HTTP hosting, and idle auto-stop.
sidebar_position: 21
---

# Cloud Runtimes

Cloud Runtimes let you deploy AI agents in managed Docker containers with built-in secret injection, optional Shroud sidecar for LLM traffic protection, public HTTP hosting, and automatic idle shutdown. No Kubernetes expertise required — just point to an image and go.

:::info Requirements
Runtimes are available on all tiers with varying limits. Business+ tiers unlock confidential compute presets. See [Tier Limits](#tier-limits) below.
:::

## Overview

A runtime is a managed container that:

- **Injects vault secrets** as environment variables at startup
- **Optionally runs a Shroud sidecar** for LLM proxy and secret redaction
- **Exposes an HTTP endpoint** with slug-based subdomains (`{slug}.run.1claw.xyz`)
- **Auto-stops** after an idle timeout to save costs
- **Provides web terminal access** from the dashboard for debugging

---

## Creating a Runtime

```bash
curl -X POST "https://api.1claw.xyz/v1/runtimes" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trading-agent",
    "agent_id": "AGENT_UUID",
    "preset": "medium",
    "image": "ghcr.io/myorg/trading-bot:latest",
    "env_public": {
      "LOG_LEVEL": "info",
      "CHAIN": "ethereum"
    },
    "idle_timeout_secs": 1800,
    "expose_http": true,
    "slug": "my-trading-agent",
    "http_port": 8080,
    "inbound_auth": "api_key"
  }'
```

---

## Presets

| Preset | vCPU | Memory | Monthly Cost | Notes |
|---|---|---|---|---|
| `small` | 0.5 | 1 GB | $15/mo | Good for lightweight bots |
| `medium` | 1 | 2 GB | $39/mo | Recommended for most agents |
| `large` | 2 | 4 GB | $99/mo | For memory-intensive workloads |
| `small-cc` | 0.5 | 1 GB | $35/mo | Confidential compute (TEE) |
| `medium-cc` | 1 | 2 GB | $75/mo | Confidential compute (TEE) |
| `large-cc` | 2 | 4 GB | $149/mo | Confidential compute (TEE) |

Confidential compute (`-cc`) presets run on AMD SEV-SNP enclaves, providing hardware-level memory encryption. Secrets and signing keys are never exposed to the host OS.

---

## Lifecycle

```
create → start → running → (idle timeout) → stopped → start → running → ...
                                                        └── delete
```

| State | Description |
|---|---|
| `created` | Configuration saved, container not yet provisioned |
| `starting` | Container is being pulled and started |
| `running` | Container is live and accepting requests |
| `stopping` | Graceful shutdown in progress |
| `stopped` | Container terminated, can be restarted |
| `error` | Container failed to start or crashed |

### Start and stop

```bash
# Start a runtime
curl -X POST "https://api.1claw.xyz/v1/runtimes/RUNTIME_ID/start" \
  -H "Authorization: Bearer YOUR_JWT"

# Stop a runtime
curl -X POST "https://api.1claw.xyz/v1/runtimes/RUNTIME_ID/stop" \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## Public HTTP Hosting

When `expose_http: true`, your runtime gets a public URL:

```
https://{slug}.run.1claw.xyz
```

### Inbound auth modes

| Mode | Description |
|---|---|
| `api_key` | Requires `Authorization: Bearer <key>` — a key is auto-generated on creation |
| `jwt` | Accepts 1Claw JWTs (agent or user tokens) |
| `public` | No authentication required |

:::warning
Use `public` only for read-only endpoints or webhooks. For anything handling sensitive data, use `api_key` or `jwt`.
:::

### Slug management

Slugs must be globally unique, 3–63 characters, lowercase alphanumeric with hyphens. Check availability before creating:

```bash
curl "https://api.1claw.xyz/v1/runtimes/slug-check/my-agent-slug" \
  -H "Authorization: Bearer YOUR_JWT"
# → { "available": true }
```

Released slugs have a 30-day cooldown before they can be reused.

---

## Secret Injection

Runtimes inject vault secrets as environment variables at container startup. The agent bound to the runtime (`agent_id`) determines which secrets are accessible based on its policies.

Secrets are resolved from the agent's bound vault(s) and injected as `ONECLAW_SECRET_{PATH}` environment variables, with path separators replaced by underscores and uppercased:

- Vault path `api-keys/openai` → env var `ONECLAW_SECRET_API_KEYS_OPENAI`

Public (non-secret) env vars are set via the `env_public` field on the runtime.

---

## Web Terminal Access

The dashboard provides a web-based terminal for running containers. Navigate to **Runtimes → your runtime → Terminal** to get shell access for debugging.

:::tip
Web terminal sessions are logged in the audit trail. Use them for debugging, not for running production operations.
:::

---

## Idle Timeout and Auto-Stop

Set `idle_timeout_secs` to automatically stop the runtime after a period of inactivity (no inbound HTTP requests or active processes). This saves costs for agents that run periodically.

| Value | Behavior |
|---|---|
| `0` | Never auto-stop |
| `300` | Stop after 5 minutes idle |
| `1800` | Stop after 30 minutes idle (default) |
| `3600` | Stop after 1 hour idle |

The `runtime_controller` background worker checks every 30 seconds and initiates graceful shutdown when the idle threshold is exceeded.

---

## Viewing Logs

```bash
curl "https://api.1claw.xyz/v1/runtimes/RUNTIME_ID/logs?lines=100&since=2026-08-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_JWT"
```

Response:

```json
{
  "logs": [
    { "timestamp": "2026-08-01T12:00:01Z", "stream": "stdout", "message": "Agent started" },
    { "timestamp": "2026-08-01T12:00:02Z", "stream": "stdout", "message": "Listening on :8080" }
  ]
}
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | `/v1/runtimes` | Create runtime |
| GET | `/v1/runtimes` | List runtimes |
| GET | `/v1/runtimes/{id}` | Get runtime details |
| PATCH | `/v1/runtimes/{id}` | Update runtime config |
| DELETE | `/v1/runtimes/{id}` | Delete runtime |
| POST | `/v1/runtimes/{id}/start` | Start runtime |
| POST | `/v1/runtimes/{id}/stop` | Stop runtime |
| GET | `/v1/runtimes/{id}/logs` | Get container logs |
| GET | `/v1/runtimes/slug-check/{slug}` | Check slug availability |

---

## SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "1ck_YOUR_KEY",
});

// Create a runtime
const runtime = await client.runtimes.create({
  name: "my-agent",
  agent_id: "AGENT_UUID",
  preset: "medium",
  image: "ghcr.io/myorg/agent:latest",
  expose_http: true,
  slug: "my-agent",
  http_port: 8080,
  inbound_auth: "api_key",
  idle_timeout_secs: 1800,
});

// Start it
await client.runtimes.start(runtime.data.id);

// Check status
const status = await client.runtimes.get(runtime.data.id);
console.log(status.data.status); // "running"

// View logs
const logs = await client.runtimes.logs(runtime.data.id, { lines: 50 });

// Stop when done
await client.runtimes.stop(runtime.data.id);

// Check slug availability
const check = await client.runtimes.checkSlug("my-agent-slug");
```

---

## CLI

```bash
# Create a runtime
1claw runtime create --name "my-agent" \
  --agent AGENT_ID --preset medium \
  --image ghcr.io/myorg/agent:latest \
  --slug my-agent --expose-http --port 8080

# List runtimes
1claw runtime list

# Get details
1claw runtime get RUNTIME_ID

# Start / stop
1claw runtime start RUNTIME_ID
1claw runtime stop RUNTIME_ID

# View logs (streaming)
1claw runtime logs RUNTIME_ID --follow

# Update config
1claw runtime update RUNTIME_ID --preset large --idle-timeout 3600

# Check slug
1claw runtime slug-check my-agent-slug

# Delete
1claw runtime delete RUNTIME_ID
```

---

## MCP Tools

| Tool | Description |
|---|---|
| `list_runtimes` | List all runtimes for the org |
| `manage_runtime` | Create, update, start, stop, or delete a runtime |
| `runtime_status` | Get current status and metadata |
| `runtime_logs` | Fetch recent container logs |

---

## Tier Limits

| Tier | Max Runtimes | Monthly Hours | Presets |
|---|---|---|---|
| Free | 1 | 10 | `small` only |
| Pro | 3 | 100 | All standard |
| Team | 10 | 500 | All standard |
| Business | 25 | 2,000 | All (incl. confidential compute) |
| Enterprise | Unlimited | Unlimited | All |

:::tip Cost control
Use `idle_timeout_secs` aggressively for development runtimes. A 5-minute timeout means you only pay for active usage. Production runtimes handling traffic should set `0` (never auto-stop).
:::

---

## Best Practices

1. **Use the smallest preset that works** — start with `small` and scale up based on observed memory/CPU usage in logs.
2. **Set idle timeouts for dev environments** — keeps costs predictable during development.
3. **Use `api_key` auth for production endpoints** — the auto-generated key is included in the runtime creation response.
4. **Pin image tags** — avoid `:latest` in production to prevent unexpected behavior on restart.
5. **Monitor with the dashboard** — the Runtimes page shows uptime, resource usage, and recent logs at a glance.
