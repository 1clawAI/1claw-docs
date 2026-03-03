---
title: Request pipeline
description: How each API request is processed — authentication, rate limiting, billing, and audit. Helps you understand when you might see 401, 402, or 429.
sidebar_position: 1
---

# Request pipeline

Every request to the Vault API passes through a fixed pipeline. Understanding the order helps you interpret errors (e.g. 402 vs 401 on paid routes).

## Order of processing

On **paid** routes, **x402 runs before auth** so unauthenticated requests get **402** (not 401). The pipeline is:

1. **Audit** — The request is recorded for the audit log (path, method, principal). Failures here are rare and internal.
2. **Rate limit** — Global rate limiting applies. If exceeded, the API returns **429 Too Many Requests** with a `Retry-After` header when available.
3. **x402** (outer on paid routes) — If the endpoint is subject to payment and there is no valid payment (and no JWT free-tier quota), the API returns **402 Payment Required** with a spec-compliant body. Otherwise the request continues.
4. **Auth** — The `Authorization` header is validated (JWT or API key). Missing or invalid auth → **401 Unauthorized**.
5. **IP filter** — If your organization has IP allow/block rules, they are applied here. Denied → **403 Forbidden**.
6. **Usage** — The request is counted for billing and quota (monthly request limit, prepaid credits, or x402).
7. **Quota headers** — Response headers such as `X-RateLimit-Requests-Used` and `X-Credit-Balance-Cents` are set for the client.
8. **Handler** — Your request is executed (e.g. get vault, list secrets). Here you may see **403 Forbidden** (e.g. policy denied, resource limit exceeded) or **404** / **410** for missing or expired resources.

So: on paid routes without a token you get **402** (so you can pay and retry). With an invalid token you get **401** after x402. With a valid token but over quota you get **402**. If your token is valid but you’ve hit a resource limit (vaults, agents, secrets), you get **403** with `type: "resource_limit_exceeded"` from the handler, not from middleware.

## Special routes

- **Public routes** (e.g. `POST /v1/auth/token`, `GET /v1/health`) — No auth layer; rate limit and audit still apply.
- **Share access** (`GET /v1/share/:share_id`) — Unauthenticated; only x402 (and rate limit at the outer layer) apply. Passphrase and IP allowlist are enforced inside the handler.
- **Intents API routes** (e.g. `POST /v1/agents/:id/transactions`) — Same as authenticated, plus a check that the JWT has `intents_api_enabled`. Without it → **403**.
- **Webhook** (`POST /v1/billing/webhooks`) — No auth middleware; Stripe signature verification is done in the handler.

## What you can rely on

- **401** always means auth failed (missing, invalid, or expired token or API key). Fix by re-authenticating or rotating the key.
- **402** means payment or quota is required for this request (tier limit exceeded; pay via x402 or use prepaid credits). See [Billing & Usage](/docs/guides/billing-and-usage).
- **403** can mean: no permission for this resource (policy), resource limit exceeded (subscription tier), IP denied, or (on Intents API routes) agent not allowed to sign. The response body `type` and `detail` distinguish these.
- **429** means you hit the global rate limit. Back off and retry; optional `Retry-After` header indicates when to retry.

See [Error codes](/docs/reference/error-codes) for the full list of status codes and problem details.
