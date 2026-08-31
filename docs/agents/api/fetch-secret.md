---
title: Fetch a secret
description: Retrieve a secret value by vault ID and path with GET /v1/vaults/{vault_id}/secrets/{path}; the agent must have read permission via policy.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Fetch a secret

Same endpoint as for humans: **GET /v1/vaults/:vault_id/secrets/:path**. The agent sends its JWT; the server checks policies for that agent and returns the decrypted value only if allowed.

## Request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.co/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/secrets/api-keys/openai" \
  -H "Authorization: Bearer <agent_access_token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: secret } = await client.secrets.get(
  "ae370174-9aee-4b02-ba7c-d1519930c709",
  "api-keys/openai",
);
// Use secret.value for the intended call — don't log or persist
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

## Response (200)

```json
{
  "id": "599dd304-920c-4459-ae07-d62a3515381b",
  "path": "api-keys/openai",
  "type": "api_key",
  "value": "sk-proj-...",
  "version": 1,
  "metadata": {},
  "created_by": "user:...",
  "created_at": "2026-02-18T12:00:00Z"
}
```

Use the `value` only for the intended operation; do not log or cache it longer than necessary.

## Errors

| Code | Meaning |
|------|---------|
| 401 | Invalid or expired token — refresh with POST /v1/auth/agent-token |
| 403 | No read permission for this path |
| 404 | Vault or secret not found |
| 410 | Secret expired, deleted, or over max_access_count |
