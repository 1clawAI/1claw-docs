---
title: Quickstart for agents
description: Enroll (if needed), exchange an agent API key for a JWT, then list and fetch secrets the agent is allowed to access.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart for agents

An **agent** gets access by either (1) being **registered by a human** in the dashboard, or (2) **self-enrolling** via `POST /v1/agents/enroll` (public, no auth). You can supply a **human's email** (if they already have a 1Claw account) or **name only** and use the returned **`approval_url`** so they approve in the browser. Once the agent has an **API key** (`ocv_...`), it exchanges that for a short-lived JWT and calls the same API to list and fetch secrets. Access is enforced by **policies** created by the human.

:::tip Fastest path
Wiring an AI assistant? Run [`1claw setup`](/docs/quickstart#fastest-cli-setup) — it creates the agent, vault, policy, and MCP config automatically. For API-only agents, see the [Quickstart hub](/docs/quickstart) integration table.
:::

:::tip Try it out
Try out the examples in this repo: **[Basic](https://github.com/1clawAI/1claw-examples/tree/main/basic)** (SDK + agent token) and **[LangChain Agent](https://github.com/1clawAI/1claw-examples/tree/main/langchain-agent)** (agent fetches secrets just-in-time).
:::

## 0. Enroll (if you don't have credentials yet)

If no one has assigned you an agent yet, you can **self-enroll**.

- **With `human_email`:** Creates a **pending** enrollment for that account. Allow/Deny links are emailed, and the JSON response may include **`approval_url`** (use it if email is delayed or in spam). The API key is emailed **after the human approves** — it is not returned from the enroll response.
- **Name only** (omit `human_email`): Creates a **link-only** pending enrollment. The response includes **`approval_url`**; the human opens it while signed in to approve the agent into their org.

That human can then grant the agent access to vaults via policies and share the credentials with you (or your deployment).

**No authentication is required** for this endpoint.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","human_email":"human@example.com"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const res = await fetch("https://api.1claw.co/v1/agents/enroll", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "my-agent",
    human_email: "human@example.com",
    description: "Optional description",
  }),
});
const data = await res.json();
// data.approval_url may be present; credentials are emailed after the human approves
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client()
client.agents.enroll("my-agent", "admin@example.com")
```

</TabItem>
</Tabs>

**Name only (link-only enrollment):**

```bash
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'
```

The JSON response includes **`approval_url`** when a pending row was created. The human opens that URL while signed in to approve.

**Request body:** `name` (required), `human_email` (optional), `description` (optional).

**Response (201):** Includes a status `message` and may include **`approval_url`** when enrollment was created successfully. Some responses intentionally omit `approval_url` (for example when the email does not match an account) to limit abuse — see the [OpenAPI spec](https://www.npmjs.com/package/@1claw/openapi-spec). Credentials are emailed **after approval**, not in the enroll response. The human then adds policies in the [dashboard](https://1claw.co) and can give you the Agent ID and API key so you can continue with the steps below.

**Rate limits:** Per-email cooldown (one enrollment per email per 10 minutes) and IP rate limiting apply.

## 1. Get an agent token

You need the **agent ID** (UUID) and the **API key** that was returned when the agent was registered (or rotated).

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.co/v1/auth/agent-token \
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
  baseUrl: "https://api.1claw.co",
  agentId: "ec7e0226-30f0-4dda-b169-f060a3502603",
  apiKey: "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs",
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="ocv_your_agent_key")
print(client.resolved_agent_id)
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

Use this as `Authorization: Bearer <access_token>` for subsequent requests. Token is short-lived (default 1 hour; agents with a custom `token_ttl_seconds` may differ — `expires_in` is the authoritative value).

## 2. List secrets you can access

With the agent JWT you can list secrets in a vault (metadata only). You only see secrets for vaults and paths your policies allow.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
export TOKEN="<agent access_token>"
export VAULT_ID="ae370174-9aee-4b02-ba7c-d1519930c709"

curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets" \
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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
data = client.secrets.list(vault_id)
for s in data.data["secrets"]:
    print(f"{s['path']} ({s['type']}, v{s['version']})")
```

</TabItem>
</Tabs>

**Response:** `{ "secrets": [ { "id", "path", "type", "version", "metadata", "created_at", "expires_at" }, ... ] }`

## 3. Fetch a secret value

Request a secret by vault ID and path. The server checks policy; if the agent has read access, it decrypts and returns the value.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
secret = client.secrets.get(vault_id, "api-keys/openai")
print(secret.data["value"])
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
curl -s -X POST "https://api.1claw.co/v1/secrets/$SECRET_ID/share" \
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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="ocv_...")
resp = client._http.request(
    "POST",
    f"/v1/secrets/{secret_id}/share",
    body={
        "recipient_type": "creator",
        "expires_at": "2026-12-31T00:00:00Z",
    },
)
share = resp.data
```

</TabItem>
</Tabs>

The human sees the share in their **Inbound** shares in the dashboard and accepts it.

## Important

- **Store the API key securely** — In the agent's config or secrets store, not in code or prompts.
- **Refresh the JWT** before it expires — Call `POST /v1/auth/agent-token` again when `expires_in` has passed. The TypeScript SDK handles this automatically when you pass `agentId` + `apiKey`.
- **Same API as humans** — Same base URL and paths; only the way you get the JWT (agent-token vs email/password or Google) and the permissions (policies) differ.

## Next steps

- [Agent Self-Onboarding](/docs/agents/self-enrollment) — Full agent-first journey: enroll, read, write, share.
- [Managing Agent Fleets](/docs/agents/fleet-management) — Patterns for operating 100+ agents.
- [Agent API overview](/docs/agents/api/overview) — Auth and endpoints in one place.
- [Give an agent access](/docs/vaults/golden-path) — How a human registers an agent and creates a policy (or, after self-enrollment, how they grant the new agent access to vaults).
- [Fetch secret](/docs/agents/api/fetch-secret) — Full request/response and errors.
