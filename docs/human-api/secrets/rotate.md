---
title: Rotate a secret
description: The rotate endpoint may return 400 not yet implemented; for now create a new version with PUT to the same path.
sidebar_position: 4
---

# Rotate a secret

**Endpoint:** `POST /v1/vaults/:vault_id/secrets/:path/rotate`  
**Authentication:** Bearer JWT

<!-- TODO: verify --> The vault implementation may return **400 Bad Request** with a message that secret rotation is not yet implemented. When that is the case, "rotation" is achieved by creating a **new version** of the secret:

1. Generate a new value (e.g. new API key from the provider).
2. **PUT** to the same path with the new value (see [Create](/docs/human-api/secrets/create) / [Update](/docs/human-api/secrets/update)).
3. Optionally revoke or expire the old key at the provider.

Once rotation is implemented, this endpoint may accept an optional body (e.g. `new_value` or trigger provider rotation) and return the new secret metadata. Check the [API reference](/docs/reference/api-reference) or OpenAPI spec for the current contract.

## Example (when implemented)

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai/rotate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_value":"sk-proj-..."}'
```

## Current behavior

If the server responds with **400** and a message like "Secret rotation not yet implemented", use **PUT** to the same path with the new value instead.
