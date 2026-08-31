---
title: Rotating secrets
description: Rotate via PUT, server-side generation, version history, disabling old versions, and agent API key rotation.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rotating secrets

You can rotate a vault secret in two ways:

1. **Client-supplied value** — **PUT** a new value to the same path. That creates a new version; previous versions remain in history (see [Create/update](/docs/vaults/human-api/secrets/create)).
2. **Server-side rotation** — **POST** to `secret-rotate` so the vault generates a cryptographically random value. The plaintext is never sent to or returned from the client.

## Server-side rotation

**`POST /v1/vaults/{vault_id}/secret-rotate/{path}`**

Optional JSON body:

| Field | Type | Description |
|-------|------|-------------|
| `length` | integer | Length of the generated value (8–1024, default 32) |
| `charset` | string | `hex`, `base64`, `alphanumeric`, or `ascii` (default `hex`) |
| `type` | string | Optional override for secret type (defaults to the existing secret’s type) |

The vault generates the value, encrypts it, and stores it as the **next version**. The caller never sees or transmits the raw secret. Requires **`rotate` or `write`** permission on the path.

Successful responses return **201** with metadata including the new `version` (see OpenAPI `SecretCreatedResponse`).

## Listing versions

**`GET /v1/vaults/{vault_id}/secret-versions/{path}`**

Returns all versions of the secret at that path, **newest first**. Each item includes version metadata and **`is_disabled`**, so you can tell which historical versions are still readable.

## Retrieving a specific version

**`GET /v1/vaults/{vault_id}/secret-version/{path}/{version}`**

Returns the decrypted value and metadata for that **version number**. The usual **`GET /v1/vaults/{vault_id}/secrets/{path}`** returns the latest readable version (skipping disabled versions when resolving “current”).

## Disabling old versions

**`POST /v1/vaults/{vault_id}/secret-version-disable/{path}/{version}`**

Disables that version. The row is **kept for audit**, but any read of that version returns **410 Gone**.

## Client-supplied rotation (PUT)

1. Generate or obtain the new value (e.g. new API key from OpenAI, new DB password).
2. **PUT** to the same vault and path with the new value.
3. Update any consumers to use the new value (or rely on “latest”).
4. Optionally revoke or expire the old value at the external provider.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
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

## Optional: limit exposure

- Set **expires_at** on the secret so it becomes unavailable after a date.
- Set **max_access_count** so the secret stops being returned after N reads (e.g. one-time use). (`0` is treated as unlimited.)

## SDK, CLI, and MCP

### Server-side rotation

<Tabs groupId="rotate-gen">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/vaults/$VAULT_ID/secret-rotate/api-keys%2Fdb-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length":32,"charset":"hex"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript (SDK)">

```typescript
const { data } = await client.secrets.rotateGenerate(vaultId, "api-keys/db-password", {
  length: 32,
  charset: "hex",
  // type: "password", // optional override
});
console.log(data.version);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.secrets.rotate_generate(vault_id, "api-keys/openai", length=32, charset="base64")
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw secret rotate api-keys/db-password --generate --length 32 --charset hex
```

</TabItem>
<TabItem value="mcp" label="MCP">

Tool **`rotate_generate`**: `path` (required), optional `length` (8–1024), optional `charset` (`hex` \| `base64` \| `alphanumeric` \| `ascii`).

</TabItem>
</Tabs>

### List versions

<Tabs groupId="list-ver">
<TabItem value="curl" label="curl">

```bash
curl "https://api.1claw.co/v1/vaults/$VAULT_ID/secret-versions/api-keys%2Fopenai" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript (SDK)">

```typescript
const { data } = await client.secrets.listVersions(vaultId, "api-keys/openai");
console.log(data.versions); // newest first; check is_disabled
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
<TabItem value="cli" label="CLI">

```bash
1claw secret versions api-keys/openai
1claw secret versions api-keys/openai --json
```

</TabItem>
<TabItem value="mcp" label="MCP">

Tool **`list_versions`**: `path`. Returns one line per version with `[disabled]` when applicable.

</TabItem>
</Tabs>

### Get a specific version

<Tabs groupId="get-ver">
<TabItem value="curl" label="curl">

```bash
curl "https://api.1claw.co/v1/vaults/$VAULT_ID/secret-version/api-keys%2Fopenai/3" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript (SDK)">

```typescript
const { data } = await client.secrets.getVersion(vaultId, "api-keys/openai", 3);
console.log(data.value);
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
<TabItem value="cli" label="CLI">

```bash
1claw secret get api-keys/openai --version 3
```

</TabItem>
<TabItem value="mcp" label="MCP">

Tool **`get_secret`** always loads the latest readable version. For an explicit version number, use the REST API or SDK.

</TabItem>
</Tabs>

### Disable a version

<Tabs groupId="disable-ver">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/vaults/$VAULT_ID/secret-version-disable/api-keys%2Fopenai/2" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript (SDK)">

```typescript
await client.secrets.disableVersion(vaultId, "api-keys/openai", 2);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.secrets.disable_version(vault_id, "api-keys/openai", 2)
```

</TabItem>
<TabItem value="cli" label="CLI">

Use the REST API or SDK; there is no `secret` subcommand for disable yet.

</TabItem>
<TabItem value="mcp" label="MCP">

Use the REST API or SDK; there is no MCP tool for disabling a version yet.

</TabItem>
</Tabs>

## Agent tokens

To rotate an **agent API key**, use **POST /v1/agents/:agent_id/rotate-key**. The response includes the new key once; update the agent's config and discard the old key.

<Tabs groupId="agent-rotate">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/rotate-key" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.rotateKey(agentId);
console.log(data.api_key); // New key — store securely
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>
