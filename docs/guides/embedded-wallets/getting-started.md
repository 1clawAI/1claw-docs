---
title: Getting Started with Embedded Wallets
description: Register a platform app, obtain a plt_ API key, bootstrap users from templates, and complete the claim flow.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started with Embedded Wallets

This guide walks through the minimum path from zero to a working embedded wallet for your first end-user: platform app → template → user provisioning → wallet login.

:::info Prerequisites
- 1Claw account with **Pro or higher** subscription
- Dashboard access at [1claw.co/platform](https://1claw.co/platform)
:::

## Step 1: Create a platform app

Register your app from the dashboard (**Platform → New app**) or via API with your human JWT (`1ck_...` or session token):

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Wallet App",
    "slug": "my-wallet-app",
    "description": "Embedded wallets for end users",
    "billing_model": "platform_pays",
    "auth_mode": "user_signin",
    "max_connected_users": 10000
  }'
```

Save the returned **`api_key`** (`plt_...`) immediately — it is shown once. All Platform API calls use this key as a Bearer token.

| Field | Purpose |
| ----- | ------- |
| `billing_model` | `platform_pays` (default), `user_pays`, or `hybrid` |
| `auth_mode` | `silent` (OIDC-only provisioning), `user_signin`, or `configurable` |
| `max_connected_users` | Hard cap; new connections rejected when reached |

Rotate or expire keys with `POST /v1/platform/apps/{id}/rotate-key`. See [Platform API overview](/docs/platform-api/overview).

## Step 2: Create a bootstrap template (optional)

Templates declare what gets created per user: vault, agents, policies, signing keys, runtimes, or automations. For **wallet-only** apps you can skip bootstrap and rely on auth-time wallet provisioning (Step 4).

Example template with an agent + policies (for products that also run automation):

```bash
curl -X POST "https://api.1claw.co/v1/platform/apps/$APP_ID/templates" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "default",
    "spec": {
      "vault": {
        "name": "user-vault",
        "description": "Auto-provisioned per user"
      },
      "agents": [{
        "name": "user-agent",
        "intents": { "enabled": true },
        "signing_keys": [{ "chain": "ethereum" }]
      }],
      "policies": [{
        "principal_ref": "agents.primary",
        "vault_ref": "vault",
        "paths": ["api-keys/*"],
        "permissions": ["read", "write"]
      }]
    }
  }'
```

Use the dashboard **Template Spec Builder** at `/platform/wizard` for a visual editor.

## Step 3: Provision a connected user

Upsert creates (or finds) a user and a `platform_user_connections` row:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/platform/users/upsert" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "external_subject": "your-app:user-12345"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const platform = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.PLATFORM_API_KEY!, // plt_...
});

const { data } = await platform.platform.upsertUser({
  email: "user@example.com",
  external_subject: "your-app:user-12345",
});

console.log(data.connection_id, data.is_new);
```

</TabItem>
</Tabs>

You can also pass a `subject_token` (OIDC JWT verified against your app's JWKS) instead of email. Set `create_sub_org: true` to isolate each user in a [sub-organization](/docs/guides/embedded-wallets/advanced#sub-organizations).

## Step 4: Bootstrap resources (optional)

If you created a template, bootstrap applies it to the connection:

```bash
curl -X POST "https://api.1claw.co/v1/platform/connections/$CONNECTION_ID/bootstrap" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "template_id": "TEMPLATE_UUID" }'
```

Response includes:

- `claim_url` / `claim_token` — one-time link for the user to claim resources (10-minute TTL)
- `summary` — `vault_id`, `agent_id`, `policy_ids`, one-time `agent_api_key`, `signing_keys[]`

Reissue expired claim links with `POST .../reissue-claim` without re-provisioning.

### Claim flow

1. Send the user to `claim_url` (public page at `/connect/{slug}/claim/{token}`).
2. User previews vaults/agents/policies and clicks **Claim Resources**.
3. `POST /v1/platform/claim/{token}` marks the connection `claimed`.

Public preview: `GET /v1/platform/claim/{token}` (no auth).

## Step 5: Give the user a wallet

Two common paths:

### A. React widget (recommended)

```tsx
import { OneclawWalletProvider, OneclawEmbeddedWallet } from "@1claw/wallet-react";

<OneclawWalletProvider apiKey="plt_..." baseUrl="https://api.1claw.co">
  <OneclawEmbeddedWallet
    chains={["ethereum", "base", "solana"]}
    socialProviders={["email", "google", "apple"]}
    features={["send", "swap", "receive", "buy"]}
  />
</OneclawWalletProvider>
```

See [React integration](/docs/guides/embedded-wallets/react-integration).

### B. Headless Email OTP

```typescript
await client.auth.sendEmailOtp({
  email: "user@example.com",
  platform_app_id: APP_UUID, // optional scope
});

const { data } = await client.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
  auto_provision_chains: ["ethereum", "solana"],
});

// data.access_token — user JWT
// Wallets created on first login for listed chains
```

See [Authentication](/docs/guides/embedded-wallets/authentication).

## Step 6: Set spend policies (recommended)

Before going to production, define what users can spend:

```typescript
await platform.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.25",
  daily_limit_eth: "2.0",
  allowed_chains: ["ethereum", "base"],
});
```

Details: [Spend policies](/docs/guides/embedded-wallets/spend-policies).

## Connected apps & grants

After login, users manage your app under **Settings → Connected Apps**. They can grant vault/agent access via `/connect/{slug}/grant?connection={id}`.

Platform operators call:

- `POST /v1/platform/connections/{id}/grant` — user-only; vault/agent picker
- `GET /v1/platform/connections/{id}/grants` — list active grants
- `DELETE /v1/platform/connections/{id}/grants/{grant_id}` — revoke

Use `client.platform.withConnection(connectionId)` in the SDK to attach `X-Platform-Connection` for delegated CRUD. See [Platform API guide](/docs/guides/embedded-wallets/platform-api).

## Next steps

- [Authentication flows](/docs/guides/embedded-wallets/authentication) — social, passkeys, OAuth
- [Multi-chain wallets](/docs/guides/embedded-wallets/multi-chain-wallets) — chains and balances
- [Dashboard platform wizard](/docs/dashboard/platform-wizard) — visual onboarding
