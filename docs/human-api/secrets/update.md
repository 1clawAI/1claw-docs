---
title: Update a secret (new version)
description: Creating a new version of a secret is done by PUT to the same path; the API creates a new version and returns 201 with updated metadata.
sidebar_position: 2
---

# Update a secret (new version)

In 1claw, there is no separate "update" endpoint. To **update** a secret you **PUT** to the same vault and path with a new body. That creates a **new version** (version 2, 3, …). The previous version remains stored but the default "latest" read returns the newest version.

**Endpoint:** `PUT /v1/vaults/:vault_id/secrets/:path`  
**Authentication:** Bearer JWT

Same request body as [Create a secret](/docs/human-api/secrets/create): `type`, `value`, and optional `metadata`, `expires_at`, `rotation_policy`, `max_access_count`.

## Example

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","value":"sk-proj-NEW-KEY..."}'
```

**Response (201):** Same shape as create; `version` will be 2 (or next). The secret value is never returned.

To read a **specific** version, use the versioned endpoint if your deployment supports it (e.g. `GET .../secrets/:path/versions/:v`). Otherwise only the latest is available via `GET .../secrets/:path`.

## Related

- [Create a secret](/docs/human-api/secrets/create) — Full request/response.
- [Rotate a secret](/docs/human-api/secrets/rotate) — Rotation endpoint (may return 400 "not yet implemented").
