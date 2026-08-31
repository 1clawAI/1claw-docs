---
title: Runtime Hosting
description: Expose Cloud Runtimes to the internet with public URLs, slug-based routing, and inbound authentication.
sidebar_label: "Hosting — public URLs for agent runtimes"
sidebar_position: 21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Runtime Hosting

Runtime Hosting gives your Cloud Runtimes a public HTTP endpoint at `{slug}.run.1claw.co`. Use it to expose agent APIs, webhooks, or dashboards — no load balancer or DNS configuration needed.

## How it works

```
Client                     1Claw Edge                    Your Runtime Container
  │                            │                                │
  │  GET https://my-bot.       │                                │
  │    run.1claw.co/chat      │                                │
  │  ──────────────────────►   │                                │
  │                            │  1. Route by slug               │
  │                            │  2. Verify inbound auth         │
  │                            │  3. Forward to container  ───►  │
  │                            │                                │
  │  ◄──────────────────────── │  ◄──── Response                │
```

1. A request arrives at `{slug}.run.1claw.co`
2. The edge resolves the slug to a running runtime
3. Inbound auth is enforced (if configured)
4. The request is forwarded to the container's HTTP port
5. If the runtime is idle-stopped, it auto-starts (cold start ~2–5s)

## Enable hosting

<Tabs groupId="code-examples">
<TabItem value="cli" label="CLI">

```bash
# Create a runtime with hosting enabled
1claw runtime create \
  --name "my-api-agent" \
  --template node \
  --preset medium \
  --expose-http \
  --slug "my-api-agent" \
  --inbound-auth api_key

# Enable hosting on an existing runtime
1claw runtime update <id> --expose-http --slug "my-api-agent"
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/runtimes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api-agent",
    "template": "node",
    "preset": "medium",
    "expose_http": true,
    "slug": "my-api-agent",
    "inbound_auth": "api_key"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: runtime } = await client.runtimes.create({
  name: "my-api-agent",
  template: "node",
  preset: "medium",
  expose_http: true,
  slug: "my-api-agent",
  inbound_auth: "api_key",
});
console.log(runtime.public_url); // https://my-api-agent.run.1claw.co
```

</TabItem>
</Tabs>

## Public URL format

```
https://{slug}.run.1claw.co
```

All paths and query parameters are forwarded as-is to your container. The container must listen on the configured `http_port` (default: 8080).

## Inbound authentication

Control who can reach your runtime:

| Mode | Header required | Use case |
|------|----------------|----------|
| `api_key` | `Authorization: Bearer <key>` | Private agent API |
| `jwt` | `Authorization: Bearer <1claw-jwt>` | 1Claw agent/user auth |
| `public` | None | Public webhooks, status pages |

### API key auth

When `inbound_auth: "api_key"`, the runtime gets an auto-generated inbound API key. Callers must include it as a Bearer token. The key is available from `GET /v1/runtimes/{id}` (human-only).

### JWT auth

When `inbound_auth: "jwt"`, the edge validates the incoming token as a 1Claw JWT (agent or user). The request is rejected with 401 if the token is invalid or expired.

### Public

No authentication. Use for:
- Webhook receivers
- Health check endpoints
- Public-facing agent UIs

:::warning
Public endpoints are accessible to anyone on the internet. Rate limiting is applied at the edge, but you should implement application-level auth if the endpoint handles sensitive data.
:::

## Slug rules

| Rule | Requirement |
|------|-------------|
| Length | 3–63 characters |
| Characters | Lowercase alphanumeric + hyphens |
| Start/end | Must not start or end with a hyphen |
| Reserved | `api`, `admin`, `status`, `www`, `mail`, etc. |
| Cooldown | 30-day cooldown after a slug is released |

### Check availability

```bash
1claw runtime slug-check my-agent-name
```

```bash
curl "https://api.1claw.co/v1/runtimes/slug-check/my-agent-name" \
  -H "Authorization: Bearer $TOKEN"
```

## Cold start behavior

If a runtime is stopped (idle timeout or manual stop), the first inbound request triggers an auto-start. During the cold start (~2–5s), the request is queued and forwarded once the container is ready.

To avoid cold starts for latency-sensitive endpoints, disable idle timeout:

```bash
1claw runtime update <id> --idle-timeout 0
```

## Custom port

By default, the edge forwards to port 8080. If your application listens on a different port:

```bash
1claw runtime update <id> --http-port 3000
```

## HTTPS and TLS

All `*.run.1claw.co` subdomains are automatically covered by a wildcard TLS certificate. You don't need to manage certificates. All traffic is encrypted end-to-end.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/runtimes` | Create runtime (with hosting config) |
| `PATCH` | `/v1/runtimes/{id}` | Update hosting settings |
| `GET` | `/v1/runtimes/slug-check/{slug}` | Check slug availability |

## Dashboard

On the runtime detail page:
1. Toggle **Expose HTTP** to enable/disable hosting
2. Set the **Slug** (auto-checks availability)
3. Choose **Inbound Auth** mode
4. Copy the public URL

## Example: expose a FastAPI agent

```python
# agent.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
async def chat(body: dict):
    # Your agent logic here
    return {"response": "Hello from the cloud!"}
```

```bash
1claw runtime create \
  --name "fastapi-agent" \
  --template python \
  --preset small \
  --expose-http \
  --slug "fastapi-agent" \
  --inbound-auth public \
  --env PORT=8080
```

Your agent is now live at `https://fastapi-agent.run.1claw.co/chat`.

## Next steps

- [Cloud Runtimes](/docs/runtimes/overview) — compute presets and lifecycle management
- [Automations](/docs/automations/overview) — trigger runtimes on a schedule
- [Shroud](/docs/agents/shroud/overview) — route runtime LLM traffic through the TEE proxy
