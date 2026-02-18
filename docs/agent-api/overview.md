---
title: Agent API overview
description: Agents use the same REST API as humans; they authenticate with POST /v1/auth/agent-token and then list and fetch secrets they are allowed to access.
sidebar_position: 0
---

# Agent API overview

The **Agent API** is the same REST API as the Human API, with a different **auth entry point**. Agents do not log in with email/password; they use an **agent API key** (`ocv_...`) to get a short-lived JWT, then call the same endpoints to list and fetch secrets.

## Base URL

Same as Human API: `https://api.1claw.xyz` (or your Cloud Run URL).

## Authentication

1. **Obtain agent credentials** — A human registers an agent via `POST /v1/agents` and receives an `api_key` (`ocv_...`). Store it securely in the agent’s config.
2. **Exchange key for JWT** — `POST /v1/auth/agent-token` with `{ "agent_id": "<uuid>", "api_key": "ocv_..." }` → returns `access_token` and `expires_in`.
3. **Use the JWT** — Send `Authorization: Bearer <access_token>` on every request. Refresh the token before it expires by calling the agent-token endpoint again.

## What agents can do

- **List secrets** — `GET /v1/vaults/:vault_id/secrets` — Returns metadata only for paths the agent is allowed to read.
- **Get secret value** — `GET /v1/vaults/:vault_id/secrets/:path` — Returns decrypted value if policy grants read.
- **Create/update secrets** — `PUT .../secrets/:path` — Only if a policy grants write.

Agents typically **do not** create vaults, register other agents, or manage policies; those operations are for humans. Access is determined entirely by policies created by humans.

## Next

- [Agent authentication](/docs/agent-api/authentication) — Request/response for agent-token.
- [Fetch a secret](/docs/agent-api/fetch-secret) — GET secret by path with examples.
