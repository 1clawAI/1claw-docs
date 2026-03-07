---
title: Troubleshooting
description: Common issues when using the API, SDK, CLI, or MCP — and how to fix them.
sidebar_position: 12
---

# Troubleshooting

Quick fixes for issues you might hit as a user of the API, SDK, CLI, or MCP.

## "Can't reach the API" / connection errors

- **Base URL** — Use `https://api.1claw.xyz` for production. The dashboard at 1claw.xyz proxies `/api/*` to the same API, so from a browser you may use relative `/api/v1/...` when on the same origin.
- **CLI / SDK** — Ensure your client is configured with the correct base URL. The SDK and CLI default to the production API when not set.
- **MCP** — For hosted MCP, use `https://mcp.1claw.xyz/mcp`. For local stdio, `ONECLAW_BASE_URL` defaults to `https://api.1claw.xyz`; override only if you use a different API host.

## 401 Unauthorized

- **Missing or invalid token** — Include `Authorization: Bearer <token>`. For agents, get a fresh JWT via `POST /v1/auth/agent-token` (tokens expire; the MCP server refreshes automatically when using agent ID + API key).
- **Revoked key** — If you rotated an agent key or revoked a personal API key, use the new key or log in again.
- **Wrong credentials** — For `POST /v1/auth/token`, use `email` and `password` (not username). Check for typos or wrong environment variable.

## 402 Payment Required

- Your request count has exceeded your tier’s monthly limit and the API is asking for payment (x402 or prepaid credits).
- **What to do:** Upgrade your plan, add prepaid credits, or complete the x402 payment for this request. In the dashboard, go to [Settings → Billing](https://1claw.xyz/settings/billing). See [Billing & Usage](/docs/guides/billing-and-usage).

## 403 Forbidden

- **No permission for this resource** — Your token is valid but you don’t have a policy that allows this action on this vault/path. Add or update a policy (dashboard: Vault → Policies), or use a vault you own or have been granted access to.
- **Resource limit exceeded** — You’ve hit your subscription’s limit for vaults, secrets, or agents. The response body has `type: "resource_limit_exceeded"` and a message like "Vault limit reached (3/3 on free tier)". Upgrade your plan or delete unused resources. See [Billing & Usage](/docs/guides/billing-and-usage).
- **Intents API** — You’re calling a transaction endpoint (e.g. submit or simulate) but your agent doesn’t have `intents_api_enabled`. Enable it in the dashboard (Agent → edit) or via the API.
- **IP denied** — Your org has IP allow/block rules and your current IP is not allowed. Check Security → IP rules in the dashboard.

## 404 Not Found

- **Vault or secret path** — Check the vault ID and path. Paths are case-sensitive and must match exactly. Use list endpoints (`GET /v1/vaults`, `GET /v1/vaults/:id/secrets`) to confirm IDs and paths.
- **Agent ID** — When calling agent or transaction endpoints, ensure the agent ID is correct and the agent belongs to your org.

## 410 Gone

- The secret has expired (`expires_at` passed), been soft-deleted, or exceeded `max_access_count`. Store a new version of the secret or use a different path.

## 429 Too Many Requests

- You’ve hit the global rate limit. Wait and retry; the response may include a `Retry-After` header. Share creation is also limited to 10 per minute per org.

## MCP: "Access denied" or 403 on get_secret

- The agent must have a **policy** that grants read access to that vault and path. Create a policy in the dashboard (Vault → Policies) with the agent as principal and a path pattern that matches the secret (e.g. `**` for all paths). See [Give an agent access](/docs/guides/give-agent-access).

## CLI: Device login not completing

- Approve the device code in the dashboard: go to the CLI verification page (linked from the CLI output) and sign in, then approve. Ensure you’re using the same account as the one that started the device flow.

---

For a full list of error codes and response shapes, see [Error codes](/docs/reference/error-codes). For how the API processes requests (auth, rate limit, billing), see [Request pipeline](/docs/reference/request-pipeline).

## Need help?

- **Community:** [Join the 1claw Telegram group](https://t.me/+jG4Rm7XHJ79mNDRh) for questions and support.
- **Email:** [ops@1claw.xyz](mailto:ops@1claw.xyz) for account or billing issues.
