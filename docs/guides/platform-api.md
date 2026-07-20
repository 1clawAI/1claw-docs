---
title: Platform API
description: Build multi-tenant products on 1Claw — provision users, bootstrap vaults/agents/policies from templates, and manage connected user infrastructure.
sidebar_position: 14
---

# Platform API

The Platform API lets you build products on top of 1Claw. Register your app, create bootstrap templates, provision end-users, and manage their secrets infrastructure — all with custody guarantees that prevent your platform from accessing end-user secrets.

:::info Requirements
The Platform API requires a **Pro or higher** subscription. [Upgrade your plan →](https://1claw.xyz/settings/billing)
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

:::tip Key expiration and rotation
Set `api_key_expires_at` (ISO 8601) when creating the app to auto-expire the key. Rotate at any time with `POST /v1/platform/apps/{id}/rotate-key`, optionally setting a new expiry. Expired keys return 401.
:::

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

The response includes `claim_url`, `claim_token`, and `summary` (with `vault_id`, `agent_id`, `policy_ids`, `agent_api_key` — one-time, and `signing_keys[]` when signing keys are defined in the template). See [Step 7](#7-operate-the-bootstrapped-agent) for how to use the agent API key and signing keys.

### 5. Share the Claim URL

Send the `claim_url` to your end user (e.g. via your app's UI, email, or bot message). When they visit it, they'll see what was provisioned and can claim the resources with one click.

The claim URL format is `https://1claw.xyz/connect/{slug}/claim/{token}`. It expires after 10 minutes.

**Reissue an expired claim URL:**

If the token expires before your user claims, mint a fresh one without re-provisioning:

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/reissue-claim" \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
# → { "claim_url": "...", "claim_token": "ct_...", "expires_in": 600, "connection_id": "..." }
```

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

### 7. Operate the Bootstrapped Agent

The bootstrap response includes `summary.agent_api_key` (one-time, like regular agent creation) and `summary.signing_keys` (chain, address, public key). Store the API key securely — it won't be shown again.

**Get an agent JWT:**

```bash
curl -X POST "https://api.1claw.xyz/v1/auth/agent-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_UUID",
    "api_key": "ocv_AGENT_API_KEY"
  }'
# → { "access_token": "eyJ...", "vault_ids": ["..."] }
```

**Get the agent's wallet address:**

The wallet addresses are returned in the bootstrap response under `summary.signing_keys`. You can also retrieve them later:

```bash
curl "https://api.1claw.xyz/v1/agents/AGENT_UUID/signing-keys" \
  -H "Authorization: Bearer YOUR_USER_OR_PLATFORM_JWT"
# → { "keys": [{ "chain": "ethereum", "address": "0x...", "public_key": "...", "is_active": true }] }
```

**Submit a transaction (Intents API):**

```bash
AGENT_JWT="eyJ..."  # from token exchange above

curl -X POST "https://api.1claw.xyz/v1/agents/AGENT_UUID/transactions" \
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
curl -X POST "https://api.1claw.xyz/v1/agents/AGENT_UUID/transactions/sign" \
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

## Redirect URIs & "Sign in with 1Claw"

If your platform app uses the OAuth consent flow ("Sign in with 1Claw"), you need to register allowed redirect URIs. These are the URLs that 1Claw will redirect users back to after login/consent.

### Adding Redirect URIs

**Dashboard:** Go to **Platform** → your app → **Settings** tab → **Redirect URIs** section. Add each callback URL (e.g. `https://myapp.com/callback`).

**API:**

```bash
curl -X PATCH "https://api.1claw.xyz/v1/platform/apps/APP_ID" \
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

### OAuth Flow

1. Your app redirects users to:
   ```
   https://1claw.xyz/oauth/authorize?client_id=YOUR_SLUG&redirect_uri=https://myapp.com/callback&response_type=code&scope=link&state=RANDOM
   ```
2. The user sees the 1Claw consent page and approves.
3. 1Claw redirects back to your `redirect_uri` with an authorization `code`.
4. Your backend exchanges the code for tokens via `POST /v1/oauth/token` (send `application/x-www-form-urlencoded` or JSON).

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
    "authorize_url": "https://1claw.xyz/connect/cubeverse/link?login_hint=user@example.com&return_to=https://myapp.com/callback",
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

## Resource Grants (User-Side)

After a user claims their bootstrapped resources, they can grant your platform app access to **additional** vaults and agents beyond what the template provisioned. This is useful when your users have pre-existing 1Claw resources they want to connect.

### How It Works

1. Your app redirects the user to the 1Claw grant page:
   ```
   https://1claw.xyz/connect/{your-slug}/grant?connection={connection_id}
   ```
2. The user selects which vaults and agents to share.
3. Your backend can query the grants to discover what access it has.

### API

**Grant resources** (user-authenticated, `1ck_` key):

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/grant" \
  -H "Authorization: Bearer 1ck_USER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vault_ids": ["vault-uuid-1", "vault-uuid-2"],
    "agent_ids": ["agent-uuid-1"]
  }'
```

**List active grants:**

```bash
curl "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/grants" \
  -H "Authorization: Bearer 1ck_USER_KEY"
```

**Revoke a grant:**

```bash
curl -X DELETE "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/grants/GRANT_ID" \
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
curl "https://api.1claw.xyz/v1/platform/apps/APP_ID/audit" \
  -H "Authorization: Bearer plt_YOUR_KEY"
```

Returns `platform.*` audit events (app creation, user provisioning, bootstrap, template changes).

---

## Key Rotation

Rotate your platform API key at any time. The old key is immediately invalidated.

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/APP_ID/rotate-key" \
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

## Spend Policies (Embedded Wallets)

If your platform offers treasury wallets to end-users, spend policies let you set guardrails on wallet sends and swaps.

### Create an App-Level Default Policy

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/APP_ID/spend-policies" \
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
curl -X PUT "https://api.1claw.xyz/v1/platform/connections/CONNECTION_ID/spend-policy" \
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
curl "https://api.1claw.xyz/v1/treasury/wallets/spend-policy" \
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
curl -X POST "https://api.1claw.xyz/v1/auth/email-otp/send" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "platform_app_id": "YOUR_APP_UUID"
  }'

# 2. Verify OTP → returns JWT + wallet address
curl -X POST "https://api.1claw.xyz/v1/auth/email-otp/verify" \
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
curl -X POST "https://api.1claw.xyz/v1/auth/social-login" \
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
console.log("Agent API Key:", result.data.summary.agent_api_key); // one-time — store securely
```

### Python

```python
from oneclaw import OneclawClient

client = OneclawClient(
    base_url="https://api.1claw.xyz",
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
| PATCH | `/v1/platform/apps/{id}` | User JWT | Update platform app |
| DELETE | `/v1/platform/apps/{id}` | User JWT | Delete platform app |
| POST | `/v1/platform/apps/{id}/rotate-key` | User JWT | Rotate `plt_` API key |
| POST | `/v1/platform/apps/{id}/templates` | User JWT | Create bootstrap template |
| GET | `/v1/platform/apps/{id}/templates` | User JWT | List templates |
| PATCH | `/v1/platform/apps/{id}/templates/{tid}` | User JWT | Update template |
| DELETE | `/v1/platform/apps/{id}/templates/{tid}` | User JWT | Delete template |
| POST | `/v1/platform/users/upsert` | `plt_` key | Provision or find user |
| POST | `/v1/platform/connections/{id}/bootstrap` | `plt_` key | Bootstrap resources from template |
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
| PUT | `/v1/platform/connections/{id}/spend-policy` | User JWT | Set per-user spend policy override |
| GET | `/v1/treasury/wallets/spend-policy` | User JWT | View effective policy for calling user |
