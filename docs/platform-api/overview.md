---
title: Platform API
description: Build multi-tenant products on 1Claw — provision users, bootstrap vaults/agents/policies from templates, and manage connected user infrastructure.
sidebar_position: 14
---

# Platform API

The Platform API lets you build products on top of 1Claw. Register your app, create bootstrap templates, provision end-users, and manage their secrets infrastructure — all with custody guarantees that prevent your platform from accessing end-user secrets.

:::info Requirements
The Platform API requires a **Pro or higher** subscription. [Upgrade your plan →](https://1claw.co/settings/billing)
:::

## Quickstart (~10 min)

### 1. Register a Platform App

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My DeFi Platform",
    "slug": "my-defi",
    "description": "DeFi automation for end users",
    "billing_model": "platform_pays",
    "auth_mode": "silent",
    "max_connected_users": 1000,
    "max_requests_per_minute": 120
  }'
```

Save the returned `api_key` (prefixed `plt_`) — it won't be shown again. This key authenticates all subsequent Platform API calls.

Optional fields on app creation:

| Field | Type | Description |
|---|---|---|
| `max_connected_users` | integer | Cap on connected users (new connections rejected when reached) |
| `max_requests_per_minute` | integer | Per-app rate limit for Platform API endpoints |

:::tip Key expiration and rotation
Set `api_key_expires_at` (ISO 8601) when creating the app to auto-expire the key. Rotate at any time with `POST /v1/platform/apps/{id}/rotate-key`, optionally setting a new expiry. Expired keys return 401.
:::

### 2. Create a Bootstrap Template

Templates define what gets created for each user: a vault, agents, and access policies.

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps/APP_ID/templates" \
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
curl -X POST "https://api.1claw.co/v1/platform/users/upsert" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "external_subject": "telegram:123456789"
  }'
```

Set `create_sub_org: true` to auto-create a sub-organization for the connected user, giving them isolated resources under the parent org:

```bash
curl -X POST "https://api.1claw.co/v1/platform/users/upsert" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "external_subject": "telegram:123456789",
    "create_sub_org": true
  }'
```

### 4. Bootstrap the User

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/bootstrap" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "TEMPLATE_UUID"
  }'
```

The response includes `claim_url`, `claim_token`, and `summary` (with `vault_id`, `agent_id`, `policy_ids`, `agent_api_key` — one-time, and `signing_keys[]` when signing keys are defined in the template). See [Step 7](#7-operate-the-bootstrapped-agent) for how to use the agent API key and signing keys.

### 5. Share the Claim URL

Send the `claim_url` to your end user (e.g. via your app's UI, email, or bot message). When they visit it, they'll see what was provisioned and can claim the resources with one click.

The claim URL format is `https://1claw.co/connect/{slug}/claim/{token}`. It expires after 10 minutes.

**Reissue an expired claim URL:**

If the token expires before your user claims, mint a fresh one without re-provisioning:

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/reissue-claim" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
# → { "claim_url": "...", "claim_token": "ct_...", "expires_in": 600, "connection_id": "..." }
```

**Programmatic claim** (for headless flows):

```bash
# Preview what was provisioned
curl "https://api.1claw.co/v1/platform/claim/ct_TOKEN"

# Redeem the claim
curl -X POST "https://api.1claw.co/v1/platform/claim/ct_TOKEN"
```

### 6. Agent Access is Automatic

After bootstrap, the agent already has access to the vault paths defined in your template's `policies` array. No additional delegation step is needed — the bootstrap template creates both the agent and its access policies in one atomic operation.

If the user needs to grant the agent access to *additional* paths later, they can:
1. Visit the vault's **Policies** tab in the dashboard
2. Create a new access policy for the agent
3. Or use the API: `POST /v1/vaults/{vault_id}/policies`

### 7. Operate the Bootstrapped Agent

The bootstrap response includes `summary.agent_api_key` (one-time, like regular agent creation) and `summary.signing_keys` (chain, address, public key). Store the API key securely — it won't be shown again.

**Get an agent JWT:**

```bash
curl -X POST "https://api.1claw.co/v1/auth/agent-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_UUID",
    "api_key": "ocv_AGENT_API_KEY"
  }'
# → { "access_token": "eyJ...", "vault_ids": ["..."] }
```

**Get the agent's on-chain address (signing key):**

Agent wallet addresses come from **signing keys** provisioned at bootstrap (`summary.signing_keys` or template `signing_keys[]`). Retrieve them later with the **connection-scoped** endpoint (plt_ auth — do not use `GET /v1/agents/{id}/signing-keys`, which is org-bound and returns 403 for platform keys):

```bash
curl "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/signing-keys?agent_id=AGENT_UUID" \
  -H "Authorization: Bearer plt_YOUR_KEY"
# → { "keys": [{ "chain": "ethereum", "address": "0x...", "public_key": "...", "curve": "secp256k1", "is_active": true }] }

curl "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/signing-keys/ethereum?agent_id=AGENT_UUID" \
  -H "Authorization: Bearer plt_YOUR_KEY"
# → { "chain": "ethereum", "address": "0x...", "public_key": "...", "curve": "secp256k1" }
```

:::warning `wallet_address` ≠ agent signing key
`GET /v1/platform/connections/{id}` includes `wallet_address` when the user was provisioned via **SIWE** — that is the **staker's EIP-4361 wallet** (identity / upsert subject), **not** the agent's Intents signing address. For agent transactions, deposits, or balance checks, use **`GET .../signing-keys`** (or bootstrap `summary.signing_keys`).
:::

**Submit a transaction (Intents API):**

```bash
AGENT_JWT="eyJ..."  # from token exchange above

curl -X POST "https://api.1claw.co/v1/agents/AGENT_UUID/transactions" \
  -H "Authorization: Bearer $AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "chain_id": 1,
    "to": "0xRecipientAddress",
    "value": "0.01",
    "data": "0x"
  }'
# → { "tx_hash": "0x...", "signed_tx": "0x...", "status": "broadcast" }
```

**Sign without broadcasting (sign-only mode):**

```bash
curl -X POST "https://api.1claw.co/v1/agents/AGENT_UUID/transactions/sign" \
  -H "Authorization: Bearer $AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "chain_id": 1,
    "to": "0xRecipientAddress",
    "value": "0.01",
    "data": "0x"
  }'
# → { "signed_tx": "0x...", "tx_hash": "0x...", "from": "0x...", "status": "sign_only" }
```

:::tip Platform Flow Summary
1. **Bootstrap** → save `agent_api_key` and `signing_keys[].address` from the response
2. **Token exchange** → `POST /v1/auth/agent-token` with the agent's `ocv_` key → get a JWT
3. **Operate** → use the JWT to submit transactions, sign messages, or read secrets
4. The platform never needs a "delegation token" — the agent authenticates directly with its own key
:::

---

## Template Spec Reference

The `spec` field is a JSON object with top-level keys: `vault`, `agents`, `policies`, `signing_keys`, `runtimes`, `automations`, and optional `plan`. All resource keys are optional — include only what you need.

### Template field aliases

Bootstrap templates accept **shorthand aliases** that map to agent API field names. Priority: direct API field name → boolean shorthand → `{ "enabled": true }` object.

| Maps to (agent DB / API) | Accepted in template spec |
|---|---|
| `intents_api_enabled` | `intents_api_enabled`, `intents: true`, `intents: { "enabled": true }` |
| `execution_intents_enabled` | `execution_intents_enabled`, `execution: true`, `execution: { "enabled": true }` |

Direct field names win over conflicting shorthands (e.g. `intents_api_enabled: true` with `intents: false` still enables Intents API).

:::warning `intents: true` does not enable execution

`intents` is shorthand for **`intents_api_enabled` only**. It does not set
`execution_intents_enabled`, which has its own separate shorthand (`execution`).

The two flags do different things, and an agent with one and not the other is a
confusing halfway state: it can compose an intent and will be refused when it
tries to execute one, with "Execution Intents not enabled for this agent". If
you want both, set both:

```json
{ "intents": true, "execution": true }
```

or, unambiguously:

```json
{ "intents_api_enabled": true, "execution_intents_enabled": true }
```
:::

**Inheritance.** Each flag is resolved per agent first, then from the template
root. If an agent spec sets *either* the direct field or its shorthand, the
agent's value is used and the template root is ignored for that flag; if it sets
neither, the root value applies. So a root-level `intents: true` covers every
agent that stays silent about it, and an agent that mentions `intents` at all
takes full responsibility for its own value.

### `plan` (platform_pays tier inheritance)

When the platform app uses `billing_model: "platform_pays"`, an optional top-level `plan` in the template spec grants a billing tier to the end-user org at bootstrap (default **`pro`** if omitted). Valid values: `free`, `pro`, `team`, `business`, `enterprise` — capped to the platform org's effective tier. `GET /v1/platform/connections/{id}` returns `provisioned_tier` when set.

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
| `system_prompt` | string | — | Default system prompt for agent chat (also on `POST/PATCH /v1/agents`) |
| `intents.enabled` | boolean | `false` | Enable the Intents API (transaction signing); see aliases above |
| `execution.enabled` | boolean | `false` | Enable Execution Intents bindings; see aliases above |
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

:::tip Intents API in templates
Prefer `"intents": true` or `"intents": { "enabled": true }` in templates — the bootstrap engine maps these to `intents_api_enabled`. The direct agent API uses the flat field `intents_api_enabled`.
:::

:::note Multi-agent templates
Templates with multiple agents in the `agents` array now correctly provision all agents. Earlier versions only created the first agent — this has been fixed.
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

### `runtimes` (v0.44+; bootstrap wiring v0.58.2)

Runtimes can be declared three ways in a bootstrap template:

1. **Top-level `runtimes` array** — each entry binds to `agents[agent_ref]` (default `0`)
2. **Nested `agents[].runtime`** — one runtime per agent entry
3. **`provision_runtime: true`** — shorthand that creates a default runtime for the first agent (`runtime_preset` default `"medium"`, `runtime_template` default `"openclaw"`)

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | `"default"` | Runtime name |
| `template` | string | — | Agent template (`hermes`, `openclaw`, `openclaude`, …) |
| `preset` | string | `"small"` | Compute preset: `small`, `medium`, `large`, `small-cc`, `medium-cc`, `large-cc` |
| `expose_http` | boolean | `false` | Enable public URL at `{slug}.run.1claw.co` |
| `agent_ref` | integer | `0` | Index into `agents[]` (top-level `runtimes` only) |
| `idle_timeout_secs` | integer | `1800` | Idle auto-stop timeout |
| `startup_command` | string | — | Optional container startup override |

```json
{
  "provision_runtime": true,
  "runtime_preset": "medium",
  "runtime_template": "openclaw",
  "agents": [{ "name": "defi-bot", "intents": { "enabled": true } }],
  "runtimes": [
    {
      "name": "trading-runtime",
      "preset": "medium",
      "template": "openclaw",
      "expose_http": true,
      "agent_ref": 0
    }
  ]
}
```

After bootstrap, create additional runtimes with **`POST /v1/platform/connections/{id}/runtimes`** (plt_ key). Do **not** use `POST /v1/runtimes` with a plt_ key — that resolves to the platform org and returns 404 for user-org agents.

Bootstrapped runtime and automation IDs are tracked on the connection record (`runtime_ids`, `automation_ids`) and returned by `GET /v1/platform/connections/{id}`.

### `automations` (v0.44+)

Array of automation definitions. Each entry creates a scheduled, webhook-triggered, or event-driven workflow.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | required | Automation name |
| `trigger_type` | string | `"manual"` | `cron`, `webhook`, `event`, or `manual` |
| `cron_expr` | string | — | Required for cron triggers |
| `workflow_spec` | object | required | Workflow step definitions |

```json
{
  "automations": [
    {
      "name": "nightly-rotate",
      "trigger_type": "cron",
      "cron_expr": "0 0 * * *",
      "workflow_spec": {
        "steps": [
          { "type": "rotate_generate", "params": { "length": 32 } }
        ]
      }
    }
  ]
}
```

Bootstrapped runtime and automation IDs are tracked on the `platform_user_connections` record (`runtime_ids`, `automation_ids`).

---

## Connection-scoped operations (plt_ key)

Platform apps act on behalf of a **connected end-user**. These endpoints scope actions to a single connection — no user JWT, no `POST /grant`, and no `X-Platform-Connection` delegation header required. Your app must verify user intent out-of-band (e.g. wallet signature / mandate) before calling write endpoints.

### Inspect template

```bash
curl "https://api.1claw.co/v1/platform/apps/APP_ID/templates/TEMPLATE_ID" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

### Poll connection state

```bash
curl "https://api.1claw.co/v1/platform/connections/CONNECTION_ID" \
  -H "Authorization: Bearer plt_YOUR_KEY"
# → { status, vault_ids, agent_ids, runtime_ids, automation_ids, claim, ... }
```

### Create a runtime for a provisioned agent

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/runtimes" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "agent-runtime",
    "agent_id": "AGENT_UUID",
    "template": "openclaw",
    "preset": "medium"
  }'
```

### Chat with a provisioned agent

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/agents/AGENT_ID/chat" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "system_prompt": "You are a helpful trading assistant.",
    "model": "gpt-4o",
    "provider": "openai"
  }'
```

Accepts `message`, `system`, `system_prompt`, or `messages[]` (including `role: "system"`). Billing failures return **402** (not 500). Use this instead of `POST /v1/agents/{id}/chat` with a plt_ key (403 human-only).

### Get a connection-scoped runtime

```bash
curl "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/runtimes/RUNTIME_ID" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

Do **not** use `GET /v1/runtimes/{id}` with a plt_ key — that resolves to the platform org.

### Passkey enrollment for connected end-users

**A platform app cannot enroll a passkey for a user.** Both
`/v1/platform/connections/{id}/passkeys/enroll/begin` and `.../complete` return
403, always. This page previously showed them as working `plt_` calls; they
never can be.

The reason is what a passkey is worth. It is not scoped to your connection the
way a `plt_` key is: once one exists on an account, the public sign-in flow
(`/v1/auth/passkeys/assert/*`) exchanges it for a **full, non-delegated user
session**. An app able to enroll one would hold a credential stronger than the
delegation boundary it operates under, so the capability was removed.

That also rules out the near miss: a claim session cannot enroll either. A claim
JWT acts as the connected user, and your app can obtain one on its own — it can
reissue a claim token for its own connection and redeem it — so accepting it
here would be the same hole with an extra step.

**The user enrolls, in a session they signed into themselves**, at
`https://1claw.co/settings/security`. Send them there and use `return_to` on the
claim link to bring them back.

To *use* a passkey a connected user already has — the step-up you probably
want — see:

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/platform/connections/{id}/passkeys` | Whether the confirm step can be offered at all. Returns counts, never credential material. Branch on `has_passkey`. |
| POST | `/v1/platform/connections/{id}/passkeys/tx-assert/begin` | Ask that user to touch their authenticator over a specific digest. |
| POST | `/v1/platform/connections/{id}/passkeys/tx-assert/complete` | Complete that ceremony. |

### Spend policy, approvals, signing keys

| Method | Path | Description |
|---|---|---|
| GET | `/v1/platform/connections/{id}/spend-policy` | Effective spend policy for connection user |
| PUT | `/v1/platform/connections/{id}/spend-policy` | Set per-user spend policy (Idempotency-Key supported) |
| GET | `/v1/platform/connections/{id}/pending-approvals` | Hash-bound consensus/HITL queue (`payload_hash` on each row) |
| POST | `/v1/platform/connections/{id}/pending-approvals` | **Create** pending approval (auto-resolves `policy_id` from agent consensus policies) |
| GET | `/v1/platform/connections/{id}/pending-approvals/{aid}` | Single pending approval |
| POST | `/v1/platform/connections/{id}/pending-approvals/{aid}/decide` | Vote approve/reject with matching `payload_hash` |
| POST | `/v1/platform/connections/{id}/approvals/{aid}/decide` | Mobile approval queue decide |
| GET | `/v1/platform/connections/{id}/signing-keys?agent_id=` | List agent signing keys (public metadata only — never private keys) |
| GET | `/v1/platform/connections/{id}/signing-keys/{chain}?agent_id=` | Single-chain signing key lookup |
| DELETE | `/v1/platform/connections/{id}/signing-keys/{chain}?agent_id=` | Deactivate signing key for connection agent |
| PATCH | `/v1/platform/connections/{id}/agents/{agent_id}` | Enable Intents/Execution Intents or update `system_prompt` |
| GET | `/v1/platform/connections/{id}/portfolio` | Agent portfolio/balances (`?chains=`, `?include_tokens=`) |
| GET | `/v1/platform/connections/{id}/balances` | Alias for portfolio |
| GET/POST | `/v1/platform/connections/{id}/automations` | List/create automations for connection agents |
| POST | `/v1/platform/connections/{id}/automations/{aid}/runs/{rid}/cancel` | Cancel automation run |
| GET/PUT/DELETE | `/v1/platform/connections/{id}/memory/{namespace}/{key}` | Connection-scoped agent memory (optional `?agent_id=`) |

### Enable Intents on an existing agent (no re-bootstrap)

If an agent was bootstrapped before Intents were enabled, patch it in place — the agent must belong to the connection (`agent_ids`):

```bash
curl -X PATCH "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/agents/AGENT_UUID" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "intents_api_enabled": true,
    "execution_intents_enabled": false,
    "system_prompt": "You are a DeFi trading assistant."
  }'
```

Allowed fields: `intents_api_enabled`, `execution_intents_enabled`, `system_prompt` only. Agents cannot self-enable these flags via agent JWT.

```typescript
await client.platform.patchConnectionAgent(connectionId, agentId, {
  intents_api_enabled: true,
  system_prompt: "You are a DeFi trading assistant.",
});

// v0.59.4 — portfolio, pending-approval create, automations, memory
const portfolio = await client.platform.getConnectionPortfolio(connectionId, {
  include_tokens: true,
});
const pending = await client.platform.createConnectionPendingApproval(connectionId, {
  agent_id: agentId,
  action: "transaction",
  action_payload: { chain: "ethereum", to: "0x...", value: "0.1" },
});
```

At **bootstrap** time, the same flags can be set via template aliases: `intents: true`, `intents: { enabled: true }`, or `intents_api_enabled: true` (and `execution` / `execution_intents_enabled` equivalents).

### Create a pending approval (over-cap / consensus)

When a transfer exceeds spend caps or matches a consensus policy, create a hash-bound pending approval for the connected user's agent — no need to pass `policy_id` if the agent already has a matching `consensus_trigger` policy:

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/pending-approvals" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_UUID",
    "action": "transaction",
    "summary": "Transfer 0.5 ETH to treasury",
    "action_payload": {
      "chain": "base",
      "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "value": "0.5"
    }
  }'
# → 202 { pending_approval_id, payload_hash, required_approvals, expires_at, ... }
```

Then decide with `POST .../pending-approvals/{id}/decide` using the returned `payload_hash`. Re-submit the original transaction with `approval_id` after approval executes.

Optional explicit policy:

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/pending-approvals" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "POLICY_UUID",
    "action": "transaction",
    "action_payload": { "chain": "ethereum", "to": "0x...", "value": "1.0" }
  }'
```

---

## Content inspection (REST)

MCP `inspect_content` parity for platform backends:

```bash
curl -X POST "https://api.1claw.co/v1/shroud/inspect-content" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "content": "user-supplied text", "context": "input" }'
# → { safe, verdict, threat_count, threats[] }
```

Accepts plt_ keys, agent JWTs, and user JWTs. Fail-closed when high/critical threats match.

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

## Redirect URIs & "Sign in with 1Claw"

If your platform app uses the OAuth consent flow ("Sign in with 1Claw"), you need to register allowed redirect URIs. These are the URLs that 1Claw will redirect users back to after login/consent.

### Adding Redirect URIs

**Dashboard:** Go to **Platform** → your app → **Settings** tab → **Redirect URIs** section. Add each callback URL (e.g. `https://myapp.com/callback`).

**API:**

```bash
curl -X PATCH "https://api.1claw.co/v1/platform/apps/APP_ID" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": [
      "https://myapp.com/callback",
      "http://localhost:3000/callback"
    ]
  }'
```

**SDK:**

```typescript
await client.platform.updateApp(appId, {
  redirect_uris: [
    "https://myapp.com/callback",
    "http://localhost:3000/callback",
  ],
});
```

:::tip localhost is allowed
Per [RFC 8252 §7.3](https://datatracker.ietf.org/doc/html/rfc8252#section-7.3), `http://localhost` (any port) is allowed for development. No HTTPS required for loopback addresses.
:::

### OAuth Flow (Sign in with 1Claw)

For **sign-in** (OIDC tokens), use scopes like `openid profile email`:

1. Your app redirects users to:
   ```
   https://1claw.co/oauth/authorize?client_id=YOUR_SLUG&redirect_uri=https://myapp.com/callback&response_type=code&scope=openid%20email&state=RANDOM&code_challenge=...&code_challenge_method=S256
   ```
2. The user sees the 1Claw consent page and approves.
3. 1Claw redirects back to your `redirect_uri` with an authorization `code`.
4. Your backend exchanges the code for tokens via `POST /v1/oauth/token` (send `application/x-www-form-urlencoded` or JSON) with the matching `code_verifier`.

:::warning PKCE is required for sign-in
Standard OAuth code grants require S256 PKCE (`code_challenge` on authorize, `code_verifier` on token exchange).
:::

:::tip Complete working example
See [`examples/sign-in-with-1claw/`](https://github.com/1clawAI/1claw/tree/main/examples/sign-in-with-1claw) for a minimal, copy-pasteable demo (plain HTML + vanilla JS, no build step) that implements this entire flow.
:::

### OAuth `scope=link` (cross-org linking only)

If you use `scope=link` on `/oauth/authorize`, 1Claw **does not issue an authorization code**. After consent, the redirect is:

```
https://myapp.com/callback?linked=true&connection_id=UUID&state=RANDOM
```

Retry `POST /v1/platform/users/upsert` — no token exchange step. Prefer the dashboard link URL from `link_required.authorize_url` (`/connect/{slug}/link`) for the same behavior without OAuth parameters.

:::warning client_id is your app slug, not the UUID
The `client_id` parameter must be your platform app's **slug** (e.g. `cubeverse`), not the app UUID. You set the slug when creating the app. If you pass the UUID, you'll get "Unknown client_id". Find your slug in the dashboard at Platform → your app → Details.
:::

### Cross-Org User Linking

When you call `POST /v1/platform/users/upsert` and the user already exists in a *different* organization, the API returns `409 Conflict` with a `link_required` response:

```json
{
  "link_required": {
    "status": "link_required",
    "reason": "user_exists_in_other_org",
    "authorize_url": "https://1claw.co/connect/cubeverse/link?login_hint=user@example.com&return_to=https://myapp.com/callback",
    "app_slug": "cubeverse"
  }
}
```

**Do not treat this as an error.** Redirect the user's browser to `link_required.authorize_url`. They sign in (if needed), approve the connection, and are sent back to your `return_to` URL with `?linked=true&connection_id=...`. Then retry `upsert` — it will succeed.

:::tip Register redirect URIs first
The link flow sends users back to your first registered `redirect_uri` unless you pass `return_to` on `upsert`. Add your callback URL under Platform → your app → Settings → Redirect URIs.
:::

:::warning Do not show a generic error for link_required
If your app surfaces `cross_org_link_incomplete`, you are detecting the 409 but not redirecting. Send the user to `authorize_url` instead.
:::

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
| `platform_pays` | All API usage is billed to the platform's subscription. Template `plan` can upgrade the end-user org tier at bootstrap (see [`plan`](#plan-platform_pays-tier-inheritance)). |
| `user_pays` | Each connected user is billed individually. |
| `hybrid` | Platform covers base usage; overages billed to users. |

---

## Sign-In with Ethereum (SIWE)

Wallet-based user provisioning without email or OIDC.

### Configure `siwe_domain`

Set the hostname allowed in EIP-4361 messages (no scheme, path, or port):

```bash
# Human JWT
curl -X PATCH "https://api.1claw.co/v1/platform/apps/APP_ID" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "siwe_domain": "myapp.com" }'

# Or plt_ key — platform keys may **only** update siwe_domain via PATCH
curl -X PATCH "https://api.1claw.co/v1/platform/apps/APP_ID" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "siwe_domain": "myapp.com" }'
```

First `POST /v1/platform/siwe/challenge` with optional `domain` in the body auto-persists `siwe_domain` when unset.

### Challenge + upsert

```bash
# 1. Challenge (plt_ auth)
curl -X POST "https://api.1claw.co/v1/platform/siwe/challenge" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", "domain": "myapp.com" }'
# → { "message": "...", "nonce": "...", "expires_at": "..." }

# 2. User signs message in wallet, then upsert
curl -X POST "https://api.1claw.co/v1/platform/users/upsert" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_token_type": "urn:1claw:params:oauth:token-type:siwe",
    "siwe_message": "<EIP-4361 message>",
    "siwe_signature": "0x<65-byte ECDSA hex>",
    "external_subject": "eip155:1:0x742d35cc6634c0532925a3b844bc9e7595f0beb0"
  }'
```

**Signature format:** 65-byte ECDSA (`r‖s‖v`). MetaMask, viem, and ethers emit **v=27/28** (EIP-191); legacy **0/1** is also accepted. Invalid recovery bytes return **400** with `expected recovery id 0, 1, 27, or 28, got {v}`.

Synthetic email: `wallet+{hash}@platform.1claw.local`. Connection detail includes `wallet_address` when provisioned via SIWE — the **staker identity wallet**, not the agent signing key (see warning above).

`siwe_domain` is returned on `GET /v1/platform/apps/{id}`. Platform keys may **PATCH** only `siwe_domain` on the app record (human JWT can update all fields).

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

## Resource Grants (User-Side)

After a user claims their bootstrapped resources, they can grant your platform app access to **additional** vaults and agents beyond what the template provisioned. This is useful when your users have pre-existing 1Claw resources they want to connect.

### How It Works

1. Your app redirects the user to the 1Claw grant page:
   ```
   https://1claw.co/connect/{your-slug}/grant?connection={connection_id}
   ```
2. The user selects which vaults and agents to share.
3. Your backend can query the grants to discover what access it has.

### API

**Grant resources** (user-authenticated, `1ck_` key):

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/grant" \
  -H "Authorization: Bearer 1ck_USER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vault_ids": ["vault-uuid-1", "vault-uuid-2"],
    "agent_ids": ["agent-uuid-1"]
  }'
```

**List active grants:**

```bash
curl "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/grants" \
  -H "Authorization: Bearer 1ck_USER_KEY"
```

**Revoke a grant:**

```bash
curl -X DELETE "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/grants/GRANT_ID" \
  -H "Authorization: Bearer 1ck_USER_KEY"
```

### SDK

```typescript
// User-authenticated client (1ck_ key)
const userClient = new OneclawClient({ apiKey: "1ck_user_key" });

// Grant access
const { data } = await userClient.platform.grantAccess(connectionId, {
  vault_ids: ["vault-uuid"],
  agent_ids: ["agent-uuid"],
});

// List grants
const { data: grants } = await userClient.platform.listGrants(connectionId);

// Revoke
await userClient.platform.revokeGrant(connectionId, grantId);
```

### Dashboard

Users can manage grants from **Settings → Connected Apps** — each app shows shared resource counts with expandable grant panels and per-grant revoke buttons.

:::tip
Resource grants are always user-initiated. Platform operators cannot grant themselves access — only the connected user can share their resources. Grants are instantly revocable.
:::

---

## Platform Audit

Track all platform-related events for your app:

```bash
curl "https://api.1claw.co/v1/platform/apps/APP_ID/audit" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

Returns `platform.*` audit events (app creation, user provisioning, bootstrap, template changes).

---

## Key Rotation

Rotate your platform API key at any time. The old key is immediately invalidated.

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps/APP_ID/rotate-key" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "api_key_expires_at": "2027-01-01T00:00:00Z" }'
```

Response:

```json
{
  "api_key": "plt_NEW_KEY_HERE",
  "api_key_prefix": "plt_aBcDeFgH",
  "api_key_expires_at": "2027-01-01T00:00:00+00:00"
}
```

The `api_key_expires_at` field is optional. Omit it for a key that never expires.

---

## Marketplace

List approved platform apps in the public marketplace:

```bash
curl "https://api.1claw.co/v1/platform/marketplace"
```

Returns apps with `category`, `tags`, `screenshots`, and `pricing_summary`. No authentication required. The dashboard exposes this at `/marketplace`.

---

## App Stats

Get connected user counts and bootstrap metrics for your app:

```bash
curl "https://api.1claw.co/v1/platform/apps/APP_ID/stats" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

Returns `connected_user_count`, `bootstrap_count`, and `active_connections`.

---

## Platform Webhook Events

Platform apps receive lifecycle events at `platform_apps.webhook_url` (set via `PATCH /v1/platform/apps/{id}`). Deliveries include `X-Webhook-Signature` (HMAC-SHA256) and `X-Webhook-Event`. **Connection-scoped events include `connection_id` in the JSON body** so your backend can route to the correct end-user session.

List configured delivery and event catalog:

```bash
curl "https://api.1claw.co/v1/platform/apps/APP_ID/webhooks" \
  -H "Authorization: Bearer plt_YOUR_KEY"
# → { webhook_configured, webhook_url_host, platform_events[], org_webhooks_note }
```

Org-level webhook subscriptions (`POST /v1/webhooks`, human JWT) are **separate** — they deliver end-user org events (transactions, policies, etc.) and do not replace the platform app webhook.

The following events are delivered to the platform app webhook:

| Event | Description |
|---|---|
| `platform.user.connected` | A new user was connected (`connection_id`, `user_id`, `is_new`) |
| `platform.user.disconnected` | A user disconnected from your app |
| `platform.bootstrap.completed` | Bootstrap finished (`connection_id`, resource summary) |
| `platform.grant.created` | A user granted your app access to resources |
| `platform.grant.revoked` | A user revoked a resource grant |
| `platform.user.claimed` | User claimed bootstrapped resources |
| `platform.claim.expired` | Claim token expired unclaimed |
| `platform.entitlement.granted` | On-chain entitlement satisfied |
| `platform.entitlement.revoked` | Entitlement revoked |
| `pending_approval.created` | Consensus pending approval created (`connection_id`, `payload_hash`, `agent_id`) |
| `tx.awaiting_approval` | Transaction HITL gate (when wired for connection agents) |
| `sign.awaiting_approval` | Sign intent HITL gate |
| `automation.run.failed` | Automation run failed for a connection agent |

### Webhook signing secrets

Org webhook HMAC secrets are returned once at create time. Rotate by recreating the webhook, or use `POST /v1/platform/apps/{app_id}/rotate-webhook-secret` for platform app delivery secrets.

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps/APP_ID/rotate-webhook-secret" \
  -H "Authorization: Bearer YOUR_USER_JWT"
```

The new secret is returned once — store it securely. All subsequent deliveries use the new `X-Webhook-Signature` HMAC.

---

## Idempotency-Key (platform writes)

Fathom and other platform clients should send `Idempotency-Key` on provisioning and write endpoints. Replays within 24h return the cached response when the body hash matches; mismatched body → **409**.

| Endpoint | Idempotency behavior |
|---|---|
| `POST /v1/platform/connections/{id}/bootstrap` | 24h replay via `platform_bootstrap_idempotency` (same body → cached `BootstrapResponse`) |
| `PUT /v1/platform/connections/{id}/spend-policy` | 24h replay via `platform_spend_policy_idempotency` |
| `POST /v1/platform/users/upsert` | Safe to retry (upsert by `external_subject` / email — no dedicated key table) |
| `POST /v1/platform/connections/{id}/runtimes` | Not idempotent — use unique names or client-side dedup |
| Agent `POST /v1/agents/{id}/transactions` | `Idempotency-Key` on Intents API (agent JWT) — 24h transaction replay |

Bootstrap example:

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/CONN_ID/bootstrap" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Idempotency-Key: bootstrap-user-123-v1" \
  -H "Content-Type: application/json" \
  -d '{ "template_id": "TEMPLATE_UUID" }'
```

---

## Platform Rate Limiting

Per-app rate limits are enforced on all Platform API endpoints. Set `max_requests_per_minute` when creating or updating your app:

```bash
curl -X PATCH "https://api.1claw.co/v1/platform/apps/APP_ID" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "max_requests_per_minute": 120 }'
```

Requests exceeding the limit return `429 Too Many Requests`.

---

## Platform Onboarding Wizard

The dashboard includes a step-by-step onboarding wizard at **`/platform/wizard`** that walks you through creating a platform app, defining a bootstrap template, and provisioning your first user. This is the fastest way to get started if you prefer a guided UI over the API.

---

## Spend Policies (Embedded Wallets)

If your platform offers treasury wallets to end-users, spend policies let you set guardrails on wallet sends and swaps.

### Create an App-Level Default Policy

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps/APP_ID/spend-policies" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "max_value_per_tx_eth": "0.5",
    "daily_limit_eth": "2.0",
    "allowed_chains": ["ethereum", "base"],
    "max_transactions_per_day": 50
  }'
```

### Per-User Override

Override the app default for a specific connected user:

```bash
curl -X PUT "https://api.1claw.co/v1/platform/connections/CONNECTION_ID/spend-policy" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "max_value_per_tx_eth": "1.0",
    "daily_limit_eth": "5.0"
  }'
```

### Check Effective Policy (User-Side)

End-users can see what policy applies to them:

```bash
curl "https://api.1claw.co/v1/treasury/wallets/spend-policy" \
  -H "Authorization: Bearer USER_JWT"
```

### Available Policy Fields

| Field | Type | Description |
|---|---|---|
| `to_allowlist` | string[] | Only allow sends to these addresses |
| `to_denylist` | string[] | Block sends to these addresses |
| `max_value_per_tx_eth` | string | Max value per transaction (ETH) |
| `daily_limit_eth` | string | Rolling 24h spend cap (ETH) |
| `allowed_chains` | string[] | Restrict to these chains |
| `allowed_tokens` | string[] | Restrict to these token contracts |
| `max_transactions_per_day` | integer | Max sends per UTC day |

---

## Embedded Wallet Integration

Platform apps can provide passwordless wallet experiences to end-users using Email OTP, social login, or passkeys.

### Email OTP (Passwordless)

```bash
# 1. Send OTP
curl -X POST "https://api.1claw.co/v1/auth/email-otp/send" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "platform_app_id": "YOUR_APP_UUID"
  }'

# 2. Verify OTP → returns JWT + wallet address
curl -X POST "https://api.1claw.co/v1/auth/email-otp/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "platform_app_id": "YOUR_APP_UUID",
    "auto_provision_chains": ["ethereum", "solana"]
  }'
# → { "token": "eyJ...", "user_id": "...", "wallet_address": "0x..." }
```

### Social Login

```bash
curl -X POST "https://api.1claw.co/v1/auth/social-login" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "id_token": "GOOGLE_ID_TOKEN",
    "auto_provision_chains": ["ethereum"]
  }'
```

Supported providers: `google`, `apple`, `discord`. Discord uses an authorization code flow (pass the code as `id_token` with `oauth_redirect_uri`).

### React Widget

For the fastest integration, use the `@1claw/wallet-react` package:

```tsx
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawEmbeddedWallet
      appId="your-slug"
      theme="dark"
      chains={["ethereum", "solana"]}
      socialProviders={["google", "discord"]}
      features={["send", "swap", "receive", "buy"]}
    />
  );
}
```

---

## Delegation

Platform apps can perform ongoing CRUD operations on connected user resources via **delegated access**. Users opt in per-connection; the platform's `plt_` key then acts on behalf of the user within scoped boundaries.

### Enabling delegation

Users toggle delegation for a specific platform app connection:

```
PATCH /v1/platform/connected-apps/{connectionId}
{ "delegation_enabled": true, "delegation_scopes": ["secrets:read", "secrets:write"] }
```

### Using delegated access

The platform sends the `X-Platform-Connection` header with its `plt_` key:

```bash
curl -X GET "https://api.1claw.co/v1/vaults" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "X-Platform-Connection: CONNECTION_ID"
```

Auth middleware resolves the caller as `principal_type: "platform_delegated"` with scoped permissions.

### Available scopes

| Scope | Access |
|-------|--------|
| `vaults:read` / `vaults:write` | Vault CRUD |
| `agents:read` / `agents:write` | Agent CRUD |
| `secrets:read` / `secrets:write` | Secret CRUD |
| `automations:*` | Automation management |
| `runtimes:*` | Runtime management |
| `memory:read` / `memory:write` | Agent memory CRUD |
| `chat:read` / `chat:write` | Agent chat conversations |

### Scope enforcement

Delegation scopes are enforced on 4 handler groups: secrets, policies, bindings, and discovery. Disconnected connections (status `disconnected`) are rejected with 403.

### SDK

```typescript
const scoped = client.platform.withConnection(connectionId);
const vaults = await scoped.listVaults();
```

### Delegation log

```
GET /v1/platform/connections/{connection_id}/delegation-log
```

## Current Limitations

- **`plt_` keys** can see user metadata but cannot directly access user signing keys (`GET /v1/agents/{id}/signing-keys`). The org boundary prevents cross-org reads.

## Security

- **OIDC audience enforcement**: Platform apps can set `oidc_audience` to restrict which JWT audiences are accepted during OIDC user provisioning. When set, JWTs with a mismatched `aud` claim are rejected.
- **JWKS SSRF prevention**: The `oidc_jwks_url` field is validated against private CIDRs, cloud metadata endpoints, and localhost to prevent SSRF attacks.
- **Cross-org binding protection**: `upsert_user` enforces that the user belongs to the same org as the platform app.

---

## SDK Usage

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.co",
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
console.log("Agent API Key:", result.data.summary.agent_api_key); // one-time — store securely
```

### Python

```python
from oneclaw import OneclawClient

client = OneclawClient(
    base_url="https://api.1claw.co",
    api_key="plt_YOUR_KEY",
)

# Create a template
template = client.platform.create_template(app_id, {
    "name": "default-template",
    "spec": {
        "vault": {"name": "user-vault"},
        "agents": [{"name": "bot", "intents": {"enabled": True}}],
        "signing_keys": [{"chain": "ethereum"}],
        "policies": [{"principal_ref": "agents.primary", "vault_ref": "vault", "paths": ["**"]}],
    },
})

# Provision + bootstrap a user
user = client.platform.upsert_user({
    "email": "user@example.com",
    "external_subject": "tg:12345",
})
result = client.platform.bootstrap_user(user["connection_id"], {
    "template_id": template["id"],
})
print("Claim URL:", result["claim_url"])
print("Agent ID:", result["summary"]["agent_id"])
print("Agent API Key:", result["summary"]["agent_api_key"])  # one-time — store securely
print("Signing keys:", result["summary"]["signing_keys"])

# Rotate platform key
rotated = client.platform.rotate_key(app_id, {
    "api_key_expires_at": "2027-01-01T00:00:00Z",
})
print("New key:", rotated["api_key"])

# Create a spend policy
policy = client.platform.create_spend_policy(app_id, {
    "max_value_per_tx_eth": "0.5",
    "daily_limit_eth": "2.0",
    "allowed_chains": ["ethereum", "base"],
})
```

---

## Complete Endpoint Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/platform/apps` | User JWT | Register a platform app (returns `plt_` key one-time) |
| GET | `/v1/platform/apps` | User JWT | List platform apps for org |
| GET | `/v1/platform/apps/{id}` | User JWT | Get platform app details |
| PATCH | `/v1/platform/apps/{id}` | User JWT (full update) or `plt_` (**siwe_domain only**) | Update platform app |
| DELETE | `/v1/platform/apps/{id}` | User JWT | Delete platform app |
| POST | `/v1/platform/apps/{id}/rotate-key` | User JWT | Rotate `plt_` API key |
| POST | `/v1/platform/apps/{id}/templates` | User JWT | Create bootstrap template |
| GET | `/v1/platform/apps/{id}/templates` | User JWT or `plt_` | List templates |
| GET | `/v1/platform/apps/{id}/templates/{tid}` | User JWT or `plt_` | Get template by ID |
| PATCH | `/v1/platform/apps/{id}/templates/{tid}` | User JWT or `plt_` | Update template |
| DELETE | `/v1/platform/apps/{id}/templates/{tid}` | User JWT or `plt_` | Delete template |
| POST | `/v1/platform/users/upsert` | `plt_` key | Provision or find user |
| GET | `/v1/platform/connections/{id}` | `plt_` key | Connection status, resource IDs, `provisioned_tier`, `wallet_address` |
| POST | `/v1/platform/connections/{id}/bootstrap` | `plt_` key | Bootstrap resources from template |
| POST | `/v1/platform/siwe/challenge` | `plt_` key | SIWE nonce + message for wallet upsert |
| POST | `/v1/platform/connections/{id}/runtimes` | `plt_` key | Create runtime for connection agent |
| GET | `/v1/platform/connections/{id}/runtimes/{rid}` | `plt_` key | Get connection-scoped runtime |
| POST | `/v1/platform/connections/{id}/passkeys/enroll/begin` | — | **Always 403.** A platform app cannot enroll a login passkey; the user enrolls in their own session. |
| POST | `/v1/platform/connections/{id}/passkeys/enroll/complete` | — | **Always 403.** See above. |
| POST | `/v1/platform/connections/{id}/agents/{aid}/chat` | `plt_` key | Chat (`system`, `system_prompt`, `messages[]`; 402 on billing errors) |
| POST | `/v1/platform/apps/{id}/templates/{tid}/preview` | `plt_` key | Dry-run template with `parameters` |
| GET | `/v1/platform/connections/{id}/usage` | `plt_` key | Per-connection usage / inference spend |
| GET | `/v1/platform/connections/{id}/pending-approvals` | `plt_` key | List hash-bound pending approvals |
| POST | `/v1/platform/connections/{id}/pending-approvals` | `plt_` key | Create pending approval (consensus / over-cap) |
| POST | `/v1/platform/connections/{id}/pending-approvals/{aid}/decide` | `plt_` key | Vote on pending approval |
| POST | `/v1/shroud/inspect-content` | Any JWT / `plt_` | Standalone content threat scan |
| GET | `/v1/platform/apps/{id}/webhooks` | `plt_` or User JWT | Platform webhook catalog |
| GET | `/v1/platform/connections/{id}/signing-keys` | `plt_` key | List agent signing keys (public metadata) |
| GET | `/v1/platform/connections/{id}/signing-keys/{chain}` | `plt_` key | Single-chain signing key lookup |
| DELETE | `/v1/platform/connections/{id}/signing-keys/{chain}` | `plt_` key | Deactivate agent signing key |
| PATCH | `/v1/platform/connections/{id}/agents/{aid}` | `plt_` key | Patch `intents_api_enabled`, `execution_intents_enabled`, `system_prompt` |
| GET | `/v1/platform/connections/{id}/portfolio` | `plt_` key | Agent portfolio/balances for connection |
| GET | `/v1/platform/connections/{id}/balances` | `plt_` key | Alias for portfolio |
| GET/POST | `/v1/platform/connections/{id}/automations` | `plt_` key | List/create connection-scoped automations |
| POST | `/v1/platform/connections/{id}/automations/{aid}/runs/{rid}/cancel` | `plt_` key | Cancel automation run |
| GET/PUT/DELETE | `/v1/platform/connections/{id}/memory/{namespace}/{key}` | `plt_` key | Connection-scoped agent memory |
| POST | `/v1/platform/connections/{id}/reissue-claim` | `plt_` key | Reissue expired claim URL |
| GET | `/v1/platform/claim/{token}` | None (public) | Preview claim token |
| POST | `/v1/platform/claim/{token}` | None (public) | Redeem claim token |
| GET | `/v1/platform/apps/{id}/users` | `plt_` key | List connected users |
| GET | `/v1/platform/apps/{id}/audit` | User JWT or `plt_` | Platform audit events |
| GET | `/v1/platform/connected-apps` | User JWT | List apps connected to calling user |
| DELETE | `/v1/platform/connected-apps/{id}` | User JWT | Disconnect from a platform app |
| POST | `/v1/platform/connections/{id}/grant` | User JWT | Grant vault/agent access to app |
| GET | `/v1/platform/connections/{id}/grants` | User JWT | List active grants |
| DELETE | `/v1/platform/connections/{id}/grants/{gid}` | User JWT | Revoke a grant |
| POST | `/v1/platform/apps/{id}/spend-policies` | User JWT | Create app-level spend policy |
| GET | `/v1/platform/apps/{id}/spend-policies` | User JWT | List spend policies |
| DELETE | `/v1/platform/apps/{id}/spend-policies/{pid}` | User JWT | Deactivate spend policy |
| PUT | `/v1/platform/connections/{id}/spend-policy` | `plt_` key or User JWT | Set per-user spend policy override |
| GET | `/v1/treasury/wallets/spend-policy` | User JWT | View effective policy for calling user |
| GET | `/v1/platform/marketplace` | None (public) | List approved apps in the marketplace |
| GET | `/v1/platform/apps/{id}/stats` | `plt_` key or User JWT | App stats (connected users, bootstraps) |
| POST | `/v1/platform/apps/{id}/rotate-webhook-secret` | User JWT | Rotate platform app webhook HMAC secret |
