---
title: Create a policy (grant)
description: Grant a principal read/write/delete access to secret paths in a vault using POST /v1/vaults/{vault_id}/policies.
sidebar_position: 0
---

# Create a policy (grant)

Policies link a **principal** (user or agent) to **secret path patterns** with a set of **permissions** (e.g. read, write, delete). Path matching uses globs: `*` for one segment, `**` for any depth.

**Endpoint:** `POST /v1/vaults/:vault_id/policies`  
**Authentication:** Bearer JWT (vault access)

## Request body

| Field                | Type   | Required | Description |
|----------------------|--------|----------|-------------|
| secret_path_pattern  | string | ✅       | Glob pattern (e.g. `**`, `prod/*`, `api-keys/*`) |
| principal_type       | string | ✅       | `user` or `agent` |
| principal_id         | string | ✅       | UUID of the user or agent |
| permissions          | array  | ✅       | e.g. `["read"]`, `["read","write"]` |
| conditions           | object | ❌       | Optional (e.g. ip_allowlist, time_window) |
| expires_at           | string | ❌       | ISO 8601; policy stops applying after this time |

## Example request

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/policies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "secret_path_pattern": "**",
    "principal_type": "agent",
    "principal_id": "ec7e0226-30f0-4dda-b169-f060a3502603",
    "permissions": ["read"]
  }'
```

## Example response (201)

```json
{
  "id": "897b37da-a265-4bd4-818b-e716eeff3de3",
  "vault_id": "ae370174-9aee-4b02-ba7c-d1519930c709",
  "secret_path_pattern": "**",
  "principal_type": "agent",
  "principal_id": "ec7e0226-30f0-4dda-b169-f060a3502603",
  "permissions": ["read"],
  "conditions": {},
  "created_by": "2a57eb5e-caac-4e34-9685-b94c37458eb1",
  "created_at": "2026-02-18T12:00:00Z"
}
```

## Error responses

| Code | Meaning |
|------|---------|
| 400 | Validation error (e.g. empty permissions) |
| 401 | Invalid or missing token |
| 403 | Not allowed to create policies on this vault |
| 404 | Vault not found |
