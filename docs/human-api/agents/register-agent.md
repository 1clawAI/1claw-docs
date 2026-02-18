---
title: Register an agent
description: Create an agent identity and receive an API key using POST /v1/agents; the key is shown only once.
sidebar_position: 0
---

# Register an agent

**Endpoint:** `POST /v1/agents`  
**Authentication:** Bearer JWT (human)

Creates a new agent identity and returns an **API key** (`ocv_...`). The key is returned only on create (and on rotate); store it securely for the agent to use with `POST /v1/auth/agent-token`.

## Request body

| Field       | Type   | Required | Description |
|------------|--------|----------|-------------|
| name       | string | ✅       | Display name for the agent |
| description| string | ❌       | Optional description |
| auth_method| string | ❌       | Default `api_key` |
| scopes     | array  | ❌       | Optional scope strings |
| expires_at | string | ❌       | ISO 8601; agent token exchange fails after this |

## Example request

```bash
curl -X POST "https://api.1claw.xyz/v1/agents" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI Agent",
    "description": "GitHub Actions deploy",
    "scopes": ["vaults:read"]
  }'
```

## Example response (201)

```json
{
  "agent": {
    "id": "ec7e0226-30f0-4dda-b169-f060a3502603",
    "name": "CI Agent",
    "description": "GitHub Actions deploy",
    "auth_method": "api_key",
    "scopes": ["vaults:read"],
    "is_active": true,
    "created_at": "2026-02-18T12:00:00Z"
  },
  "api_key": "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs"
}
```

Store the `api_key` securely; it cannot be retrieved again. Use [Deactivate agent / Rotate key](/docs/human-api/agents/deactivate-agent#rotate-agent-key) to get a new key if needed.
