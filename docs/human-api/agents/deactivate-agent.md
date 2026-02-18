---
title: Deactivate agent / Rotate key
description: Deactivate an agent with DELETE /v1/agents/{agent_id}; get a new API key with POST /v1/agents/{agent_id}/rotate-key.
sidebar_position: 2
---

# Deactivate agent / Rotate key

## Deactivate an agent

**Endpoint:** `DELETE /v1/agents/:agent_id`  
**Authentication:** Bearer JWT

Marks the agent as inactive. The agent can no longer exchange its API key for a token; existing JWTs may still be valid until expiry.

**Response:** 204 No Content.

---

## Rotate agent key

**Endpoint:** `POST /v1/agents/:agent_id/rotate-key`  
**Authentication:** Bearer JWT

Generates a **new** API key for the agent. The old key stops working. Response includes the new key (shown only once).

**Example request:**

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/ec7e0226-30f0-4dda-b169-f060a3502603/rotate-key" \
  -H "Authorization: Bearer <token>"
```

**Example response (200):** Same shape as create agent: `{ "agent": { ... }, "api_key": "ocv_..." }`. Store the new `api_key` and update the agent’s config.

---

## Get or update agent

- **GET /v1/agents/:agent_id** — Returns single agent metadata (no API key).
- **PATCH /v1/agents/:agent_id** — Update name, description, scopes, is_active, expires_at.
