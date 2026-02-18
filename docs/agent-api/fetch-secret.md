---
title: Fetch a secret
description: Retrieve a secret value by vault ID and path with GET /v1/vaults/{vault_id}/secrets/{path}; the agent must have read permission via policy.
sidebar_position: 2
---

# Fetch a secret

Same endpoint as for humans: **GET /v1/vaults/:vault_id/secrets/:path**. The agent sends its JWT; the server checks policies for that agent and returns the decrypted value only if allowed.

## Request

```bash
curl -s "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/secrets/api-keys/openai" \
  -H "Authorization: Bearer <agent_access_token>"
```

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
