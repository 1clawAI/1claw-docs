---
title: Quickstart for agents
description: Enroll (if needed), exchange an agent API key for a JWT, then list and fetch secrets the agent is allowed to access.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart for agents

An **agent** gets access by either (1) being **registered by a human** in the dashboard, or (2) **self-enrolling** with the email of a human who already has a 1Claw account. Once the agent has an **API key** (`ocv_...`), it exchanges that for a short-lived JWT and calls the same API to list and fetch secrets. Access is enforced by **policies** created by the human.

## 0. Enroll (if you don't have credentials yet)

If no one has assigned you an agent yet, you can **self-enroll**. You need the **email address of a human** who already has a 1Claw account. The API creates an agent in their organization and **emails the credentials** (Agent ID + API key) to that person — the key is never returned in the API response. That human can then grant the agent access to vaults via policies and share the credentials with you (or your deployment).

**No authentication is required** for this endpoint.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST https://api.1claw.xyz/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","human_email":"human@example.com"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const res = await fetch("https://api.1claw.xyz/v1/agents/enroll", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "my-agent",
    human_email: "human@example.com",
    description: "Optional description",
  }),
});
const data = await res.json();
// data.agent_id is set only when the email matched a user; credentials are emailed to the human
```

</TabItem>
</Tabs>

**Request body:** `name` (required), `human_email` (required), `description` (optional).

**Response (201):** Same shape whether the email exists or not (to prevent email enumeration). When the email matches a 1Claw user, an agent is created and credentials are sent to that email. The human then adds policies in the [dashboard](https://1claw.xyz) and can give you the Agent ID and API key so you can continue with the steps below.

**Rate limits:** Per-email cooldown (one enrollment per email per 10 minutes) and IP rate limiting apply.

## 1. Get an agent token

You need the **agent ID** (UUID) and the **API key** that was returned when the agent was registered (or rotated).

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ec7e0226-30f0-4dda-b169-f060a3502603",
    "api_key": "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

// Agent credentials — the SDK exchanges them for a JWT automatically
// and refreshes it before expiry
const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: "ec7e0226-30f0-4dda-b169-f060a3502603",
  apiKey: "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs",
});
```

</TabItem>
</Tabs>

**Response:**

```json
{
  "access_token": "eyJhbGciOiJFZERTQSIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use this as `Authorization: Bearer <access_token>` for subsequent requests. Token is short-lived (e.g. 1 hour).

## 2. List secrets you can access

With the agent JWT you can list secrets in a vault (metadata only). You only see secrets for vaults and paths your policies allow.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
export TOKEN="<agent access_token>"
export VAULT_ID="ae370174-9aee-4b02-ba7c-d1519930c709"

curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const VAULT_ID = "ae370174-9aee-4b02-ba7c-d1519930c709";

const { data } = await client.secrets.list(VAULT_ID);
for (const s of data.secrets) {
  console.log(`${s.path} (${s.type}, v${s.version})`);
}
```

</TabItem>
</Tabs>

**Response:** `{ "secrets": [ { "id", "path", "type", "version", "metadata", "created_at", "expires_at" }, ... ] }`

## 3. Fetch a secret value

Request a secret by vault ID and path. The server checks policy; if the agent has read access, it decrypts and returns the value.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: secret } = await client.secrets.get(VAULT_ID, "api-keys/openai");
// Use the value for the intended call — don't log or persist it
console.log(`Retrieved ${secret.path} (${secret.type}, v${secret.version})`);
```

</TabItem>
</Tabs>

**Response (200):** Includes `value` (plaintext) and metadata. Use the value only for the intended call; don't log or persist it.

If the agent has no read permission for that path, or the secret is expired/deleted, you get **403** or **404/410**.

## 4. Share a secret back to your human

Agents can share secrets with the human who created or enrolled them using `recipient_type: "creator"`. No email address or user ID is needed.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.xyz/v1/secrets/$SECRET_ID/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_type":"creator","expires_at":"2026-12-31T00:00:00Z"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.sharing.create(secretId, {
  recipient_type: "creator",
  expires_at: "2026-12-31T00:00:00Z",
});
```

</TabItem>
</Tabs>

The human sees the share in their **Inbound** shares in the dashboard and accepts it.

## Important

- **Store the API key securely** — In the agent's config or secrets store, not in code or prompts.
- **Refresh the JWT** before it expires — Call `POST /v1/auth/agent-token` again when `expires_in` has passed. The TypeScript SDK handles this automatically when you pass `agentId` + `apiKey`.
- **Same API as humans** — Same base URL and paths; only the way you get the JWT (agent-token vs email/password or Google) and the permissions (policies) differ.

## Next steps

- [Agent Self-Onboarding](/docs/guides/agent-self-onboarding) — Full agent-first journey: enroll, read, write, share.
- [Managing Agent Fleets](/docs/guides/agent-fleet-management) — Patterns for operating 100+ agents.
- [Agent API overview](/docs/agent-api/overview) — Auth and endpoints in one place.
- [Give an agent access](/docs/guides/give-agent-access) — How a human registers an agent and creates a policy (or, after self-enrollment, how they grant the new agent access to vaults).
- [Fetch secret](/docs/agent-api/fetch-secret) — Full request/response and errors.
