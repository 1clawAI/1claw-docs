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

You can rotate in two ways:

1. **Server-generated value** — `POST /v1/vaults/{vault_id}/secret-rotate/{path}` with optional `{ "length": 32, "charset": "hex", "type": "api_key" }`. Requires `rotate` or `write` permission.
2. **Client-supplied value** — **PUT** to the same path with a new value (see [Create](/docs/vaults/human-api/secrets/create) / [Update](/docs/vaults/human-api/secrets/update)). Creates a new version while preserving history.

## Server-side generation

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secret-rotate/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length": 32, "charset": "alphanumeric", "type": "api_key"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.secrets.rotateGenerate(vaultId, "api-keys/openai", {
  length: 32,
  charset: "alphanumeric",
  type: "api_key",
});
console.log(data.version);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.secrets.rotate_generate(
    vault_id,
    "api-keys/openai",
    length=32,
    charset="alphanumeric",
    type="api_key",
)
print(resp.data["version"])
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw secret rotate api-keys/openai --generate -v $VAULT_ID -l 32 -c alphanumeric
```

</TabItem>
</Tabs>

## Manual rotation (new version via PUT)

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","value":"sk-proj-NEW..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.set(vaultId, "api-keys/openai", "sk-proj-NEW...", {
  type: "api_key",
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
client.secrets.set(vault_id, "api-keys/openai", "sk-proj-NEW...", type="api_key")
```

</TabItem>
</Tabs>

After rotation, optionally disable older versions with `POST /v1/vaults/{vault_id}/secret-version-disable/{path}/{version}`.
