---
title: Agent Environment Tagging
description: Tag agents with production, preview, or custom environments for policy scoping, env var auto-resolve, and per-environment guardrails.
keywords: [agent environment, env_auto_resolve, environment_in, per_environment_guardrails, JWT environment claim]
sidebar_position: 7
---

# Agent Environment Tagging (v0.52)

Tag agents with a named **environment** so policies, env var resolution, and transaction guardrails can differ between production, preview, development, and custom deployment targets — without maintaining separate agent records.

## Agent fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `environment` | string | `production`, `preview`, `development`, or a custom slug |
| `environment_locked` | boolean | When `true`, the tag cannot be changed after creation |
| `env_auto_resolve` | boolean | Resolve endpoint auto-fills `environment` from the agent tag |
| `per_environment_guardrails` | object | JSONB guardrail overrides keyed by environment slug |

All four fields appear on `CreateAgentRequest`, `UpdateAgentRequest`, and `AgentResponse`.

## JWT claim

Agent tokens from `POST /v1/auth/agent-token` include an `environment` claim when the agent has a tag. Auth middleware populates `CallerIdentity.environment` for policy evaluation and env var resolution.

## Policy scoping with `environment_in`

Built-in access policies support an `environment_in` array in the `conditions` JSON object. The policy matches only when the caller's environment is in the list:

```json
{
  "secret_path_pattern": "config/*",
  "permissions": ["read"],
  "conditions": {
    "environment_in": ["production", "preview"]
  }
}
```

Agents without an environment tag do not match `environment_in` conditions.

## Env var auto-resolve

When `env_auto_resolve` is `true` on an agent:

- `GET /v1/vaults/{id}/env-vars/resolve` may omit the `environment` query parameter
- The server uses the agent's tagged environment from the JWT
- MCP `resolve_env` behaves the same way

Org setting **`env.enforce_agent_environment_scope`** (Settings → Security) blocks agents from resolving vars for environments other than their tag — even if they pass a different `?environment=` query param.

## Per-environment guardrails

`per_environment_guardrails` lets you override transaction limits per environment without separate agents:

```json
{
  "production": {
    "max_value": "1.0",
    "daily_limit": "10.0",
    "to_allowlist": ["0x..."]
  },
  "preview": {
    "max_value": "0.1",
    "daily_limit": "1.0"
  }
}
```

Per-environment values intersect with global agent guardrails — the **strictest** limit wins.

## Create and update

### API

```bash
curl -s -X POST "https://api.1claw.co/v1/agents" \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "preview-bot",
    "environment": "preview",
    "environment_locked": false,
    "env_auto_resolve": true
  }'
```

```bash
curl -s -X PATCH "https://api.1claw.co/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "environment_locked": true,
    "per_environment_guardrails": {
      "production": { "max_value": "1.0" }
    }
  }'
```

Agents cannot PATCH their own record — only human users can update environment tags.

### CLI

```bash
1claw agent create preview-bot \
  --environment preview \
  --env-auto-resolve

1claw agent create prod-bot \
  --environment production \
  --environment-locked \
  --env-auto-resolve

1claw agent update $AGENT_ID \
  --environment production \
  --environment-locked true \
  --per-environment-guardrails '{"production":{"tx_max_value":"1.0"}}'
```

### SDK

```typescript
await client.agents.create({
  name: "preview-bot",
  environment: "preview",
  env_auto_resolve: true,
});

await client.agents.update(agentId, {
  environment: "production",
  environment_locked: true,
  per_environment_guardrails: {
    production: { max_value: "1.0", daily_limit: "10.0" },
  },
});

// Omit environment when env_auto_resolve is true on the agent JWT
const { vars } = await client.envVars.resolve(vaultId);
```

## Typical workflow

1. Create [environment variables](/docs/guides/environment-variables) on the vault for `production` and `preview`.
2. Register two agents (or one agent per environment) with matching `environment` tags.
3. Enable `env_auto_resolve` so runtime and MCP callers do not pass `?environment=` manually.
4. Add policies with `environment_in` so preview agents cannot read production-only paths.
5. Optionally enable `env.enforce_agent_environment_scope` org-wide for defense in depth.

## Dashboard

- **Agent create** — environment tag selector with lock and auto-resolve toggles
- **Agent detail** — edit environment, lock state, auto-resolve, and per-environment guardrails JSON

## Related

- [Environment Variables (v0.51)](/docs/guides/environment-variables) — per-key vars, resolve precedence, runtime injection
- [Intents API guardrails](/docs/agents/intents/guardrails) — global agent transaction limits
- [Scoped permissions](/docs/vaults/scoped-permissions) — path patterns and permissions
- [Changelog 2026 — v0.52.0](/docs/reference/changelog-2026#v0520--agent-environment-tagging-2026-08-18)
