---
title: OAuth Connected Accounts
description: Connect AI agents to external services via OAuth — Google, GitHub, Slack, Discord, and more.
sidebar_position: 35
---

# OAuth Connected Accounts

Connect your AI agents to external services (Google, GitHub, Slack, Discord, LinkedIn, etc.) via human-approved OAuth flows. Agents can then use tokens to access external APIs without ever seeing the credentials.

:::info Requirements
OAuth Connected Accounts requires the **Execution Intents** feature to be enabled on the agent (`execution_intents_enabled: true`).
:::

## How It Works

1. **Human saves OAuth app credentials** — Register your OAuth app's `client_id` and `client_secret` for a provider (e.g., Google, GitHub). Credentials are envelope-encrypted at rest.
2. **Human initiates connection** — Call `POST /v1/agents/{id}/oauth/connect` with the provider slug and desired scopes. Returns an `authorization_url`.
3. **User completes OAuth consent** — Redirect to the authorization URL. After approval, the OAuth provider redirects to `GET /v1/oauth/callback`, which stores the tokens as an execution binding on the agent.
4. **Agent uses the connection** — The agent accesses the external service through execution intents. Tokens are auto-refreshed when expired.

## Supported Providers

The provider registry is seeded with 10 providers:

| Provider | Slug | Key Scopes |
|----------|------|-----------|
| Google | `google` | `openid`, `email`, `profile`, `calendar`, `drive` |
| GitHub | `github` | `repo`, `user`, `read:org`, `gist` |
| X (Twitter) | `twitter` | `tweet.read`, `tweet.write`, `users.read` |
| LinkedIn | `linkedin` | `openid`, `profile`, `email`, `w_member_social` |
| Slack | `slack` | `channels:read`, `chat:write`, `users:read` |
| Discord | `discord` | `identify`, `guilds`, `messages.read` |
| Notion | `notion` | Full workspace access (single scope) |
| Microsoft | `microsoft` | `openid`, `email`, `profile`, `Mail.Read`, `Calendars.Read` |
| Salesforce | `salesforce` | `api`, `refresh_token`, `openid` |
| HubSpot | `hubspot` | `crm.objects.contacts.read`, `crm.objects.deals.read` |

## Quick Start

### 1. Save App Credentials

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/{agent_id}/oauth/app-credentials" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_slug": "github",
    "client_id": "Iv1.abc123...",
    "client_secret": "secret_xyz..."
  }'
```

### 2. Initiate OAuth Connection

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/{agent_id}/oauth/connect" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_slug": "github",
    "scopes": ["repo", "user"],
    "redirect_uri": "https://1claw.xyz/oauth/callback"
  }'
```

Response:

```json
{
  "authorization_url": "https://github.com/login/oauth/authorize?client_id=...&scope=repo+user&state=...",
  "state": "..."
}
```

### 3. Complete OAuth Flow

Open the `authorization_url` in a browser. After the user approves, the callback stores tokens automatically.

### 4. Agent Uses the Connection

The agent can now access GitHub through execution intents:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/{agent_id}/execute" \
  -H "Authorization: Bearer $AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "github-oauth-binding-id",
    "intent_type": "http",
    "params": {
      "method": "GET",
      "url": "https://api.github.com/user/repos"
    }
  }'
```

## SDK Usage

```typescript
import { createClient } from '@1claw/sdk';

const client = createClient({ baseUrl: 'https://api.1claw.xyz', token: userJwt });

// List available providers
const providers = await client.oauthConnect.listProviders();

// Save app credentials
await client.oauthConnect.saveAppCredentials(agentId, {
  provider_slug: 'slack',
  client_id: 'your-slack-client-id',
  client_secret: 'your-slack-client-secret',
});

// Initiate connection
const { authorization_url } = await client.oauthConnect.connect(agentId, {
  provider_slug: 'slack',
  scopes: ['channels:read', 'chat:write'],
});

// List connections
const connections = await client.oauthConnect.listConnections(agentId);

// Disconnect
await client.oauthConnect.disconnect(agentId, bindingId);
```

## CLI Usage

```bash
# List available providers
1claw oauth providers

# List agent connections
1claw oauth connections --agent-id <id>

# Initiate a connection (opens browser)
1claw oauth connect --agent-id <id> --provider github --scopes repo,user

# Disconnect
1claw oauth disconnect --agent-id <id> --binding-id <binding-id>

# Manage app credentials
1claw oauth credentials set --agent-id <id> --provider slack
1claw oauth credentials list --agent-id <id>
1claw oauth credentials delete --agent-id <id> --provider slack
```

## Dashboard

The **Connected Accounts** card on the agent detail page (Connections tab) provides:

- List of connected OAuth providers with status
- "Connect" buttons for available providers
- OAuth app credential management
- Disconnect/revoke actions

## API Reference

### List Providers

```
GET /v1/oauth/providers
```

Returns the full provider registry (public, no auth required).

### Initiate Connection

```
POST /v1/agents/{id}/oauth/connect
```

Human-only. Body: `{ provider_slug, scopes?, redirect_uri? }`. Returns `{ authorization_url, state }`.

### List Connections

```
GET /v1/agents/{id}/oauth/connections
```

Returns OAuth connections backed by execution intent bindings.

### Disconnect

```
POST /v1/agents/{id}/oauth/disconnect/{bindingId}
```

Human-only. Revokes tokens and deletes the underlying binding.

### Save App Credentials

```
POST /v1/agents/{id}/oauth/app-credentials
```

Human-only. Body: `{ provider_slug, client_id, client_secret }`. Credentials are envelope-encrypted.

### List App Credentials

```
GET /v1/agents/{id}/oauth/app-credentials
```

Returns credentials with `client_secret` redacted.

### Delete App Credentials

```
DELETE /v1/agents/{id}/oauth/app-credentials/{providerSlug}
```

Human-only.

### OAuth Callback

```
GET /v1/oauth/callback
```

Public. Handles OAuth provider redirects, exchanges authorization code for tokens, stores as binding.

## Security

- OAuth app credentials (`client_secret`) are envelope-encrypted at rest using the org's KEK
- Access tokens and refresh tokens are stored as execution binding credentials (same encryption as other bindings)
- Agents never see raw OAuth tokens — they access services through the execution intents framework
- Token refresh happens transparently server-side
- Only humans can initiate connections and manage credentials (agents get 403)
- Provider registry is read-only (seeded at migration time)

## Database

- `oauth_provider_registry` (migration 171) — seeded provider definitions
- `oauth_app_credentials` (migration 172) — per-org encrypted client credentials

Both tables have RLS enabled.
