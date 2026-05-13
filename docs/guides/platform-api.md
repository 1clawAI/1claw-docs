---
sidebar_position: 22
title: Platform API
description: Build on top of 1Claw — provision users, bootstrap vaults and agents, and manage connected apps.
---

# Platform API

The Platform API lets developers build products on top of 1Claw. Register your app, create bootstrap templates, provision end-users, and scaffold secrets infrastructure — all without touching your users' secrets.

## Concepts

| Term | Description |
|------|-------------|
| **Platform App** | Your registered application. Gets a `plt_` API key. |
| **Template** | Declarative JSON spec defining vault + agents + policies to create per user. |
| **Connection** | Links a platform user to your app. Tracks provisioned resources. |
| **Claim Token** | One-time URL for the end-user to claim their bootstrapped resources. |
| **platform_locked** | Resources created via templates are locked — operators can't read secrets. |

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
