---
title: Create a policy (grant)
description: Grant a principal read/write/delete access to secret paths in a vault using POST /v1/vaults/{vault_id}/policies.
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Create a policy (grant)

Policies link a **principal** (user or agent) to **secret path patterns** with a set of **permissions** (e.g. read, write, delete). Path matching uses globs: `*` for one segment, `**` for any depth.

In the **dashboard** at [1claw.xyz](https://1claw.co), use **Vaults → [vault] → Policies → Create Policy**. You can select the target vault from a dropdown and, for agents, pick from your registered agents or enter a custom agent ID.

**Endpoint:** `POST /v1/vaults/:vault_id/policies`  
**Authentication:** Bearer JWT (vault access)

## Request body

| Field               | Type   | Required | Description                                      |
| ------------------- | ------ | -------- | ------------------------------------------------ |
| secret_path_pattern | string | ✅       | Glob pattern (e.g. `**`, `prod/*`, `api-keys/*`) |
| principal_type      | string | ✅       | `user` or `agent`                                |
| principal_id        | string | ✅       | UUID of the user or agent                        |
| permissions         | array  | ✅       | e.g. `["read"]`, `["read","write"]`              |
| conditions          | object | ❌       | Optional (e.g. ip_allowlist, time_window)        |
| expires_at          | string | ❌       | ISO 8601; policy stops applying after this time  |
| effect              | string | ❌       | `"allow"` (default) or `"deny"` — deny rules override allow rules at the same priority |
| priority            | integer| ❌       | Higher priority wins on conflict within the same effect (default `0`) |
| attribute_conditions| object | ❌       | Attribute-based conditions (see below)           |

### Policy Engine v2 fields

The `effect`, `priority`, and `attribute_conditions` fields enable advanced policy evaluation:

- **`effect`**: Set to `"deny"` to create a deny policy. Deny policies with higher priority override allow policies.
- **`priority`**: Integer. When multiple policies match, the highest priority wins within the same effect. A deny at priority 10 beats an allow at priority 5.
- **`attribute_conditions`**: JSONB object with optional fields:

| Field | Type | Description |
| --- | --- | --- |
| `required_tags` | string[] | Principal must have all listed tags |
| `principal_role` | string | Required role (e.g. `"admin"`, `"operator"`) |
| `auth_method` | string | Required auth method (`"api_key"`, `"mtls"`, `"oidc_client_credentials"`) |
| `risk_verdict_max` | string | Maximum acceptable risk verdict (`"low"`, `"medium"`, `"high"`) |
| `device_known` | boolean | Require a known/registered device |

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "secret_path_pattern": "keys/production/*",
    "principal_type": "agent",
    "principal_id": "ec7e0226-...",
    "permissions": ["read"],
    "effect": "deny",
    "priority": 10,
    "attribute_conditions": {
      "risk_verdict_max": "low",
      "auth_method": "api_key"
    }
  }'
```

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

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

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.access.grantAgent(vaultId, agentId, ["read"], {
  secretPathPattern: "**",
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.policies.create(
    vault_id,
    principal_type="agent",
    principal_id=agent_id,
    secret_path_pattern="production/*",
    permissions=["read"],
)
```

</TabItem>
</Tabs>

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

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 400  | Validation error (e.g. empty permissions)    |
| 401  | Invalid or missing token                     |
| 403  | Not allowed to create policies on this vault |
| 404  | Vault not found                              |
