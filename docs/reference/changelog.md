---
title: Changelog
description: Product and API changelog for 1claw.
sidebar_position: 3
---

# Changelog

For detailed release history, see the [1clawAI GitHub](https://github.com/1clawAI) repositories.

## API stability

The **/v1** API is stable. Breaking changes would be accompanied by a new version prefix or clear deprecation notices. New optional fields or endpoints are added in a backward-compatible way.

## 2026-03 (latest)

### x402 marketplace compatibility

- **Updated:** 402 Payment Required response body now aligns with [docs.g402.ai](https://docs.g402.ai/docs/api/response-format) and x402scan: `x402Version`, `accepts[]` with `maxAmountRequired` (atomic units), `resource` (full URL), `payTo`, `maxTimeoutSeconds`, `asset`, `description`, `mimeType`. Enables registration on x402 marketplaces.
- **Updated:** On paid routes, x402 middleware runs before auth so unauthenticated requests receive 402 (with payment details) instead of 401. Scanners and buyers can discover and pay without a token.
- **New:** Optional `x402.asset` (DB/API) and `X402_ASSET` env — default is Base USDC. Used in 402 `accepts[].asset`.
- **Updated:** SDK `PaymentAccept` and auto-pay logic support the new 402 shape; `maxAmountRequired` (atomic) with fallback to legacy `price` (USD). Custom `X402Signer` implementations should use `maxAmountRequired` and `asset`.
- **Updated:** Dashboard proxy passes discovery paths (`/openapi.json`, `/.well-known/x402`) through without `/v1` prefix so vault discovery routes are reachable at api.1claw.xyz.

## 2026-02

### Tenderly Transaction Simulation

- **New:** `POST /v1/agents/:agent_id/transactions/simulate` — pre-flight simulation of EVM transactions via Tenderly. Returns balance changes, gas estimates, decoded errors, and a Tenderly dashboard deep-link. No signing or broadcasting occurs.
- **New:** `POST /v1/agents/:agent_id/transactions/simulate-bundle` — simulate multiple sequential transactions (e.g. approve + swap).
- **New:** `simulate_first` flag on `POST /v1/agents/:agent_id/transactions` — runs a Tenderly simulation before signing. If the simulation reverts, returns HTTP 422 and does not sign. Org admins can enforce this as mandatory via the `intents_api.require_simulation` setting.
- **New:** EIP-1559 (Type 2) transaction signing — set `max_fee_per_gas` and `max_priority_fee_per_gas` instead of legacy `gas_price`.
- **New:** Automatic nonce resolution via `eth_getTransactionCount` RPC when `nonce` is omitted.
- **New:** Address derivation from private key (secp256k1) — the simulation endpoint resolves the `from` address without exposing the key.
- **New:** `simulate_transaction` MCP tool and `simulate_first` argument on the `submit_transaction` MCP tool (defaults to `true`).
- **New:** `simulateTransaction()` and `simulateBundle()` methods in the TypeScript SDK.
- **New:** Dashboard Transaction Builder on the agent detail page — simulate, review balance changes, then confirm and send.
- **New:** Transaction history table on the agent detail page with simulation status badges and tx hash copy.

### Transaction replay protection & response hardening

- **New:** `Idempotency-Key` header on `POST /v1/agents/:agent_id/transactions` — duplicate requests with the same key within 24 hours return the cached response (200) instead of signing and broadcasting again. In-progress duplicates return 409 Conflict.
- **New:** Server-side nonce serialization — when `nonce` is omitted, the server atomically reserves the next nonce per agent+chain+address via `SELECT FOR UPDATE` locking, preventing nonce collisions between concurrent requests.
- **New:** `signed_tx` redacted by default — GET transaction endpoints omit the raw signed transaction hex. Pass `?include_signed_tx=true` to include it. The initial POST submission always returns it.
- **New:** `transaction_idempotency` and `nonce_tracker` database tables (migrations 034, 035).
- **New:** Nightly cleanup of expired idempotency keys (>48h) in the existing credit expiry background job.
- **Updated:** SDK `submitTransaction()` auto-generates an `Idempotency-Key` header (UUID). Callers can override via `options.idempotencyKey`.
- **Updated:** MCP `submit_transaction` tool auto-generates an `Idempotency-Key` header.
- **Updated:** OpenAPI spec documents `Idempotency-Key` header and `include_signed_tx` query parameter.

### Admin user management

- **New:** `DELETE /v1/admin/users/:user_id` — platform admins can delete users. Cascades: delete share links created by the user, clear `agents.created_by`, then delete the user (device_auth_codes and user_api_keys CASCADE in DB). Cannot delete self or the last owner of the platform org.
- **New:** `scripts/cleanup-test-users.sh` — removes test users by display name. Auth via `ONECLAW_TOKEN` or `ADMIN_EMAIL` + `ADMIN_PASSWORD`. Use `--dry-run` to list only.

### Security audit hardening

- **New:** Per-agent transaction guardrails — `tx_allowed_chains`, `tx_to_allowlist`, `tx_max_value_eth`, `tx_daily_limit_eth` enforced before signing.
- **New:** Audit hash chain — each event stores `prev_event_id` and SHA-256 `integrity_hash` for tamper detection.
- **New:** x402 payment replay protection — payment proofs deduplicated via SHA-256 before facilitator verification.
- **New:** Authorization enforcement on `delete_secret`, `list_secrets`, and `list_versions` (policy check, not just org membership).
- **Improved:** CORS defaults to `https://1claw.xyz` in production (no more permissive `Any` fallback).
- **Improved:** CSP removes `unsafe-inline` and `unsafe-eval` from `script-src`.
- **Improved:** Global rate limiting middleware applied to all API routes.
- **Improved:** Dependency overrides for `minimatch`, `ajv`, `hono` to address known CVEs.

### Dashboard UX — CopyableId

- **New:** One-click copy for every UUID, path, and identifier across the dashboard. Vault IDs, agent IDs, principal IDs, audit actor/resource IDs, API key prefixes, secret paths, and user/org IDs in the sidebar — all clickable with tooltip confirmation.

### Quota exemption for platform admin orgs

- **New:** `CallerIdentity.quota_exempt` flag resolved at authentication time. Platform admin org (and its agents) bypasses all billing checks. Cleaner than per-route overrides — single source of truth in auth middleware.

### Policy UI improvements

- **New:** Vault selector dropdown on Create Access Policy page — pick any vault, not just the one in the URL.
- **New:** Agent principal picker — select from existing agents or type a custom agent ID.
- **New:** Edit policy dialog — update permissions, conditions (JSON), and expiry on existing policies.
- **New:** Delete policy from the policies list page.

### Agent integration guide

- **New:** Agent detail page in the dashboard now includes a tabbed integration guide with copy-paste code snippets for TypeScript SDK, Python, curl, and MCP configuration.

### PolyForm Noncommercial License

- All repositories now include the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).

### Organization migration

- All repositories moved to the [1clawAI](https://github.com/1clawAI) GitHub organization.

### Email notifications

- **New:** Transactional emails via [Resend](https://resend.com) for account and security events.
- Welcome email on signup (email/password and Google OAuth).
- Share invite email when a secret is shared by email.
- Share access notification to the creator when a shared secret is accessed.
- Password change confirmation email.
- API key creation notification email.
- Emails are fire-and-forget (non-blocking) and silently skipped when no `RESEND_API_KEY` is configured.

### Sharing & invite-by-email

- **New:** `external_email` share type — share secrets with users who don't have accounts yet.
- **New:** Claim-on-login — pending email shares are automatically claimed when the recipient signs up or logs in.
- **New:** Share access notifications — creators are emailed each time a shared secret is accessed.
- **New:** `POST /v1/auth/signup` — self-service account registration via email/password.

### SDK rewrite (`@1claw/sdk` v0.2.0)

- **New:** Full API parity — typed methods for all 42+ REST API endpoints.
- Resource modules: `vault`, `secrets`, `access`, `agents`, `sharing`, `auth`, `apiKeys`, `billing`, `audit`, `org`.
- `createClient()` factory with auto-authentication (API key or agent credentials).
- `{ data, error, meta }` response envelope on every method.
- Typed error hierarchy: `AuthError`, `PaymentRequiredError`, `NotFoundError`, `RateLimitError`, etc.
- x402 auto-payment support with configurable `maxAutoPayUsd`.
- MCP tool layer: `McpHandler` and `getMcpToolDefinitions()` for AI agent frameworks.
- `auth.signup()` for programmatic account creation.
- `sharing.create()` with email support for invite-by-email.

### Examples repository

- **New:** `examples/basic/` — TypeScript scripts for vault CRUD, secrets, billing, signup, and email sharing.
- **New:** `examples/nextjs-agent-secret/` — Next.js 14 app with Claude AI agent accessing vault secrets.

### MCP server (`@1claw/mcp`)

- **New:** MCP server for AI agent access to secrets via the Model Context Protocol.
- 7 tools: `list_secrets`, `get_secret`, `put_secret`, `delete_secret`, `describe_secret`, `rotate_and_store`, `get_env_bundle`.
- Browsable `vault://secrets` resource.
- **Dual transport:** Local stdio mode (Claude Desktop, Cursor) and hosted HTTP streaming mode (`mcp.1claw.xyz`).
- Per-session authentication in hosted mode — each connection gets its own vault client.
- Auto-deploy to Cloud Run via GitHub Actions.

### Billing & usage tracking

- **New:** Usage tracking middleware records every authenticated API request.
- **New:** Free tier — 1,000 requests/month per organization.
- **New:** x402 Payment Required responses when free tier is exhausted, with on-chain payment on Base (EIP-155:8453).
- **New:** Billing API — `GET /v1/billing/usage` (summary) and `GET /v1/billing/history` (event log).
- Unified billing across dashboard, SDK, and MCP — all count against the same quota.

### Vault API

- Added `POST /v1/agents/:agent_id/rotate-key` endpoint for agent key rotation.
- Added `GET /v1/billing/usage` and `GET /v1/billing/history` endpoints.
- Usage middleware tracks method, endpoint, principal, status code, and price per request.
- x402 middleware enforces free tier limits and returns payment-required responses.

### Infrastructure

- Cloud Run deployment for MCP server (`oneclaw-mcp`).
- Terraform resources for MCP service and domain mapping.
- GitHub Actions workflow for MCP auto-deploy.
- CI pipeline expanded: MCP type check, build, Docker image build and Trivy scan.

### Documentation

- **New:** Full MCP documentation section (overview, setup, tool reference, security, deployment).
- **New:** Billing & usage guide.
- **New:** Deploying updates guide.
- Updated intro, MCP integration guide, and changelog.
- Updated `llms.txt` and `llms-full.txt` with MCP and billing content.

### Initial release (2026-02 early)

- Vault API: vaults, secrets (CRUD + versioning), policies, agents, sharing, audit log, org management.
- Human auth: email/password, Google OAuth, personal API keys (`1ck_`).
- Agent auth: agent API keys (`ocv_`) exchanged for short-lived JWTs.
- Envelope encryption with Cloud KMS (or SoftHSM for local dev).
- Dashboard: Next.js with full secret management UI.
- TypeScript SDK (`@1claw/sdk`).
- Docusaurus docs site.
- Terraform infrastructure (Supabase, GCP, Vercel).
