---
title: Agent Self-Onboarding
description: "End-to-end guide for AI agents that need to enroll themselves, store secrets, and share them with their human — no pre-existing credentials required."
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent Self-Onboarding

This guide covers the full journey from an agent's perspective: self-enroll with zero credentials, receive access from your human, create and read secrets, and share them back.

:::tip Try it out
Try out the example in this repo: **[Basic](https://github.com/1clawAI/1claw-examples/tree/main/basic)** (includes enrollment and sharing). The [examples README](https://github.com/1clawAI/1claw-examples) lists all runnable demos.
:::

## Overview

```
Agent (no credentials)
  │
  ├── 1. POST /v1/agents/enroll  (public, no auth)
  │      └── Pending enrollment; human approves via email link or approval_url
  │      └── Credentials emailed to the human after approval
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

The enrollment endpoint is **public** — no authentication required. Provide **`name`** and optionally **`human_email`**:

- **With email:** A pending enrollment is created for that account; Allow/Deny links are emailed, and the response may include **`approval_url`** as a fallback.
- **Name only:** A link-only pending enrollment is created; the response includes **`approval_url`** for the human to open while signed in (no email required to start).

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
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
  "https://api.1claw.co",
  {
    name: "my-agent",
    human_email: "alice@example.com",
    description: "CI pipeline agent",
  },
);
console.log("Agent ID:", result.agent_id);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client()
resp = client.agents.enroll(
    "my-agent",
    "alice@example.com",
    description="CI pipeline agent",
)
print(resp.data.get("agent_id"), resp.data.get("approval_url"))
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npx @1claw/cli agent enroll my-agent --email alice@example.com
```

</TabItem>
</Tabs>

**Link-only (no email):**

```bash
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'

npx @1claw/cli agent enroll my-agent
```

**What happens:**

1. The API creates a **pending** enrollment (email-bound or link-only).
2. The human **approves** via the emailed link or by opening **`approval_url`** while signed in.
3. After approval, an agent is created in the approver's organization; an API key is generated and **emailed** — the plaintext key is never returned from `POST /v1/agents/enroll`.
4. Responses use a uniform `201` shape where needed to limit email enumeration (some branches omit `approval_url`).

**Rate limits:** One enrollment per email per 10 minutes (when email is used), caps on pending enrollments, plus IP-based rate limiting.

## 2. Human grants access

The human receives an email with the agent's ID and API key. In the [dashboard](https://1claw.co):

1. Go to **Vaults** and select (or create) a vault.
2. Navigate to **Policies** → **Create Policy**.
3. Set principal type to **Agent**, select the agent, choose a path pattern (e.g. `api-keys/**`), and grant **read** (and optionally **write**) permission.

The agent now has zero-access-by-default elevated to the specific paths the human chose.

## 3. Exchange API key for JWT

Once the human shares the API key with the agent's deployment:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
TOKEN=$(curl -s -X POST https://api.1claw.co/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<AGENT_ID>","api_key":"ocv_..."}' \
  | jq -r .access_token)
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.co",
  agentId: process.env.ONECLAW_AGENT_ID,
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});
// The SDK auto-exchanges and refreshes the JWT.
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

## 4. Read and write secrets

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Read a secret
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"

# Store a secret
curl -s -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/credentials/db-password" \
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
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.secrets.set(
    vault_id,
    "api-keys/openai",
    "sk-proj-...",
    type="api_key",
    metadata={"tags": ["openai", "production"]},
)
print(resp.data["path"], f"v{resp.data['version']}")
```

</TabItem>
</Tabs>

## 5. Share secrets back to your human

Agents can share any secret they own back to the human who created them using `recipient_type: "creator"`. No email address or user ID is needed — the API resolves it from `created_by`.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.co/v1/secrets/$SECRET_ID/share" \
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
        "max_access_count": 10,
    },
)
share = resp.data
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
const enrollment = await AgentsResource.enroll("https://api.1claw.co", {
  name: "deploy-bot",
  human_email: "ops@mycompany.com",
});
console.log("Pending:", enrollment.message, enrollment.approval_url);
// Wait for human to approve, then email you the API key and create policies...

// Steps 3-5: Normal operation (after receiving credentials)
const client = createClient({
  baseUrl: "https://api.1claw.co",
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
const { data: secretMeta } = await client.secrets.get(VAULT_ID, "credentials/session-key");
await client.sharing.create(secretMeta.id, {
  recipient_type: "creator",
  expires_at: "2026-06-01T00:00:00Z",
});
```

## Security notes

- **Zero access by default** — A freshly enrolled agent cannot read any secrets until the human creates policies.
- **API key is never in the enroll response** — It is emailed to the human after they approve. The agent never sees its own key via `POST /v1/agents/enroll`.
- **Rate limiting** — Enrollment is rate-limited per email (10 min cooldown when email is used), with caps on pending rows and per IP.
- **Uniform responses** — Some branches use the same 201 shape to limit email enumeration; `approval_url` may be omitted in those cases.

## Next steps

- [Managing Agent Fleets](/docs/agents/fleet-management) — Patterns for operating 100+ agents at scale.
- [Give an agent access](/docs/vaults/golden-path) — The human side of the flow.
- [Sharing Secrets](/docs/sharing/overview) — All share types and options.
