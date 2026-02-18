---
title: Error codes
description: HTTP status codes and RFC 7807 problem-details returned by the 1claw API; 400, 401, 403, 404, 409, 410, 429, 500.
sidebar_position: 1
---

# Error codes

All errors return a JSON body with **RFC 7807** fields: `type`, `title`, `status`, `detail`. The API does not expose stack traces or internal details in 500 responses.

## HTTP status codes

| Code | Title | When |
|------|--------|------|
| 400 | Bad Request | Invalid path format, invalid request body, validation failure (e.g. empty permissions). |
| 401 | Unauthorized | Missing `Authorization` header, invalid Bearer format, invalid or expired JWT, wrong credentials (email/password or API key). |
| 403 | Forbidden | Valid JWT but no permission for this resource (policy does not grant the action, or not vault owner). |
| 404 | Not Found | Vault, secret, policy, or agent not found (wrong ID or path). |
| 409 | Conflict | Request conflicts with current state (e.g. name already exists, if applicable). |
| 410 | Gone | Secret has expired, been soft-deleted, or exceeded max_access_count. |
| 429 | Too Many Requests | Rate limit exceeded. |
| 500 | Internal Server Error | Server-side failure (e.g. database, KMS). Detail is generic. |

## Example body

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "Insufficient permissions"
}
```

Use `status` for programmatic handling; use `detail` for user-facing messages (it may vary by endpoint).
