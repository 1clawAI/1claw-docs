---
title: Read a secret
description: Retrieve the decrypted value and metadata of a secret by vault ID and path using GET /v1/vaults/{vault_id}/secrets/{path}.
sidebar_position: 1
---

# Read a secret

Retrieve the **decrypted value** and metadata of a secret. Requires read permission (policy or vault owner).

**Endpoint:** `GET /v1/vaults/:vault_id/secrets/:path`  
**Authentication:** Bearer JWT (human or agent)

## Path

- `vault_id` — UUID of the vault.
- `path` — Secret path (e.g. `api-keys/openai`). Returns the **latest** version unless you use a versioned endpoint (if available).

## Example request

```bash
curl -s "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/secrets/api-keys/openai" \
  -H "Authorization: Bearer <token>"
```

## Example response (200)

```json
{
  "id": "599dd304-920c-4459-ae07-d62a3515381b",
  "path": "api-keys/openai",
  "type": "api_key",
  "value": "sk-proj-...",
  "version": 1,
  "metadata": {"tags": ["openai", "production"]},
  "created_by": "user:2a57eb5e-caac-4e34-9685-b94c37458eb1",
  "created_at": "2026-02-18T12:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

Treat the `value` field as highly sensitive; do not log or persist it unnecessarily.

## Error responses

| Code | Meaning |
|------|---------|
| 401 | Invalid or missing token |
| 403 | No read permission |
| 404 | Vault or secret not found |
| 410 | Secret expired, deleted, or over max_access_count (Gone) |
