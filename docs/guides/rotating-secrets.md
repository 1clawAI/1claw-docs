---
title: Rotating secrets
description: Create a new version with PUT to the same path; optionally use expires_at or max_access_count to limit exposure.
sidebar_position: 1
---

# Rotating secrets

1claw does not yet expose a dedicated "rotate" endpoint that returns a new value from a provider. Rotation is done by **creating a new version** of the secret.

## Steps

1. Generate or obtain the new value (e.g. new API key from OpenAI, new DB password).
2. **PUT** to the same vault and path with the new value (see [Create/update](/docs/human-api/secrets/create)).
3. Update any consumers to use the new value (or rely on "latest" version).
4. Optionally revoke or expire the old value at the external provider.

## Optional: limit exposure

- Set **expires_at** on the secret so it becomes unavailable after a date.
- Set **max_access_count** so the secret stops being returned after N reads (e.g. one-time use).

## Agent tokens

To rotate an **agent API key**, use **POST /v1/agents/:agent_id/rotate-key**. The response includes the new key once; update the agent’s config and discard the old key.
