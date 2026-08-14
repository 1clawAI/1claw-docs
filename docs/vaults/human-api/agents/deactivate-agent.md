---
title: Deactivate agent / Rotate key
description: Deactivate an agent with DELETE /v1/agents/{agent_id}; get a new API key with POST /v1/agents/{agent_id}/rotate-key.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deactivate agent / Rotate key

## Deactivate an agent

**Endpoint:** `DELETE /v1/agents/:agent_id`  
**Authentication:** Bearer JWT

**Permanently deletes** the agent and **immediately revokes** all active JWTs. The agent can no longer authenticate. To temporarily disable an agent without deleting it, use `PATCH /v1/agents/{agent_id}` with `{ "is_active": false }` instead.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X DELETE "https://api.1claw.xyz/v1/agents/ec7e0226-30f0-4dda-b169-f060a3502603" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.agents.delete(agentId);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.deactivate(agent_id)
```

</TabItem>
</Tabs>

**Response:** 204 No Content.

---

## Rotate agent key

**Endpoint:** `POST /v1/agents/:agent_id/rotate-key`  
**Authentication:** Bearer JWT

Generates a **new** API key for the agent. The old key stops working. Response includes the new key (shown only once).

**Example request:**

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/ec7e0226-30f0-4dda-b169-f060a3502603/rotate-key" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.rotateKey(agentId);
console.log(data.api_key); // Store new key
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

**Example response (200):** Same shape as create agent: `{ "agent": { ... }, "api_key": "ocv_..." }`. Store the new `api_key` and update the agent's config.

---

## Get or update agent

- **GET /v1/agents/:agent_id** — Returns single agent metadata (no API key).
- **PATCH /v1/agents/:agent_id** — Update name, description, scopes, is_active, expires_at.
