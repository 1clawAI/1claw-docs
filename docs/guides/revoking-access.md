---
title: Revoking access
description: Revoke agent or user access by deleting the policy, or deactivate the agent; access is enforced on every request.
sidebar_position: 3
---

# Revoking access

Access is checked on **every request**. Revocation takes effect as soon as you remove the grant or deactivate the agent.

## Remove a policy (grant)

**DELETE /v1/vaults/:vault_id/policies/:policy_id**

The principal (user or agent) immediately loses the permissions that policy granted. No cache; the next request fails with 403 if no other policy applies.

## Deactivate an agent

**DELETE /v1/agents/:agent_id**

The agent is marked inactive. It can no longer exchange its API key for a JWT. Existing JWTs may still work until they expire (typically short-lived). For immediate effect, rotate the agent key (so the old key fails) and/or keep token lifetime short.

## Rotate agent key

**POST /v1/agents/:agent_id/rotate-key**

Returns a new API key; the old one stops working. Use this to invalidate a leaked key without deactivating the agent.
