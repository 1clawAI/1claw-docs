---
title: Human API overview
description: The Human API is the full REST API for vaults, secrets, policies, agents, audit, and billing; authenticate with email/password, Google, or personal API key.
sidebar_position: 0
---

# Human API overview

The **Human API** is the full set of REST endpoints used by secret owners: create and manage vaults, store and retrieve secrets, define policies (grants), register and manage agents, view audit logs, and manage billing/usage. You use it with a **JWT** obtained via email/password, Google OAuth, or a personal API key.

## Base URL

- **Production:** `https://api.1claw.xyz` (or your Cloud Run URL, e.g. `https://oneclaw-vault-XXXX.run.app`)
- **Dashboard proxy:** The app at [1claw.xyz](https://1claw.xyz) proxies `/api/v1/*` to the same API, so from the browser the base is effectively `https://1claw.xyz/api`.

All endpoints are under the `/v1` prefix.

## Authentication

Every request (except health and public auth endpoints) must include:

```http
Authorization: Bearer <access_token>
```

Ways to get an access token:

| Method           | Endpoint                      | Request body                               |
| ---------------- | ----------------------------- | ------------------------------------------ |
| **Signup**       | `POST /v1/auth/signup`        | `{ "email", "password", "display_name?" }` |
| Email + password | `POST /v1/auth/token`         | `{ "email", "password" }`                  |
| Google OAuth     | `POST /v1/auth/google`        | `{ "id_token" }`                           |
| Personal API key | `POST /v1/auth/api-key-token` | `{ "api_key" }` (e.g. `1ck_...`)           |

See [Authentication](/docs/human-api/authentication) for details and response shape.

## Main areas

| Area         | Endpoints                                                                           | Purpose                                                                |
| ------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Vaults**   | POST/GET /v1/vaults, GET/DELETE /v1/vaults/:vault_id                                | Create, list, get, delete vaults                                       |
| **Secrets**  | PUT/GET/DELETE /v1/vaults/:vault_id/secrets/:path, GET /v1/vaults/:vault_id/secrets | Store, read, list, delete secrets                                      |
| **Policies** | POST/GET /v1/vaults/:vault_id/policies, PUT/DELETE .../policies/:policy_id          | Grant/revoke access to principals                                      |
| **Agents**   | POST/GET /v1/agents, GET/PATCH/DELETE /v1/agents/:agent_id, POST .../rotate-key     | Register agents, rotate keys                                           |
| **Sharing**  | POST /v1/secrets/:secret_id/share, GET/DELETE /v1/share/:share_id                   | Share secrets by email or link ([guide](/docs/guides/sharing-secrets)) |
| **Audit**    | GET /v1/audit/events                                                                | Query audit events                                                     |
| **Billing**  | GET /v1/billing/usage, GET /v1/billing/history                                      | Usage and history                                                      |
| **Org**      | GET /v1/org/members, PATCH/DELETE /v1/org/members/:user_id                          | Team members                                                           |
| **API keys** | POST/GET /v1/auth/api-keys, DELETE /v1/auth/api-keys/:key_id                        | Personal API keys                                                      |

## Response and errors

- Success responses return JSON with the documented shape (or 204 No Content for deletes).
- Errors use **RFC 7807**-style JSON: `type`, `title`, `status`, `detail`. See [Error codes](/docs/reference/error-codes) and [Human API errors](/docs/human-api/errors).

## Next

- [Authentication](/docs/human-api/authentication) — All ways to get a JWT.
- [Secrets: create](/docs/human-api/secrets/create) — PUT a secret with full request/response.
