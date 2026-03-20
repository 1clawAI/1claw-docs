---
title: Quickstart for humans
description: Log in with email and password, create a vault, store a secret, and read it back using the Human API.
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart for humans

This page gets you from zero to a stored secret in a few minutes: obtain a JWT, create a vault, then create and read a secret.

:::tip Try it out
Try out the example in this repo: **[Basic](https://github.com/1clawAI/1claw/tree/main/examples/basic)** (vault CRUD, secrets, billing, sharing, Intents API).
:::

## 1. Get a JWT

Exchange email and password for an access token. Base URL: `https://api.1claw.xyz` (or your Cloud Run URL).

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.xyz" });

await client.auth.login({
  email: "you@example.com",
  password: "your-password",
});
// Client is now authenticated — JWT is managed internally
```

</TabItem>
</Tabs>

**Response:**

```json
{
  "access_token": "eyJhbGciOiJFZERTQSIs...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Use `access_token` as a Bearer token in all following requests.

## 2. Create a vault

Vaults are containers for secrets. Each vault has its own HSM-backed key.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
export TOKEN="<your access_token>"

curl -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Vault","description":"Secrets for my app"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: vault } = await client.vault.create({
  name: "My Vault",
  description: "Secrets for my app",
});
console.log(vault.id); // ae370174-9aee-4b02-ba7c-d1519930c709
```

</TabItem>
</Tabs>

**Response (201):**

```json
{
  "id": "ae370174-9aee-4b02-ba7c-d1519930c709",
  "name": "My Vault",
  "description": "Secrets for my app",
  "created_by": "2a57eb5e-caac-4e34-9685-b94c37458eb1",
  "created_at": "2026-02-18T12:00:00Z"
}
```

Save the `id`; you'll use it as `vault_id`.

## 3. Store a secret

Secrets live at **paths** inside a vault. Paths are slash-separated (e.g. `api-keys/stripe`, `passwords/db`).

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
export VAULT_ID="ae370174-9aee-4b02-ba7c-d1519930c709"

curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_key",
    "value": "sk-proj-...",
    "metadata": {"tags": ["openai", "production"]}
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: secret } = await client.secrets.set(
  vault.id,
  "api-keys/openai",
  "sk-proj-...",
  {
    type: "api_key",
    metadata: { tags: ["openai", "production"] },
  },
);
console.log(secret.path, `v${secret.version}`); // api-keys/openai v1
```

</TabItem>
</Tabs>

**Response (201):**

```json
{
  "id": "599dd304-920c-4459-ae07-d62a3515381b",
  "path": "api-keys/openai",
  "type": "api_key",
  "version": 1,
  "metadata": {"tags": ["openai", "production"]},
  "created_at": "2026-02-18T12:01:00Z"
}
```

The secret **value** is never returned after creation; only metadata.

## 4. Read the secret

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: secret } = await client.secrets.get(vault.id, "api-keys/openai");
console.log(secret.value); // sk-proj-... (use securely, don't log in production)
```

</TabItem>
</Tabs>

**Response (200):** Includes decrypted `value` plus metadata. Keep this response secure.

## 5. List secrets (metadata only)

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.secrets.list(vault.id);
for (const s of data.secrets) {
  console.log(`${s.path} (${s.type}, v${s.version})`);
}
```

</TabItem>
</Tabs>

Returns `{ "secrets": [ ... ] }` with id, path, type, version, metadata, created_at, expires_at — **no** value.

## Next steps

- [Human API overview](/docs/human-api/overview) — All endpoints and auth options.
- [Create a secret](/docs/human-api/secrets/create) — Full request/response and options.
- [Give an agent access](/docs/guides/give-agent-access) — Register an agent and grant read access.
