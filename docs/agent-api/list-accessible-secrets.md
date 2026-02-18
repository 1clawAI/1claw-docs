---
title: List accessible secrets
description: List secret metadata in a vault with GET /v1/vaults/{vault_id}/secrets; only paths the agent can read are visible; values are never in list responses.
sidebar_position: 3
---

# List accessible secrets

**Endpoint:** `GET /v1/vaults/:vault_id/secrets`  
**Authentication:** Bearer JWT (agent)

Returns **metadata** for secrets in the vault. The server applies policy so the agent only sees secrets it has read access to. Optional query: `?prefix=...` to filter by path prefix.

## Example request

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets?prefix=api-keys" \
  -H "Authorization: Bearer <agent_token>"
```

## Example response (200)

```json
{
  "secrets": [
    {
      "id": "599dd304-920c-4459-ae07-d62a3515381b",
      "path": "api-keys/openai",
      "type": "api_key",
      "version": 1,
      "metadata": {},
      "created_at": "2026-02-18T12:00:00Z"
    }
  ]
}
```

Values are **never** returned in list responses. To get a value, call [GET .../secrets/:path](/docs/agent-api/fetch-secret) for each path you need.
