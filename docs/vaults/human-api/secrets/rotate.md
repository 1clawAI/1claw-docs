---
title: Rotate a secret
description: Rotate a secret to a new server-generated value or manually create a new version with PUT.
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rotate a secret

**Endpoint:** `POST /v1/vaults/{vault_id}/secret-rotate/{path}`
**Authentication:** Bearer JWT

Server-side rotation generates a cryptographically random value and creates a new version. You can also manually rotate by creating a **new version** of the secret:

1. Generate a new value (e.g. new API key from the provider).
2. **PUT** to the same path with the new value (see [Create](/docs/vaults/human-api/secrets/create) / [Update](/docs/vaults/human-api/secrets/update)).
3. Optionally revoke or expire the old key at the provider.

Once rotation is implemented, this endpoint may accept an optional body (e.g. `new_value` or trigger provider rotation) and return the new secret metadata. Check the [API reference](/docs/reference/api-reference) or OpenAPI spec for the current contract.

## Example (when implemented)

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai/rotate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_value":"sk-proj-..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.set(vaultId, "api-keys/openai", "sk-proj-NEW...", {
  type: "api_key",
}); // Creates a new version
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

## Server-side generation

Use `POST /v1/vaults/{vault_id}/secret-rotate/{path}` with an optional body `{ "length": 32, "charset": "hex", "type": "api_key" }` to generate a new random value server-side. Requires `rotate` or `write` permission. Alternatively, use **PUT** to the same path with a new value you provide.
