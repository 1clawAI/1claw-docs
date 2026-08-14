---
title: Delete a secret
description: Soft-delete a secret at a path using DELETE /v1/vaults/{vault_id}/secrets/{path}; subsequent reads return 410 Gone.
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Delete a secret

Soft-delete a secret at a path. All versions of that path are marked deleted; they are not returned in list or get, and GET returns **410 Gone**.

**Endpoint:** `DELETE /v1/vaults/:vault_id/secrets/:path`  
**Authentication:** Bearer JWT (write permission or vault owner)

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X DELETE "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/secrets/api-keys/old-key" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.delete(vaultId, "api-keys/old-key");
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.secrets.delete(vault_id, "api-keys/openai")
```

</TabItem>
</Tabs>

## Response

**204 No Content** — Success. No body.

## Error responses

| Code | Meaning |
|------|---------|
| 401 | Invalid or missing token |
| 403 | No delete/write permission |
| 404 | Vault not found |

After deletion, `GET .../secrets/:path` for that path returns **410 Gone**.
