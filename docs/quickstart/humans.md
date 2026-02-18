---
title: Quickstart for humans
description: Log in with email and password, create a vault, store a secret, and read it back using the Human API.
sidebar_position: 0
---

# Quickstart for humans

This page gets you from zero to a stored secret in a few minutes: obtain a JWT, create a vault, then create and read a secret.

## 1. Get a JWT

Exchange email and password for an access token. Base URL: `https://api.1claw.xyz` (or your Cloud Run URL).

```bash
curl -X POST https://api.1claw.xyz/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

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

```bash
export TOKEN="<your access_token>"

curl -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Vault","description":"Secrets for my app"}'
```

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

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):** Includes decrypted `value` plus metadata. Keep this response secure.

## 5. List secrets (metadata only)

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets" \
  -H "Authorization: Bearer $TOKEN"
```

Returns `{ "secrets": [ ... ] }` with id, path, type, version, metadata, created_at, expires_at — **no** value.

## Next steps

- [Human API overview](/docs/human-api/overview) — All endpoints and auth options.
- [Create a secret](/docs/human-api/secrets/create) — Full request/response and options.
- [Give an agent access](/docs/guides/give-agent-access) — Register an agent and grant read access.
