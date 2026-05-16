---
title: Platform API
description: Build multi-tenant products on 1Claw — provision users, bootstrap vaults/agents/policies from templates, and manage connected user infrastructure.
sidebar_position: 14
---

# Platform API

The Platform API lets you build products on top of 1Claw. Register your app, create bootstrap templates, provision end-users, and manage their secrets infrastructure — all with custody guarantees that prevent your platform from accessing end-user secrets.

:::info Requirements
The Platform API requires a **Pro or higher** subscription. [Upgrade your plan →](/settings/billing)
:::

## Quickstart (~10 min)

### 1. Register a Platform App

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My DeFi Platform",
    "slug": "my-defi",
    "description": "DeFi automation for end users",
    "billing_model": "platform_pays",
    "auth_mode": "silent"
  }'
```

Save the returned `api_key` (prefixed `plt_`) — it won't be shown again. This key authenticates all subsequent Platform API calls.

### 2. Create a Bootstrap Template

Templates define what gets created for each user: a vault, agents, and access policies.

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/APP_ID/templates" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "default-template",
    "spec": {
      "vault": {
        "name": "user-vault",
        "description": "Auto-provisioned vault"
      },
      "agents": [{
        "name": "defi-bot",
        "description": "Automated DeFi agent",
        "intents": { "enabled": true },
        "shroud_enabled": true,
        "shroud_config": {
          "pii_policy": "redact",
          "enable_secret_redaction": true
        }
      }],
      "policies": [{
        "principal_ref": "agents.primary",
        "vault_ref": "vault",
        "paths": ["api-keys/*", "keys/*"],
        "permissions": ["read", "write"],
        "conditions": {}
      }]
    }
  }'
```

### 3. Provision a User

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/users/upsert" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "external_subject": "telegram:123456789"
  }'
```

### 4. Bootstrap the User

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/bootstrap" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "TEMPLATE_UUID"
  }'
```

The response includes `claim_url`, `claim_token`, and `summary` (with `vault_id`, `agent_id`, `policy_ids`).

### 5. Share the Claim URL

Send the `claim_url` to your end user (e.g. via your app's UI, email, or bot message). When they visit it, they'll see what was provisioned and can claim the resources with one click.

The claim URL format is `https://1claw.xyz/connect/{slug}/claim/{token}`. It expires after 10 minutes.

**Programmatic claim** (for headless flows):

```bash
# Preview what was provisioned
curl "https://api.1claw.xyz/v1/platform/claim/ct_TOKEN"

# Redeem the claim
curl -X POST "https://api.1claw.xyz/v1/platform/claim/ct_TOKEN"
```

### 6. Agent Access is Automatic

After bootstrap, the agent already has access to the vault paths defined in your template's `policies` array. No additional delegation step is needed — the bootstrap template creates both the agent and its access policies in one atomic operation.

If the user needs to grant the agent access to *additional* paths later, they can:
1. Visit the vault's **Policies** tab in the dashboard
2. Create a new access policy for the agent
3. Or use the API: `POST /v1/vaults/{vault_id}/policies`

---

## Template Spec Reference

The `spec` field is a JSON object with three top-level keys: `vault`, `agents`, and `policies`. All are optional — include only what you need.

### `vault`

Creates a single vault for the user.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | `"main"` | Vault name |
| `description` | string | `""` | Vault description |

```json
{
  "vault": {
    "name": "prod-secrets",
    "description": "Production API keys and credentials"
  }
}
```

### `agents`

Array of agent definitions. Each entry creates one agent with an auto-generated `ocv_` API key.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | `"primary"` | Agent name |
| `description` | string | `""` | Agent description |
| `intents.enabled` | boolean | `false` | Enable the Intents API (transaction signing) |
| `shroud_enabled` | boolean | `false` | Route LLM traffic through Shroud TEE |
| `shroud_config` | object | `null` | Per-agent Shroud policy (PII, injection thresholds, etc.) |

```json
{
  "agents": [
    {
      "name": "trading-bot",
      "description": "Executes DeFi trades",
      "intents": { "enabled": true },
      "shroud_enabled": true,
      "shroud_config": {
        "pii_policy": "redact",
        "injection_threshold": 0.7,
        "allowed_providers": ["openai", "anthropic"],
        "enable_secret_redaction": true
      }
    }
  ]
}
```

:::caution intents vs intents_api_enabled
In the template spec, use `"intents": { "enabled": true }` (nested object). This is different from the direct agent creation API which uses `"intents_api_enabled": true` (flat boolean). The bootstrap engine translates between the two formats.
:::

### `policies`

Array of access policies linking agents to vault paths.

| Field | Type | Default | Description |
|---|---|---|---|
| `principal_ref` | string | first agent | Reference to the agent. Use `"agents.primary"` for the first agent. |
| `vault_ref` | string | created vault | Reference to the vault. Use `"vault"` for the template-created vault. |
| `paths` | string[] | `["**"]` | Glob patterns for secret paths the agent can access |
| `permissions` | string[] | `["read", "write"]` | Permission set: `read`, `write`, `rotate` |
| `conditions` | object | `{}` | Optional conditions (IP allowlist, time windows) |

```json
{
  "policies": [
    {
      "principal_ref": "agents.primary",
      "vault_ref": "vault",
      "paths": ["api-keys/*", "keys/*"],
      "permissions": ["read", "write"]
    },
    {
      "principal_ref": "agents.primary",
      "vault_ref": "vault",
      "paths": ["config/**"],
      "permissions": ["read"],
      "conditions": {
        "ip_allowlist": ["10.0.0.0/8"]
      }
    }
  ]
}
```

---

## Full Template Example

A complete template for a DeFi trading platform with Shroud inspection, Intents API, and multi-chain signing keys:

```json
{
  "name": "defi-trading-template",
  "spec": {
    "vault": {
      "name": "trading-vault",
      "description": "Keys and credentials for automated trading"
    },
    "agents": [
      {
        "name": "trade-executor",
        "description": "Executes on-chain trades via Intents API",
        "intents": { "enabled": true },
        "shroud_enabled": true,
        "shroud_config": {
          "pii_policy": "redact",
          "injection_threshold": 0.7,
          "enable_secret_redaction": true,
          "allowed_providers": ["openai", "anthropic"],
          "max_requests_per_minute": 60,
          "daily_budget_usd": 50
        }
      }
    ],
    "signing_keys": [
      { "chain": "ethereum" },
      { "chain": "solana" }
    ],
    "policies": [
      {
        "principal_ref": "agents.primary",
        "vault_ref": "vault",
        "paths": ["keys/*", "api-keys/*"],
        "permissions": ["read"]
      },
      {
        "principal_ref": "agents.primary",
        "vault_ref": "vault",
        "paths": ["config/**"],
        "permissions": ["read", "write"]
      }
    ]
  }
}
```

---

## Auth Modes

Set `auth_mode` when creating your platform app:

| Mode | Description |
|---|---|
| `silent` | Users are provisioned without sign-in. Best for bot-first platforms (Telegram, Discord). The `claim_url` is still returned — share it so users can manage their vault in the dashboard. |
| `user_signin` | Users must sign in to 1Claw before claiming. Best for web apps where users already have accounts. |
| `configurable` | Let the operator choose per-user at bootstrap time. |

## Billing Models

| Model | Description |
|---|---|
| `platform_pays` | All API usage is billed to the platform's subscription. |
| `user_pays` | Each connected user is billed individually. |
| `hybrid` | Platform covers base usage; overages billed to users. |

---

### `signing_keys`

Array of blockchain signing keys to auto-provision for the first agent at bootstrap time. Each entry generates a keypair, stores the private key in the `__agent-keys` vault, and records the public key on the agent. Requires at least one agent with `intents.enabled: true`.

| Field | Type | Description |
|---|---|---|
| `chain` | string | Blockchain name: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron` |

```json
{
  "signing_keys": [
    { "chain": "ethereum" },
    { "chain": "solana" }
  ]
}
```

:::tip
Signing keys are provisioned server-side during bootstrap — the platform operator never sees the private keys, and no user interaction is required. The `plt_` key cannot read signing keys across the org boundary, maintaining custody separation.
:::

---

## Platform Audit

Track all platform-related events for your app:

```bash
curl "https://api.1claw.xyz/v1/platform/apps/APP_ID/audit" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

Returns `platform.*` audit events (app creation, user provisioning, bootstrap, template changes).

---

## Current Limitations

- **Delegated token exchange** (RFC 8693 `DelegatedTokenRequest`) is defined but not yet wired. Platform operators cannot issue delegated JWTs on behalf of connected users.
- **`plt_` keys** can see user metadata but cannot directly access user signing keys (`GET /v1/agents/{id}/signing-keys`). The org boundary prevents cross-org reads. Use the user's agent token or wait for delegated tokens.

## Security

- **OIDC audience enforcement**: Platform apps can set `oidc_audience` to restrict which JWT audiences are accepted during OIDC user provisioning. When set, JWTs with a mismatched `aud` claim are rejected.
- **JWKS SSRF prevention**: The `oidc_jwks_url` field is validated against private CIDRs, cloud metadata endpoints, and localhost to prevent SSRF attacks.
- **Cross-org binding protection**: `upsert_user` enforces that the user belongs to the same org as the platform app.

---

## SDK Usage

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "plt_YOUR_KEY",
});

// Create a template
const template = await client.platform.createTemplate(appId, {
  name: "default-template",
  spec: {
    vault: { name: "user-vault" },
    agents: [{ name: "bot", intents: { enabled: true } }],
    policies: [{ principal_ref: "agents.primary", vault_ref: "vault", paths: ["**"] }],
  },
});

// Provision + bootstrap a user
const user = await client.platform.upsertUser({
  email: "user@example.com",
  external_subject: "tg:12345",
});
const result = await client.platform.bootstrapUser(user.data.connection_id, {
  template_id: template.data.id,
});
console.log("Claim URL:", result.data.claim_url);
console.log("Agent ID:", result.data.summary.agent_id);
```
