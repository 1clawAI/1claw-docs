---
title: List agents
description: List all agents in your org with GET /v1/agents.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# List agents

**Endpoint:** `GET /v1/agents`  
**Authentication:** Bearer JWT

Returns all agents in the caller's organization. API keys are never returned; only metadata.

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.co/v1/agents" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.list();
for (const a of data.agents) {
  console.log(a.name, a.id, a.is_active);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
agents = client.agents.list()
for a in agents.data["agents"]:
    print(a["name"], a["id"])
```

</TabItem>
</Tabs>

## Example response (200)

```json
{
  "agents": [
    {
      "id": "ec7e0226-30f0-4dda-b169-f060a3502603",
      "name": "CI Agent",
      "description": "GitHub Actions deploy",
      "auth_method": "api_key",
      "scopes": ["vaults:read"],
      "is_active": true,
      "created_at": "2026-02-18T12:00:00Z",
      "expires_at": null,
      "last_active_at": "2026-02-18T14:00:00Z"
    }
  ]
}
```
