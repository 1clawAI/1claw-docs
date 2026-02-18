---
title: Audit log (agents)
description: Agents can query audit events with GET /v1/audit/events; same endpoint as humans, scoped to the org.
sidebar_position: 4
---

# Audit log (agents)

**Endpoint:** `GET /v1/audit/events`  
**Authentication:** Bearer JWT (agent or human)

Returns audit events for the caller’s organization. Agents can use this to see their own access history (and other events they are allowed to see). Query parameters may include `resource_id`, `actor_id`, `action`, `from`, `to`, `limit`, `offset` (exact names depend on implementation).

## Example request

```bash
curl -s "https://api.1claw.xyz/v1/audit/events?limit=20" \
  -H "Authorization: Bearer <token>"
```

## Example response (200)

```json
{
  "events": [
    {
      "id": "...",
      "org_id": "...",
      "actor_type": "agent",
      "actor_id": "ec7e0226-30f0-4dda-b169-f060a3502603",
      "action": "secret.read",
      "resource_type": "secret",
      "resource_id": "api-keys/openai",
      "metadata": {},
      "timestamp": "2026-02-18T14:00:00Z"
    }
  ],
  "count": 1
}
```

Secret values are never included in audit payloads. See [Audit and compliance](/docs/guides/audit-and-compliance) for more context.
