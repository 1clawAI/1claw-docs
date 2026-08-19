---
title: Environment Variables
description: Per-key encrypted env vars on vaults with Vercel-style environment scoping, org shared vars, branch overrides, and Cloud Runtime injection.
keywords: [environment variables, env vars, production, preview, development, resolve, runtime injection]
sidebar_position: 6
---

# Environment Variables (v0.51)

First-class per-key environment variables on vaults replace the legacy `config/prod/*` secret-path pattern. Each entry is envelope-encrypted, scoped to one or more **environments** (production, preview, development, or custom), and resolved at deploy time with explicit precedence.

## Concepts

| Concept | Description |
| ------- | ----------- |
| **Env var** | A named key (`DATABASE_URL`, `STRIPE_KEY`, …) with a value targeting specific environments |
| **Environment** | Built-in slugs (`production`, `preview`, `development`) plus tier-gated custom environments per vault |
| **Org shared var** | Organization-level var linked to multiple vaults — lowest precedence at resolve time |
| **Branch override** | Preview var with `git_branch` set — highest precedence when branch matches |
| **Sensitive var** | Write-only for humans after creation (list/get omit value); cannot target Development-only |

### Resolution precedence

`GET /v1/vaults/{id}/env-vars/resolve?environment=preview&git_branch=feat/x` returns the final `KEY=VALUE` map:

1. **Org shared vars** linked to the vault (lowest)
2. **Vault vars** for the environment (`git_branch IS NULL`)
3. **Branch overrides** where `git_branch` matches (highest)

Response includes `sources` mapping each key to `"shared"`, `"vault"`, or `"branch_override"`.

## API endpoints

### Vault-scoped

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/v1/vaults/{id}/env-vars` | List vars (filter `?environment=`) |
| `POST` | `/v1/vaults/{id}/env-vars` | Create var |
| `GET` | `/v1/vaults/{id}/env-vars/{key}` | Get var (`?environment=`, `?git_branch=`) |
| `PATCH` | `/v1/vaults/{id}/env-vars/{key}` | Update var |
| `DELETE` | `/v1/vaults/{id}/env-vars/{key}` | Delete var |
| `GET` | `/v1/vaults/{id}/env-vars/resolve` | Resolve final KEY=VALUE set |
| `GET` | `/v1/vaults/{id}/environments` | List environments |
| `POST` | `/v1/vaults/{id}/environments` | Create custom environment |
| `DELETE` | `/v1/vaults/{id}/environments/{slug}` | Delete custom environment |

### Org-scoped shared vars

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/v1/org/env-vars` | List shared vars |
| `POST` | `/v1/org/env-vars` | Create shared var |
| `PATCH` | `/v1/org/env-vars/{key}` | Update shared var |
| `DELETE` | `/v1/org/env-vars/{id}` | Delete shared var |
| `POST` | `/v1/org/env-vars/{id}/link` | Link shared var to a vault |
| `DELETE` | `/v1/org/env-vars/{id}/links/{vault_id}` | Unlink from vault |

Limit: **1,000 vars per vault**.

## Example: create and resolve

```bash
# Create a production-scoped var
curl -s -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/env-vars" \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "DATABASE_URL",
    "value": "postgres://prod.example/db",
    "environments": ["production"],
    "sensitive": true
  }'

# Resolve for preview with optional branch
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/env-vars/resolve?environment=preview&git_branch=feat/auth" \
  -H "Authorization: Bearer $ONECLAW_TOKEN" | jq
```

## SDK

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.xyz", apiKey: process.env.ONECLAW_API_KEY! });

await client.envVars.create(vaultId, {
  key: "STRIPE_KEY",
  value: "sk_live_...",
  environments: ["production"],
  sensitive: true,
});

const { vars, sources } = await client.envVars.resolve(vaultId, "production");
```

See [JavaScript SDK — Environment Variables](/docs/sdks/javascript#environment-variables) for the full API surface.

## CLI

Per-key management (distinct from legacy `env pull`/`push` which sync path-based secrets):

```bash
1claw env ls production                        # List vars for an environment
1claw env add DATABASE_URL production          # Add var scoped to production
1claw env add API_KEY preview --sensitive      # Sensitive write-only var
1claw env rm DATABASE_URL preview              # Remove from preview
1claw env environments ls                      # List vault environments
1claw env environments add staging             # Create custom environment
1claw env environments rm staging              # Delete custom environment
```

Legacy path-based workflows still support environment scoping:

```bash
1claw env pull -e production -o .env.production
1claw env push .env -e staging
1claw env run -e production -- npm start
```

## MCP

| Tool | Purpose |
| ---- | ------- |
| `resolve_env` | Returns the resolved KEY=VALUE map for a vault and environment |

When the calling agent has `env_auto_resolve: true`, omit `environment` and the server uses the agent's tagged environment from the JWT. See [Agent Environment Tagging](/docs/guides/agent-environment-tagging).

## Cloud Runtime injection

When a [Cloud Runtime](/docs/runtimes/overview) starts or rebuilds, the Vault resolves env vars for `runtime.environment` (plus `source_branch` as `git_branch`) and merges them into the container environment. Vault-resolved keys win over `env_public`. Combined limit: **64 KB**. Restart required after env var changes.

## Org settings (Settings → Security)

| Setting | Key | Effect |
| ------- | --- | ------ |
| Require sensitive prod/preview vars | `env.require_sensitive_prod` | Forces `sensitive: true` on production and preview vars |
| Enforce agent environment scope | `env.enforce_agent_environment_scope` | Agents may only resolve vars for their tagged environment |

## Custom environment tiers

| Tier | Custom environments per vault |
| ---- | ------------------------------ |
| Pro | 1 |
| Team | 5 |
| Business | 12 |
| Enterprise | Unlimited |

## Dashboard

- **Vault detail → Env Variables** — CRUD, environment filter, sensitive toggle
- **Org Settings → Shared Env Vars** — org-level vars and vault links
- **Manage Environments** dialog on vault detail — built-in + custom slugs

## Related

- [Agent Environment Tagging (v0.52)](/docs/guides/agent-environment-tagging) — tag agents so resolve auto-fills `environment`
- [CLI integration](/docs/integrations/cli) — full command reference
- [MCP integration](/docs/integrations/mcp-integration) — `resolve_env` tool
- [Changelog 2026 — v0.51.0](/docs/reference/changelog-2026#v0510--environment-variables-2026-08-18)
