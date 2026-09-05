---
title: List policies (grants)
description: List all policies for a vault with GET /v1/vaults/{vault_id}/policies.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# List policies (grants)

**Endpoint:** `GET /v1/vaults/:vault_id/policies`  
**Authentication:** Bearer JWT

Returns all policies (grants) for the given vault.

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.co/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/policies" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.access.listGrants(vaultId);
for (const p of data.policies) {
  console.log(p.id, p.principal_type, p.permissions);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
policies = client.policies.list(vault_id)
for p in policies.data["policies"]:
    print(p["secret_path_pattern"], p["permissions"])
```

</TabItem>
</Tabs>

## Example response (200)

```json
{
    "policies": [
        {
            "id": "897b37da-a265-4bd4-818b-e716eeff3de3",
            "vault_id": "ae370174-9aee-4b02-ba7c-d1519930c709",
            "secret_path_pattern": "**",
            "principal_type": "agent",
            "principal_id": "00000000-0000-4000-8000-000000000000",
            "permissions": ["read"],
            "conditions": {},
            "created_by": "2a57eb5e-caac-4e34-9685-b94c37458eb1",
            "created_at": "2026-02-18T12:00:00Z"
        }
    ]
}
```

## Update a policy

**Endpoint:** `PUT /v1/vaults/:vault_id/policies/:policy_id`  
**Body:** `permissions` (array), optional `conditions` (object), optional `expires_at` (ISO 8601). Only these fields can be updated; path pattern and principal are fixed after creation.

In the **dashboard**, open **Vaults → [vault] → Policies** and click the pencil (edit) icon on a policy to change permissions, conditions, or expiry. Use the trash icon to delete a policy.
