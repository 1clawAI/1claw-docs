---
title: Agent authentication
description: Exchange agent_id and api_key for a JWT using POST /v1/auth/agent-token; use the token as Bearer for all subsequent requests.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent authentication

Agents authenticate by exchanging an **agent ID** and **API key** for a short-lived **JWT**. The API key is returned only when the agent is created (or when the key is rotated) and must be stored securely.

## Endpoint

**POST /v1/auth/agent-token**  
**Security:** None (no Bearer required). Request body must contain valid agent credentials.

## Request body

| Field    | Type   | Required | Description                           |
| -------- | ------ | -------- | ------------------------------------- |
| agent_id | string | Optional | UUID of the agent (from registration). When omitted, the server auto-resolves the agent from the API key prefix. |
| api_key  | string | ✅       | Agent API key (e.g. `ocv_...`)        |

## Example request

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

// The SDK exchanges agent credentials for a JWT automatically
// and refreshes the token before it expires
const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: "ec7e0226-30f0-4dda-b169-f060a3502603",
  apiKey: "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs",
});
// All subsequent calls use the auto-managed JWT
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

## Example response (200)

```json
{
    "access_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900
}
```

Use `access_token` in the `Authorization` header for all subsequent API calls. When `expires_in` seconds have passed, call this endpoint again to get a new token.

## JWT scopes

The issued JWT includes a `scopes` claim. If the agent record has scopes set (e.g. from creation or PATCH), those are used. If the agent has no scopes set, the backend derives scopes from the agent's **access policies**: the path patterns from all active policies for that agent become the JWT scopes, so the token reflects current policy-based access. If there are no policies either, scopes default to `["*"]`.

## Error responses

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| 401  | Invalid agent_id or api_key, agent inactive, agent expired, or **API key expired** (`api_key_expires_at` passed) |

Never log or expose the API key; treat it like a password.

:::info API key expiration
Agents support an optional `api_key_expires_at` field (ISO 8601). When set, the token exchange returns 401 after that date even if the agent itself hasn't expired. Set it on agent creation or update via `api_key_expires_at`.
:::
