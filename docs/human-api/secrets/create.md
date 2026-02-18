---
title: Create or update a secret
description: Store a new secret or new version at a path in a vault using PUT /v1/vaults/{vault_id}/secrets/{path}; authentication is Bearer JWT.
sidebar_position: 0
---

# Create or update a secret

Store a secret in a vault at a given **path**. If the path already exists, this creates a **new version**. Path is slash-separated (e.g. `passwords/one`, `api-keys/stripe`). Paths must be alphanumeric with hyphens, underscores, and slashes; no leading or trailing slashes.

**Endpoint:** `PUT /v1/vaults/:vault_id/secrets/:path`  
**Authentication:** Human API Key (Bearer JWT)

## Path

- `vault_id` — UUID of the vault.
- `path` — Secret path (e.g. `api-keys/openai`). Can contain multiple segments; the API uses a wildcard `{*path}` so use the full path as in the URL.

## Request body

| Field           | Type   | Required | Description |
|----------------|--------|----------|-------------|
| type           | string | ✅       | One of: `password`, `api_key`, `private_key`, `certificate`, `file`, `note`, `ssh_key`, `env_bundle` |
| value          | string | ✅       | The secret value (plaintext) to store |
| metadata       | object | ❌       | Optional JSON (e.g. tags, description) |
| expires_at     | string | ❌       | ISO 8601 datetime; secret unavailable after this time |
| rotation_policy| object | ❌       | Reserved for future use |
| max_access_count | number | ❌    | After this many reads, secret returns 410 Gone |

## Example request

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/secrets/api-keys/openai" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_key",
    "value": "sk-proj-...",
    "metadata": {"tags": ["openai", "production"], "description": "OpenAI production key"},
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

## Example response (201 Created)

```json
{
  "id": "599dd304-920c-4459-ae07-d62a3515381b",
  "path": "api-keys/openai",
  "type": "api_key",
  "version": 1,
  "metadata": {"tags": ["openai", "production"], "description": "OpenAI production key"},
  "created_at": "2026-02-18T12:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

If the path already had a version, the new version number is incremented and you still get **201**.

> ⚠️ The secret `value` is **never** returned after creation. Only metadata is returned.

## Error responses

| Code | Meaning |
|------|---------|
| 400 | Invalid path format or request body |
| 401 | Invalid or missing token |
| 403 | No write permission for this path (policy or vault owner) |
| 404 | Vault not found |
| 500 | Internal error (e.g. HSM or DB) |

All error bodies use RFC 7807 problem-details (`type`, `title`, `status`, `detail`).
