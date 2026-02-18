---
title: List agents
description: List all agents in your org with GET /v1/agents.
sidebar_position: 1
---

# List agents

**Endpoint:** `GET /v1/agents`  
**Authentication:** Bearer JWT

Returns all agents in the caller’s organization. API keys are never returned; only metadata.

## Example request

```bash
curl -s "https://api.1claw.xyz/v1/agents" \
  -H "Authorization: Bearer <token>"
```

## Example response (200)

```json
{
  "agents": [
    {
      "id": "ec7e0226-30f0-4dda-b169-f060a3502603",
      "name": "CI Agent",
      "description": "GitHub Actions deploy",
      "auth_method": "api_key",
      "scopes": ["vaults:read"],
      "is_active": true,
      "created_at": "2026-02-18T12:00:00Z",
      "expires_at": null,
      "last_active_at": "2026-02-18T14:00:00Z"
    }
  ]
}
```
