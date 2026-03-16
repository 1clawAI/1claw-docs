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
| 403 | Resource Limit Exceeded | Tier limit reached for vaults, secrets, or agents. `type` field is `"resource_limit_exceeded"`. Upgrade plan or delete unused resources. |
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

## Resource limit errors

When creating vaults, secrets, or agents beyond your tier's quota, the API returns `403` with `type: "resource_limit_exceeded"` instead of `"about:blank"`:

```json
{
  "type": "resource_limit_exceeded",
  "title": "Resource Limit Exceeded",
  "status": 403,
  "detail": "Vault limit reached (3/3 on free tier). Upgrade your plan for more."
}
```

Check the `type` field to distinguish permission errors from quota errors. The `detail` includes the current count, limit, and tier name.

## Intents API errors

Transaction and simulation endpoints return these status codes and messages:

| Code | When | `detail` (examples) |
|------|------|---------------------|
| 400 | Bad Request | Invalid `value`, `data` (hex), `to` address, or `signing_key_path`. `signing_key_path` must start with `keys/`, `wallets/`, or `agents/`. Unknown chain name. Invalid `max_fee_per_gas` / `max_priority_fee_per_gas` / `gas_price`. |
| 403 | Forbidden | Agent not allowed on this chain (`tx_allowed_chains`). Destination not in `tx_to_allowlist`. Transaction value exceeds `tx_max_value_eth`. Would exceed `tx_daily_limit_eth`. Cannot submit on behalf of another agent. |
| 404 | Not Found | Agent or transaction not found. |
| 409 | Conflict | Idempotency key reused (duplicate request); retry with a new key or wait. |
| 422 | Unprocessable Entity | Simulation reverted. Response includes `status: "simulation_failed"` and simulation details. Transaction was **not** signed or broadcast. Fix the tx (e.g. insufficient balance, revert reason) and retry. |
| 402 | Payment Required | Over quota; pay via x402 or prepaid credits. See [Billing & Usage](/docs/guides/billing-and-usage) and [x402 guide](/docs/guides/x402). |

For **422**, the response body includes `simulation_id`, `simulation_status`, and optional `simulation_result` (e.g. `error`, `revert_reason`, `tenderly_dashboard_url`) to debug why the simulation failed.
