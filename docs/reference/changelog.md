---
title: Changelog
description: Product and API changelog for 1claw.
sidebar_position: 3
---

# Changelog

For detailed release history, see the [1clawAI GitHub](https://github.com/1clawAI) repositories.

## API stability

The **/v1** API is stable. Breaking changes would be accompanied by a new version prefix or clear deprecation notices. New optional fields or endpoints are added in a backward-compatible way.

## 2026-06 (latest)

### API v2.20.1 / SDK 0.34.3 / CLI 0.36.4 — OAuth branding + redirect URI validation (2026-06-29)

- **New:** Platform apps can configure a `logo_url` for branding on OAuth login and consent pages. When a user visits the "Sign in with 1Claw" flow, the app's logo and name are shown. Set via Dashboard (Platform → app → Settings → App Branding) or `PATCH /v1/platform/apps/{id}`.
- **New:** Public branding endpoint `GET /v1/platform/apps/by-slug/{slug}/branding` — returns `{ name, logo_url, slug }` without authentication.
- **New:** Dedicated `validate_redirect_uri()` function for OAuth redirect URIs allows `http://localhost` and `http://127.0.0.1` per RFC 8252 §7.3 (native/dev clients). Cloud metadata and non-loopback private IPs remain blocked.
- **Dashboard:** Platform app detail page has a "Redirect URIs" editor in the Settings tab. Login and consent pages show app branding (logo + name) when the OAuth `client_id` query parameter is present.
- **Docs:** Updated Platform API guide with redirect URI management instructions and a warning that `client_id` must be the app **slug** (not UUID).

### API v2.20.0 / SDK 0.34.2 / MCP 0.34.3 — raw digest signing + EIP-712 fixes (2026-06-26)

- **New:** Raw digest signing intent on `POST /v1/agents/{id}/sign` — `intent_type: "eip712_digest"` (alias `"digest"`) signs a client-computed 32-byte `hash` directly and returns a 65-byte `r‖s‖v` signature that recovers to the agent's EOA. This unblocks **ERC-1271 / ERC-7739 nested EIP-712** flows (e.g. **Polymarket** CLOB orders) where the canonical hash is computed client-side and must match the verifier exactly, which 1Claw's own `typed_data` recomputation would otherwise diverge from.
- **Security:** Raw digest signing is **blind signing** (no domain/transaction inspection, guardrails bypassed), so it is gated behind a new per-agent **`raw_signing_enabled`** flag — **off by default**, only a human can enable it (agents cannot self-enable), and every use is audit-logged as `signing_key.raw_digest_sign`. Surfaced as a toggle (with an explicit warning) on the dashboard agent detail page.
- **Fixed:** EIP-712 `uintN`/`intN` encoding for `typed_data` now uses arbitrary-precision integers — decimal strings that happened to be valid hex are no longer misparsed, and values larger than `u128` are no longer silently encoded as zero. Negative `intN` values use correct two's-complement.
- **New:** Platform bootstrap templates accept `provision_eoa: true` per agent — generates a standalone secp256k1 EOA for the agent (returned as `agent_evm_address` in the bootstrap summary) so platform-provisioned agents can deploy/operate ERC-4337 smart accounts client-side without a Pro+ treasury-wallet flow.
- **MCP:** New `sign_digest` tool wraps the `eip712_digest` intent. **SDK:** `signIntent` accepts `intent_type: "eip712_digest"` + `hash`; `AgentResponse`/`UpdateAgentRequest` expose `raw_signing_enabled`.

### CLI v0.36.2 — fix cloud-mode container startup + start/restart for `init --docker` (2026-06-25)

- **Fixed:** `1claw init --docker` (cloud mode) started the container but the entrypoint exited immediately with `ERROR: ONECLAW_AGENT_API_KEY is not set (cloud mode)` and looped on restart. The container is **designed never to receive the agent API key** — the host daemon brokers credentials over the mounted Unix socket — so requiring the key directly was wrong for this flow. The entrypoint now detects the mounted daemon socket and brokers all credentials through it (cloud **and** local). A direct `ONECLAW_AGENT_API_KEY` is only required for standalone deploys with no daemon socket (e.g. Cloud Run via `1claw deploy`).
- **New:** `1claw containers start <name>` and `1claw containers restart <name>`. `start` resumes a stopped container; if the container was removed (status `absent`), it is recreated from the saved run spec (re-checking the host port). `restart` restarts a running/stopped container or recreates an absent one. The `init` command now persists the container's run spec (image, env var names, mounts, labels — never secret values) to `~/.config/1claw/containers/{name}.json` to enable this.
- **Changed:** The chat UI header no longer shows the ambiguous `mode=cloud`. It now shows `runtime=docker` (the container is always Docker) alongside `vault=cloud|local` — clarifying that "cloud/local" refers to where the agent's identity and secrets live (a 1Claw cloud account vs an offline local CLI vault), not the runtime. `/info` reflects the same.
- **Changed:** Base image `org.1claw.base-version` bumped so an existing `1claw/agent:stable` is rebuilt with the corrected entrypoint and clarified labels automatically on the next `init`.

### CLI v0.36.1 — robust port handling for `init --docker` (2026-06-25)

- **Fixed:** `1claw init --docker` could fail with `Bind for 0.0.0.0:3000 failed: port is already allocated` even though the CLI's pre-check thought the port was free. The free-port check now binds `0.0.0.0` (matching how Docker publishes ports) instead of `127.0.0.1`, so ports already held by another container are correctly detected.
- **New:** If the container still fails to start because the port is taken (a TOCTOU race, or a port held only inside the Docker VM), the CLI now automatically retries on the next free port — unless you pinned an explicit `--port`, in which case it fails with actionable guidance (`1claw containers list`, `1claw containers stop <name>`, `docker ps --filter publish=<port>`).
- **Reminder:** manage running agent containers with `1claw containers list | info | stop | rm | logs`; manage cloud agent identities with `1claw agent list | get | update | delete`.

### CLI v0.36.0 — chat LLM through Shroud (2026-06-25)

- **New:** In cloud mode, the `1claw init --docker` chat UI is now wired to an LLM **through Shroud**. Messages route via the host daemon, which injects the `X-Shroud-Agent-Key` header (the container never sees the agent key); Shroud applies the agent's inspection/redaction policy before forwarding to the provider.
- **New:** Three provider-key sources, all keeping the key out of the container: **1Claw LLM Token Billing** (Stripe AI Gateway — no key), **1Claw cloud vault** (`--llm-api-key`, default `--llm-key-store cloud`, stored at `providers/<provider>/api-key` and auto-fetched by Shroud), and **local CLI vault BYOK** (`--llm-api-key --llm-key-store local` or `--llm-api-key-secret <name>` — the daemon injects `X-Shroud-Api-Key`). The provisioned agent now also gets a read policy on `providers/*` so cloud-vault keys resolve.
- **New:** `--llm-provider` (default `openai`), `--llm-model` (default per provider, e.g. `gpt-4o-mini`), `--llm-api-key`, `--llm-key-store`, and `--llm-api-key-secret` flags on `init --docker`. The daemon `/proxy` now supports injecting multiple secrets into one request.
- **Fixed:** The container chat UI reported `mode=local` even for cloud-provisioned agents — `ONECLAW_LOCAL_VAULT=true` was baked into the base image. Mode is now passed at run time; cloud agents correctly report `mode=cloud`. `--local` mode still has no LLM (no cloud agent → no Shroud credential).
- **Changed:** The base image carries an `org.1claw.base-version` label; `init` rebuilds a stale `1claw/agent:stable` automatically when bundled assets change. CLI version 0.35.1 → 0.36.0.

### CLI v0.35.1 — local vault recovery (2026-06-25)

- **New:** `1claw local destroy --force` skips the confirmation prompt, and `1claw local reset` is an alias for `destroy`. Neither requires the passphrase — this is the recovery path for a forgotten local-vault passphrase. Destroy now also stops any running daemon still holding the old vault and clears its stale socket/PID.
- **Improved:** `1claw init --docker --local` validates an existing vault's passphrase **before** starting the daemon and, on mismatch, fails fast with explicit recovery instructions instead of a generic daemon-startup timeout. `1claw daemon start` surfaces the same recovery guidance on "wrong passphrase or corrupted vault file".

### CLI v0.35.0 — containerized agent runtime (2026-06-25)

- **New:** `1claw init --docker` — provisions a secure agent runtime inside a Docker container in one command (1Claw MCP server + chat UI on port 3000). The container never receives the agent API key; the host daemon injects credentials over a read-only Unix-socket bind mount.
- **New:** Module system — `--module=ampersend,onchain` composes container extensions from bundled `module.yaml` manifests with dependency resolution, conflict detection, and topological layer ordering. Bundled modules: `ampersend`, `onchain`, `langchain`, `elizaos`, `scaffold-agent`. `--list-modules` prints the catalog.
- **New:** `--local` flag runs fully offline (no cloud account); the base image is built from bundled assets when not already present.
- **New:** `1claw containers list|info|stop|rm|logs` — manage CLI-created agent containers (state stored in `~/.config/1claw/containers/{name}.json`).
- **New:** `1claw publish` — rebuild from base + modules, build from a custom `Dockerfile`, or snapshot a running container (`--commit`), then tag and push to a registry.
- **New:** `1claw eject` — export the generated `Dockerfile`, module configs, and a `docker-compose.yaml` (daemon socket pre-wired) for manual control.
- **New:** `1claw deploy --google-cloud` — generate Terraform (`main.tf`, `variables.tf`, `outputs.tf`) for Cloud Run with Secret Manager key injection; `--apply` runs `terraform apply`.
- **Changed:** CLI version bumped from 0.34.7 to 0.35.0. Added `yaml` dependency for module manifest parsing.

### CLI v0.34.7 — LLM proxy, treasury proposals, unified signing (2026-06-22)

- **New:** `1claw proxy` — local OpenAI-compatible proxy that routes LLM traffic through Shroud with full inspection, secret redaction, and optional LLM Token Billing. Auto-detects provider from model name. IDE setup snippets printed on startup.
- **New:** `1claw treasury proposal create|list|get|sign|execute|cancel` — full multisig proposal lifecycle from CLI.
- **New:** `1claw agent sign` — unified signing command for EIP-191, EIP-712, and all EIP-2718 transaction types (0–4).
- **New:** `1claw webhook create|list|get|update|delete` — manage webhook endpoints from CLI.
- **New:** `1claw platform reissue-claim` — reissue expired claim URLs without re-provisioning.
- **New:** `1claw treasury send` and `1claw treasury swap` — send native/ERC-20 tokens and swap via 0x from CLI.
- **New:** `1claw treasury balance` — query native + ERC-20 token balances.
- **New:** DPoP support — `ONECLAW_DPOP=true` env var enables RFC 9449 proof-of-possession. Keypair persisted at `~/.config/1claw/dpop-key.json`.
- **Updated:** MCP tools expanded to 37 tools (added platform_reissue_claim, platform_rotate_key, list_approvals, get_approval, request_approval, treasury_propose, treasury_sign_proposal, treasury_list_proposals, sign_digest).
- **Updated:** MCP auth simplified — `ONECLAW_AGENT_API_KEY` alone is sufficient (agent ID and vault auto-discovered via prefix lookup).
- **Changed:** CLI version bumped from 0.34.2 to 0.34.7. SDK 0.34.1. MCP 0.34.1.

### Local Vault & Daemon (v0.34.2 — 2026-06-22)

**Local encrypted vault:**
- `1claw local init` — create an AES-256-GCM encrypted vault with passphrase-derived key (PBKDF2, 100k iterations)
- `1claw local add/get/rm/list/status/destroy` — full secret lifecycle without cloud connectivity
- `1claw local import <file>` — import from `.env` files into the local vault
- `1claw local export` — export as `.env` format
- `1claw local sync` — push local secrets to cloud vault; `--pull` to pull from cloud
- File permissions hardened to 0600; safe to back up (encrypted at rest)

**Local daemon & secret proxy:**
- `1claw daemon start` — starts a Unix socket daemon that holds decrypted secrets in memory
- `1claw daemon policy add <secret> --hosts <hosts>` — per-secret host allowlist (fail-closed: no policy = no injection)
- `1claw daemon policy list/remove` — manage policies
- Secret proxy: `POST /proxy` on the daemon socket injects secrets into HTTP requests per policy rules — the AI model never sees the raw secret value
- `1claw daemon status/stop` — lifecycle management

**MCP local mode:**
- `1claw setup --local` — configures AI clients to use the daemon instead of the cloud API
- MCP server (`ONECLAW_LOCAL_VAULT=true`) connects to daemon over Unix socket
- `proxy_request` MCP tool: AI model specifies secret name + URL, daemon injects credential per policy
- `list_secrets` tool shows secret names (never values) from the local vault

### CLI DX & Homebrew (v0.34.1 — 2026-06-22)

**New CLI commands:**
- `1claw setup` — auto-detect and configure AI clients (Claude Desktop, Cursor, VS Code, Zed, Windsurf, Claude Code) to use the 1Claw MCP server for runtime secret access
- `1claw import <file>` — parse `.env` files and import secrets into a vault (supports `--prefix`, `--dry-run`, `--force`)
- `env cache` / `env cache-clear` / `env cache-status` — encrypted local secret cache for offline `env run` (AES-256-GCM, `~/.config/1claw/env-cache.enc`)
- `env run --no-cache` — bypass local cache and always fetch from API

**Homebrew tap:**
- `brew install 1clawAI/tap/oneclaw` — install CLI via Homebrew
- `brew install 1clawAI/tap/1claw-mcp` — install MCP server via Homebrew
- Automated formula updates on npm publish via `repository_dispatch`

**Version alignment:**
- CLI bumped to 0.34.7 (latest)
- SDK at 0.34.1
- MCP at 0.34.1
- OpenAPI spec info.version bumped to 2.19.0

---

### Security Hardening (v0.34.1 — 2026-06-21)

#### Fixed
- **H-1/H-2 (HIGH):** `create_share` now enforces vault-binding, scope access, and policy-engine read permission checks before sharing. Cross-org share recipients are validated to prevent cross-tenant secret egress.
- **H-3 (HIGH):** Treasury wallet swap path now enforces full spend policy (per-tx cap, daily limits, denylist, 10,000-ETH sanity cap) and records swaps to the daily send ledger.
- **H1-R (HIGH):** CAE (Continuous Access Evaluation) now properly revokes agent tokens on critical risk verdicts via `revoke_all_for_agent`, ensuring stolen agent JWTs are actually rejected by auth middleware.
- **L-4:** Single `delete_agent` endpoint now enforces `platform_locked` guard (parity with batch-delete).
- **L-5:** Batch-delete hardening — sanitized error messages (no raw DB errors), collapsed not-found/access-denied responses to prevent cross-tenant existence oracle.
- **L-1/L-2:** Nightly cleanup job now sweeps expired `revoked_tokens`, `agent_active_tokens`, and `dpop_nonces` tables to prevent unbounded growth.

---

### Risk Engine + DPoP Token Binding (v0.34.0 — 2026-06-11)

#### Added
- **Risk Engine Phase 1**: Geo-velocity (impossible travel detection), first-seen ASN/country drift, honeytoken canary secrets
- **Risk Engine Phase 2**: DPoP token binding (RFC 9449), Continuous Access Evaluation (auto-revoke on critical)
- Dashboard: `/security` page with risk events feed and severity filtering
- Dashboard: `/security/honeytokens` page for canary secret management
- Dashboard: DPoP enforcement toggle in Security settings (off/warn/required)
- SDK: `client.risk` resource for risk events, verdicts, and honeytokens
- SDK/MCP/CLI: `DPoPManager` for proof-of-possession token binding
- API: `GET/POST/DELETE /v1/risk/honeytokens`, `GET /v1/risk/events`, `GET /v1/risk/verdicts`
- MaxMind GeoLite2 IP enrichment (City + ASN) for risk scoring
- Auth verdict gate: blocks login/token-exchange on high/critical risk score
- Honeytoken detection: silent critical verdict on canary secret read

#### Security
- Stolen JWTs are now non-replayable when DPoP is enabled (bound to client keypair)
- Critical risk verdicts immediately revoke all active sessions for the principal
- Impossible travel detection catches session replay from different geography
- ASN/country baseline drift flags credential stuffing from unfamiliar sources

#### Migrations
- `118_risk_engine_phase1.sql` — risk_events, risk_verdicts, principal_baselines, honeytokens
- `119_dpop_and_cae.sql` — jwt_bound_keys, dpop_nonces

---

### Embedded Wallets: Email OTP, OAuth2, Spend Policies (v0.33.0)

- **New:** Email OTP login — Passwordless authentication for embedded wallet end-users via 6-digit email codes. `POST /v1/auth/email-otp/send` (rate-limited, 5-min expiry) and `POST /v1/auth/email-otp/verify` (returns JWT + auto-provisions treasury wallets on first login). Migration 113.
- **New:** Sign in with 1Claw — Full OAuth2 authorization code flow with PKCE; 1Claw acts as an OIDC provider for third-party apps. Endpoints: `POST /v1/oauth/authorize` (code grant), `POST /v1/oauth/token` (code exchange), `GET /v1/oauth/userinfo`. Dashboard consent page at `/oauth/authorize`. OIDC discovery updated to advertise `authorization_endpoint`, `userinfo_endpoint`, and PKCE (`S256`). Platform apps configure `redirect_uris` for OAuth client registration. Migration 114.
- **New:** Wallet spend policies — Per-app default and per-user override policies for treasury wallet sends and swaps. Controls: recipient `to_allowlist`, `max_value_eth` per-tx cap, `daily_limit_eth`, `allowed_chains`. Endpoints: `POST/GET/PATCH/DELETE /v1/spend-policies`. Enforced server-side before signing treasury wallet transactions. Migration 115.
- **New:** Embedded Wallets marketing page — Landing page at `/embedded-wallets` showcasing the platform for developers (feature grid, code snippets, integration steps).
- **New:** OAuth consent page — User consent UI at `/oauth/authorize` for third-party app authorization with scope display and approve/deny.
- **SDK:** Added `sendEmailOtp()`, `verifyEmailOtp()`, `exchangeOAuthCode()`, spend policy CRUD methods (`createSpendPolicy`, `listSpendPolicies`, `updateSpendPolicy`, `deleteSpendPolicy`).
- **wallet-react:** Added `sendEmailOtp()` and `verifyEmailOtp()` methods for passwordless login in the React widget.
- **OpenAPI spec:** Documented all new endpoints (email OTP, OAuth2 authorization/token/userinfo, spend policies).
- **Docs:** 2-minute embedded wallets quickstart guide at `docs/guides/embedded-wallets-quickstart`.
- **Changed:** OIDC discovery (`/.well-known/openid-configuration`) now advertises `authorization_endpoint`, `userinfo_endpoint`, and PKCE support (`code_challenge_methods_supported: ["S256"]`).

---

### Bankr Dynamic Key Vending (Secret Engine)

- **New:** First-class "dynamic secrets" engine for Bankr. Store a long-lived partner key (`bk_ptr_`) in the secure zone; programmatically issue/revoke short-lived `bk_usr_` wallet API keys for agents — scoped, TTL-bound, and automatically cleaned up.
- **Endpoints:** `POST /v1/agents/{id}/bankr-keys/lease`, `GET /v1/agents/{id}/bankr-keys`, `DELETE /v1/agents/{id}/bankr-keys/{lease_id}`.
- **Lifecycle:** Leases auto-revoke on agent deletion/deactivation. Nightly sweep cleans expired leases via Bankr DELETE.
- **Shroud integration:** When `X-Shroud-Provider: bankr`, Shroud auto-resolves the latest leased key for the agent. Falls back to static `providers/bankr/api-key`.
- **SDK:** `client.agents.leaseBankrKey()`, `.listBankrKeys()`, `.revokeBankrKey()`.
- **MCP:** `lease_bankr_key` tool.
- **CLI:** `1claw agent bankr-key lease|list|revoke`.
- **Dashboard:** Bankr Keys card on agent detail page (lease, list, revoke inline).
- **Config:** `BANKR_PARTNER_KEY`, `BANKR_DEFAULT_WALLET_ID`, `BANKR_DEFAULT_LEASE_TTL_SECS`.
- **Security (v0.32.2):** Leasing is deny-by-default — agents require explicit policy on `agents/{id}/bankr/*`. Agent lease responses and MCP `lease_bankr_key` output omit `bk_usr_` keys (Shroud resolves server-side). Agent default TTL 15 min; recommend 5–15 min with revoke-after-task.

---

### Shroud: Bankr LLM Gateway upstream

- **New:** Shroud provider `bankr` — route agent LLM traffic through [Bankr LLM Gateway](https://docs.bankr.bot/llm-gateway/overview/) (`https://llm.bankr.bot`) with `X-Shroud-Provider: bankr`. Store `bk_` keys at `providers/bankr/api-key`. Empty model allowlist (Bankr catalog is authoritative).
- **Docs:** [Shroud supported models](/docs/reference/shroud-supported-models#bankr-models), [Shroud guide](/docs/guides/shroud#supported-providers), [Ecosystem](/docs/guides/ecosystem).

---

### Security audit fixes — social login, treasury, webhooks, internal ledger (v0.24.1, SDK/OpenAPI 0.31.0)

- **Fixed (CRITICAL):** Social login Google/Apple tokens now validate OAuth **audience** and issuer (shared `oauth_tokens` module). Discord uses server-side **authorization code exchange** with `oauth_redirect_uri` (no raw access tokens in production).
- **Fixed (CRITICAL):** Removed email-based auto-linking on social login — existing email returns **409**; users must sign in with their existing method first.
- **Fixed (HIGH):** Internal transfers require **account ownership** (`from_account.user_id == caller.id`).
- **Fixed (HIGH):** Internal transfers support **`Idempotency-Key`** replay protection (migration 110).
- **Fixed (HIGH):** Fiat webhooks in production require verified **MoonPay** signature (unsigned JSON rejected).
- **Fixed (HIGH):** Agents cannot supply client `users/...` signing paths; treasury `mode=treasury` only.
- **Fixed (HIGH):** Webhook `PATCH` URL updates run **SSRF validation** (`validate_audience_url`).
- **Fixed (HIGH):** Passkey `tx-assert/complete` validates **origin**; sign-count clone detection; optional **tx_digest** binding via `X-Passkey-Tx-Digest`.
- **Fixed (MEDIUM):** Treasury send sanity cap (10k ETH); proposal `signer_address` must match registered signer; `auto_credit_account_id` ownership check; internal transfer **asset allowlist**; ledger `total` is real count.
- **Changed:** Vault **0.24.1**. `@1claw/sdk`, `@1claw/cli`, `@1claw/mcp`, `@1claw/openapi-spec` **0.31.0** (OpenAPI **2.17.0**).

---

### CDP parity Phases 2–4: deposits, fiat ramps, social login, internal ledger, embedded wallet (v0.24.0)

- **New:** Deposit destinations — `POST/GET/PATCH /v1/deposit-destinations` for unique inbound payment addresses per chain. `deposit_destinations` and `deposit_events` tables (migration 106). Webhook event `deposit_destination.created`.
- **New:** Fiat on/off ramps — `POST /v1/fiat/onramp/session` (Coinbase Onramp or MoonPay widget URL), `POST /v1/fiat/offramp/initiate`, `POST /v1/fiat/webhooks` (partner completion). Config: `COINBASE_ONRAMP_APP_ID`, `MOONPAY_API_KEY`, `MOONPAY_SECRET_KEY`.
- **New:** Social login — `POST /v1/auth/social-login` (public) accepts Google/Apple/Discord `id_token`, verifies JWKS, upserts user, auto-provisions Ethereum treasury wallet on signup. Migration 108 (`users.social_provider`, `users.social_subject`).
- **New:** Passkey transaction authorization — `POST /v1/auth/passkeys/tx-assert/begin` and `.../complete` return a short-lived `passkey_token` usable as `X-Passkey-Token` on treasury send (alternative to `X-Auth-Confirm` password).
- **New:** Internal accounts & ledger — `POST/GET /v1/internal-accounts`, `POST /v1/internal-transfers`, `GET /v1/internal-accounts/{id}/ledger`. Double-entry bookkeeping with `SELECT FOR UPDATE` balance checks (migration 107). Webhook `internal_transfer.completed`.
- **New:** `@1claw/wallet-react` v0.2.0 — `<OneclawEmbeddedWallet />` with social login UI, Send/Swap/Receive/Buy views, passkey and fiat client methods.
- **New:** SDK resources — `client.depositDestinations`, `client.internalAccounts`, `client.fiat`.
- **New:** Dashboard hooks — `use-deposit-destinations`, `use-internal-accounts`, `use-fiat`.
- **Changed:** Vault version bumped to 0.24.0. SDK/CLI/OpenAPI spec bumped to 0.30.0.

---

### CDP parity Phase 1: live webhooks, gasless treasury sends, wallet-react swap (v0.23.0)

- **New:** Webhook delivery wired end-to-end — `dispatch_event()` calls in treasury_wallets, policies, signing_keys, transactions, and treasury_proposals handlers. Background worker `process_pending_deliveries` runs every 5s. Events: `wallet.transfer.sent`, `wallet.transfer.received`, `proposal.created/signed/executed/cancelled`, `agent.transaction.broadcast/signed`, `signing_key.rotated`, `policy.created/updated/deleted`.
- **New:** Gasless treasury wallet sends — `POST /v1/treasury/wallets/{chain}/send` accepts `gasless: true` to wrap the send as an ERC-4337 UserOperation with Pimlico paymaster sponsorship. Response includes `user_op_hash`. Requires `PIMLICO_API_KEY`.
- **New:** `@1claw/wallet-react` v0.1.0 — added `swap()` client method, `SwapParams`/`SwapResult` types, swap exposed in context. `<OneclawTreasuryWidget />` rebuilt with three views: Send, Swap, and Receive.
- **New:** Dashboard treasury `WalletChainCard` — inline balance with 30s auto-refresh, Send dialog (with gasless option), Swap dialog per chain. New hooks: `useTreasuryWalletBalance`, `useSendFromWallet`, `useSwapFromWallet`.
- **Changed:** Vault version bumped to 0.23.0.

---

## 2026-05

### Security audit fixes (v0.22.1, 2026-05-30)

- **Fixed (CRITICAL):** Treasury signing authorization bypass — agents signing via Intents API in `mode: "treasury"` now require an active `treasury_delegations` entry with `mode` set to `delegated` or `both`. Previously, any agent with Intents API enabled could sign using treasury wallet keys without delegation verification.
- **Fixed (H1):** Delegation guardrails enforcement — per-delegation `guardrails` JSONB fields (`to_allowlist`, `max_value_eth`, `allowed_chains`) are now enforced during treasury-mode signing in the Intents API. Previously, delegation guardrails were stored but not checked, allowing agents to bypass spend caps and address restrictions on delegated treasury transactions.
- **Fixed (H2):** Webhook SSRF protection — webhook delivery dispatcher now validates destination URLs via `validate_audience_url()` (blocks private CIDRs, cloud metadata, `.internal` hosts, localhost) and disables HTTP redirect following to prevent SSRF via registered webhook endpoints.
- **Fixed (H3):** Account lockout on treasury send/swap — failed password re-authentication on `POST /v1/treasury/wallets/{chain}/send` and `POST /v1/treasury/wallets/{chain}/swap` now increments `failed_login_attempts` and triggers account lockout at 10 failures (matches existing behavior on export). Previously, send/swap brute-force did not trigger lockout.
- **Fixed (M1):** Treasury proposal `sign_proposal` authorization — `POST /v1/treasury/{id}/proposals/{pid}/sign` now verifies the caller is either a treasury signer or the proposal creator. Previously, any org member could submit signatures.
- **Fixed (M2):** Delegation mode filter for Intents API — only delegations with `mode` set to `delegated` or `both` are accepted for direct signing via `POST /v1/agents/{id}/transactions` with `treasury_id`. Owner-mode-only delegations are rejected (they must propose via the multisig pipeline).
- **Changed:** `@1claw/wallet-react` converted to a public git submodule (`github.com/1clawAI/wallet-react`, MIT license).
- **Changed:** Vault version bumped to 0.22.1.

### Treasury wallet operations, webhooks, and gasless transactions (v0.22.0)

- **New:** `GET /v1/treasury/wallets/{chain}/balance` — query native token and ERC-20 token balances for a treasury wallet via RPC. Accepts optional `?tokens=0x...` query param for ERC-20 addresses.
- **New:** `POST /v1/treasury/wallets/{chain}/send` — send native token or ERC-20 transfers from a treasury wallet. Human-only, requires password re-authentication via `X-Auth-Confirm` header. Audit-logged as `treasury_wallet.send`.
- **New:** `POST /v1/treasury/wallets/{chain}/swap` — DEX token swaps via 0x aggregator. Human-only with `X-Auth-Confirm` re-auth. Returns transaction hash and swap details. Requires `ZERO_X_API_KEY` env var.
- **New:** Webhook system — register HTTP endpoints to receive real-time event notifications. Full CRUD: `POST /v1/webhooks` (create, returns signing secret), `GET /v1/webhooks` (list), `GET /v1/webhooks/{id}` (get), `PATCH /v1/webhooks/{id}` (update), `DELETE /v1/webhooks/{id}` (delete). 12 event types: `secret.created`, `secret.updated`, `secret.deleted`, `secret.accessed`, `agent.created`, `agent.deleted`, `policy.created`, `policy.updated`, `policy.deleted`, `transaction.submitted`, `transaction.signed`, `share.created`. Deliveries use HMAC-SHA256 signatures (`X-1Claw-Signature` header) with 5 retries and exponential backoff. Database migration 105.
- **New:** `GET /v1/agents/{id}/signing-keys/{chain}/balance` — agents can query the native token balance of their signing key address.
- **New:** `gasless: true` flag on `POST /v1/agents/{id}/transactions` — enables gas sponsorship via Pimlico paymaster for ERC-4337 smart account transactions. When set, the handler requests sponsorship before signing the UserOperation.
- **New:** `@1claw/wallet-react` — embeddable React component package for Platform API apps. Components: `<OneclawWalletProvider>`, `<OneclawTreasuryWidget>`. Hooks: `useOneclawWallet()`. Supports wallet listing, balance display, and send operations.
- **New:** `crypto/dex.rs` module — 0x DEX aggregator client for swap quotes.
- **New:** `domain/webhook_dispatcher.rs` — background webhook delivery with retry logic.
- **Changed:** Vault version bumped to 0.22.0. SDK/CLI/MCP/OpenAPI all bumped to 0.28.0.

### API key expiration and platform key rotation (v0.21.2)

- **New:** All three API key types (`1ck_` human, `ocv_` agent, `plt_` platform) now support optional expiration via `api_key_expires_at`. Expired keys are rejected at authentication time with 401.
- **New:** `POST /v1/platform/apps/{id}/rotate-key` — rotate a platform app's API key with an optional new expiration date. Returns the new `plt_` key (one-time).
- **New:** Agent create/update accepts `api_key_expires_at` (ISO 8601 datetime). Enforced during `POST /v1/auth/agent-token` exchange.
- **New:** Platform app create/update accepts `api_key_expires_at`. Enforced in auth middleware for `plt_` Bearer tokens.
- **New:** Dashboard UI — `KeyExpiryPicker` component on agent create, platform app create, and API keys settings. Agent cards show expiry badges. Platform detail shows key expiration.
- **New:** CLI flags — `--api-key-expires-at` on `agent create`, `agent update`, `platform create`, `platform update`. New `platform rotate-key <appId>` command.
- **New:** MCP tool — `platform_rotate_key` with optional `api_key_expires_at`.
- **New:** Database migration 098 (`agents.api_key_expires_at`, `platform_apps.api_key_expires_at`, `platform_apps.api_key_rotated_at`).
- **New:** `POST /v1/platform/connections/{id}/reissue-claim` — reissue an expired claim URL for an existing connection without re-provisioning resources.
- **Changed:** OpenAPI spec v2.15.0. SDK/CLI/MCP all bumped to 0.27.0.

### WebAuthn passkeys, email change, and agent approvals (v0.21.1)

- **New:** WebAuthn/FIDO2 passkey authentication — passwordless login and passkey management. Server-side P-256 ECDSA verification (`p256` crate) with CBOR attestation parsing (`ciborium` crate).
- **New:** Passkey endpoints (public): `POST /v1/auth/passkeys/assert/begin` (start login), `POST /v1/auth/passkeys/assert/complete` (complete login → JWT).
- **New:** Passkey endpoints (authenticated): `POST /v1/auth/passkeys/register/begin`, `POST /v1/auth/passkeys/register/complete`, `GET /v1/auth/passkeys` (list), `DELETE /v1/auth/passkeys/{id}` (delete).
- **New:** Dashboard login page "Sign in with passkey" button. Settings → Security page has passkey management (register, list, delete).
- **New:** `POST /v1/auth/set-password` — allows platform-provisioned users (OIDC/Google, no existing password) to set their first password. Enables email/password login alongside existing auth methods.
- **New:** Email change flow — `POST /v1/auth/change-email` (sends 6-digit verification code to new email), `POST /v1/auth/verify-email-change` (completes change). One pending request per user, 15-minute expiry. Dashboard: Account settings email change dialog.
- **New:** `POST /v1/approvals/request` — agent-initiated approval requests for policy changes. Directed to the agent's creator (human). Dashboard approval inbox at `/approvals` and detail at `/approvals/[id]`.
- **New:** Auto-execution of approved policy changes — when `POST /v1/approvals/{id}/decide` approves a `policy_change` action, the policy described in the approval `summary` is automatically created/updated.
- **New:** Database migration 097 (`email_change_requests` table).
- **New:** Dashboard hooks: `use-approvals.ts` (useApprovals, useApproval, useDecideApproval), `use-passkeys.ts` (usePasskeys, usePasskeySignIn, useRegisterPasskey, useDeletePasskey).
- **New:** `lib/passkeys.ts` — WebAuthn browser helpers (base64url encode/decode, credential creation/request options builders, attestation/assertion serialization).

### Mobile companion app & approval queue (v0.21.0)

- **New:** Mobile companion app for iOS and Android (Expo/React Native, beta). Passkey authentication, biometric unlock, and push notifications.
- **New:** Device registration API — `POST/GET/DELETE /v1/auth/devices` for mobile device lifecycle, step-up challenge (`POST .../challenge`), WebAuthn attestation (`POST .../attest`), and push token registration (`POST .../push-token`).
- **New:** Approval queue — `GET /v1/approvals` (list with status filter), `GET /v1/approvals/:id` (details), `POST /v1/approvals/:id/decide` (approve/reject). Risk-tiered step-up authentication: routine actions require biometrics, critical/irreversible actions require passkey attestation.
- **New:** CLI commands — `1claw device list`, `1claw device revoke`, `1claw approval list`, `1claw approval get`, `1claw approval decide`.
- **New:** MCP tools — `list_approvals`, `get_approval` for agent visibility into pending approvals.
- **New:** SDK resources — `client.devices` (list, revoke), `client.approvals` (list, get, decide), `client.passkeys`.
- **New:** OpenAPI spec v2.14.0 — 6 device endpoints, 3 approval endpoints, 11 new schemas, Approvals tag.
- **New:** Database migrations (092–096): `user_devices`, `device_challenges`, `step_up_tokens`, `user_passkeys`, `approvals` tables.
- **Changed:** Vault version bumped from 0.20.2 to 0.21.0. CLI 0.23.0. MCP 0.24.0. SDK types regenerated.

### Security hardening round 3 (v0.20.2, 2026-05-14)

- **Fixed (H-NEW-OIDC-SSRF):** SSRF via Platform App `oidc_jwks_url` — `validate_audience_url()` wired into platform app create/update and inside `resolve_oidc_subject()` defense-in-depth. Prevents attacker-controlled JWKS URLs from reaching internal services.
- **Fixed (H-NEW-DEK-REWRAP-RACE):** Nightly DEK re-wrap race condition — added optimistic concurrency guard `WHERE wrapped_dek = $old` to UPDATE; skips on `rows_affected == 0` to prevent races between concurrent re-wrap and secret-write operations.
- **Fixed (M-NEW-IPV6-MAPPED):** IPv4-mapped IPv6 bypass — `is_private_or_reserved()` now checks `to_ipv4_mapped()`, ULA `fc00::/7`, and link-local `fe80::/10` to prevent IPv6 representation bypasses of private CIDR blocklists in audience/URL validation.
- **Fixed (M-NEW-BUNDLER-OPEN):** Bundler proxy unauthenticated — `/api/bundler` route now requires session cookie + per-IP rate limiting (20/min).
- **Fixed (M-NEW-DEMO-UNAUTH):** Demo vault/intents routes unauthenticated — `/api/demo/vault` and `/api/demo/intents` now require session cookie + per-IP rate limiting (10/min).
- **Fixed (M-NEW-EXPORT-NO-LOCKOUT):** Treasury wallet export no lockout — failed re-auth password now increments `failed_login_attempts`, triggers account lockout at 10 failures; successful re-auth resets the counter.
- **Fixed (M-NEW-SIGNKEY-AGENT-UUID):** Signing key path UUID binding — `validate_signing_key_path` now takes `caller_agent_id` and enforces UUID match on `agents/{uuid}/` paths, preventing cross-agent key path traversal.
- **Fixed (M-NEW-PLT-AUD-DISABLED):** Platform audience not enforced — `oidc_audience` column added to `platform_apps` (migration 089). When set, enforced during JWT validation in `resolve_oidc_subject()`.
- **Fixed (L-NEW-FORWARDED-FOR):** All demo/bundler routes now use `x-vercel-forwarded-for` instead of `x-forwarded-for` for reliable IP extraction on Vercel.
- **Fixed (L-NEW-DEMO-AUTH-WEAK):** Accepted risk — any non-empty session cookie passes auth check on demo routes, but combined with rate limiting this is acceptable for demo functionality.
- **Changed:** Vault version bumped from 0.20.1 to 0.20.2.

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
