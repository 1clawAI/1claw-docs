---
title: Revoke a policy (grant)
description: Delete a policy with DELETE /v1/vaults/{vault_id}/policies/{policy_id}; the principal immediately loses the granted access.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Revoke a policy (grant)

**Endpoint:** `DELETE /v1/vaults/:vault_id/policies/:policy_id`  
**Authentication:** Bearer JWT

Removes the policy. The principal (user or agent) immediately loses the permissions that policy granted.

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X DELETE "https://api.1claw.co/v1/vaults/$VAULT_ID/policies/897b37da-a265-4bd4-818b-e716eeff3de3" \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.access.revoke(vaultId, policyId);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.policies.delete(vault_id, policy_id)
```

</TabItem>
</Tabs>

## Response

**204 No Content** — Success.

## Error responses

| Code | Meaning |
|------|---------|
| 401 | Invalid or missing token |
| 403 | Not allowed |
| 404 | Vault or policy not found |
