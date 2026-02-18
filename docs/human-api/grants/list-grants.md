---
title: List policies (grants)
description: List all policies for a vault with GET /v1/vaults/{vault_id}/policies.
sidebar_position: 2
---

# List policies (grants)

**Endpoint:** `GET /v1/vaults/:vault_id/policies`  
**Authentication:** Bearer JWT

Returns all policies (grants) for the given vault.

## Example request

```bash
curl -s "https://api.1claw.xyz/v1/vaults/ae370174-9aee-4b02-ba7c-d1519930c709/policies" \
  -H "Authorization: Bearer <token>"
```

## Example response (200)

```json
{
  "policies": [
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
  ]
}
```

## Update a policy

**Endpoint:** `PUT /v1/vaults/:vault_id/policies/:policy_id`  
**Body:** Optional `permissions`, `conditions`, `expires_at` (and possibly `secret_path_pattern`). Omitted fields may be left unchanged depending on implementation.
