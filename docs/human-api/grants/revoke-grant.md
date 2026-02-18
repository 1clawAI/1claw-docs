---
title: Revoke a policy (grant)
description: Delete a policy with DELETE /v1/vaults/{vault_id}/policies/{policy_id}; the principal immediately loses the granted access.
sidebar_position: 1
---

# Revoke a policy (grant)

**Endpoint:** `DELETE /v1/vaults/:vault_id/policies/:policy_id`  
**Authentication:** Bearer JWT

Removes the policy. The principal (user or agent) immediately loses the permissions that policy granted.

## Example request

```bash
curl -X DELETE "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies/897b37da-a265-4bd4-818b-e716eeff3de3" \
  -H "Authorization: Bearer <token>"
```

## Response

**204 No Content** — Success.

## Error responses

| Code | Meaning |
|------|---------|
| 401 | Invalid or missing token |
| 403 | Not allowed |
| 404 | Vault or policy not found |
