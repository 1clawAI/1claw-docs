---
title: API reference
description: Full API reference is provided by the OpenAPI 3.1 spec in the repository; base URL and all v1 endpoints are listed here.
sidebar_position: 0
---

# API reference

The canonical API spec is the **OpenAPI 3.1** document in the monorepo root: [openapi.yaml](https://github.com/kmjones1979/1claw/blob/main/openapi.yaml). It defines all paths, request/response schemas, and error shapes.

## Base URL

- **Production:** `https://api.1claw.xyz` (or your Cloud Run URL)
- **Dashboard proxy:** `https://1claw.xyz/api` (proxies to the same API)

All endpoints are under **/v1**.

## Endpoints summary

- **POST** `/v1/auth/token` — Email/password to JWT
- **POST** `/v1/auth/agent-token` — Agent ID + API key to JWT
- **POST** `/v1/auth/api-key-token` — Personal API key to JWT
- **POST** `/v1/auth/google` — Google id_token to JWT
- **POST** `/v1/auth/refresh` — Refresh token to JWT
- **DELETE** `/v1/auth/token` — Revoke token
- **POST** `/v1/auth/change-password` — Change password
- **GET** `/v1/health` — Service health
- **GET** `/v1/health/hsm` — HSM connectivity
- **POST** `/v1/vaults` — Create vault
- **GET** `/v1/vaults` — List vaults
- **GET** `/v1/vaults/:vault_id` — Get vault
- **DELETE** `/v1/vaults/:vault_id` — Delete vault
- **GET** `/v1/vaults/:vault_id/secrets` — List secrets
- **PUT** `/v1/vaults/:vault_id/secrets/:path` — Create/update secret (path is wildcard)
- **GET** `/v1/vaults/:vault_id/secrets/:path` — Get secret value
- **DELETE** `/v1/vaults/:vault_id/secrets/:path` — Delete secret
- **POST** `/v1/vaults/:vault_id/policies` — Create policy
- **GET** `/v1/vaults/:vault_id/policies` — List policies
- **PUT** `/v1/vaults/:vault_id/policies/:policy_id` — Update policy
- **DELETE** `/v1/vaults/:vault_id/policies/:policy_id` — Delete policy
- **POST** `/v1/agents` — Register agent
- **GET** `/v1/agents` — List agents
- **GET** `/v1/agents/:agent_id` — Get agent
- **PATCH** `/v1/agents/:agent_id` — Update agent
- **DELETE** `/v1/agents/:agent_id` — Deactivate agent
- **POST** `/v1/agents/:agent_id/rotate-key` — Rotate agent key
- **POST** `/v1/secrets/:secret_id/share` — Create share link
- **GET** `/v1/share/:share_id` — Access share (public)
- **DELETE** `/v1/share/:share_id` — Revoke share
- **GET** `/v1/billing/usage` — Usage summary
- **GET** `/v1/billing/history` — Usage history
- **GET** `/v1/audit/events` — Query audit events
- **GET** `/v1/org/members` — List org members
- **PATCH** `/v1/org/members/:user_id` — Update member role
- **DELETE** `/v1/org/members/:user_id` — Remove member
- **POST** `/v1/auth/api-keys` — Create API key
- **GET** `/v1/auth/api-keys` — List API keys
- **DELETE** `/v1/auth/api-keys/:key_id` — Revoke API key

Note: The OpenAPI spec may use `username` for `/v1/auth/token`; the **actual** API expects `email` and `password`. See [Authentication](/docs/human-api/authentication).
