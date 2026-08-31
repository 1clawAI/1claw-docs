---
title: List accessible secrets
description: List secret metadata in a vault with GET /v1/vaults/{vault_id}/secrets; only paths the agent can read are visible; values are never in list responses.
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# List accessible secrets

**Endpoint:** `GET /v1/vaults/:vault_id/secrets`  
**Authentication:** Bearer JWT (agent)

Returns **metadata** for secrets in the vault. The server applies policy so the agent only sees secrets it has read access to. Optional query: `?prefix=...` to filter by path prefix.

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets?prefix=api-keys" \
  -H "Authorization: Bearer <agent_token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
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

## Example response (200)

```json
{
  "secrets": [
    {
      "id": "599dd304-920c-4459-ae07-d62a3515381b",
      "path": "api-keys/openai",
      "type": "api_key",
      "version": 1,
      "metadata": {},
      "created_at": "2026-02-18T12:00:00Z"
    }
  ]
}
```

Values are **never** returned in list responses. To get a value, call [GET .../secrets/:path](/docs/agents/api/fetch-secret) for each path you need.
