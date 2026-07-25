---
title: "Platform API (multi-tenant)"
description: Build a SaaS product on top of 1claw using the Platform API. Provision users, vaults, agents, and policies with bootstrap templates.
sidebar_position: 66
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Platform API (Multi-Tenant)

The Platform API lets you build products on top of 1claw. You register a platform app, define a bootstrap template, and provision 1claw resources (vaults, agents, policies, signing keys) for each of your end users. Your users get secure key management and signing without you building the infrastructure.

:::info Requirements
The Platform API requires a **Pro or higher** subscription. The dashboard shows an upgrade prompt if you are on the free tier.
:::

## How it works

```
Your SaaS                          1claw Platform API             End user
     |                                   |                           |
     |  POST /v1/platform/apps           |                           |
     |  (register your app)              |                           |
     | --------------------------------> |                           |
     |                                   |                           |
     |  POST /v1/platform/users/upsert   |                           |
     |  (provision a user)               |                           |
     | --------------------------------> |                           |
     |                                   |                           |
     |  POST /v1/platform/               |                           |
     |    connections/{id}/bootstrap     |                           |
     |  (apply template: vault + agent   |                           |
     |   + policies + signing keys)      |                           |
     | --------------------------------> |                           |
     |                                   |                           |
     |  <-- claim_url, agent_api_key --- |                           |
     |                                   |                           |
     |  Send claim URL to end user  ---> |  ----------------------> |
     |                                   |  User claims resources    |
```

1. Register a platform app and get a `plt_` API key.
2. Create a bootstrap template that defines what each user gets (vault, agent, policies, signing keys).
3. When a user signs up for your product, provision them via the Platform API.
4. Bootstrap applies the template: creates a vault, agent, access policies, and optionally signing keys.
5. The user claims the resources via a one-time URL (or silently, depending on auth mode).

## Step 1: Register a platform app

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
APP=$(curl -s -X POST https://api.1claw.xyz/v1/platform/apps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Trading Platform",
    "slug": "my-trading-platform",
    "description": "Automated trading platform built on 1claw",
    "billing_model": "platform_pays",
    "auth_mode": "silent"
  }')

PLT_KEY=$(echo "$APP" | jq -r '.api_key')
APP_ID=$(echo "$APP" | jq -r '.id')
echo "Platform key: $PLT_KEY"   # save this, shown once
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const app = await client.platform.createApp({
  name: "My Trading Platform",
  slug: "my-trading-platform",
  description: "Automated trading platform built on 1claw",
  billing_model: "platform_pays",
  auth_mode: "silent",
});

const platformKey = app.data.api_key; // save, shown once
const appId = app.data.id;
```

</TabItem>
</Tabs>

### Auth modes

| Mode | Behavior |
|------|----------|
| `silent` | User is provisioned without interaction. Your OIDC token is sufficient. |
| `user_signin` | User must sign in to 1claw to claim resources. |
| `configurable` | You choose per connection. |

### Billing models

| Model | Who pays |
|-------|----------|
| `platform_pays` | Your org's subscription covers all user resources (default). |
| `user_pays` | Each end user's subscription covers their resources. |
| `hybrid` | You pay the base; users pay overages. |

## Step 2: Create a bootstrap template

Templates define what gets created for each user:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/platform/apps/$APP_ID/templates" \
  -H "Authorization: Bearer $PLT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trader-setup",
    "description": "Standard trader setup with vault, agent, and Ethereum signing key",
    "spec": {
      "vault": {
        "name": "{{user_name}} Trading Vault",
        "description": "Secrets and keys for automated trading"
      },
      "agents": [
        {
          "name": "{{user_name}} Trading Bot",
          "description": "Automated trading agent",
          "intents": { "enabled": true },
          "shroud_enabled": true,
          "signing_keys": [
            { "chain": "ethereum" },
            { "chain": "solana" }
          ]
        }
      ],
      "policies": [
        {
          "vault_ref": 0,
          "principal_ref": "agent:0",
          "paths": ["keys/*", "config/*"],
          "permissions": ["read"]
        }
      ]
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.platform.createTemplate(appId, {
  name: "trader-setup",
  description: "Standard trader setup",
  spec: {
    vault: {
      name: "{{user_name}} Trading Vault",
      description: "Secrets and keys for automated trading",
    },
    agents: [
      {
        name: "{{user_name}} Trading Bot",
        description: "Automated trading agent",
        intents: { enabled: true },
        shroud_enabled: true,
        signing_keys: [{ chain: "ethereum" }, { chain: "solana" }],
      },
    ],
    policies: [
      {
        vault_ref: 0,
        principal_ref: "agent:0",
        paths: ["keys/*", "config/*"],
        permissions: ["read"],
      },
    ],
  },
});
```

</TabItem>
</Tabs>

The template spec supports:

| Field | Description |
|-------|-------------|
| `vault` | Name and description for the user's vault |
| `agents[]` | Array of agents to create (each with optional Intents API, Shroud, signing keys) |
| `agents[].signing_keys[]` | Per-chain signing keys provisioned at bootstrap (ethereum, bitcoin, solana, xrp, cardano, tron) |
| `agents[].provision_eoa` | Set `true` to generate a standalone EOA for client-side smart account deployment |
| `policies[]` | Access policies linking vaults, agents, and paths |

## Step 3: Provision users

When a user signs up for your product:

```typescript
// 1. Upsert the user
const connection = await platformClient.platform.upsertUser({
  email: user.email,
});

// 2. Bootstrap their resources from the template
const bootstrap = await platformClient.platform.bootstrapUser(
  connection.data.connection_id,
  { template_name: "trader-setup" },
);

console.log("Vault ID:", bootstrap.data.summary.vault_id);
console.log("Agent ID:", bootstrap.data.summary.agent_id);
console.log("Agent API key:", bootstrap.data.summary.agent_api_key); // one-time
console.log("Signing keys:", bootstrap.data.summary.signing_keys);
// signing_keys: [{ chain: "ethereum", address: "0x...", public_key: "..." }, ...]

// 3. Send claim URL to the user (if auth_mode is "user_signin")
if (bootstrap.data.claim_url) {
  await sendEmail(user.email, {
    subject: "Claim your trading account",
    body: `Click here to claim: ${bootstrap.data.claim_url}`,
  });
}
```

### OIDC user provisioning

If your users already authenticate through an OIDC provider, pass their JWT directly:

```typescript
const connection = await platformClient.platform.upsertUser({
  subject_token: userJwt, // validated against your app's oidc_jwks_url
});
```

Configure `oidc_jwks_url` and `oidc_issuer` on your platform app to enable JWT validation.

## Step 4: Use the bootstrapped agent

Once bootstrapped, the agent API key works like any other 1claw agent:

```typescript
import { createClient } from "@1claw/sdk";

// Client using the bootstrapped agent's API key
const tradingAgent = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: bootstrapResult.summary.agent_api_key,
});

// Submit a trade
const tx = await tradingAgent.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xUniswapRouter...",
  value: "0",
  data: swapCalldata,
  simulate_first: true,
});
```

## Custody guarantee

When `platform_locked = true` (set automatically during bootstrap), the platform operator (you) cannot read secret values. You can manage lifecycle (create, delete, rotate) but cannot access the raw key material. This protects your end users' secrets from your own backend.

## Claim flow

For `user_signin` mode, the end user visits the claim URL:

1. The claim page shows your app name, provisioned resources (vaults, agents, policies), and a custody guarantee
2. The user clicks "Claim Resources"
3. The connection status changes from `pending` to `claimed`

If the claim token expires (10 minutes), reissue it:

```typescript
const reissue = await platformClient.platform.reissueClaim(connectionId);
console.log("New claim URL:", reissue.data.claim_url);
```

## User grants (resource sharing)

After claiming, users can grant your platform app access to specific vaults and agents:

```typescript
// User grants access to their vault
const grant = await userClient.platform.grantAccess(connectionId, {
  vault_ids: [vaultId],
  agent_ids: [agentId],
  allowed_paths: ["config/*"],
  permissions: ["read"],
});
```

Users can revoke grants at any time from the dashboard (Settings > Connected Apps).

## Dashboard

The Platform section in the dashboard provides:

- **App management**: create, edit, delete platform apps
- **Template editor**: visual template builder (no raw JSON needed)
- **Connected users**: list of provisioned users with claim status
- **Audit log**: platform-specific events (`platform.user_provisioned`, `platform.claim_redeemed`, etc.)

## Further reading

- [Platform API reference](/docs/guides/platform-api) for the full API documentation
- [Embedded wallets quickstart](/docs/guides/embedded-wallets-quickstart) for wallet-in-your-app patterns
- [@1claw/wallet-react](/docs/guides/wallet-react) for the embeddable React widget
- [Billing](/docs/guides/billing-and-usage) for tier details and platform billing
