---
title: Changelog
description: Product and API changelog for 1claw.
sidebar_position: 3
---

# Changelog

For detailed release history, see the [1clawAI GitHub](https://github.com/1clawAI) repositories.

## API stability

The **/v1** API is stable. Breaking changes would be accompanied by a new version prefix or clear deprecation notices. New optional fields or endpoints are added in a backward-compatible way.

## 2026-05 (latest)

### Platform API (v0.20.0)

- **New:** Platform API for developers building applications on top of 1Claw. Platform apps can provision users, vaults, agents, and policies on behalf of their end-users.
- **New:** `plt_` prefixed API keys for platform app authentication. Resolved by auth middleware to `CallerIdentity` with `principal_type: "platform"`.
- **New:** Bootstrap templates — declarative JSON specs that scaffold vault + agent + policies in a single API call (`POST /v1/platform/connections/{id}/bootstrap`).
- **New:** OIDC user provisioning — `POST /v1/platform/users/upsert` accepts a `subject_token` (JWT verified against the platform app's JWKS) or email to create-or-find end-users.
- **New:** Connected apps management — end-users can view and disconnect platform apps via `GET/DELETE /v1/platform/connected-apps`.
- **New:** Claim tokens (`ct_` prefix) — one-time 10-minute tokens for end-users to claim bootstrapped resources.
- **New:** `platform_locked` flag on vaults and agents — prevents platform operators from accessing end-user secret values (custody guarantee).
- **New:** Three billing models: `platform_pays` (default), `user_pays`, `hybrid`. Per-resource payer override via `vaults.billed_to_type` and `billed_to_id`.
- **New:** Three auth modes: `silent` (no user interaction), `user_signin` (user must sign in), `configurable` (per-connection).
- **New:** Database tables: `platform_apps`, `platform_templates`, `platform_user_connections`, `platform_user_grants`, `platform_claim_tokens` (migrations 081–085). New columns on `vaults`, `agents`, `access_policies`, `users`, `usage_events` (migration 086).
- **New:** Dashboard pages at `/platform` — app management, template editor, connected users, bootstrap flow.
- **New:** SDK — `client.platform.createApp()`, `.upsertUser()`, `.bootstrapUser()`, `.listConnectedApps()`.
- **New:** Platform audit events (`platform.*` actions) with dedicated query endpoint.

### Security hardening round 2 (2026-05)

- **New:** Nonce-based Content Security Policy (CSP) — dashboard uses per-request nonces instead of `'unsafe-inline'` for script tags.
- **New:** DEK re-wrap nightly job — automatically re-wraps data encryption keys using the latest KEK version, ensuring old key versions can be safely destroyed.
- **Improved:** OIDC federation audience URL validation now blocks cloud metadata endpoints (169.254.x.x, link-local) and private CIDR ranges.
- **Improved:** CORS explicit header allowlist — only documented request headers are accepted; unknown custom headers are rejected.
- **Improved:** MCP secret cache TTL and rate limiting — secrets fetched via the MCP server are no longer persisted beyond the session; rate limits added to prevent abuse.
- **Improved:** x402 payment proof cleanup — expired proofs are purged during the nightly credit expiry job.
- **Improved:** HTTP timeouts on all outbound RPC clients (KMS, Tenderly, chain RPC) to prevent hung connections.
- **Improved:** Demo Shroud endpoint rate limiting — prevents abuse of the public demo page.
- **Improved:** Platform handler audit events now include `request_id` for full request tracing.
- **Fixed:** Platform `upsert_user` now enforces org match — prevents cross-org user binding.
- **Changed:** KEK rotation period updated from 90 days to 365 days (NIST SP 800-57). Nightly KMS cleanup job destroys old key versions (keeps 2 most recent).
- **Changed:** MCP exfiltration protection default changed from `warn` to `block`.

### Signing key auto-resolution and chain mapping (v0.19.2)

- **Improved:** Default `signing_key_path` now auto-resolves: if the agent has a per-chain signing key provisioned (via `POST /v1/agents/:id/signing-keys`), the handler uses `agents/{id}/chains/{chain}/private_key`; otherwise falls back to `keys/{chain}-signer`.
- **Improved:** Network names (e.g. `sepolia`, `base`, `arbitrum`) now map to canonical signing key chains (e.g. `ethereum`) via `signing_key_chain_for()`, so agents only need one Ethereum signing key regardless of which EVM network they transact on.
- **Improved:** `validate_signing_key_path` now also allows `agents/{id}/chains/*` paths (previously restricted to `keys/*`, `wallets/*`, `agents/{id}/keys/*`).
- **Improved:** Shroud default signing key path is now chain-aware (dynamically resolved to `keys/{chain}-signer` instead of hardcoded `keys/default-signer`).

### Native multi-chain treasury wallets (v0.19)

- **New:** HSM-backed treasury wallet generation for human users across 6 chains: Ethereum (secp256k1), Bitcoin (secp256k1), Solana (Ed25519), XRP (Ed25519), Cardano (Ed25519), Tron (secp256k1).
- **New:** `POST /v1/treasury/wallets/generate` — generate wallets for specified chains (or all supported chains). Private keys stored in per-org `__treasury-keys` vault with auto-configured MPC custody.
- **New:** `GET /v1/treasury/wallets` — list all active wallets for the calling user.
- **New:** `GET /v1/treasury/wallets/{chain}` — get wallet for a specific chain.
- **New:** `POST /v1/treasury/wallets/{chain}/export` — export private key (audit-logged).
- **New:** `POST /v1/treasury/wallets/{chain}/rotate` — rotate wallet keypair.
- **New:** `DELETE /v1/treasury/wallets/{chain}` — deactivate wallet.
- **New:** MPC custody auto-configured per billing tier: XOR 2-of-2 for Pro/Team, Shamir 2-of-3 multi-HSM for Business/Enterprise.
- **New:** Dashboard wizard UI with QR codes for public addresses and key export.
- **New:** SDK — `client.treasury.generateWallets()`, `.listWallets()`, `.getWallet()`, `.exportWallet()`, `.rotateWallet()`, `.deactivateWallet()`.
- **New:** CLI — `1claw treasury generate`, `list`, `get`, `export`, `rotate`, `deactivate`.
- **Changed:** Treasury page no longer requires beta access — requires Pro+ subscription.
- **Removed:** Coinbase CDP embedded wallets replaced by native wallet generation.

### Multi-chain signing keys (v0.18)

- **New:** Per-agent, per-chain signing keys for 6 blockchains: Ethereum (secp256k1), Bitcoin (secp256k1), Solana (Ed25519), XRP (Ed25519), Cardano (Ed25519), Tron (secp256k1).
- **New:** `POST /v1/agents/{id}/signing-keys` — provision an HSM-backed key for a chain. Returns public key and derived address. Private key stored in `__agent-keys` vault.
- **New:** `POST /v1/agents/{id}/signing-keys/{chain}/rotate` — rotate a chain's key (deactivates old version, creates new).
- **New:** `DELETE /v1/agents/{id}/signing-keys/{chain}` — deactivate a chain's key.
- **New:** Crypto modules — `bitcoin.rs` (secp256k1, P2WPKH bech32), `solana.rs` (Ed25519, Base58), `xrp.rs` (Ed25519, Base58Check), `cardano.rs` (Ed25519, bech32 enterprise), `tron.rs` (secp256k1, Base58Check).
- **New:** Dashboard — "Signing Keys" card on agent detail page with public keys, addresses, key version, and "Add Key" dialog.
- **New:** SDK — `client.signingKeys.create()`, `.list()`, `.rotate()`, `.deactivate()`.
- **New:** CLI — `1claw agent signing-keys list`, `create --chain`, `rotate`, `delete`.
- **New:** MCP tools — `provision_signing_key`, `list_signing_keys`.

### Extended signing intents (v0.18)

- **New:** Unified `POST /v1/agents/{id}/sign` endpoint supporting three intent types:
  - **`personal_sign`** (EIP-191): Sign arbitrary messages. Requires `message_signing_enabled` on agent.
  - **`typed_data`** (EIP-712): Sign structured typed data (e.g. ERC-20 Permit). Enforces domain allowlist and deny-by-default for dangerous types (Permit, Permit2, etc.).
  - **`transaction`**: All EIP-2718 types — legacy (type 0), EIP-2930 access list (type 1), EIP-1559 (type 2), EIP-4844 blob (type 3), EIP-7702 (type 4).
- **New:** Agent guardrail fields — `message_signing_enabled` (boolean), `eip712_default_policy` ("deny"/"allow"), `eip712_domain_allowlist` (JSON array), `signing_chains` (text array).
- **New:** SDK — `client.agents.sign(agentId, { intent_type, chain, ... })`.
- **New:** CLI — `1claw agent sign`.
- **New:** MCP tools — `sign_message` (EIP-191), `sign_typed_data` (EIP-712).
- **New:** [Multi-chain keys example](https://github.com/1clawAI/1claw-examples/tree/main/multi-chain-keys), [EVM signing example](https://github.com/1clawAI/1claw-examples/tree/main/evm-signing), [Agentic TX example](https://github.com/1clawAI/1claw-examples/tree/main/agentic-tx), [Non-EVM keys example](https://github.com/1clawAI/1claw-examples/tree/main/non-evm-keys).

### Scaling & performance (v0.17)

- **New:** DEK cache — 60s TTL, 1000-entry DashMap, cuts KMS unwrap calls ~80%.
- **New:** Usage metering batching — in-memory buffer, batch INSERT every 5s/100 events.
- **New:** Distributed rate limiting — two-layer: in-memory L1 + optional Redis L2.
- **New:** Shroud nonce manager — DB-backed via Vault's `POST /v1/admin/nonces/reserve`.
- **New:** Cron job leader election via `pg_try_advisory_lock`.
- **New:** Quota header caching — DashMap 30s TTL per org.
- **New:** Manifest endpoint ETag/304 + `?since=` incremental query.
- **New:** Daily spend partial composite index on `transactions` table.

---

## 2026-04

### Agent self-enrollment: link-only and `approval_url`

- **Updated:** `POST /v1/agents/enroll` — `human_email` is **optional**. With email, a pending enrollment is created and Allow/Deny links are sent; the JSON response may include **`approval_url`** as a fallback if email is delayed. **Name only** creates a link-only pending enrollment; the response includes **`approval_url`** for the human to open while signed in to approve into their org.
- **Updated:** Database migration allows nullable org/user/email on `pending_agent_enrollments` for link-only rows; global cap on link-only pendings via `ONECLAW_MAX_LINK_ONLY_PENDING_ENROLLMENTS` (default 100).
- **Updated:** CLI `agent enroll` — `--email` is optional; prints `approval_url` when returned.
- **Docs:** [Quickstart for agents](/docs/quickstart/agents), [Agent self-onboarding](/docs/guides/agent-self-onboarding), [Give an agent access](/docs/guides/give-agent-access), [OpenClaw](/docs/guides/openclaw).

### MPC Secret Storage

- **New:** Multi-Party Computation (MPC) secret storage — split secret DEKs across multiple HSM providers so no single provider holds the complete key. Three custody modes: `2of2_client_custody` (XOR split, client holds one share), `2of3_multi_hsm` (Shamir 2-of-3 across GCP KMS + AWS KMS + Azure Key Vault, fully server-side), `2of3_client_custody` (Shamir 2-of-3 with client share).
- **New:** `POST /v1/vaults/{id}/mpc` — enable MPC on a vault (user-only, Business/Enterprise tiers).
- **New:** `client_share` returned in `SecretCreatedResponse` for client custody modes. Must be stored securely — only returned once. Required via `X-Client-Share` header on read.
- **New:** Crypto modules — `mpc_provider.rs` (orchestrates split/reconstruct), `shamir.rs` (Shamir secret sharing over GF(256)), `xor_split.rs` (XOR 2-of-2), `hsm_aws.rs` (AWS KMS CryptoProvider), `hsm_azure.rs` (Azure Key Vault CryptoProvider).
- **New:** Database tables `vault_mpc_keks` and `secret_dek_shares` (migration 063).
- **New:** [MPC guide](/docs/guides/mpc) in documentation.

### GDPR Data Export

- **New:** `POST /v1/auth/export-data` — authenticated endpoint that returns a JSON archive of the calling user's personal data (profile, org membership, vaults, agents, policies, audit events, shares, billing). For GDPR data portability compliance.
- **Updated:** `DELETE /v1/auth/me` already handles account deletion with cascade cleanup (right-to-erasure).
- **Updated:** [Compliance](/docs/security/compliance) documentation now covers GDPR support.

### Security hardening (2026-04-15)

- **New:** Agent token auto-revocation on policy changes — when an access policy targeting an agent is created, updated, or deleted, all of that agent's active JWTs are automatically revoked via the `agent_active_tokens` table (migration 066). The agent must re-exchange credentials to get a fresh token with updated scopes. Eliminates stale-scope window.
- **New:** KMS key rotation — GCP KMS vault KEKs are now created with a 90-day automatic rotation schedule and `next_rotation_time`. Existing ciphertext remains decryptable (KMS retains all versions).
- **New:** KMS CRC32C verification — all `wrap_dek`, `unwrap_dek`, and `sign` KMS operations now send CRC32C of input data and verify response CRC32C. Detects in-transit corruption or tampering. Added `crc32c` and `prost-types` crates.
- **New:** Audit insert hardening — migration 067 creates a restricted `vault_app` database role (no `BYPASSRLS`) and a `SECURITY DEFINER` function `insert_audit_event`. Direct `INSERT` on `audit_events` is revoked from `vault_app`, preventing log fabrication from compromised connections.
- **Fixed:** Shroud user-supplied `blocked_patterns` compiled via `RegexBuilder` with 256KiB size limit (ReDoS protection).
- **Fixed:** x402 facilitator verify now passes actual atomic USDC amounts. Settlement moved before broadcast in `submit_transaction`.

---

## 2026-03

### Live demo

- **New:** Interactive demo page at [1claw.xyz/demo](https://1claw.xyz/demo) — three panels (Vault secret retrieval, Shroud prompt injection + secret redaction, Intents TEE transaction signing) with preset buttons, no signup required.

### Onboarding wizard improvements

- **Updated:** Agent wizard is now 4 steps: register → save credentials → **grant vault access** (creates read policy) → connection snippets. Ensures agents don't start with zero access.
- **Updated:** Vault wizard is now 4 steps: create vault → store secret → **grant agent access** (creates read policy) → next steps.
- **New:** `.env` import on vault detail page — paste a `.env` file to bulk-create secrets with configurable path prefix.

### Google OAuth JWKS

- **Updated:** `POST /v1/auth/google` now verifies the Google ID token locally via [Google's JWKS](https://www.googleapis.com/oauth2/v3/certs) (RS256 signature, audience, issuer, expiry). Replaces the previous tokeninfo endpoint call. More reliable (no URL length limits).

### SSO (WorkOS)

- **New:** WorkOS SAML/OIDC SSO — `GET /v1/auth/sso/authorize`, callback handler, "Sign in with SSO" button on login page.

### Security fixes (2026-03-16 audit)

- **Fixed (C-3):** Dashboard auth bypass — `PUBLIC_PAGES` prefix match for `"/"` matched all paths. Now uses exact match.
- **Fixed (C-4):** MFA token replay — MFA challenge tokens are now single-use (jti revoked after verification).
- **Fixed (C-5):** Cross-vault IDOR — agent JWTs with empty `vault_ids` no longer grant unrestricted access; vault IDs are derived from access policies.
- **Fixed (H-19):** Ed25519 SPKI DER parsing uses proper ASN.1 validation instead of a heuristic.
- **New:** `signing_key_path` validation restricts Intents API key paths to `keys/*`, `wallets/*`, `agents/{id}/keys/*`, or `agents/{id}/chains/*`.
- **New:** Shroud strips sensitive headers (authorization, cookies, IP headers) before forwarding to upstream LLM providers.

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
