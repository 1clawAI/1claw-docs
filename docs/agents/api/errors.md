---
title: Agent API errors
description: Agent API uses the same error format and status codes as the Human API; 401 often means token expired and the agent should re-authenticate.
sidebar_position: 5
---

# Agent API errors

The Agent API uses the **same** error format and HTTP status codes as the Human API. All errors return RFC 7807 problem-details JSON.

## Common cases for agents

| Code | Meaning | What to do |
|------|---------|------------|
| 401 | Invalid or expired token | Call `POST /v1/auth/agent-token` again and use the new token |
| 403 | No permission for this path | Human must add/update a policy granting the agent read (or write) |
| 403 | Resource limit reached (`type: "resource_limit_exceeded"`) | Organization tier limit hit. Human must upgrade plan at `/settings/billing` |
| 404 | Vault or secret not found | Check vault_id and path |
| 410 | Secret expired, deleted, or over max_access_count | Use a different secret or ask human to create a new version |

See [Human API errors](/docs/vaults/human-api/errors) and [Error codes reference](/docs/reference/error-codes) for the full list.
