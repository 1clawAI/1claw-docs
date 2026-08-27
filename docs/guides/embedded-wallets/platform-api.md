---
title: Platform API for Embedded Wallets
description: Upsert users, bootstrap templates, claim tokens, connected apps, grants, and delegation for embedded wallet products.
sidebar_position: 8
---

# Platform API for Embedded Wallets

The [Platform API](/docs/platform-api/overview) is how your **backend** provisions users, bootstraps infrastructure, and configures spend policies. End-users interact with **treasury wallet** and **auth** endpoints using their own JWTs (issued after OTP/social/OAuth login). Your **`plt_`** key must never ship to browsers — use it server-side or rely on the widget's built-in platform key wiring.

## Authentication model

| Credential | Principal | Use for |
| ---------- | --------- | ------- |
| `plt_...` | Platform app | `upsert`, `bootstrap`, spend policies, list connected users |
| User JWT | Human end-user | Treasury wallets, send/swap, effective spend policy |
| `X-Platform-Connection` + `plt_` | Platform delegated | Scoped CRUD on connected user's resources (when enabled) |

## Register and configure app

See [Getting started](/docs/guides/embedded-wallets/getting-started#step-1-create-a-platform-app). Key settings for wallet products:

| Setting | Wallet product guidance |
| ------- | ------------------------ |
| `auth_mode: "user_signin"` | Users explicitly log in (OTP/social/widget) |
| `auth_mode: "silent"` | Backend provisions via OIDC `subject_token` only |
| `billing_model: "platform_pays"` | Your subscription covers connected user usage |
| `redirect_uris` | Required for Sign in with 1Claw OAuth |
| `oidc_jwks_url` / `oidc_issuer` | Verify upstream IdP tokens on `upsert` |

## Upsert user

```typescript
const { data } = await platform.platform.upsertUser({
  email: "user@example.com",
  external_subject: "shopify:customer-9912",
  create_sub_org: false, // true → isolated sub-org per user
});
// data.connection_id, data.user_handle, data.is_new
```

OIDC variant:

```typescript
await platform.platform.upsertUser({
  subject_token: upstreamJwt,
  external_subject: upstreamJwtSub,
});
```

Cross-org safety: `user.org_id` must match `app.org_id` or upsert fails.

## Bootstrap templates

Declarative JSON spec creates resources atomically:

```json
{
  "plan": "pro",
  "vault": { "name": "user-vault" },
  "agents": [{
    "name": "companion",
    "intents": { "enabled": true },
    "signing_keys": [{ "chain": "ethereum" }],
    "provision_eoa": true
  }],
  "policies": [{
    "principal_ref": "agents.primary",
    "vault_ref": "vault",
    "paths": ["*"],
    "permissions": ["read"]
  }],
  "runtimes": [],
  "automations": []
}
```

When `billing_model` is **`platform_pays`**, bootstrap applies the template **`plan`** tier to the connected user's org (default **`pro`**, capped by your platform org's tier). This unlocks Cloud Runtimes, chat, and other Pro+ gates without requiring each end-user to subscribe. The granted tier is returned on `GET /v1/platform/connections/{id}` as `provisioned_tier`.

Valid `plan` values: `pro`, `team`, `business`, `enterprise`.

Bootstrap call:

```typescript
const { data } = await platform.platform.bootstrapUser(connectionId, {
  template_id: templateUuid,
});
// data.claim_url, data.summary.agent_api_key (one-time), data.summary.signing_keys
```

**Custody:** Resources created with `platform_locked: true` cannot be read by platform operators — only lifecycle management.

### Wallet-only apps

You do **not** need bootstrap for basic embedded wallets. Auth-time `auto_provision_chains` + React `chains` prop creates treasury wallets without agents or vaults.

## Claim flow

| Step | API | Auth |
| ---- | --- | ---- |
| Preview | `GET /v1/platform/claim/{token}` | Token in URL |
| Redeem | `POST /v1/platform/claim/{token}` | Token in URL |
| Reissue link | `POST .../reissue-claim` | `plt_` |

After claim, connection status becomes `claimed`. Webhook: `platform.claim.redeemed`.

## Connected apps & grants

Users manage connections at **Settings → Connected Apps**. Grant UI: `/connect/{slug}/grant?connection={id}`.

**User-authenticated** grant API:

```typescript
await userClient.platform.grantAccess(connectionId, {
  vault_ids: [vaultUuid],
  agent_ids: [agentUuid],
  allowed_paths: ["api-keys/*"],
  permissions: ["read"],
  expires_at: "2027-01-01T00:00:00Z",
});
```

List/revoke: `listGrants`, `revokeGrant`.

## Fathom / connection-scoped operations (v0.58–v0.59)

Use these with **`plt_`** auth when building embedded wallet or agent products (e.g. Fathom):

| Operation | Endpoint | SDK |
| --------- | -------- | --- |
| Agent signing keys (list) | `GET /v1/platform/connections/{id}/signing-keys?agent_id=` | `platform.listConnectionSigningKeys()` |
| Agent signing key (one chain) | `GET .../signing-keys/{chain}?agent_id=` | `platform.getConnectionSigningKey()` |
| Enable Intents post-bootstrap | `PATCH .../agents/{agent_id}` | `platform.patchConnectionAgent()` |
| Connection runtime GET | `GET /v1/platform/connections/{id}/runtimes/{runtimeId}` | `platform.getConnectionRuntime()` |
| Passkey enroll (begin) | `POST .../passkeys/enroll/begin` | `platform.connectionPasskeyEnrollBegin()` |
| Passkey enroll (complete) | `POST .../passkeys/enroll/complete` | `platform.connectionPasskeyEnrollComplete()` |
| Agent chat (as user) | `POST .../agents/{aid}/chat` | `platform.connectionAgentChat()` — accepts `system`, `system_prompt`, `messages[]`; billing errors **402** |
| Template GET | `GET /v1/platform/apps/{appId}/templates/{templateId}` | `platform.getTemplate()` |
| Provisioned tier | `GET /v1/platform/connections/{id}` → `provisioned_tier` | `platform.getConnection()` |
| SIWE staker wallet | `GET /v1/platform/connections/{id}` → `wallet_address` | `platform.getConnection()` |

**`wallet_address` vs agent address:** On SIWE connections, `wallet_address` is the **user's Sign-In with Ethereum wallet** (identity). The **agent's on-chain signing address** is under `GET .../signing-keys` or bootstrap `summary.signing_keys`. Do not send deposits or read Intents balances from `wallet_address`.

**Enable Intents without re-bootstrap:**

```typescript
await platform.platform.patchConnectionAgent(connectionId, agentId, {
  intents_api_enabled: true,
  execution_intents_enabled: true,
  system_prompt: "You are a helpful trading assistant.",
});
```

At bootstrap, template aliases work too: `intents: true`, `intents: { enabled: true }`, or `intents_api_enabled: true` (same for `execution` / `execution_intents_enabled`).

Set default agent behavior at bootstrap via template `agents[].system_prompt` or on agents with `system_prompt` on create/update. Connection chat uses the agent default when the request does not override.

## Platform delegation (optional)

Enable ongoing backend operations on connected resources:

1. User toggles delegation on the connection (`PATCH /v1/platform/connected-apps/{id}`)
2. Backend uses `client.platform.withConnection(connectionId)` — attaches `X-Platform-Connection`
3. Scopes enforced: `secrets:read`, `vaults:write`, `agents:read`, etc.

Disconnected connections return **403**.

## Spend policies

Platform-side only:

```typescript
await platform.platform.createSpendPolicy(appId, { daily_limit_eth: "1.0" });
await platform.platform.setUserSpendPolicy(connectionId, { daily_limit_eth: "5.0" });
```

See [Spend policies](/docs/guides/embedded-wallets/spend-policies).

## Webhooks

Subscribe to platform and wallet events:

- `platform.user.connected` / `platform.user.disconnected`
- `platform.bootstrap.completed`
- `platform.grant.created` / `platform.grant.revoked`
- `platform.claim.redeemed`
- `wallet.transfer.sent` / `wallet.transfer.received`

Configure `webhook_url` on the platform app; verify HMAC (`X-Webhook-Signature`). See [Platform webhooks](/docs/platform-api/webhooks).

## Marketplace listing

Public marketplace: `GET /v1/platform/marketplace`. Opt in via app fields `is_listed`, `category`, `listing_tags`, `listing_screenshots`.

## SDK resource map

```typescript
const platform = createClient({ apiKey: "plt_..." });

platform.platform.createApp(...)
platform.platform.listApps()
platform.platform.createTemplate(appId, ...)
platform.platform.upsertUser(...)
platform.platform.bootstrapUser(connectionId, ...)
platform.platform.reissueClaim(connectionId)
platform.platform.claimPreview(token)
platform.platform.claimRedeem(token)
platform.platform.createSpendPolicy(appId, ...)
platform.platform.setUserSpendPolicy(connectionId, ...)
platform.platform.grantAccess(connectionId, ...)
platform.platform.getConnection(connectionId) // includes provisioned_tier, wallet_address (SIWE staker — not agent key)
platform.platform.listConnectionSigningKeys(connectionId, { agent_id })
platform.platform.getConnectionSigningKey(connectionId, chain, { agent_id })
platform.platform.patchConnectionAgent(connectionId, agentId, { intents_api_enabled, system_prompt })
platform.platform.getConnectionRuntime(connectionId, runtimeId)
platform.platform.connectionPasskeyEnrollBegin(connectionId)
platform.platform.connectionAgentChat(connectionId, agentId, { message, system_prompt })
platform.platform.withConnection(connectionId) // delegated client
```

## Related

- [Platform API overview](/docs/platform-api/overview) — exhaustive reference
- [Multi-tenant patterns](/docs/platform-api/multi-tenant) — billing models
- [Dashboard platform wizard](/docs/dashboard/platform-wizard) — visual setup
- [Security overview](/docs/security/security-overview) — custody and audit
