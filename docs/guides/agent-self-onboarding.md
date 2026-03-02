---
title: Agent Self-Onboarding
description: "End-to-end guide for AI agents that need to enroll themselves, store secrets, and share them with their human — no pre-existing credentials required."
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent Self-Onboarding

This guide covers the full journey from an agent's perspective: self-enroll with zero credentials, receive access from your human, create and read secrets, and share them back.

## Overview

```
Agent (no credentials)
  │
  ├── 1. POST /v1/agents/enroll  (public, no auth)
  │      └── Credentials emailed to the human
  │
  ├── 2. Human creates access policies in the dashboard
  │
  ├── 3. Agent exchanges API key for JWT
  │      └── POST /v1/auth/agent-token
  │
  ├── 4. Agent reads / writes secrets
  │      └── GET/PUT /v1/vaults/:id/secrets/:path
  │
  └── 5. Agent shares secrets back to human
         └── POST /v1/secrets/:id/share { recipient_type: "creator" }
```

## 1. Self-enroll

The enrollment endpoint is **public** — no authentication required. The agent provides its name and the email of a human who already has a 1Claw account.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST https://api.1claw.xyz/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "human_email": "alice@example.com",
    "description": "CI pipeline agent"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
import { AgentsResource } from "@1claw/sdk";

const result = await AgentsResource.enroll(
  "https://api.1claw.xyz",
  {
    name: "my-agent",
    human_email: "alice@example.com",
    description: "CI pipeline agent",
  },
);
console.log("Agent ID:", result.agent_id);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npx @1claw/cli agent enroll my-agent --email alice@example.com
```

</TabItem>
</Tabs>

**What happens:**

1. The API looks up the human by email.
2. An agent is created in the human's organization with `created_by` pointing to that user.
3. An API key is generated, hashed, and stored — the plaintext key is **emailed to the human**, never returned in the API response.
4. The response always returns `201` with the same shape (to prevent email enumeration).

**Rate limits:** One enrollment per email per 10 minutes, plus IP-based rate limiting.

## 2. Human grants access

The human receives an email with the agent's ID and API key. In the [dashboard](https://1claw.xyz):

1. Go to **Vaults** and select (or create) a vault.
2. Navigate to **Policies** → **Create Policy**.
3. Set principal type to **Agent**, select the agent, choose a path pattern (e.g. `api-keys/**`), and grant **read** (and optionally **write**) permission.

The agent now has zero-access-by-default elevated to the specific paths the human chose.

## 3. Exchange API key for JWT

Once the human shares the API key with the agent's deployment:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
TOKEN=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<AGENT_ID>","api_key":"ocv_..."}' \
  | jq -r .access_token)
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: process.env.ONECLAW_AGENT_ID,
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});
// The SDK auto-exchanges and refreshes the JWT.
```

</TabItem>
</Tabs>

## 4. Read and write secrets

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Read a secret
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"

# Store a secret
curl -s -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/credentials/db-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"password","value":"s3cret!"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
// Read
const { data: secret } = await client.secrets.get(VAULT_ID, "api-keys/openai");

// Write (requires write policy)
await client.secrets.set(VAULT_ID, "credentials/db-password", "s3cret!", {
  type: "password",
});
```

</TabItem>
</Tabs>

## 5. Share secrets back to your human

Agents can share any secret they own back to the human who created them using `recipient_type: "creator"`. No email address or user ID is needed — the API resolves it from `created_by`.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.xyz/v1/secrets/$SECRET_ID/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_type": "creator",
    "expires_at": "2026-12-31T00:00:00Z",
    "max_access_count": 10
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
const { data: share } = await client.sharing.create(secretId, {
  recipient_type: "creator",
  expires_at: "2026-12-31T00:00:00Z",
  max_access_count: 10,
});
```

</TabItem>
<TabItem value="mcp" label="MCP">

```
share_secret(secret_id: "...", recipient_type: "creator", expires_at: "2026-12-31T00:00:00Z")
```

</TabItem>
</Tabs>

The human sees the share in their **Inbound** tab on the Sharing page and accepts it.

## Complete example

Here is a typical agent lifecycle in a single script:

```typescript
import { createClient, AgentsResource } from "@1claw/sdk";

// Step 1: Self-enroll (first run only)
const enrollment = await AgentsResource.enroll("https://api.1claw.xyz", {
  name: "deploy-bot",
  human_email: "ops@mycompany.com",
});
console.log("Enrolled:", enrollment.agent_id);
// Wait for human to email you the API key and create policies...

// Steps 3-5: Normal operation (after receiving credentials)
const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: process.env.ONECLAW_AGENT_ID,
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});

// Read a secret
const { data: secret } = await client.secrets.get(VAULT_ID, "api-keys/deploy-token");

// Store a newly generated credential
await client.secrets.set(VAULT_ID, "credentials/session-key", newSessionKey, {
  type: "api_key",
});

// Share it back to the human
const { data: secretMeta } = await client.secrets.describe(VAULT_ID, "credentials/session-key");
await client.sharing.create(secretMeta.id, {
  recipient_type: "creator",
  expires_at: "2026-06-01T00:00:00Z",
});
```

## Security notes

- **Zero access by default** — A freshly enrolled agent cannot read any secrets until the human creates policies.
- **API key is never in the response** — It is emailed to the human only. The agent never sees its own key via the enrollment API.
- **Rate limiting** — Enrollment is rate-limited per email (10 min cooldown) and per IP to prevent abuse.
- **Uniform responses** — The API returns the same 201 shape whether the email matches a user or not, preventing email enumeration.

## Next steps

- [Managing Agent Fleets](/docs/guides/agent-fleet-management) — Patterns for operating 100+ agents at scale.
- [Give an agent access](/docs/guides/give-agent-access) — The human side of the flow.
- [Sharing Secrets](/docs/guides/sharing-secrets) — All share types and options.
