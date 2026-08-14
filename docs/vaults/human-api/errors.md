---
title: Human API errors
description: The Human API returns RFC 7807 problem-details and uses standard HTTP status codes for auth, validation, and server errors.
sidebar_position: 99
---

# Human API errors

All error responses use **RFC 7807** problem details: a JSON body with `type`, `title`, `status`, and `detail`. The API does not expose internal stack traces or key material.

## HTTP status codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request — Invalid path, body, or parameters |
| 401 | Unauthorized — Missing or invalid Authorization header / token |
| 403 | Forbidden — Valid token but insufficient permission (or resource limit reached) |
| 404 | Not Found — Vault, secret, policy, or agent not found |
| 409 | Conflict — e.g. name already in use (if applicable) |
| 410 | Gone — Secret expired, deleted, or over max_access_count |
| 429 | Too Many Requests — Rate limited |
| 500 | Internal Server Error — Server-side failure (detail is generic) |

## Response body

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid or expired token"
}
```

`detail` may vary; it is safe to show to the client. For 500 errors the detail is generic (e.g. "An unexpected error occurred") to avoid leaking internals.

## Common cases

- **401** — Omit `Authorization`, invalid JWT, or expired JWT. Fix: obtain a new token.
- **403** — Policy does not grant the requested permission, or not the vault owner. Fix: add/update policy or use an allowed principal. If `type` is `"resource_limit_exceeded"`, you've hit a tier limit for vaults, secrets, or agents — upgrade your plan at `/settings/billing`.
- **404** — Wrong vault_id or path, or resource was deleted. Fix: check IDs and path.
- **410** — Secret is expired, soft-deleted, or over max_access_count. Fix: create a new version or new secret.

See [Error codes reference](/docs/reference/error-codes) for a full list.
