---
sidebar_position: 22
title: Platform API
description: Build on top of 1Claw — provision users, bootstrap vaults and agents, and manage connected apps.
---

# Platform API

The Platform API lets developers build products on top of 1Claw. Register your app, create bootstrap templates, provision end-users, and scaffold secrets infrastructure — all without touching your users' secrets.

:::info Pro plan required
The Platform API is available on **Pro, Team, Business, and Enterprise** plans. [Upgrade your plan](/settings/billing) to get started.
:::

## Concepts

| Term | Description |
|------|-------------|
| **Platform App** | Your registered application. Gets a `plt_` API key. |
| **Template** | Declarative JSON spec defining vault + agents + policies to create per user. |
| **Connection** | Links a platform user to your app. Tracks provisioned resources. |
| **Claim Token** | One-time URL for the end-user to claim their bootstrapped resources. |
| **platform_locked** | Resources created via templates are locked — operators can't read secrets. |

## How it Works

The Platform API connects three parties: **you** (the operator), **1Claw** (secrets infrastructure), and **your end-user** (the secret owner). The flow ensures your users always own their secrets — you scaffold the infrastructure, they hold the keys.

### End-to-end flow

```
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │  Your App    │         │    1Claw      │         │   End-User   │
 │  (Operator)  │         │   Platform    │         │              │
 └──────┬───────┘         └──────┬────────┘         └──────┬───────┘
        │                        │                         │
   1. Register app (plt_ key)    │                         │
        │───────────────────────>│                         │
        │                        │                         │
   2. Create template            │                         │
        │───────────────────────>│                         │
        │                        │                         │
   3. Provision user             │                         │
        │───────────────────────>│                         │
        │     connection_id      │                         │
        │<───────────────────────│                         │
        │                        │                         │
   4. Bootstrap resources        │                         │
        │───────────────────────>│                         │
        │     claim_url          │  Creates vault, agent,  │
        │<───────────────────────│  policies (locked)      │
        │                        │                         │
   5. Redirect user to claim_url │                         │
        │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│
        │                        │                         │
        │                        │  6. User claims resources│
        │                        │<────────────────────────│
        │                        │     (downloads API key, │
        │                        │      generates MPC share)│
        │                        │                         │
   7. User has secrets infra     │                         │
      you can't peek at ✓        │                         │
```

**Steps 1–2** happen once when you integrate. **Steps 3–6** repeat for every new user.

### Choose your onboarding flow

How your users get into 1Claw depends on two choices: **auth mode** and **billing model**.

#### Option A: Silent provisioning (recommended for embedded products)

Best when your users shouldn't know or care about 1Claw. Your backend provisions them silently — they never see a 1Claw login screen.

```
Your user signs in to YOUR app
        │
        ▼
Your backend calls POST /v1/platform/users/upsert
with the user's email (or OIDC subject_token)
        │
        ▼
1Claw creates a 1Claw account linked to your app
        │
        ▼
Your backend calls POST /v1/platform/connections/{id}/bootstrap
        │
        ▼
Vault + Agent + Policies created (platform_locked)
        │
        ▼
Claim URL returned → redirect user to download credentials
```

Set `auth_mode: "silent"` on your app. If you have your own IdP, configure `oidc_jwks_url` and `oidc_issuer` to skip email-based provisioning entirely — just pass a signed JWT as `subject_token`.

#### Option B: User picks sign-in method

Best when you want users to have their own 1Claw identity from the start — they sign in with Google or email/password during the claim step.

```
Your user clicks "Connect to 1Claw" in your app
        │
        ▼
Your backend calls POST /v1/platform/users/upsert
        │
        ▼
Bootstrap → claim_url returned
        │
        ▼
User visits claim_url → 1Claw sign-in screen
(Google, email/password, or SSO)
        │
        ▼
User claims vault + agent credentials
```

Set `auth_mode: "user_signin"` on your app.

#### Option C: Configurable per user

Mix and match — provision power users silently, let others sign in manually. Set `auth_mode: "configurable"` and decide at bootstrap time.

### Choose your billing model

| Model | Who pays | Best for |
|-------|----------|----------|
| `platform_pays` | You (the operator) | SaaS products where secrets infra is bundled into your pricing |
| `user_pays` | The end-user | Marketplaces or tools where users manage their own 1Claw subscription |
| `hybrid` | Base usage: you. Overages: user | Freemium products with power-user tiers |

All three are set on the platform app and can be changed later. Start with `platform_pays` if you're unsure.

### What gets created during bootstrap

When you call the bootstrap endpoint with a template, 1Claw creates all resources **as the end-user** (not as your platform app). This means:

| Resource | Owned by | Your `plt_` key can... |
|----------|----------|------------------------|
| **Vault** | End-user | See metadata (name, ID). **Cannot** read secrets. |
| **Agent** | End-user | See metadata. **Cannot** mint tokens or read API keys. |
| **Policies** | End-user | See metadata. **Cannot** modify permissions. |
| **Secrets** | End-user | **Cannot** read, write, or delete. |

All bootstrapped resources are marked `platform_locked: true`. The operator can view audit logs and connection status, but the cryptographic boundary is absolute — especially when CMEK + MPC custody is enabled.

### Delegated access (when your agent needs to read user secrets)

Sometimes your backend agent needs to act on behalf of a user — for example, fetching an API key the user stored. Use delegated token exchange:

```
Your agent (ocv_ key)                    1Claw
        │                                  │
        │  POST /v1/auth/delegated-token   │
        │  subject_token: user_grant_jwt   │
        │  actor_token: ocv_YOUR_KEY       │
        │  scope: "secrets:read            │
        │          paths:api-keys/*"        │
        │─────────────────────────────────>│
        │                                  │
        │  Short-lived JWT                 │
        │  (audit: actor=plt_ on behalf    │
        │   of usr_...)                    │
        │<─────────────────────────────────│
```

The user must explicitly grant this access — either during the claim flow or later in their 1Claw dashboard under **Settings > Connected Apps**. Grants are scoped to specific paths and can be revoked with one click.

## Quick Start

### 1. Register your platform app

```bash
curl -X POST https://api.1claw.xyz/v1/platform/apps \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme AI",
    "slug": "acme-ai",
    "billing_model": "platform_pays",
    "auth_mode": "silent"
  }'
```

Save the returned `api_key` (starts with `plt_`) — it won't be shown again.

### 2. Create a bootstrap template

```bash
curl -X POST https://api.1claw.xyz/v1/platform/apps/{appId}/templates \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "default-customer",
    "spec": {
      "vault": { "name": "main" },
      "agents": [{ "name": "primary", "shroud_enabled": true }],
      "policies": [{
        "principal_ref": "agents.primary",
        "vault_ref": "vault",
        "paths": ["api-keys/*"],
        "permissions": ["read", "write"]
      }]
    }
  }'
```

### 3. Provision a user

```bash
curl -X POST https://api.1claw.xyz/v1/platform/users/upsert \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "display_name": "Alice" }'
```

### 4. Bootstrap their resources

```bash
curl -X POST https://api.1claw.xyz/v1/platform/connections/{connectionId}/bootstrap \
  -H "Authorization: Bearer plt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "template_id": "TEMPLATE_ID" }'
```

The response includes a `claim_url` — redirect your user there to claim their vault and agent credentials.

## SDK Usage

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "plt_YOUR_KEY",
});

// Create an app
const app = await client.platform.createApp({
  name: "My App",
  slug: "my-app",
});

// Create a template
const template = await client.platform.createTemplate(app.data.id, {
  name: "default",
  spec: { vault: { name: "main" }, agents: [{ name: "primary" }], policies: [] },
});

// Provision and bootstrap a user
const user = await client.platform.upsertUser({ email: "user@example.com" });
const result = await client.platform.bootstrapUser(user.data.connection_id, {
  template_id: template.data.id,
});
console.log(result.data.claim_url);
```

## Billing Models

| Model | Description |
|-------|-------------|
| `platform_pays` | Usage billed to your org (default). End-users are free. |
| `user_pays` | Usage billed to the end-user's account. |
| `hybrid` | Base usage billed to platform, overages to user. |

## Auth Modes

| Mode | Description |
|------|-------------|
| `silent` | No sign-in screen — user provisioned silently via OIDC or email. |
| `user_signin` | User signs in to 1Claw (Google, email/password) during claim. |
| `configurable` | Platform chooses per-user at bootstrap time. |

## OIDC User Provisioning

If your platform has an IdP, configure `oidc_jwks_url` and `oidc_issuer` on your app. Then pass a `subject_token` (JWT signed by your IdP) to `POST /v1/platform/users/upsert`. 1Claw verifies the JWT against your JWKS and creates/finds the user by `sub` claim.

## Custody Guarantee

Resources bootstrapped via templates are marked `platform_locked: true`. This means:

1. **Authorization**: `plt_` keys cannot read secrets in locked vaults
2. **Token isolation**: `plt_` keys cannot mint agent JWTs for user agents
3. **Cryptographic** (optional): Templates can require CMEK + client-share MPC, making secrets mathematically inaccessible to both operator and 1Claw

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/platform/apps` | Register platform app |
| GET | `/v1/platform/apps` | List apps |
| GET | `/v1/platform/apps/{id}` | Get app details |
| PATCH | `/v1/platform/apps/{id}` | Update app |
| DELETE | `/v1/platform/apps/{id}` | Delete app |
| POST | `/v1/platform/apps/{id}/templates` | Create template |
| GET | `/v1/platform/apps/{id}/templates` | List templates |
| POST | `/v1/platform/users/upsert` | Provision user |
| GET | `/v1/platform/apps/{id}/users` | List connected users |
| POST | `/v1/platform/connections/{id}/bootstrap` | Bootstrap resources |
| GET | `/v1/platform/apps/{id}/audit` | Platform audit log |
| GET | `/v1/platform/connected-apps` | Connected apps (user) |
| DELETE | `/v1/platform/connected-apps/{id}` | Disconnect app |
