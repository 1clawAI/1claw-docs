---
title: Hosting
description: Expose your agent runtime to the internet with a public URL and inbound authentication.
sidebar_label: "Hosting — public URLs for agent runtimes"
---

# Hosting

Hosting turns your Cloud Runtime into a public HTTP endpoint. Agents get a stable URL at `{slug}.run.1claw.xyz` with built-in authentication and inspection.

## How hosting works

When you enable `expose_http` on a runtime, 1Claw:

1. Assigns a public URL: `https://{slug}.run.1claw.xyz`
2. Routes inbound traffic to your container's HTTP port (default: 8080)
3. Enforces your chosen authentication mode
4. Optionally proxies through Shroud for inbound inspection

```
Client → slug.run.1claw.xyz → [Auth] → [Shroud?] → Container:8080
```

## Quick start

```bash
# Create a runtime with hosting enabled
1claw runtime create \
  --name "my-api-agent" \
  --template node \
  --preset medium \
  --expose-http \
  --slug "my-api-agent" \
  --inbound-auth api_key

# Your agent is live at:
# https://my-api-agent.run.1claw.xyz
```

## Inbound authentication modes

| Mode | Header | Use case |
|------|--------|----------|
| `api_key` | `Authorization: Bearer <key>` | Service-to-service, CI/CD |
| `jwt` | `Authorization: Bearer <1claw-jwt>` | 1Claw agents/users calling each other |
| `public` | None required | Webhooks, public APIs (use with caution) |

### API key mode

When `inbound_auth: "api_key"`, 1Claw generates a key at runtime creation. Callers must include it:

```bash
curl https://my-api-agent.run.1claw.xyz/chat \
  -H "Authorization: Bearer rt_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### JWT mode

Validates 1Claw JWTs (from `POST /v1/auth/agent-token` or user login). Useful for agent-to-agent communication within the same org.

### Public mode

No authentication — anyone can call the endpoint. Recommended only for webhook receivers or public-facing APIs with their own auth layer.

## Slug validation

Slugs must be:
- 3–63 characters
- Lowercase alphanumeric + hyphens
- No leading/trailing hyphens
- Not a reserved word (`api`, `admin`, `www`, `status`, `app`, etc.)

Released slugs have a **30-day cooldown** before reuse.

Check availability:

```bash
1claw runtime slug-check my-agent-name
# ✓ "my-agent-name" is available
```

## A2A agent discovery

Hosted runtimes automatically serve `/.well-known/agent.json` for [Agent-to-Agent (A2A)](https://google.github.io/A2A/) discovery:

```json
{
  "name": "my-api-agent",
  "description": "Research assistant with web search",
  "url": "https://my-api-agent.run.1claw.xyz",
  "capabilities": ["chat", "search"],
  "authentication": {
    "type": "bearer",
    "scheme": "1claw-jwt"
  }
}
```

Configure the A2A card via the dashboard or `PATCH /v1/agents/{id}/discovery`.

Combined with the [Agent Directory](/docs/guides/agent-directory), this enables agents to discover and communicate with each other.

## Security: inbound inspection proxy

For runtimes with Shroud enabled, inbound requests pass through an inspection layer:

- **Secret detection** — blocks requests containing leaked credentials
- **Injection scoring** — flags prompt injection attempts
- **Rate limiting** — per-IP and per-key limits
- **Body size limits** — 5 MB max request body

Enable via the dashboard runtime settings or:

```bash
1claw runtime update <id> --shroud-inbound true
```

## Custom domains (coming soon)

Custom domain support is on the roadmap. You'll be able to:

```bash
1claw runtime update <id> --custom-domain api.mycompany.com
```

For now, use a CNAME or reverse proxy pointing to `{slug}.run.1claw.xyz`.

## Configuration reference

| Field | Default | Description |
|-------|---------|-------------|
| `expose_http` | `false` | Enable public URL |
| `slug` | auto-generated | URL slug |
| `http_port` | `8080` | Container port to route to |
| `inbound_auth` | `api_key` | Authentication mode |
| `idle_timeout_secs` | `300` (Free) / `900` (Pro+) | Auto-stop after inactivity |

## Next steps

- [Cloud Runtimes](/docs/guides/runtimes) — full runtime configuration
- [Agent Discovery](/docs/guides/agent-directory) — list your agent in the public directory
- [Shroud](/docs/guides/shroud) — protect inbound and outbound traffic
