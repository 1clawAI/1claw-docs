---
title: Agent authentication
description: Exchange agent_id and api_key for a JWT using POST /v1/auth/agent-token; use the token as Bearer for all subsequent requests.
sidebar_position: 1
---

# Agent authentication

Agents authenticate by exchanging an **agent ID** and **API key** for a short-lived **JWT**. The API key is returned only when the agent is created (or when the key is rotated) and must be stored securely.

## Endpoint

**POST /v1/auth/agent-token**  
**Security:** None (no Bearer required). Request body must contain valid agent credentials.

## Request body

| Field     | Type   | Required | Description |
|----------|--------|----------|-------------|
| agent_id | string | ✅       | UUID of the agent (from registration) |
| api_key  | string | ✅       | Agent API key (e.g. `ocv_...`) |

## Example request

```bash
curl -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ec7e0226-30f0-4dda-b169-f060a3502603",
    "api_key": "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs"
  }'
```

## Example response (200)

```json
{
  "access_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use `access_token` in the `Authorization` header for all subsequent API calls. When `expires_in` seconds have passed, call this endpoint again to get a new token.

## Error responses

| Code | Meaning |
|------|---------|
| 401 | Invalid agent_id or api_key, agent inactive, or agent expired |

Never log or expose the API key; treat it like a password.
