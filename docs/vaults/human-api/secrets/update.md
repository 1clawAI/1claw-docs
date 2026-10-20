---
title: Update a secret (new version)
description: Creating a new version of a secret is done by PUT to the same path; the API creates a new version and returns 201 with updated metadata.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Update a secret (new version)

In 1claw, there is no separate "update" endpoint. To **update** a secret you **PUT** to the same vault and path with a new body. That creates a **new version** (version 2, 3, …). The previous version remains stored but the default "latest" read returns the newest version.

**Endpoint:** `PUT /v1/vaults/:vault_id/secrets/:path`  
**Authentication:** Bearer JWT

Same request body as [Create a secret](/docs/vaults/human-api/secrets/create): `type`, `value`, and optional `metadata`, `expires_at`, `rotation_policy`, `max_access_count`.

## Example

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","value":"sk-proj-NEW-KEY..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.set(vaultId, "api-keys/openai", "sk-proj-NEW-KEY...", {
  type: "api_key",
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

**Response (201):** Same shape as create; `version` will be 2 (or next). The secret value is never returned.

To read a **specific** version, use `GET /v1/vaults/:vault_id/secret-version/:path/:version` (SDK: `client.secrets.getVersion(vaultId, path, version)`). List all versions with `GET /v1/vaults/:vault_id/secret-versions/:path`. `GET .../secrets/:path` always returns the latest version.

## Related

- [Create a secret](/docs/vaults/human-api/secrets/create) — Full request/response.
- [Rotate a secret](/docs/vaults/human-api/secrets/rotate) — Server-generated or manual rotation.
