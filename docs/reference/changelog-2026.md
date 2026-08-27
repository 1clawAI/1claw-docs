---
title: Changelog 2026
description: 1claw product and API changelog for 2026 releases.
sidebar_label: "2026"
---

## 2026 {#2026}

### 2026-08 (latest)

### v0.59.4 (2026-08-27) {#v0594-2026-08-27}

**Platform connection expansion**
- **`GET /v1/platform/connections/{id}/portfolio`** (alias `GET .../balances`) — unified balances for connection agents (`?chains=`, `?include_tokens=`).
- **`POST /v1/platform/connections/{id}/pending-approvals`** — create consensus/HITL pending approval for connection agent (**202**).
- **Connection automations** — `GET/POST .../automations`, `POST .../automations/{aid}/runs/{rid}/cancel` (plt_-scoped; not org `/v1/automations`).
- **Connection memory** — `GET/PUT/DELETE .../memory/{namespace}/{key}` (optional `?agent_id=`).
- **`POST /v1/shroud/inspect-content`** — REST parity with MCP `inspect_content` (fail-closed threat scan).
- **Docs sync** — webhook events (`pending_approval.created`, `tx.awaiting_approval`, `sign.awaiting_approval`, `automation.run.failed`), idempotency matrix, `siwe_domain`, `provisioned_tier` / `platform_pays`.

**Packages**
- OpenAPI spec, SDK, CLI, MCP, Python SDK → **0.59.4**

---

### v0.59.3 (2026-08-27) {#v0593-2026-08-27}

**Platform connection operations (Fathom parity)**
- **`GET /v1/platform/connections/{id}/signing-keys`** — list agent signing keys (public metadata: chain, address, public_key, curve). Optional `?agent_id=`. Use instead of org-scoped `GET /v1/agents/{id}/signing-keys` with plt_ keys.
- **`GET .../signing-keys/{chain}`** — single-chain lookup with same metadata.
- **`PATCH /v1/platform/connections/{id}/agents/{agent_id}`** — enable `intents_api_enabled`, `execution_intents_enabled`, or update `system_prompt` on existing bootstrapped agents without re-bootstrap.
- **Docs:** Platform API overview clarifies **`wallet_address`** (SIWE staker identity) vs **agent signing key address** (`signing-keys` endpoints / bootstrap `summary.signing_keys`).
- **Template aliases:** `intents: true`, `intents: { enabled: true }`, `intents_api_enabled: true` (and execution equivalents) documented in overview.

**Packages**
- OpenAPI spec, SDK (`listConnectionSigningKeys`, `getConnectionSigningKey`, `patchConnectionAgent`), CLI, MCP → **0.59.3**
- Python SDK (`oneclaw`) → **0.59.3**

---

### v0.59.2 (2026-08-27) {#v0592-2026-08-27}

**Onboarding golden path (MCP stdio)**
- **`GET /v1/org/onboarding/status`** — human-only progress: welcome bundle, agent, policy, sample secret, first read.
- **`POST /v1/onboarding/provision`** — idempotent welcome vault (`default`), `examples/hello`, MCP agent, `**` read/write policy, one-time `ocv_` key, and `mcp_stdio_config` (stdio `npx @1claw/mcp`).
- **Signup hooks** — async welcome bundle after email verify, Google signup, social login, email OTP.
- **Agent create** — `skip_default_policy` on `POST /v1/agents`; default onboarding applied on human create and enrollment approve unless skipped.
- **Dashboard** — `/onboarding/connect` wizard, connect CTA on dashboard/sidebar/marketing; post-login redirect to connect flow.
- **CLI** — `1claw setup` calls `/v1/onboarding/provision` instead of manual vault/policy steps.
- **MCP** — vault auto-discovery prefers vault named `default`; `GET /.well-known/oauth-protected-resource` on httpStream (metadata).
- **Tests** — `scripts/test-onboarding-prod.sh`; wired into `run-production-tests.sh` and OpenAPI contract checks.

**Packages**
- OpenAPI spec, SDK (`client.org.getOnboardingStatus()`, `.provisionOnboarding()`), CLI, MCP → **0.59.2**
- MCP registry: `io.github.1clawAI/1claw-mcp` @ **0.59.2**

---

### v0.59.0 (2026-08-27) {#v0590-2026-08-27}

**Fathom platform integration (migration 221)**
- **`agents.system_prompt`** — default chat system prompt on create/update and template `agents[].system_prompt` at bootstrap.
- **Connection chat** — `POST /v1/platform/connections/{id}/agents/{aid}/chat` accepts `system`, `system_prompt`, and `messages[]` with `role: system`; billing failures return **402** (not 500).
- **Connection passkey enroll** — `POST .../passkeys/enroll/begin|complete` for plt_-scoped WebAuthn registration of connected end-users (replaces user-only `/v1/auth/passkeys/register/*`).
- **Connection runtime GET** — `GET /v1/platform/connections/{id}/runtimes/{runtimeId}` (plt_ scoped; use instead of `GET /v1/runtimes/{id}`).
- **`platform_pays` tier inheritance (migration 220)** — Template `plan` at bootstrap grants tier to end-user org; `GET /v1/platform/connections/{id}` returns `provisioned_tier`.
- **Bootstrap runtime fix** — `provision_runtime` uses valid Cloud Run provider and respects tier limits.
- **OpenAPI** — `GET /v1/platform/apps/{id}/users` response wraps `{ users: [] }`; passkey enroll schemas added.

**Packages**
- OpenAPI spec, SDK, CLI, MCP, Python SDK, Go SDK → **0.59.0**
- New SDK/MCP/CLI methods: `getConnectionRuntime`, `connectionPasskeyEnrollBegin|Complete`, `system_prompt` types
- MCP tools: `platform_get_connection_runtime`, `platform_connection_passkey_enroll_begin`
- Prod tests: `scripts/test-platform-expansion-prod.sh` (passkey begin, runtime GET, system_prompt chat)

---

### v0.58.2 (2026-08-26) {#v0582-2026-08-26}

**Platform connection control plane (runtime + chat)**
- **Bootstrap runtimes:** Top-level `runtimes[]`, nested `agents[].runtime`, and `provision_runtime: true` (+ `runtime_preset` / `runtime_template`) now create Cloud Runtimes during bootstrap. Connection detail includes `runtime_ids` and `automation_ids`.
- **`GET /v1/platform/apps/{id}/templates/{tid}`** — plt_ or user JWT; inspect template spec after bootstrap.
- **`POST /v1/platform/connections/{id}/runtimes`** — create runtime in end-user org (fixes plt_ → `POST /v1/runtimes` 404).
- **`POST /v1/platform/connections/{id}/agents/{aid}/chat`** — connection-scoped agent chat (fixes plt_ → `POST /v1/agents/{id}/chat` 403).
- **Spend-policy PUT replace** — second write no longer 500 (unique per-user app policy).
- **Connection-scoped control:** pending-approval get/decide, mobile approval decide, signing-key deactivate (v0.58.0 continued).

**Tests:** `scripts/test-platform-expansion-prod.sh` covers template GET, spend-policy replace, control-plane routes, bootstrap `provision_runtime`, connection runtime create, connection chat.

---

### v0.58.1 (2026-08-25) {#v0581-2026-08-25}

**Agent-created automations (chat/runtime)**
- **`POST /v1/agents/{agent_id}/automations`** — agent-token only. Simple manual/webhook workflows with guardrailed steps (`log`, `notify`, `memory_get`, `memory_put`, `wait`; max 10 steps, 25 per agent). Optional `auto_trigger` for manual runs. Humans remain on `POST /v1/automations` (agents get **403**).
- **`created_by_type`** on automations (`human` | `agent`, migration 218). Dashboard shows an **Agent-created** badge.
- **Runtime tools:** `create_automation`, `create_test_automation`, agent-access tools (`request_access`, `request_approval`, `request_binding`, `request_signing_key`, `request_guardrail_change`), `forget`, capabilities prompt injection across Hermes/OpenClaw/OpenClaude/OpenCode templates.
- **Vault:** `request_timeout` middleware, runtime chat cold-start improvements.

**Packages**
- OpenAPI spec, SDK (`agents.createAutomation()`), MCP (`create_agent_automation`), Python SDK (`agents.create_automation()`), Go SDK (`Agents.CreateAutomation()`), CLI (`1claw agent automation create`) → **0.58.1**
- MCP registry: `io.github.1clawAI/1claw-mcp` @ **0.58.0** (tool shipped in prior release)
- Prod tests: `scripts/test-automations-prod.sh` §24 (agent-scoped create + human-route 403)

---

### v0.58.0 (2026-08-24) {#v0580-2026-08-24}

**Platform API control plane (Fathom bundled release)**
- **SIWE recovery ids:** Accept EIP-191 signatures with recovery byte **27 or 28** (MetaMask/viem) in addition to 0/1.
- **App-scoped reads (`plt_`):** `GET /v1/platform/connections/{id}/approvals`, `.../approvals/{approval_id}`, `.../pending-approvals` (includes `payload_hash`), `.../spend-policy`.
- **Spend policy:** `GET /v1/platform/apps/{id}/spend-policies/{policy_id}`; `PUT .../connections/{id}/spend-policy` supports optional **`Idempotency-Key`** (24h body-hash replay).
- **App lifecycle:** `PATCH` slug changes → **400**; `DELETE` soft-deactivates and returns `{ id, slug, deleted_at }`; `GET` inactive app → **404**; slugs unique **per org** (migration 216).
- **Ownership transfer:** `POST /v1/platform/apps/{id}/transfer-ownership` with step-up auth.

**Packages**
- Vault API **0.58.0** (migrations 216–217)
- OpenAPI spec, SDK, CLI, MCP, Python SDK, Go SDK → **0.58.0** with Platform control-plane parity
- MCP registry: `io.github.1clawAI/1claw-mcp` @ **0.58.0**
- New MCP tools: `platform_list_connection_approvals`, `platform_get_connection_approval`, `platform_list_connection_pending_approvals`, `platform_get_connection_spend_policy`, `platform_get_spend_policy`, `platform_transfer_ownership`, `platform_delete_app`
- Prod tests extended: `scripts/test-platform-api.sh`, `scripts/test-platform-expansion-prod.sh`

---

### v0.57.0 (2026-08-24) {#v0570-2026-08-24}

**Platform API expansion (migration 215)**
- **SIWE wallet provisioning:** `POST /v1/platform/siwe/challenge` + upsert with `subject_token_type: urn:1claw:params:oauth:token-type:siwe`, `siwe_message`, `siwe_signature`. Atomic DB nonces; `siwe_domain` on platform apps.
- **Parameterized bootstrap:** `parameters` on bootstrap requests; `POST .../templates/{id}/preview` for dry-run; params-aware bootstrap idempotency via `Idempotency-Key` + body hash.
- **Connection polling:** `GET /v1/platform/connections/{id}` returns claim status, `entitlement_status`, `wallet_address`, resource IDs.
- **Per-connection usage:** `GET .../connections/{id}/usage` — monthly `inference_spent_usd`.
- **On-chain entitlements:** Template `entitlements[]`; `GET/POST .../entitlements` + refresh; background monitor; webhooks `platform.entitlement.granted/revoked`.
- **Inference budgets:** Spend policy fields (`inference_allowance_usd`, `max_request_cost_usd`, etc.); JWT `inference_budget` claim; Shroud per-request cap; `GET /v1/treasury/wallets/inference-budget`.
- **Claim expiry webhook:** Background worker fires `platform.claim.expired` when 10-min claim tokens lapse unclaimed.

**Packages**
- Vault API, OpenAPI spec, SDK, CLI, MCP bumped to **0.57.0**
- Python SDK tag **0.57.0** (CI publish)
- MCP registry: `io.github.1clawAI/1claw-mcp` @ **0.57.0**
- New prod tests: `scripts/test-platform-expansion-prod.sh`

---

### v0.56.3 (2026-08-24) {#v0563-2026-08-24}

**Cumulative gas budget & outbound idempotency**
- **`gas_daily_budget_native`:** Per-chain guardrail field in `per_chain_guardrails` — UTC-day cumulative EVM gas (sum of `gas_limit × max_fee`) enforced alongside per-tx `max_fee_per_gas_gwei` / `max_gas_limit`. Tracked in `agent_gas_ledger` (migration 213).
- **`inject_idempotency_key`:** Binding guardrail — when `true`, Vault injects a deterministic `Idempotency-Key` on outbound HTTP/GraphQL execute requests (SHA-256 hex of binding id, HTTP method, path, and JSON body). Wired in `domain/execution/http.rs` and `graphql.rs`.
- **Expo push on approvals:** When `ONECLAW_EXPO_ACCESS_TOKEN` is set, pending approval/HITL events send best-effort Expo push notifications to registered mobile device tokens (`domain/push_notify.rs`, wired from `approval_notify.rs`).
- **Passkey for login 2FA (migration 214):** Per-user `require_passkey_for_mfa` via `GET/PATCH /v1/auth/settings`. When enabled, password/social/email-OTP login returns `mfa_method: "passkey"` and completes via `POST /v1/auth/mfa/passkey/begin` + `.../complete` instead of TOTP. Disabling requires step-up (`X-Auth-Confirm`, purpose `security.mfa_passkey.disable`). Dashboard toggle on Settings → Security MFA card.

**Packages**
- Vault API, OpenAPI spec, SDK bumped to **0.56.3**

---

### v0.56.2 (2026-08-24) {#v0562-2026-08-24}

**Guardrail widening approvals & treasury HFA passkey parity**
- **Guardrail widening queue:** Binding and agent guardrail edits that widen access now require `policy_change` approval with step-up re-auth (`X-Auth-Confirm`). PATCH handlers return **202** with `pending_approval_id` until approved.
- **Treasury HFA passkey parity:** Swap operations support passkey tx-assert digests (`treasury_swap_digest`); send/swap/export honor Human Factor Auth with passkey-only flows in dashboard and `@1claw/wallet-react`.
- **HFA audit events:** `human_factor_auth.satisfied` / `human_factor_auth.denied` emitted on treasury wallet operations.

**Phase 5 Safe foundation (counterfactual)**
- **Agent accounts API:** `GET/POST /v1/agents/{id}/accounts`, `POST .../accounts/migrate`, `POST .../accounts/{chain}/deprecate-eoa` — counterfactual Safe provisioning, EOA→Safe migration wizard, execTransaction signing path.
- **Module registry:** `GET /v1/safe/module-registry/{chain}` — pinned Safe v1.4.1 + Zodiac module addresses per chain.
- **Org allowance sync:** `POST /v1/org/safe/sync-allowances` — compiles allowance targets from agent guardrails; returns drift report (`onchain_sync: counterfactual`).
- **Guard.sol:** Foundry scaffold with tests; on-chain deploy/cosign/passkey/timelock/4337 stubs return **501** pending external audit.
- **Dashboard:** Safe migration wizard at `/agents/[agentId]/migrate-safe`.

**Tests & tooling**
- HFA unit tests (`human_factor_auth.rs`); guardrail shadow/revisions/replay checks in `scripts/test-guardrails-prod.sh`.
- CLI: `1claw agent accounts list|migrate|deprecate-eoa`, `1claw safe module-registry|sync-allowances`.
- Prod smoke: `scripts/test-safe-prod.sh`.

**Packages**
- Vault API, OpenAPI spec, SDK bumped to **0.56.2**
- MCP: `list_agent_accounts`, `migrate_agent_to_safe`, `deprecate_agent_eoa`, `get_safe_module_registry`, `sync_org_safe_allowances`

---

### v0.56.0 (2026-08-24) {#v0560-2026-08-24}

**Guardrail governance, HFA, Safe foundation (Phases 3–6)**
- **Convention 6 shadow/enforce** on execution guardrails — `enforcement: "log"|"enforce"` on bindings and agents; audit `guardrail_shadow.would_deny`.
- **Address screening** — per-agent `address_screening_policy` (`mode`: off | deny | approve); env deny list `ONECLAW_SCREENING_DENY_LIST`.
- **Solana simulate_first** on non-EVM submit/sign when configured.
- **Governance APIs:** `GET /v1/org/guardrail-shadow-report`, `GET /v1/org/guardrail-revisions`, `POST /v1/agents/{id}/guardrails/replay`.
- **Guardrail revisions** recorded on agent/binding guardrail PATCH.
- **Org unfreeze** T3 step-up; webhook `org.unfrozen`.
- **Execution honeytoken** on vault-ref credential loads.
- **Shroud tx escalation** — `POST /v1/admin/shroud/tx-escalations`; Shroud heuristics escalate to HITL.
- **HFA** on treasury send/swap/export; **Safe stubs** — agent accounts + module registry.

**Packages**
- Vault API, OpenAPI spec, SDK, CLI, MCP bumped to **0.56.0**
- CLI: `1claw guardrails shadow-report|revisions|replay`
- Dashboard: Settings → Security → Guardrails tab

---

### v0.55.0 (2026-08-24) {#v0550-2026-08-24}

**Guardrail phases 1.3–2.7 (extended HITL & enforcement)**
- **Sign HITL:** EIP-712 typed data and raw digest signing can route to **202** `awaiting_approval` when `typed_data_policy` or `raw_signing_policy` is `approve`. Webhook: `sign.awaiting_approval`. Approve via `/v1/approvals/{id}/decide` auto-executes stored sign intent.
- **Simulation HITL:** Tenderly revert can route to tx HITL when `simulation_failure_policy` is `approve` (instead of 422).
- **Extended tx guardrails:** `tx_block_unlimited_approvals`, per-recipient daily limits, new-recipient caps, USD caps (`tx_max_value_usd`, `tx_daily_limit_usd`), gas budget checks, in-flight daily budget reservations (`tx_budget_reservations`).
- **Signing policies:** `raw_signing_policy` (allow/deny/approve), `personal_sign_policy` JSON, `allow_erc4337`, `allow_eip7702`.
- **Execution guardrails (2.4–2.7):** binding time windows + source IP (`execution_conditions`), outbound secret pattern scan, per-binding concurrency cap.
- **Org freeze:** `POST /v1/org/freeze` and `POST /v1/org/unfreeze` (owner/admin emergency stop).

**Packages**
- Vault API, OpenAPI spec, SDK, CLI, MCP bumped to **0.55.0**

---

### v0.54.0 (2026-08-24) {#v0540-2026-08-24}

**Graduated guardrails & HITL (Phase 1–2)**
- **Transaction HITL:** `agents.tx_approval_policy` JSON — graduated thresholds (`require_above_native`, `require_for_chains`, `require_for_new_recipients`, unlimited ERC-20 approve detection). Matching txs return **202** `awaiting_approval` with `approval_id`; humans approve via `/v1/approvals/{id}/decide` to resume signing.
- **Execution HITL:** Binding `guardrails.approval_policy` (`mode`: `off` | `always` | `conditional`) and `allowed_methods`. Execute returns **202** `approval_required` when policy matches; approve auto-runs the intent.
- **`dry_run` on execute:** Validates guardrails and approval policy without side effects (`status: dry_run`).
- **Circuit breaker:** Repeated guardrail denials can auto-suspend agents (`auto_suspended`); org-level `frozen_at`. Webhooks: `tx.awaiting_approval`, `execution.pending`, `agent.suspended`, `org.frozen`.
- **Agent API:** `tx_approval_policy`, `typed_data_policy`, `simulation_failure_policy`, `auto_suspended` on GET; PATCH supports `clear_auto_suspended` (owner/admin).
- Production scripts: `scripts/test-guardrail-hitl-prod.sh`; extended `scripts/test-execution-guardrails-prod.sh` (`allowed_methods`, `dry_run`).

**Packages**
- Vault API, OpenAPI spec, SDK, CLI, MCP bumped to **0.54.0**
- MCP: `execute_intent` accepts `dry_run`; CLI: `1claw approval status <id>`

---

### v0.53.4 (2026-08-23) {#v0534-2026-08-23}

**Execution guardrails (Phase 0)**
- Machine-readable `guardrail_violation` JSON on execute denials (`reason_code`, optional `limit` / `current` / `attempted`)
- Per-binding guardrails: `max_request_bytes`, `max_response_bytes`, `allowed_request_headers`, GraphQL depth/mutation/introspection limits, DNS-pinned HTTP/GraphQL clients
- Per-binding and per-agent `max_requests_per_minute` — denied executions do not count toward RPM
- `GET /v1/approvals/{approval_id}/status` — agent-only lightweight approval poll
- Production script: `scripts/test-execution-guardrails-prod.sh`

**Packages**
- Vault API, OpenAPI spec, SDK, CLI, MCP (`io.github.1clawAI/1claw-mcp` / `@1claw/mcp`) bumped to **0.53.4**
- MCP tool: `get_approval_status`
- SDK: `client.approvals.getStatus()`

---

### v0.53.3 (2026-08-20) {#v0533-2026-08-20}

**Execution Intents parity**
- All ten binding type executors are live on **Pro+** (HTTP, GraphQL, Postgres, MySQL, Redis, gRPC, SMTP, Cloud SDK, S3, Custom)
- Production regression script section 30 supports optional `EXEC_*` real-service smoke tests
- Dashboard Security settings: env policy, credential recovery, and Shamir KEK endpoints wired correctly

**1claw.co domain parity**
- `api.1claw.co`, `mcp.1claw.co`, `shroud.1claw.co`, `intents.1claw.co`, and `run.1claw.co` mirror `.xyz` routing
- Smoke and Shroud prod scripts validate `.co` health endpoints

**Docs & packages**
- SDK, CLI, MCP (`io.github.1clawAI/1claw-mcp` / `@1claw/mcp`), OpenAPI spec, Python SDK bumped to **0.53.3**
- Marketing copy and agent skills updated for Pro+ binding tier gating

---

### v0.53.2 (2026-08-19) {#v0532-2026-08-19}

**Release engineering & OpenAPI sync**
- OpenAPI `@1claw/openapi-spec` 0.53.2: `ShroudAttestationResponse` adds `attestation_level` (`none` | `identity` | `confidential` | `sev_snp`) and `confidential_claims` (SEV-SNP tier metadata)
- SDK, CLI, MCP, Python SDK, Go SDK, and OpenClaw plugin bumped to **0.53.2**
- Production test scripts validate `attestation_level` on `GET /v1/shroud/attestation`
- `@1claw/wallet-react` **v0.5.0** — audit-driven auth/session fixes; parent submodule pointer updated

**Shroud & execution**
- SEV-SNP attestation verification with measurement match against published image digest
- TEE execution forwarding: Vault `POST /v1/agents/{id}/execute` with `execution_mode: "tee"` dispatches to Shroud when `ONECLAW_SHROUD_EXECUTION_URL` is configured
- Shroud secrets manifest refresh notifications for faster redaction automata updates

**Dashboard & policy UI**
- Policy Engine v2 dashboard parity: tx conditions editor, consensus `skip_when` / `require_when`, expression engine fields
- Embedded wallet UX improvements and blog post on competitive positioning

**Security (2026-08-19 audit)**
- HIGH/MEDIUM findings from security audit remediated in vault and dashboard

---

### v0.53.1 (2026-08-19) {#v0531-2026-08-19}

**Raw Transaction Deep Decode**
- Added `raw_transaction` (base64) and `tron_transaction` (JSON) fields to sign and submit endpoints
- Pre-built Solana, Bitcoin, and Tron transactions are now deep-decoded for policy enforcement
- Base64 validation and 64KB size cap enforced server-side

**Credential Recovery Hardening**
- Split approve/execute into two steps with configurable delay window (default 72 hours)
- Added `POST /v1/auth/credential-recovery/requests/{id}/execute` endpoint
- Admin/owner role verification required for approve and execute actions
- Org-configurable `credential_recovery_delay_hours` setting

**Shamir KEK TEE Forwarding**
- Reconstruct endpoint now forwards to Shroud TEE for secure key reconstruction
- Returns 501 when Shroud is not configured (deployment without TEE)
- Shroud stub handler at `POST /v1/admin/shamir/reconstruct`

**Wallet Access Policies**
- New CRUD endpoints: `POST/GET/DELETE /v1/wallets/access-policies`
- Per-chain, per-agent/user permission policies with conditions (value caps, token allowlists)

**OpenAPI Specification**
- 15 new endpoint definitions (wallet access, credential recovery, Shamir KEK, execute)
- Full request/response schemas with component definitions

**Expression Engine & Chain Decoders**
- Expression engine now evaluated in signing path for schema v2 policies
- Solana, Bitcoin, and Tron transaction decoders integrated into policy context builder
- Fail-open fallback when decode fails (graceful degradation)

---

### v0.53.0 — Embedded Wallet Competitive Parity (2026-08-19) {#v0530--embedded-wallet-competitive-parity-2026-08-19}

Whole-agent governance hardening for embedded wallet competitive parity with Turnkey-style signing infrastructure.

#### New features
- **Expression engine** — Mini DSL in `tx_conditions.expression` for signing-time policy evaluation (schema version 2). Fail-closed with step budget and length limits.
- **Policy schema versioning** — `policy_schema_version` on access policies (migration 202). Version 1 = legacy field-matching; version 2 = expression engine support.
- **TEE attestation endpoint** — Public `GET /v1/shroud/attestation` on Shroud returns GCE identity token + image hash with verification steps.
- **Audit chain verification** — `GET /v1/audit/verify` returns org-scoped hash chain integrity result with HMAC-SHA256 scheme metadata.
- **Multi-chain deep decode** — Full Solana, Bitcoin, and Tron transaction parsers feed `TransactionContext` for policy engine evaluation.
- **Control-plane action kinds** — `action_kind_in` on consensus triggers for version-agnostic grouping (e.g. `signing_key.*`, `policy.*`).
- **Approval bypass** — `approval_id` on consensus-gated requests (policy create, agent create, signing key export, treasury send).
- **Shamir org KEK** — Infrastructure for 2-of-3 Shamir KEK custody across HSM providers (migration 203).
- **Credential recovery escape hatch** — Time-delayed recovery for MFA/passkey consensus gating in solo/small orgs (migration 204).
- **Wallet access policies** — Role-based wallet permissions schema (migration 205).
- **`allowed_tokens` enforcement** — Spend policies now enforce `allowed_tokens` at signing time.

#### Security docs
- Security overview, trust model comparison, Turnkey migration guide, security whitepaper.
- Policy versioning guide, external security review scope runbook.

#### Migrations
- 202: `access_policies.policy_schema_version`
- 203: `organizations.kek_custody`, `org_kek_shares`, `org_kek_recovery_codes`
- 204: `credential_recovery_requests`
- 205: `wallet_access_policies`, `users.wallet_roles`, `agents.wallet_roles`

#### Clients
- `@1claw/sdk@0.53.0`, `@1claw/cli@0.53.0`, `@1claw/mcp@0.53.0`, `@1claw/openapi-spec@0.53.0`
- Python SDK `oneclaw@0.53.0`, Go SDK `v0.53.0`
- Vault `0.53.0`, Shroud `0.8.0`

---

### v0.52.0 — Agent Environment Tagging (2026-08-18) {#v0520--agent-environment-tagging-2026-08-18}

Tag agents with a named environment for policy scoping and automatic env var resolution.

#### New features
- **Agent environment tag** — `environment`, `environment_locked`, `env_auto_resolve`, and `per_environment_guardrails` on agents.
- **JWT claim** — Agent tokens include `environment` when the agent is tagged.
- **Policy scoping** — Access policy `conditions.environment_in` restricts policies to specific environments.
- **Auto-resolve** — When `env_auto_resolve` is true, `GET /v1/vaults/{id}/env-vars/resolve` uses the agent's tag when `environment` is omitted.
- **CLI flags** — `--environment`, `--environment-locked`, `--env-auto-resolve` on create; update supports `--per-environment-guardrails`.
- **Dashboard** — Environment tag UI on agent create and detail pages.

#### Bug fixes
- `consensus_policy` unit tests updated for `require_credential_types` field.

#### Migrations
- 201: `agents.environment`, `environment_locked`, `env_auto_resolve`, `per_environment_guardrails`

#### Clients
- `@1claw/sdk@0.52.0`, `@1claw/cli@0.52.0`, `@1claw/mcp@0.52.0`, `@1claw/openapi-spec@0.52.0`
- Python SDK `oneclaw@0.52.0`, Go SDK `v0.52.0`

---

### v0.51.0 — Environment Variables (2026-08-18) {#v0510--environment-variables-2026-08-18}

First-class per-key environment variables on vaults, bringing Vercel-style env management to 1Claw.

#### New features
- **Per-key env vars** — Store `DATABASE_URL`, `STRIPE_KEY`, etc. as individual encrypted entries targeting specific environments (production, preview, development, custom). Replaces the `config/prod/*` path hack.
- **Named environments** — Built-in production/preview/development plus tier-gated custom environments with copy-from support.
- **Org shared vars** — Organization-level env vars linked to multiple vaults. Vault-level vars with same key+environment always win.
- **Resolution endpoint** — `GET /v1/vaults/{id}/env-vars/resolve` returns the final KEY=VALUE set with three-tier precedence (shared < vault < branch override).
- **Sensitive write-only vars** — Values non-readable after creation for human callers. Disallowed on Development-only. Org enforcement policy available.
- **Cloud Runtime injection** — Resolved env vars merged into container environment at start/rebuild. 64KB combined limit. Restart required for changes.
- **CLI commands** — `env ls`, `env add`, `env rm`, `env environments ls|add|rm`, `-e` flag on `pull`/`push`/`run`.
- **SDK** — `client.envVars.list()`, `.create()`, `.get()`, `.update()`, `.delete()`, `.resolve()`.
- **MCP** — `resolve_env` tool.
- **Dashboard** — Env Variables tab on vault detail, Shared Env Vars settings page, environment management.

#### Bug fixes
- CLI `env pull` now correctly unwraps the `{ secrets: [...] }` response wrapper.
- CLI `env push` now sends `type` instead of `secret_type` (matching the API's serde rename).

#### Migrations
- 197: `env_vars` table
- 198: `vault_environments` table (built-in + custom)
- 199: `org_env_vars` and `org_env_var_links` tables
- 200: `runtimes.environment` column

#### Clients
- `@1claw/sdk@0.51.0`, `@1claw/cli@0.51.0`, `@1claw/mcp@0.51.0`, `@1claw/openapi-spec@0.51.0`

---

### Auth & dashboard security (2026-08-17) {#auth--dashboard-security-2026-08-17}

#### Human authentication
- **Changed:** TOTP MFA is available on **all tiers** (including Free); the Pro+ gate was removed.
- **New:** Per-user setting `require_passkey_for_vaults` (migration 193) — when enabled, `GET` secret reads require `X-Passkey-Token` from a user-verified WebAuthn assertion.
- **New:** `GET/PATCH /v1/auth/settings` — read/update `require_passkey_for_vaults` (user-only; enabling requires at least one registered passkey).
- **New:** `POST /v1/auth/passkeys/vault-assert/begin` + `.../complete` — issue a reusable 5-minute vault unlock token after passkey verification.
- **New:** Dashboard passkey suggestion prompt after login for users without a passkey (dismissible, 7-day snooze). Toggle in **Settings → Security** ("Vault unlock" card).

---

### v0.50.0 — Policy Parity Sprint (2026-08-18) {#v0500--policy-parity-sprint-2026-08-18}

#### Consensus precision & approver identity
- **New:** `threshold_wei` on `ConsensusCondition::value_above` — arbitrary-precision wei thresholds (preferred over deprecated `threshold_gwei`).
- **New:** `required_roles`, `per_role_minimums`, and `require_credential_types` on consensus `approval` requirements — enforce role-based and credential-gated approvals (e.g. require passkey-verified approver).
- **New:** `credential_type` on `approval_signatures` (migration 195) — records auth method used at vote time (`password`, `passkey`, `totp`, `biometric`, `api_key`).

#### EIP-712 & EIP-7702 policy conditions
- **New:** `tx_conditions` fields: `eip712_primary_type_in`, `eip712_verifying_contract_in`, `eip712_domain_name_in`, `eip712_domain_chain_id_in` — fine-grained typed data signing policies.
- **New:** `eip7702_authorized_addresses_in` — restrict EIP-7702 delegate contracts via `authorization_list` in TransactionContext.

#### Control-plane governance
- **New:** Org setting `control_plane_consensus_policy_id` — gates policy CRUD, signing key export, and member mutations behind consensus (returns **202**).
- **New:** `ConsensusCondition::action_in` — match control-plane actions (`policy.create`, `policy.update`, `policy.delete`, `signing_key.export`, `member.role_change`, `member.remove`).

#### Clients
- `@1claw/sdk@0.50.0`, `@1claw/cli@0.50.0`, `@1claw/mcp@0.50.0`, `@1claw/openapi-spec@0.50.0`
- Python SDK `oneclaw@0.50.0`, Go SDK `v0.50.0`

---

### v0.49.0 — Policy engine composability & deep inspection (2026-08-17) {#v0490--policy-engine-composability--deep-inspection-2026-08-17}

#### Built-in transaction policies
- **New:** `tx_conditions.match_mode` — `"all"` (default, AND) or `"any"` (OR) for combining individual condition fields at signing time.
- **New:** `tx_conditions.deep_inspect` — when true, conditions are also evaluated against inner calls extracted from wrapper transactions (multicall, Safe `execTransaction`, ERC-4337 `handleOps`).

#### Policy time windows
- **New:** IANA `timezone` and `cron_expr` on policy `conditions.time_window` — schedule-aware access control with timezone-aware hour/day checks and cron matching.

#### Consensus composability
- **New:** `consensus_trigger.skip_when` — array of flat condition sets; when ALL fields in ANY entry match, consensus is bypassed.
- **New:** `consensus_trigger.require_when` — consensus is only required when at least one entry matches; if set and none match, consensus is skipped.
- **New:** `consensus_trigger.deep_inspect` — evaluate consensus conditions against inner wrapper calls, not just the outer transaction.

#### Deep decode
- **New:** `crypto/deep_decode.rs` — unwraps multicall, Safe, and ERC-4337 batch transactions to populate `inner_calls` on `TransactionContext` for policy evaluation.

#### Fixed
- **Fixed:** `POST /v1/pending-approvals/{id}/execute` no longer returns 500 when JSONB key reordering caused `payload_hash` mismatch — canonical alphabetical key sorting in `pre_sign.rs`.

#### Clients
- `@1claw/sdk@0.49.0`, `@1claw/cli@0.49.0`, `@1claw/mcp@0.49.0`, `@1claw/openapi-spec@0.49.0`
- Python SDK `oneclaw@0.49.0`, Go SDK `v0.49.0`
- Integration packages `@1claw/agentkit`, `@1claw/openclaw-plugin`, `@workspace/1claw-hermes`, `1claw-mobile` at **0.49.0**

---

### v0.48.2 — tx_conditions, consensus tokens & security hardening (2026-08-17) {#v0482--tx_conditions-consensus-tokens--security-hardening-2026-08-17}

#### Built-in transaction policies
- **New:** `tx_conditions` JSONB on `access_policies` (migration 189) — AND of present fields evaluated at signing time: `function_name_in`, `function_selector_in`, `erc20_amount_above`, `value_above` (gwei), `to_address_in`, `chain_in`, `intent_type_in`, `decode_failed`, `program_id_in`. All tiers. Dashboard: `TxConditionsEditor` on policy create/edit.

#### Contract ABI registry
- **New:** `interface_kind` on contract ABIs (migration 190) — `evm_abi` (default) or `solana_idl` for Anchor IDL decoding. Solana program instructions populate `function_name`, `program_id_in`, and related TransactionContext fields.

#### Consensus / pending approvals
- **New:** Single-use **`approval_id`** bypass token (migration 191) — consumed atomically on execute, **submitter-bound** (only the original submitter can execute). Works on the EVM submit path after human approval.

#### Treasury delegation
- **Fixed:** Per-delegation guardrails (`to_allowlist`, `allowed_chains`, `max_value_eth`) are now enforced at **signing time** during treasury-mode Intents API requests — strictest of agent + delegation limits wins.

#### Security & reliability
- **Changed:** `ip_filter` middleware **fail-closed** on DB errors (500 instead of silent allow). Production requires **`ONECLAW_PROXY_SECRET`** for trusted proxy header validation.
- **New:** Runtime JWT **`runtime_id`** claim; auth middleware validates `X-1Claw-Runtime-Id` matches the token (prevents cross-runtime replay).
- **Fixed:** OPA WASM evaluation uses wasmtime epoch interruption for reliable timeout enforcement.
- **Fixed:** Treasury wallet send double-conversion of `value_wei`.
- **Fixed:** Agent enrollment anti-spam — bounded cooldown map, sensitive target threshold.

#### Docs
- **New:** [Policy Engine v2 guide](/docs/guides/policy-engine-v2), [Policy language](/docs/treasury/policy-language), [Policy cookbooks](/docs/treasury/policy-examples).

#### Clients
- `@1claw/sdk@0.48.2`, `@1claw/cli@0.48.2`, `@1claw/mcp@0.48.2`, `@1claw/openapi-spec@0.48.2`
- Python SDK `oneclaw@0.48.2`, Go SDK `v0.48.2`

---

### v0.48.1 — Client package alignment (2026-08-14)

#### Clients
- **Changed:** Submodule pointers aligned for npm/PyPI publish — SDK, CLI, MCP, OpenAPI spec, Python SDK (`__version__` fix), Go SDK at **0.48.1**.
- **Changed:** `@1claw/wallet-react@0.4.2` — passkey tx digest binding for treasury send/swap.

---

### v0.48.0 — Cedar/OPA Enforcement v2 (2026-08-14)

#### Policy backend
- **New:** `GET/PATCH /v1/org/settings/policy-backend` — configure Cedar/OPA backend (`builtin`, `cedar`, `opa`, `builtin+cedar`, `builtin+opa`), mode (`shadow` default or `enforce`), scope actions, and circuit breaker (`fail_closed` default).
- **New:** `GET /v1/org/policy-shadow-report` — divergence report when running advanced backends in shadow mode.

#### Contract ABIs
- **New:** `POST/GET/DELETE /v1/org/contract-abis`, `GET /v1/org/contract-abis/{id}` — org-scoped ABI registry for transaction decoding in policy evaluation.

#### Consensus / pending approvals
- **New:** `consensus_trigger` on access policies — structured conditions (value, chain, address, function selector, ERC-20 amount, intent type, always).
- **New:** `POST/GET /v1/pending-approvals`, approve/execute/cancel endpoints — multi-party approval workflow; sign/transactions return **202** when consensus matches.
- **New webhook events:** `pending_approval.*`, `policy_backend.circuit_breaker_*`.

#### Cedar/OPA
- **Changed:** Cedar and OPA policy responses include dynamic `enforcement_status` (`shadow`, `enforce`, `inactive`) from org backend config.

#### Clients
- `@1claw/sdk@0.48.0`, `@1claw/cli@0.48.0`, `@1claw/mcp@0.48.0`, `@1claw/openapi-spec@0.48.0`
- Python SDK `oneclaw@0.48.0`, Go SDK `v0.48.0`

---

### v0.47.3 — Billing quotas: wallets, signatures, Free treasury (2026-08-13)

#### Quotas
- **Changed:** Dropped the 0.25% of transaction-value Intents fee. Signature overage is a flat per-signature charge (`proxy_transaction_submit` rates: Free $0.225, Pro $0.15, Team $0.075, Business $0.04) via prepaid credits or x402. Included signatures remain free up to the monthly quota.
- **Changed:** Business API calls/month raised to **1,000,000** (was 500,000).
- **New:** Unified **wallet quota** covering active treasury wallets, agent signing keys, smart accounts, and agents with an EOA. Free 10, Pro 10,000, Team 250,000, Business 1,000,000, Enterprise unlimited.
- **New:** Monthly **signature quota** (Free 100, Pro 20,000, Team 200,000, Business 1,000,000). Over quota is billed, not hard-blocked.
- **Changed:** Signing POSTs (`POST /v1/agents/{id}/sign`, `/transactions`, `/transactions/sign`) no longer consume the API Calls meter.

#### Treasury wallets
- **Changed:** Treasury wallet generate/import/rotate/send/swap are available on **all tiers** (no Pro+ gate). Counted against the wallet quota. Dashboard `/treasury` is no longer Pro-walled.

#### API
- **Changed:** `GET /v1/billing/subscription` `usage` now includes `wallets` (`{ used, limit }`) alongside `requests` and `intent_transactions`.

#### Quotas (runtime hours)
- **Fixed:** Runtime hour caps now match the pricing page: Pro **100h/mo** (was 720h), Team **500h/mo** (was 7,200h), Business **2,000h/mo** (was 18,000h). Enforcement in `tier_limits()` was out of sync with customer-facing limits.

#### Pricing clarity
- **Changed:** Restored Pro wallet quota to **10,000** and signature quota to **20,000** (reverts interim 100/1,000 limits).
- **Changed:** Pricing page and docs now distinguish **Execution Intents** (Pro+, HTTP/GraphQL binding calls, hard monthly execution cap) from **Intents API** (Business+, on-chain signing, Signatures/mo meter).

#### Clients
- `@1claw/sdk@0.47.3`, `@1claw/cli@0.47.2`, `@1claw/openapi-spec@0.47.3`
- Python SDK `oneclaw@0.47.3`, Go SDK `v0.47.3`

---

### v0.47.0 — Key Import, Policy Engine v2, Sub-Orgs & Portfolio (2026-08-13)

#### Key Import (BYOK)
- **New:** `POST /v1/agents/{id}/signing-keys/{chain}/import` — Import an existing private key as a signing key. Human-only, requires `X-Auth-Confirm` password re-authentication. Supports hex, base64, and WIF formats.
- **New:** `POST /v1/treasury/wallets/{chain}/import` — Import an existing private key as a treasury wallet. Human-only, requires `X-Auth-Confirm`.

#### Policy Engine v2 + Cedar + OPA
- **New:** Existing access policies now support `effect` ("allow" or "deny"), `priority` (higher wins), and `attribute_conditions` fields for fine-grained policy evaluation.
- **New:** Cedar policy engine (Team+ tier): `POST/GET /v1/org/cedar-policies` (CRUD), `POST /v1/org/cedar-policies/test` (dry-run evaluation). Declarative authorization via Cedar policy language.
- **New:** OPA policy engine (Business+ tier): `POST/GET /v1/org/opa-policies` (CRUD), `POST /v1/org/opa-policies/test` (dry-run evaluation). Rego-based policy evaluation with custom data documents.
- **DB:** Migration 179 (policy v2 columns: effect, priority, attribute_conditions + secret tags), migration 180 (cedar_policies and opa_policies tables).

#### Non-EVM Treasury Send
- **Updated:** `POST /v1/treasury/wallets/{chain}/send` now supports Bitcoin, Solana, XRP, Cardano, and Tron sends alongside EVM chains.
- **Updated:** Request body extended with `token_mint`, `memo`, `destination_tag`, `fee_rate_sat_per_vbyte`, `xrpl_tx_json`, `fee_limit_sun`, `token_decimals`, `ttl` for non-EVM chain-specific parameters.
- **Note:** `POST /v1/treasury/wallets/{chain}/swap` returns 400 for non-EVM chains (DEX aggregator is EVM-only).

#### Sub-Organizations
- **New:** Hierarchical organization management. Sub-orgs inherit or independently manage billing.
- **New endpoints:** `POST/GET /v1/org/sub-orgs` (create, list), `GET/DELETE /v1/org/sub-orgs/{id}` (get, archive), `POST/DELETE /v1/org/sub-orgs/{id}/permissions` (grant, revoke), `POST /v1/org/sub-orgs/{id}/users` (add user), `POST /v1/org/sub-orgs/{id}/wallets/generate` (generate wallets).
- **Platform API:** `create_sub_org: bool` on `upsert_user` enables platform apps to create sub-orgs for connected users.
- **DB:** Migration 181.

#### Portfolio
- **New:** `GET /v1/portfolio` — Unified balance aggregator across all wallet types (treasury wallets, signing keys, smart accounts). Query params: `?chains=ethereum,solana`, `?include_tokens=true`. Returns per-wallet balances with USD estimates.

#### Smart Account Import
- **New:** `POST /v1/agents/{id}/smart-accounts/import` — Import an existing Safe smart account. Accepts `{ chain, chain_id, safe_address, verify? }`. Optionally verifies on-chain Safe ownership before import.

#### SDK / CLI / MCP
- **SDK:** `client.signingKeys.importKey()`, `client.treasuryWallets.importWallet()`, `client.cedarPolicies.*` (CRUD + test), `client.opaPolicies.*` (CRUD + test), `client.subOrgs.*` (full CRUD), `client.portfolio.get()`, `client.agents.importSmartAccount()`. Policy types updated with `effect`, `priority`, `attribute_conditions`.
- **CLI:** `1claw cedar-policy create|list|get|delete|test`, `1claw opa-policy create|list|get|delete|test`, `1claw sub-org create|list|get|archive|grant|revoke|add-user|wallets`, `1claw portfolio`, `1claw agent keys import`, `1claw agent smart-account-import`, `1claw treasury wallet import`.
- **MCP:** `import_signing_key`, `list_cedar_policies`, `test_cedar_policy`, `list_opa_policies`, `test_opa_policy`, `list_sub_orgs`, `create_sub_org`, `get_portfolio`, `import_smart_account` tools.

#### Dashboard
- **Updated:** Policy create/list pages now show effect (allow/deny badge) and priority fields.
- **Updated:** Create policy form includes effect dropdown and priority input.

#### Clients
- `@1claw/sdk@0.47.0`, `@1claw/cli@0.47.0`, `@1claw/mcp@0.47.0`, `@1claw/openapi-spec@0.47.0`
- Python SDK `oneclaw@0.47.0`, Go SDK `v0.47.0`

---

### v0.46.0 — Agent Delegation Framework (2026-08-12)

#### Agent-to-Agent Delegation
- **New:** Human-controlled agent-to-agent delegation framework. Agents cannot delegate to other agents without an explicit `agent_delegations` record created by a human.
- **New:** Three delegation modes: `caller` (delegate uses own credentials, default/most secure), `target` (delegate uses target agent's config), `both` (per-invocation choice).
- **New:** Security guardrails: tool allowlists/blocklists per delegation, daily rate limits (`max_daily_delegations`), recursive depth limits (`max_depth` 1–10 via `X-Delegation-Depth` header), expiration, self-delegation blocked (400).
- **New:** Chat enforcement — cross-agent `POST /v1/agents/{id}/chat` requires active, non-expired delegation from caller to target. Delegation engine validates tools, daily limits, and depth.
- **New:** `agents.delegation_enabled` BOOLEAN field — agents must have this enabled to participate in delegation.

#### Endpoints
- `POST /v1/agents/{id}/delegations` — Create delegation (human-only). Body: `{ delegate_id, delegation_mode, allowed_tools?, blocked_tools?, max_daily_delegations?, max_depth?, guardrails?, expires_at? }`.
- `GET /v1/agents/{id}/delegations` — List delegations (human sees all; agent sees own).
- `GET /v1/agents/{id}/delegations/effective` — Agent-callable. Returns delegations where calling agent is the delegator (for runtime tool discovery).
- `GET /v1/agents/{id}/delegations/{delegation_id}` — Get delegation details.
- `PATCH /v1/agents/{id}/delegations/{delegation_id}` — Update delegation (human-only).
- `DELETE /v1/agents/{id}/delegations/{delegation_id}` — Revoke delegation (human-only).

#### Runtime Tools
- **Updated:** `delegate_task` tool now enforces delegation authorization — delegation-specific 403 errors returned for unauthorized cross-agent communication.
- **Updated:** `list_my_sub_agents` now includes delegation status per agent: `{ authorized, mode, allowed_tools, remaining_daily }`.
- **New:** `get_delegation_status` tool — check which agents the caller is authorized to delegate to with tool/limit details.

#### SDK / CLI / MCP
- **SDK:** `client.agents.createDelegation()`, `.listDelegations()`, `.getDelegation()`, `.updateDelegation()`, `.revokeDelegation()`, `.getEffectiveDelegations()`.
- **MCP:** `list_delegations`, `create_delegation`, `get_effective_delegations` tools.
- **CLI:** `1claw agent delegation create|list|get|update|revoke <agent-id>`.

#### Dashboard
- **New:** Sub-agent creation wizard at `/agents/sub-agent-wizard` — 4-step flow with 6 role presets (Research, Image Gen, Treasury, Comms, Code, Custom). Configures capabilities, sets delegation rules with multi-parent support.
- **New:** Delegations tab on agent detail page — outbound (this agent delegates TO others) and inbound (others delegate TO this agent) tables with create, edit, revoke dialogs.
- **New:** Sub-Agents card on runtime detail page — "Create Sub-Agent" button, delegation status badges (green "Authorized" / gray "No Delegation"), "Authorize" quick-action.
- **New:** Sub-agent tag indicators on agents list page, "Create Sub-Agent" button.

#### Audit
- New audit events: `agent.delegation.created`, `agent.delegation.updated`, `agent.delegation.revoked`, `agent.delegation.invoked`, `agent.delegation.blocked`.

#### DB
- Migration 176: `agent_delegations` table with partial unique index on `(delegator_id, delegate_id) WHERE is_active = true`. RLS enabled.
- Migration 177: `delegation_events` table for daily rate limit tracking.
- `agents.delegation_enabled` BOOLEAN DEFAULT false.

#### Tests
- `scripts/test-sub-agents-prod.sh` (~55 assertions) — CRUD, enforcement, depth limits, rate limits, tool blocklists, revocation.
- `scripts/test-delegation-security-prod.sh` (~25 security assertions) — bidirectional isolation, expired delegations, self-delegation.

#### Clients
- `@1claw/sdk@0.46.0`, `@1claw/cli@0.46.0`, `@1claw/mcp@0.46.0` updated with delegation types and methods.

---

### v0.45.0 — Hermes-Native Channel Features, Sub-Agent Chat Fix, Image Gen Fallback (2026-08-12)

#### Added
- **Hermes-Native Channel Features**: Slash command router (12 commands), voice memo transcription (Telegram/Whisper), cross-platform conversation continuity via `unified_conversation_id`, automation→channel delivery, context-aware interruption, platform presence (`is_home_platform`, `/sethome`)
- **Sub-Agent Chat Fix**: Agents can now chat with any agent in the same organization (previously restricted to self-only)
- **Shroud Image Gen Fallback**: DALL-E image generation uses `OPENAI_API_KEY` env var fallback for non-chat endpoints
- **Runtime API Keys UX**: New dashboard component for configuring runtime API keys

#### Fixed
- **LLM Billing Duplicate Fix**: Subscription lookup now finds ALL non-cancelled subscriptions, preventing duplicate billing. Dashboard shows improved warning banner.

#### Changed
- DB migrations 174-175: New columns on `agent_channels` (slash_commands_enabled, voice_transcription_enabled, unified_conversation_id, auto_respond_in_progress, is_home_platform) and `channel_messages` (is_voice_message, voice_file_id, voice_duration_secs, transcription_status)
- New domain modules: `slash_commands.rs`, `voice_transcription.rs`, `hermes_migration.rs`

---

### v0.46.0 — OAuth2 Refresh Tokens, Platform Marketplace, Security Hardening (2026-08-12)

#### OAuth2 Authorization Server
- **New:** Refresh token support — `POST /v1/oauth/token` returns `refresh_token` when `offline_access` scope is requested. Exchange via `grant_type=refresh_token`. DB: `oauth_refresh_tokens` table (migration 173).
- **New:** Token revocation — `POST /v1/oauth/revoke` revokes access or refresh tokens (RFC 7009).
- **New:** Consent revocation — `DELETE /v1/oauth/consent/{app_slug}` revokes all consent and tokens for an app (user-only).
- **New:** Scope-filtered UserInfo — `GET /v1/oauth/userinfo` now respects granted scopes (e.g. `email` scope required for email field).
- **New:** `<SignInWith1Claw />` React component in `@1claw/wallet-react` for one-click OAuth integration.

#### Platform API
- **New:** `max_connected_users` field on platform apps — enforced limit on connected users per app.
- **New:** Platform marketplace — `GET /v1/platform/marketplace` lists approved apps with category, tags, screenshots. Dashboard at `/marketplace`.
- **New:** App stats — `GET /v1/platform/apps/{id}/stats` returns connected user count, bootstrap count, active connections.
- **New:** Platform webhook secret rotation — `POST /v1/platform/apps/{id}/rotate-webhook-secret` rotates the platform app delivery HMAC secret.
- **New:** 6 platform webhook events: `platform.user.connected`, `platform.user.disconnected`, `platform.bootstrap.completed`, `platform.grant.created`, `platform.grant.revoked`, `platform.user.claimed`.
- **New:** Platform rate limiting — per-app configurable `max_requests_per_minute` on platform API endpoints.
- **New:** Platform onboarding wizard — step-by-step flow at `/platform/wizard` for creating an app, template, and first user.
- **Fixed:** Multi-agent bootstrap — template specs with multiple agents now correctly provision all agents (was only creating the first).
- **New:** Delegation scopes for memory/chat — `memory:read`, `memory:write`, `chat:read`, `chat:write` added to platform delegation scope enforcement.

#### Runtime Chat
- **Fixed:** Anthropic tool deduplication — duplicate tool definitions no longer sent to Anthropic models.
- **Improved:** Graceful LLM fallback — runtime chat falls back to a simpler prompt when the model rejects the request.
- **Improved:** BYOK UX — LLM API key configuration now shows auto-suggested provider based on key prefix.

#### LLM Billing
- **Fixed:** Duplicate subscription detection — `POST /v1/billing/llm-token-billing/subscribe` detects and cleans up duplicate Stripe subscriptions. Dashboard shows warning banner when duplicates are detected.

#### wallet-react (v0.5.0)
- **Fixed:** 8 auth bugs: token refresh race, social login popup handling, cross-origin message validation, email OTP retry logic, passkey credential caching, session expiry redirect, PKCE state cleanup, consent page deep-link.
- **New:** Passwordless send via passkey — `sendWithPasskey()` method for transaction authorization without password.
- **Improved:** Social login popups — better popup handling for Google/Apple/Discord providers.
- **New:** CSS theming — `theme` prop accepts full CSS custom properties object for deep customization.
- **New:** Toast notifications — built-in toast system for transaction status updates.
- **New:** Skeleton loading — skeleton UI states for wallet and balance loading.

#### SDK (v0.46.0)
- **New:** `auth.generatePKCE()` — generates PKCE code verifier and challenge.
- **New:** `auth.buildAuthorizeUrl()` — builds OAuth authorize URL with PKCE parameters.
- **New:** `auth.getUserInfo()` — fetches UserInfo from OAuth access token.
- **New:** `auth.revokeToken()` — revokes an OAuth access or refresh token.
- **New:** `auth.revokeConsent()` — revokes OAuth consent for a specific app.
- **New:** `platform.rotateWebhookSecret()` — rotates webhook HMAC secret.
- **New:** `platform.getAppStats()` — fetches platform app statistics.
- **New:** `platform.marketplace()` — lists marketplace apps.

#### Security
- **Fixed (TOCTOU):** OAuth authorization code exchange uses atomic `UPDATE ... RETURNING` to prevent time-of-check-to-time-of-use race.
- **Fixed (Chat authZ):** `POST /v1/agents/{id}/chat` enforces org membership for users and same-org check for agent callers.
- **Fixed (Discord replay):** Discord OAuth `state` parameter is single-use (consumed on callback) to prevent replay attacks.
- **Fixed (OAuth atomic):** Authorization code creation and consent recording use a database transaction to prevent orphaned codes.
- **Fixed (Channel allowlists):** `auto_respond_enabled` must be true AND sender must be in `sender_allowlist` for auto-respond to trigger.

#### Dashboard
- **Fixed:** Template spec builder edit round-trip — editing an existing template now correctly loads the current spec.
- **Improved:** OAuth consent page UX — better error states, scope descriptions, app logo display.
- **New:** Grant page auth gate — `/connect/{slug}/grant` requires authentication (redirects to login).
- **Improved:** Mobile responsiveness — sidebar, tables, and cards responsive on mobile viewports.
- **New:** Marketplace page at `/marketplace` — browse approved platform apps.

#### Clients
- `@1claw/sdk@0.46.0`, `@1claw/wallet-react@0.5.0`, `@1claw/mcp@0.46.0`, `@1claw/openapi-spec@0.46.0` updated.

---

## 2026-08

### v0.45.0 — Runtime Tool Registry, Sub-Agent Framework (2026-08-11)

#### Runtime Tool Registry
- **New:** 12 tool modules in `packages/runtime-base/templates/shared/tools/` provide runtime agents with structured capabilities:
  - `image-gen.js` — DALL-E image generation (requires `shroud_enabled`)
  - `web-search.js` — Web search via Brave/Tavily/SerpAPI
  - `memory-tools.js` — Agent memory CRUD (requires `memory_enabled`)
  - `file-handler.js` — Image analysis and URL reading
  - `code-exec.js` — Sandboxed code execution
  - `google-tools.js` — Google API integrations
  - `github-tools.js` — GitHub API tools
  - `slack-tools.js` — Slack messaging
  - `social-tools.js` — Social media tools
  - `vault-tools.js` — Direct vault secret access
  - `notify-tools.js` — Multi-channel notifications
  - `sub-agents.js` — Sub-agent framework (see below)
- **New:** Per-template tool configs — each runtime template (hermes, openclaw, openclaude) has a `tools-config.js` that enables/disables specific tools based on the template's use case.
- **Dashboard:** `RuntimeToolsCard` component on runtime detail page showing enabled/disabled tools per runtime.

#### Sub-Agent Framework
- **New:** 4 runtime-level tools for agent-to-agent collaboration:
  - `discover_agents` — Search the public agent directory for agents by capability
  - `delegate_task` — Send a task to another agent via chat and wait for response
  - `list_my_sub_agents` — List agents in the same org (org-scoped directory)
  - `create_sub_task` — Trigger automations on behalf of another agent
- Agent-to-agent communication uses `POST /v1/agents/{id}/chat` — agents can now call this endpoint on other agents within the same org.
- **Dashboard:** Sub-Agents tab on runtime detail page.

#### New Endpoints
- `GET /v1/agents/org-directory` — Authenticated org-scoped agent directory listing. Returns all agents in the caller's org with name, description, capabilities, and status. Used by the sub-agent `list_my_sub_agents` tool for agent discovery within an organization.

#### Shroud
- **DALL-E bypass:** Image generation requests routed through Shroud now bypass the Stripe AI Gateway. DALL-E has its own billing model and does not need metering through the gateway.

#### Dashboard
- `RuntimeToolsCard` component on runtime detail page — visual grid of enabled/disabled tools per runtime with tooltips showing requirements (e.g. "Requires shroud_enabled").
- Sub-Agents tab on runtime detail page — shows connected agents, delegation history, and task status.

#### Clients
- `@1claw/sdk@0.45.0`, `@1claw/cli@0.45.0`, `@1claw/mcp@0.45.0`, `@1claw/openapi-spec@0.45.0` updated.

### v0.44.0 — Security fixes, platform delegation enforcement, channels, chat (2026-08-11)

#### OAuth Connected Accounts
- **New**: Universal OAuth integration for AI agents — connect agents to external services (Google, GitHub, X/Twitter, LinkedIn, Slack, Discord, Notion, Microsoft, Salesforce, HubSpot) via human-approved OAuth flows.
- Provider registry seeded with 10 providers (migration 171). OAuth app credentials encrypted at rest (migration 172).
- Endpoints: `GET /v1/oauth/providers`, `POST /v1/agents/{id}/oauth/connect`, `GET .../oauth/connections`, `POST .../oauth/disconnect/{bindingId}`, credential CRUD.
- SDK `OAuthConnectResource`, MCP `list_oauth_providers`/`list_oauth_connections`, CLI `1claw oauth`.
- Dashboard: `ConnectedAccountsCard` on agent detail page (Connections tab).

#### Security (C-1 Critical + 6 Medium + 8 Low)
- **C-1 CRITICAL — Agent memory cross-org isolation** (migration 166): Shared memory entries could collide across orgs due to missing `org_id` in the unique index. Fixed by adding `org_id` to the constraint.
- **M-2 — Automation runs status CHECK** (migration 167): Added `awaiting_approval` to the automation_runs status CHECK constraint.
- **M-4 — Channel sender allowlist** (migration 168): Added `sender_allowlist` and `auto_respond_enabled` columns to agent channels for restricting which sender IDs can trigger auto-respond.
- **M-5 — Telegram dedup** (migration 169): Track `last_telegram_update_id` per channel to prevent duplicate message processing.
- **M-6 — Shared memory org validation**: Cross-org shared memory access prevented.
- **Low**: Runtime chat rolling message cap, Cloud Run internal-only ingress, XFF bypass fix, agent token TTL reduced to 2h, step-up unlock prefix hardening, LLM billing gating improvements.

#### Platform API
- **Delegation scope enforcement**: `delegation_scopes` now enforced on 4 handler groups: secrets, policies, bindings, and discovery. Missing scope → 403.
- **Disconnected connection rejection**: Operations on disconnected platform connections rejected with 403.
- **Bootstrap runtimes & automations**: Template `spec` now supports `runtimes` and `automations` arrays. Bootstrap creates these resources and tracks IDs on the connection (`runtime_ids`, `automation_ids` — migration 170).
- **Dashboard**: Platform audit page, key rotation UI, connected apps grant management with expandable panels.

#### Agent Chat
- **New**: Chat conversations between humans and agents via Shroud LLM proxy. Persistent conversation history with SSE streaming.
- Endpoints: `POST /v1/agents/{id}/chat`, `POST .../chat/unlock`, `GET .../chat/conversations`, `GET/DELETE .../chat/conversations/{id}`.
- SDK `client.chat.*`, MCP `send_chat_message`, `list_chat_conversations`.

#### Messaging Channels
- **New**: Connect agents to Telegram, WhatsApp, and Discord for bi-directional messaging with auto-respond.
- Per-channel sender allowlists, WhatsApp HMAC verification, Telegram dedup.
- Image generation delivery (DALL-E images delivered inline on Telegram and dashboard chat).
- Endpoints: CRUD under `/v1/agents/{id}/channels`, webhook endpoints per platform.
- MCP `create_channel`, `list_channels`, `send_channel_message`.

#### Dashboard
- Fixed: Automations detail page crash.
- Improved: Assist NL mapping, automations wizard/assist UX, runtime chat code formatting.
- Template Spec Builder supports runtime and automation entries.

#### Clients
- `@1claw/sdk`, `@1claw/cli`, `@1claw/mcp`, `@1claw/openapi-spec` updated.

### v0.43.4 — Automations v2: Workflow Engine, SDK ESM fix, Python SDK (2026-08-10)

#### Automations v2 — Workflow Engine
- **New:** 7 new step types — `ai_generate` (LLM text generation via Shroud), `memory_get`, `memory_put`, `memory_search` (agent memory CRUD), `notify` (webhook/slack/email notifications), `approval_request` (human-in-the-loop gate), `condition` (if/else branching with sub-steps).
- **New:** Template variable syntax — `{{steps.<index_or_name>.<field>}}` for referencing previous step outputs, `{{webhook_payload.<path>}}` for webhook trigger data. Applied recursively before step execution.
- **New:** Conditional execution — `skip_if` and `run_if` string expressions on any step (operators: `==`, `!=`, `contains`, `>`, `<`, `>=`, `<=`, truthy).
- **New:** Cancel run endpoint — `POST /v1/automations/{id}/runs/{run_id}/cancel` (human-only; cancels `running` and `awaiting_approval` runs).
- **New:** Enriched list API — `GET /v1/automations` returns `last_run_status`, `total_runs` (30-day), `success_rate` (percentage), and `agent_name`.
- **New:** 10 marketing-ready presets — `GET /v1/automations/presets` (public): rotate-api-keys-weekly, daily-dca-buy, health-check-alert, database-sync, weekly-content-draft, lead-nurture-email, competitor-watch, sentiment-alert, campaign-report, monitor-balance.
- **New:** `context` JSONB column on `automation_runs` for step output persistence.
- **DB:** Migration 165 (workflow engine v2 — `context` column + index on `automation_runs`).

#### SDK 0.43.4 — ESM fix
- **Fixed:** ESM module resolution corrected for bundler-free environments (Node.js `--conditions`, Deno, Bun). Named exports now work correctly with `import { createClient } from '@1claw/sdk'`.

#### Runtime max_tokens fix
- **Fixed:** `max_tokens` parameter now correctly passed through to LLM providers in runtime chat and automation `ai_generate` steps.

#### Python SDK 0.43.4
- **New:** `oneclaw` Python SDK updated to 0.43.4 — automation support (`client.automations.create/list/trigger`), memory CRUD (`client.memory.store/search/list`), runtime management, and discovery.

#### Dashboard
- **New:** Automation create wizard includes preset gallery with one-click deployment.
- **New:** Enriched automation list shows last run status, success rate, and total runs.
- **New:** Cancel button on running automation detail page.
- **New:** Automations Assist page at `/automations/assist` with visual step editor.

#### Clients
- `@1claw/sdk@0.43.4`, `@1claw/cli@0.43.4`, `@1claw/mcp@0.43.4`, `@1claw/openapi-spec@0.43.4`, `oneclaw` (Python) `0.43.4`.

### v0.43.3 — Runtime Chat, Assist step editor, log security (2026-08-04)

#### Added
- **Runtime Chat** — `POST /v1/runtimes/{id}/chat` (SSE); Chat tab next to Shell for hermes/openclaw/openclaude; OpenAI-compatible in-container bridge.
- **Automations Assist step editor** — type-specific editable fields + selectors; Advanced JSON collapsed.
- **Logs step-up unlock** — `POST /v1/runtimes/{id}/logs/unlock` (password or passkey reauth, purpose `runtime_logs`, 15 min grant).

#### Security
- Runtime logs exclude/summarize GCP audit payloads and redact JWTs/API keys server-side.
- Agent JWTs mounted via Secret Manager `secretKeyRef` so CreateService audit logs do not embed plaintext tokens.
- When `agent.shroud_enabled`, runtimes enable sidecar/Shroud LLM path; automation swap/submit route signing through Shroud.

#### Clients
- `@1claw/openapi-spec` / `@1claw/sdk` / `@1claw/cli` **0.43.3**; `@1claw/agentkit` **0.43.2**; `@1claw/plugin-elizaos` **0.2.1**.

### v0.43.2 — Webhook automations, event triggers, runtime logs (2026-08-03)

#### Added
- **Webhook automations** — `trigger_type: webhook` returns one-time `webhook_url` + `whk_` token on create. Public trigger: `POST /v1/automations/{id}/webhook/{token}`. Human-only rotation: `POST /v1/automations/{id}/rotate-webhook-token`.
- **Event-trigger wiring** — Automations with `trigger_type: event` and `event_filter.event_type` fire on `secret.created/updated/rotated/deleted` and `policy.created/updated/deleted`.
- **Automations Assist** — `POST /v1/automations/assist/draft` and `/assist/session` documented in OpenAPI; dashboard Assist flow + OpenClaude runtime template.
- **Runtime logs API** — `GET /v1/runtimes/{id}/logs?tail=N` returns `{ entries: [...] }` (replaces legacy `lines`/`since` query params). SDK `runtimes.logs()`, MCP `runtime_logs` use `tail`.

#### Clients
- OpenAPI **2.31.0** / `@1claw/openapi-spec@0.43.2`, `@1claw/sdk@0.43.2`, `@1claw/mcp@0.43.2`.

### v0.43.1 — Automations workflow_spec + runtime interactive shell (2026-08-03)

#### Fixed / clarified
- **Automations create contract** — `POST /v1/automations` requires `workflow_spec` (+ `agent_id`; `cron_expr` when trigger is cron). Dashboard maps legacy `action_type` UI fields onto `workflow_spec`. API accepts `trigger_type: "schedule"` as an alias for `cron`, and accepts workflow shapes as either a bare step array or `{ "steps": [...] }`.
- **Clients synced** — OpenAPI 2.30.0 / `@1claw/openapi-spec@0.43.1`, `@1claw/sdk@0.43.1` (`runtimes.createShellSession`), Go SDK (`v0.43.0`), Python SDK (`oneclaw@0.43.3`), CLI `@1claw/cli@0.43.1`, MCP `@1claw/mcp@0.43.1` (`io.github.1clawAI/1claw-mcp`). Updated off the old `/v1/agents/{id}/automations` + `action_type` shapes. CLI README examples use `--workflow` / `--cron`.
- **Runtime interactive shell** — `POST /v1/runtimes/{id}/shell/session` (+ `/shell/passkey/begin`) documented in OpenAPI. Human-only step-up auth (password, TOTP, passkey, or `reauth_token`). Dashboard terminal uses binary PTY WebSocket; Vault auto-repairs Cloud Run invoker IAM (non-blocking on Connect to avoid gateway 504). Hermes/runtime images must include `shroud-sidecar` — rebuild templates after base updates; enabling shell while running triggers background reconcile / may still need stop/start.
- **Manual automations** — DB allows `trigger_type: "manual"`; create no longer 500s for manual workflows.
- **Prod tests** — `scripts/test-automations-prod.sh` exercises `workflow_spec` + schedule→cron alias; `scripts/test-runtimes-prod.sh` adds shell session auth/enablement guards.

### v0.42.0 — Automations, Runtimes, Agent Memory, Discovery, and Platform enhancements (2026-08-01)

#### Added
- **Agent Memory** — Three-tier memory system (scratch, durable, semantic) for AI agents. Scratch is ephemeral and auto-cleared per session; durable persists across sessions; semantic enables vector similarity search via pgvector. All tiers encrypted at rest with envelope encryption. Endpoints: `POST/GET/DELETE /v1/agents/{id}/memory`, `POST /v1/agents/{id}/memory/search`. SDK `client.memory.*`, CLI `1claw memory`, MCP tools `memory_put`/`memory_get`/`memory_list`/`memory_search`/`delete_memory`. Dashboard: Memory card on agent detail with tier tabs and search UI.
- **Automations** — Cron-scheduled, webhook-triggered, and event-driven automation workflows with multi-step pipelines and AI integration. Visual cron builder in the dashboard. Tier-gated: Free 2, Pro 10, Team 50, Business 200. Endpoints: `POST/GET /v1/automations`, `GET/PATCH/DELETE /v1/automations/{id}`, `POST /v1/automations/{id}/trigger`, `GET /v1/automations/{id}/runs`. SDK `client.automations.*`, CLI `1claw automation`, MCP `list_automations`/`trigger_automation`. Dashboard pages at `/automations`, `/automations/new`, `/automations/[id]`.
- **Cloud Runtimes** — Deploy AI agents in managed containers with resource presets: small (0.5 vCPU/512MB), medium (1 vCPU/1GB), large (2 vCPU/4GB), large-cc (4 vCPU/8GB confidential compute). Public URL hosting, idle auto-stop, log streaming, health monitoring. Endpoints: `POST/GET /v1/runtimes`, `GET/PATCH/DELETE /v1/runtimes/{id}`, start/stop/logs sub-routes. SDK `client.runtimes.*`, CLI `1claw runtime`, MCP `list_runtimes`/`manage_runtime`/`runtime_status`/`runtime_logs`. Dashboard pages at `/runtimes`, `/runtimes/new`, `/runtimes/[id]`.
- **Agent Discovery** — Public agent directory and platform marketplace. Agents can be made discoverable with capability cards showing A2A/MCP URLs, supported protocols, and pricing. Endpoints: `POST/GET /v1/discovery/agents`, `GET /v1/discovery/agents/{id}`, `POST /v1/agents/{id}/discovery`. SDK `client.discovery.*`, CLI `1claw directory`, MCP `search_directory`. Dashboard: `/directory` public page, discovery card on agent detail.
- **Platform Delegation** — Platform apps can perform CRUD on connected user resources via `X-Platform-Connection` header. Scoped by `delegation_enabled` and `delegation_scopes` on platform apps. Operations attributed to the platform app in audit logs. DB: migration 151.
- **OAuth2 Credential Bindings** — Execution Intents bindings support OAuth2 credential type with `authorization_code` and `client_credentials` grant flows. Automatic token refresh before execution. DB: migration 150.
- **New agent columns:** `llm_default_provider`, `llm_default_model` (migration 143) for agent LLM defaults.
- **New sidebar entries:** Automations, Runtimes, and Directory pages added to dashboard sidebar navigation.
- **DB migrations:** 141 (automations), 142 (automation_runs), 143 (agent LLM defaults), 144 (runtimes), 145 (agent_memory_entries), 146 (agent_memory_vectors), 147 (runtime_hosting), 148 (agent_discovery), 149 (platform_listing), 150 (oauth2_credential_bindings), 151 (platform_delegation_scopes).

#### Changed
- Dashboard sidebar updated with new navigation items for Automations, Runtimes, and Directory.
- SDK types extended with memory, automation, runtime, and discovery interfaces.
- MCP server tool count increased from 50 to 62 tools.

---

## 2026-07

### Payment Card Vault — human-in-the-loop approval (2026-07-17)

#### Card orders require human approval by default
- **New:** `card_require_approval` on agents (default **true**). When enabled, `POST /v1/agents/{id}/cards/order` returns **202** with `status: awaiting_approval` and `approval_id` — x402 payment runs only after a human approves.
- **New:** `GET /v1/approvals/quick-decide` — public one-click approve/deny from email (SHA-256 hashed, single-use tokens in `approval_quick_tokens`; 7-day TTL). Dashboard proxy: `GET /api/approvals/quick-decide`.
- **New:** Approval notifications — email with Approve/Deny CTAs; push notification dispatch to registered mobile devices.
- **New:** Auto-execution on `POST /v1/approvals/{id}/decide` when `action == card_order` (approved → pay + Laso; rejected → `card.rejected` webhook).
- **New:** Risk-tier step-up on approve (T2+ requires `X-Auth-Confirm` re-auth token; T3 passkey/TOTP).
- **New:** TOTP as re-auth method — `POST /v1/auth/reauth/begin` + `complete` with `method: "totp"`.
- **New:** Webhook events `approval.created`, `approval.decided`, `card.rejected`.
- **New:** Card statuses `awaiting_approval`, `rejected`; `approval_id` on card responses.
- **DB:** migration 139 (`card_require_approval`, `approval_quick_tokens`, extended status CHECK).
- **Clients:** Dashboard approval detail card-order renderer, guardrails toggle, mobile `card_order` screen; SDK types updated.

### Payment Card Vault — x402 card ordering (Laso) (2026-07-14)

#### Agents can order prepaid & gift cards, paid with USDC via x402, without ever seeing the PAN
- **New:** `POST /v1/agents/{id}/cards/order` — order a prepaid or gift card. Paid with an **outbound x402 payment** the Vault constructs and signs (EIP-3009 `TransferWithAuthorization`) using the agent's own Ethereum signing key on Base. Requires `cards_enabled` and an `Idempotency-Key` header. Available on all tiers (Free: $25/order, 5 cards/month; Pro: 50/month; Team: 200/month; Business+: unlimited). A 3% platform fee per order is debited from prepaid credits. Returns a masked card reference — never a PAN.
- **New:** Card lifecycle endpoints — `GET /v1/cards`, `GET /v1/cards/{id}` (masked to last4), `POST /v1/cards/{id}/reveal` (human `X-Auth-Confirm` re-auth, or per-card agent reveal policy; audit-logged), `PATCH /v1/cards/{id}` (reveal policy / `void_after`, human-only), `POST /v1/cards/{id}/void` (1Claw-level lock, forward-looking only), `POST /v1/cards/{id}/refresh` (rate-limited → clean 429 + `Retry-After`), `POST /v1/cards/import` (human-only, full encrypted storage with one-time-read CVV), `POST /v1/cards/gift-cards/search`.
- **New:** Ordering guardrails on agents — `cards_enabled`, `card_max_order_usd`, `card_daily_limit_usd` (enforced atomically over a rolling 24h window), `card_payto_allowlist`, `card_reveal_enabled`. These bound the purchase, not how a revealed card is later spent.
- **New:** Outbound x402 client (`crypto/x402_client.rs`) validates every 402 challenge before signing — `payTo` allowlist, Base network, exact requested amount, and the pinned Base USDC contract. The stored Laso bearer token is constrained in code to a hardcoded card-endpoint path allowlist (never `/withdraw` or `/send-payment`).
- **New:** `card_monitor` background worker (15s, advisory-lock leader election) — polls the issuer, fills `last4`/expiry/balance, stores gift-card redemption payloads as secrets, fires webhooks, auto-voids past `void_after`, and reconciles `ordering`-stuck rows as `orphaned_payment`.
- **New:** Webhook events `card.ordered`, `card.ready`, `card.revealed`, `card.voided`, `card.depleted`, `card.orphaned_payment`.
- **Security:** PCI-conscious reference mode (only the issuer card id + encrypted refresh token stored; PAN/CVV fetched just-in-time at reveal). Shroud's PII detector now Luhn-validates PANs and detects CVV/expiry patterns, blocking card data in LLM traffic; full-mode PANs are excluded from the admin secrets manifest.
- **DB:** migration 135 (extends `secret_type` with `payment_card`/`gift_card`), migration 136 (`payment_cards` table + agent guardrail columns).
- **Clients:** SDK `client.cards.*`, CLI `1claw card order|list|get|reveal|void|refresh|import`, MCP `order_card`/`order_gift_card`/`search_gift_cards`/`list_cards`/`get_card_status` (reveal omitted from MCP), OpenAPI spec, and a Cards dashboard page + agent "Card Ordering Guardrails" card.

---

### v0.41.2 — Overhead budget and transaction count limits (2026-07-13)

#### Anti-drain guardrails
- **New:** `tx_max_per_day` (INTEGER) on agents — daily transaction count cap (UTC calendar day). Prevents high-frequency drain attacks. Per-chain override via `per_chain_guardrails.{chain}.max_per_day`.
- **New:** `tx_overhead_budget` (JSONB) on agents — per-chain daily budget for non-value costs (rent, fees, energy) in native units. Prevents ATA rent drain (Solana), XRP reserve exhaustion, Tron energy drain, and fee storms. Format: `{"solana": "0.5", "xrp": "100", "ethereum": "0.01"}`.
- **New:** `solana_ata_allowlist` (TEXT[]) on agents — restricts which Solana wallet addresses may have Associated Token Accounts created. Prevents ATA rent drain attacks by limiting recipients.
- **New:** `agent_overhead_ledger` table (migration 127) — tracks per-chain overhead costs for budget enforcement.
- **New:** `domain/overhead.rs` — per-chain overhead cost estimation module covering EVM (gas), Solana (rent + priority fees), Bitcoin (fee rate), XRP (reserves), Cardano (min-ADA), and Tron (energy).
- **New:** Response fields `tx_count_today` and `tx_overhead_today_by_chain` in `GET /v1/agents/{id}` for dashboards and Shroud.
- **New:** `per_chain_guardrails` extended with `max_per_day`, `overhead_budget`, and `max_ata_creates_per_day` fields.
- **Shroud:** `AgentTxGuardrails` mirrors new fields; enforcement parity with Vault API.
- **Dashboard:** Transaction Guardrails card gains Max Transactions Per Day, Overhead Budget (JSON), and Solana ATA Allowlist fields. Summary badges for active limits.
- **Clients:** SDK (`tx_max_per_day`, `tx_overhead_budget`, `solana_ata_allowlist`, `tx_count_today`, `tx_overhead_today_by_chain`), CLI (`--tx-max-per-day`, `--tx-overhead-budget`, `--solana-ata-allowlist`), Python SDK, Go SDK, Mobile, and OpenAPI spec updated.

---

### v0.41.1 — TEE enforcement toggles (2026-07-13)

#### Agent-level TEE enforcement (Pro+)
- **New:** `intents_require_tee` boolean on agents — when enabled, transaction sign/submit requests to `api.1claw.xyz` are rejected with 403. Agents must route through `shroud.1claw.xyz` where signing happens inside the hardware enclave.
- **New:** `execution_require_tee` boolean on agents — when enabled, execute requests to `api.1claw.xyz` are rejected AND all direct secret reads by the agent are blocked. Forces use of Execution Intents bindings through the TEE.
- **New:** `X-1Claw-TEE-Origin` HMAC verification module (`vault/src/api/middleware/tee_origin.rs`) — Shroud sets this header on proxied requests; Vault validates using shared `ONECLAW_TEE_ORIGIN_SECRET`.
- **Changed:** "Enable Intents API" toggle moved from the Overview tab to the Signing tab on agent detail page.
- **Dashboard:** Two new TEE enforcement toggles on the Signing tab with Pro+ tier badge, disabled states (dependent on base flags), and confirmation dialog warning about breaking changes.
- **Migration 133:** Adds `intents_require_tee BOOLEAN DEFAULT false` and `execution_require_tee BOOLEAN DEFAULT false` to `agents` table.
- **JWT claims:** `intents_require_tee` and `execution_require_tee` included in agent JWTs when true.
- **Clients:** SDK, CLI (`--intents-require-tee`, `--execution-require-tee`), Python SDK, Go SDK, and OpenAPI spec updated.

---

### v0.41.0 — Live-pointer credential references for Execution Intents (2026-07-12)

#### Credential sources
- **New:** `credential_source` field on `CreateBindingRequest` and `UpdateBindingRequest` — a tagged union supporting two modes:
  - `{ type: "inline", value: {...} }` — legacy behavior, credential copied into `__agent-keys` vault
  - `{ type: "vault_ref", vault_id: "...", path: "..." }` — **live pointer** to an existing vault secret. The executor resolves the secret at execution time, so rotations in the source vault are reflected automatically without manual credential rotation.
- **New:** `BindingResponse` includes `credential_source_type` ("inline" | "vault_ref"), `credential_vault_id`, and `credential_path` so the UI can display how credentials are sourced.
- **New:** Dashboard binding form has a **Manual / From Vault** toggle — selecting "From Vault" lets users pick an existing vault secret; the binding references it directly (no duplication).
- **New:** Validation ensures the referenced vault belongs to the same org and the secret path exists.
- **Migration 132:** Adds `credential_vault_id UUID` (FK to vaults, ON DELETE SET NULL) and `credential_path TEXT` columns to `agent_bindings`.

#### Clients
- **SDK:** `CredentialSource` type exported; `CreateBindingRequest` and `UpdateBindingRequest` accept `credential_source`. Version bumped to `@1claw/sdk@0.41.0`.
- **CLI:** `agent binding create --vault-ref <vault-id>:<path>` flag. Version bumped to `@1claw/cli@0.41.0`.
- **MCP:** `create_binding` tool accepts `credential_source` parameter. Version bumped to `@1claw/mcp@0.41.0`.
- **OpenAPI:** `CredentialSource` schema added; binding request/response schemas updated. Version bumped to `@1claw/openapi-spec@0.41.0`.
- **Python SDK:** `CredentialSource` model, `credential_source` field on binding requests.
- **Go SDK:** `CredentialSource` struct, updated binding request/response types.

---

### Execution Intents 2.0 — executor framework, real GraphQL, guardrail enforcement, credential lifecycle (2026-07-12)

#### Executor framework
- **New:** Trait-based executor framework (`domain/execution/`) with a shared `ExecutionContext` that centralizes SSRF validation, host/path allowlisting, credential loading, and timeout resolution — no executor can accidentally skip a guardrail. Replaces the previous single-file HTTP dispatch.
- **New:** Real **GraphQL executor** — POSTs `{ query, variables, operationName }`, surfaces GraphQL `errors[]`, and uses introspection for connectivity tests (previously GraphQL was an HTTP alias).

#### Guardrail enforcement
- **New:** Per-binding `allowed_paths` is now enforced at execute time (trailing-`*` wildcard supported); disallowed paths are recorded as `denied`.
- **New:** Agent-level `execution_guardrails` are enforced: `allowed_hosts` (strictest of binding + agent), `allowed_binding_types` (at execute, not just create), `max_duration_ms` (applied as the real client timeout), and `max_requests_per_minute` (per-agent rate limit).
- **Changed:** Connectivity `test` now runs through the same `ExecutionContext` as `execute`, so SSRF and host-allowlist checks apply to tests too.

#### Credential lifecycle & custody
- **New:** Explicit credential rotation endpoint — `POST /v1/agents/{id}/bindings/{binding_id}/rotate-credential`.
- **New:** `credential_set` boolean on binding responses reports whether a credential is stored, without ever exposing the value.
- **Fixed:** Binding delete now **purges the stored credential** (no orphaned secrets); `secret_type` unified to `credential`.

#### Execution surface & billing
- **New:** `execution_surface` on the execute response truthfully reports `vault` or `tee` (TEE only when a Shroud execution endpoint is configured); `ONECLAW_EXECUTION_TEE_REQUIRE_SHROUD=true` makes TEE requests 501 when no enclave endpoint is present, instead of silently running in Vault.
- **Fixed:** Only **successful** executions count toward the monthly execution quota; the TEE cost premium is charged as a delta over the base rate to avoid double-billing.

#### Clients & UI
- **New:** MCP tools `create_binding`, `test_binding`, `list_executions`, and generic `execute_intent` (joining `execute_http` and `list_bindings`).
- **New:** SDK `client.bindings.rotateCredential()`; OpenAPI updated with the rotate-credential path, `credential_set`, and `execution_surface`.
- **New:** Dashboard Execution Intents card rebuilt with tabs (Bindings / Execution Log / Playground), inline binding edit + `is_active` toggle, per-binding and per-agent guardrail editors, tier-aware type gating, and write-only credential UX.
- **New:** CLI `@1claw/cli@0.40.1` — `1claw agent binding` subcommands (create, list, get, update, delete, test, rotate-credential, execute, executions); `--execution-intents` and `--execution-guardrails` on agent create/update.
- **New:** Python SDK `oneclaw@0.2.1` — `bindings.rotate_credential()`; Go SDK `v0.40.1` — `Bindings.RotateCredential()` and `credential_set` on binding responses.
- **New:** Audit events for binding create/update/delete/rotate and every execution outcome (`success` / `error` / `denied`).

### Vault 0.39.1 / Shroud 0.37.2 — dRPC managed RPC, Robinhood Chain, security hardening (2026-07-12)

#### dRPC Managed RPC Endpoints
- **New:** Automatic dRPC RPC fallback for **25 EVM chains** when `DRPC_API_KEY` is configured. When a chain has no explicit `rpc_url` in the database, the Vault and Shroud dynamically construct a dRPC endpoint URL. Supported chains: Ethereum, Base, Optimism, Arbitrum, Polygon, Avalanche, BSC, zkSync Era, Linea, Scroll, Mantle, Blast, Gnosis, Fantom, Celo, Aurora, Metis, Moonbeam, Cronos, Sepolia, Holesky, Base Sepolia, Optimism Sepolia, Arbitrum Sepolia, Polygon Amoy.
- **New:** `resolve_effective_rpc()` shared helper in Vault consolidates RPC resolution: explicit DB URL → dRPC fallback → public testnet fallback.
- **New:** Shroud `ChainRegistry` expanded to 29 EVM chains with `effective_rpc_url()` method mirroring Vault's resolution logic.
- **New:** Numeric chain ID → dRPC reverse lookup via `drpc_slug_for_chain_id()` — enables dRPC support even when chains are referenced by numeric ID only.

#### Robinhood Chain Support
- **New:** Robinhood Chain (mainnet, chain ID 4663) and Robinhood Testnet (chain ID 46630) added to the chain registry.
- **New:** Native RPC endpoints configured: `https://mainnet.robinhoodchain.com/rpc` (mainnet) and `https://testnet.robinhoodchain.com/rpc` (testnet).
- **New:** Known tokens seeded: RBH (mainnet, `0xRBH...`), USDC (mainnet), testRBH (testnet).
- **New:** `resolve_chain_id()` recognizes `robinhood-chain`, `robinhood_chain`, `robinhood`, `robinhood-testnet`, `robinhood_testnet`.
- **New:** `signing_key_chain_for()` maps `robinhood-chain` and `robinhood-testnet` to `ethereum` (secp256k1).
- **New:** Database migration `131_add_robinhood_chain.sql`.

#### Security Hardening (July 11-12 Audit)
- **Fixed (HIGH):** Execution Intents cross-agent confused-deputy — all binding handlers (`list_bindings`, `get_binding`, `execute`, `test_binding`, `list_execution_events`) now enforce `caller.id == agent_id` ownership check. Previously, an agent with Execution Intents enabled could access another agent's bindings.
- **Fixed (HIGH):** X-Forwarded-For IP spoofing — changed from leftmost to **rightmost** XFF entry parsing for untrusted requests. GCP's Global Frontend appends the true client IP as the last entry; leftmost parsing was trusting attacker-controlled values.
- **Fixed (MEDIUM):** Platform-grant scope bypass — `authorize_platform_grant` enforced on `delete_secret`, `get_secret_version`, `rotate_secret`, and `disable_version` handlers. Previously, platform grants with `allowed_paths` restrictions were not checked on these operations.
- **Fixed (MEDIUM):** Execution events plaintext response bodies — response bodies are now truncated to 4KB, sensitive headers stripped, and sensitive patterns (API keys, tokens) redacted before persisting to `execution_events`. Field `redactions_applied` tracks sanitization.
- **Fixed (LOW):** SSRF trailing-dot bypass — `validate_audience_url()` and `validate_redirect_uri()` now strip trailing dots from hostnames before security checks (e.g., `metadata.google.internal.` no longer bypasses the blocklist).
- **Fixed (LOW):** Execution event caller misattribution — `insert_execution_event` now uses `caller.id` instead of `agent_id` from the URL for correct audit attribution.

#### Intents API Chain Parity
- **Improved:** `resolve_chain_id()` expanded from 10 to **30 chain names/aliases** — all dRPC-supported networks are now resolvable by name in transaction requests.
- **Improved:** Shroud `drpc_chain_slug()` made case-insensitive for parity with Vault.
- **Improved:** Shroud `seed_defaults()` expanded to cover all 29 EVM chains with correct chain IDs, native currencies, and EIP-1559 support flags.

#### Infrastructure
- **New:** `DRPC_API_KEY` environment variable on Vault (Cloud Run) and Shroud (GKE). Configured via Terraform (`infra/variables.tf`), GitHub Actions secrets, and K8s secrets.
- **New:** `scripts/test-drpc-connectivity.sh` — verifies dRPC connectivity across 22 chains via `eth_chainId` calls.
- **New:** dRPC connectivity test integrated into `run-production-tests.sh` (auto-skipped when `DRPC_API_KEY` is not set).

---

### API v2.26.0 / SDK 0.40.0 / Vault 0.39.0 / MCP 0.40.0 — Execution Intents (2026-07-10)

#### Execution Intents (Pro+)
- **New:** Execution Intents API — agents can make HTTP calls, database queries, and external service interactions through pre-configured **bindings**. Credentials are stored server-side in the `__agent-keys` vault and never exposed to agents.
- **New:** Binding types: HTTP, GraphQL (Pro tier), plus Postgres, MySQL, Redis, gRPC, SMTP, Cloud SDK, S3, Custom (Team+ tier). TEE execution mode available on Business+ for enhanced security.
- **New:** Per-binding guardrails: host allowlists, timeouts, authentication types (bearer, basic, header, query).
- **New:** Full execution audit trail via `execution_events` table with per-event cost tracking.
- **New:** CRUD endpoints under `/v1/agents/{id}/bindings` (human-only creation). Execute endpoint: `POST /v1/agents/{id}/execute`. Test endpoint: `POST /v1/agents/{id}/bindings/{binding_id}/test`.
- **New:** Agent field `execution_intents_enabled` (boolean, default false). JWT claim `execution_intents_enabled` gates access; middleware `require_execution_intents` enforces it.
- **New:** `execution_guardrails` JSONB on agents — per-agent execution guardrails (allowed hosts, max duration, rate limits).
- **New:** Tier-based billing: `execution_intent` (2¢ Pro → 0.5¢ Business) and `execution_intent_tee` (10¢ Pro → 2.5¢ Business) per execution. Monthly limits: Pro 1K, Team 10K, Business 50K, Enterprise unlimited.

#### SDK/CLI/MCP/Dashboard
- **SDK:** `client.bindings.create()`, `.list()`, `.get()`, `.update()`, `.delete()`, `.test()`, `.execute()`, `.listExecutions()`.
- **MCP:** New `execute_http` and `list_bindings` tools.
- **CLI:** Execution intents support via SDK integration.
- **Dashboard:** `ExecutionIntentsCard` on agent detail page — toggle, binding list, create/test/delete.

#### Migrations
- `129_execution_intents.sql` — `agent_bindings` and `execution_events` tables.

#### Version Bumps
- Vault API: 0.39.0
- SDK: 0.40.0
- MCP: 0.40.0
- CLI: 0.40.0
- OpenAPI: 0.40.0

---

### API v2.25.0 / SDK 0.38.0 / Vault 0.38.0 / MCP 0.38.0 — Token guardrails, known tokens registry, per-chain guardrails (2026-07-05)

#### Added
- **Token allowlist guardrail** (`tx_token_allowlist`): Controls which token contracts/mints an agent can interact with. Applied to `token_mint` on non-EVM chains and ERC-20 contract addresses on EVM chains. Checked case-insensitively.
- **Known tokens only** (`tx_known_tokens_only`): When enabled, restricts agents to verified tokens in the known tokens registry. Unknown token contracts/mints are rejected with 403.
- **XRP transaction type allowlist** (`xrpl_allowed_tx_types`): Controls which XRPL transaction types are allowed when using `xrpl_tx_json`. Empty = all supported types. Unsupported types return 403.
- **Per-chain guardrails** (`per_chain_guardrails`): Chain-specific overrides for `max_value`, `daily_limit`, `to_allowlist`, and `token_allowlist`. Strictest of global and per-chain values wins.
- **Per-chain daily spend tracking** (`tx_spent_today_by_chain`): `GET /v1/agents/{id}` now returns per-chain daily spend in native units with correct decimals (e.g. `{ "ethereum": "0.5", "solana": "2.0" }`). The canonical field is `tx_spent_today` / `tx_spent_today_by_chain`; the deprecated `tx_spent_today_eth` alias is still returned for backward compatibility.
- **Known tokens registry**: Public endpoints `GET /v1/tokens` (filterable by `?chain=`) and `GET /v1/chains/{chain}/tokens` for listing verified tokens. Admin endpoints `POST /v1/admin/tokens` and `DELETE /v1/admin/tokens/{id}` for registry management.
- **ERC-20 server-side builder**: When `token_mint` is provided on EVM chains, the handler generates ERC-20 `transfer(to, amount)` calldata server-side — agents no longer need to construct calldata manually.
- **Extended token balance**: `GET /v1/agents/{id}/signing-keys/{chain}/balance` now accepts optional `?tokens=` query param (comma-separated contract addresses/mints) to include specific ERC-20/SPL/TRC-20 token balances alongside native balance.
- **Solana ATA auto-creation**: SPL token transfers automatically create the recipient's Associated Token Account if it doesn't exist, adding a `CreateAssociatedTokenAccount` instruction before the transfer.
- **Cardano native asset transfers**: Multi-asset output support with min-ADA enforcement. `token_mint` is `policy_id.asset_name` hex.
- **Memo support**: Solana (Memo Program v2 instruction appended), XRP (Memos array in `xrpl_tx_json`), Tron (`extra_data` field).
- **UTXO locking**: Concurrent Bitcoin and Cardano transactions are serialized via the `utxo_locks` table to prevent double-spending the same UTXO. Locks auto-expire after 5 minutes.

#### Fixed
- **Daily spend unit mismatch**: Per-chain daily spend now uses correct native-unit decimals instead of ETH-equivalent conversion, which could under-count spend on high-decimal chains.
- **XRP guardrail bypass**: `xrpl_tx_json` transactions now enforce all agent guardrails (chains, allowlist, value caps, daily limits) — previously bypassed when using raw XRPL JSON.
- **`/sign` EVM persistence**: Transactions submitted via the unified `POST /v1/agents/{id}/sign` endpoint with `intent_type: "transaction"` are now correctly persisted for audit and daily-limit tracking.

#### Migrations
- `124_agent_token_guardrails.sql` — `tx_token_allowlist`, `tx_known_tokens_only`, `xrpl_allowed_tx_types`, `per_chain_guardrails` columns on `agents` table.
- `125_known_tokens.sql` — `known_tokens` table with unique index on `(chain, contract_address)`.
- `126_utxo_locks.sql` — `utxo_locks` table for concurrent UTXO transaction serialization.

#### SDK/CLI/Dashboard
- **SDK**: `CreateAgentRequest`, `UpdateAgentRequest`, and `AgentResponse` include all new guardrail fields. Token registry types added.
- **CLI**: New flags `--tx-token-allowlist`, `--tx-known-tokens-only`, `--xrpl-allowed-tx-types`, `--per-chain-guardrails` on `agent create` and `agent update`.
- **Dashboard**: Token allowlist editor, known-tokens-only toggle, per-chain guardrails visual editor, and XRPL transaction type multi-select on agent detail page. Token registry hook (`use-token-registry.ts`).

---

### Vault 0.37.1 / Shroud 0.37.1 — Official Rust SDKs for Bitcoin & Solana signing (2026-07-04)

- **Improved:** Bitcoin transaction signing now uses the official **`rust-bitcoin`** crate (v0.32) instead of hand-rolled secp256k1 + BIP-143 logic. All recipient address types are supported: P2PKH, P2SH, P2WPKH, P2WSH, and P2TR (Taproot). Key generation, address derivation, and UTXO-based transaction construction use `rust-bitcoin` types end-to-end, eliminating custom serialization code.
- **Improved:** Solana transaction signing now uses the official **`solana-sdk`** crate (v4) instead of manual Ed25519 + compact message serialization. PDA derivation uses `Pubkey::find_program_address` (replacing the custom off-curve check with `curve25519-dalek`). SPL token transfers use proper Associated Token Account derivation. Key generation, address formatting, and transaction construction are fully type-safe.
- **Improved:** Shroud TEE signing mirrors all changes — both `vault` and `shroud` now use identical SDK-backed implementations for Bitcoin and Solana.
- **Tests:** Comprehensive unit tests added for both chains in both `vault` and `shroud`: key generation determinism, address derivation across networks (mainnet/testnet/signet), signing to all recipient address types, multi-UTXO inputs, dust change handling, invalid address rejection, SPL token transfers, shortvec encoding, and blockhash variation.
- **Verified end-to-end:** Live testnet transactions confirmed on all non-EVM chains — Solana Devnet (sign-only, submit/broadcast, unified sign), Bitcoin Signet (sign-only, submit/broadcast), Tron Shasta (sign-only, submit/broadcast), and Cardano Preprod (sign-only, submit/broadcast).
- **Docs:** Intents API guide updated with comprehensive [testnet reference table](https://docs.1claw.xyz/docs/agents/intents/signing#non-evm-networks) including faucet links, external API dependencies, and network-specific address format notes for all 5 non-EVM chains.

### API v2.24.0 / SDK 0.37.0 / Vault 0.37.0 / MCP 0.37.0 — Broad XRPL coverage (2026-07-03)

- **New:** **30+ XRPL transaction types** via the `xrpl_tx_json` field on `SubmitTransactionRequest`, `SignTransactionRequest`, and `SignIntentRequest`. Pass a raw XRPL transaction JSON object and the server uses the `xrpl-rust` binary codec to encode and sign it. `Account`, `Sequence`, `Fee`, `LastLedgerSequence`, and `SigningPubKey` are auto-filled when absent. Supported types: Payment, TrustSet, OfferCreate, OfferCancel, AccountSet, AccountDelete, EscrowCreate/Finish/Cancel, PaymentChannelCreate/Fund/Claim, NFTokenMint/Burn/CreateOffer/AcceptOffer/CancelOffer, AMMCreate/Deposit/Withdraw/Bid/Delete/Vote, SetRegularKey, SignerListSet, DepositPreauth, CheckCreate/Cash/Cancel, TicketCreate, Clawback.
- **New:** `xrpl-rust` v1.1.0 crate added to both Vault and Shroud (TEE), replacing the hand-rolled Payment-only STObject serializer. The legacy `to`/`value`/`destination_tag` Payment path is preserved for backward compatibility.
- **New:** Unsupported XRPL transaction types are rejected with a descriptive error listing all supported types.
- **SDK:** `xrpl_tx_json` field added to `SubmitTransactionRequest`, `SignTransactionRequest`, and `SignIntentRequest` in the TypeScript SDK, Python SDK, and Go SDK.
- **MCP:** `submit_transaction` and `sign_transaction` tools accept `xrpl_tx_json` parameter.
- **OpenAPI:** `xrpl_tx_json` field added to all three transaction request schemas.
- **Tests:** `test-nonevm-signing-prod.sh` extended with TrustSet, AccountSet, unsupported type, and unified `/sign` OfferCreate tests. `test-shroud-prod.sh` gains XRP `xrpl_tx_json` TrustSet dispatch test and XRP Payment dispatch test.
- **Dashboard:** Intents page updated to highlight XRP's 30+ transaction type support.
- **Examples:** `examples/non-evm-keys` updated with TrustSet example via `xrpl_tx_json`.

### API v2.23.0 / SDK 0.36.0 / Vault 0.36.0 / MCP 0.36.0 — Non-EVM transaction signing (2026-07-03)

- **New:** Full on-chain **transaction signing + broadcast** for **Bitcoin, Solana, XRP, Cardano, and Tron** through the Intents API (`POST /v1/agents/{id}/transactions`, `POST .../transactions/sign`, unified `POST .../sign` with `intent_type: "transaction"`). 1Claw dispatches by chain family, auto-fetches chain data (Bitcoin UTXOs/fee via mempool.space, Solana blockhash, XRP sequence, Cardano protocol params via Blockfrost, Tron ref block via TronGrid), signs in the HSM (or Shroud TEE), and broadcasts.
- **New:** Chain-specific optional fields on transaction requests: `destination_tag` (XRP), `memo`, `fee_rate_sat_per_vbyte` (Bitcoin), `fee_limit_sun` (Tron TRC-20), `token_mint` / `token_decimals` (Solana SPL + Tron TRC-20), `ttl` (Cardano). `value` is the human-readable major unit (BTC/SOL/XRP/ADA/TRX) as a decimal string.
- **New:** Chain registry migration adds `chain_type` column and seeds non-EVM mainnets + testnets (`bitcoin-testnet`, `solana-devnet`, `xrp-testnet`, `cardano-preprod`, `tron-shasta`, etc.).
- **New:** Shroud TEE parity — non-EVM signing inside confidential memory with the same family dispatch and guardrails as Vault API.
- **Note:** Tenderly `simulate_first` and `/simulate` endpoints remain **EVM-only** (no-op for non-EVM chains).
- **Cardano:** Requires server-side Blockfrost project id (`BLOCKFROST_PROJECT_ID_PREPROD`, `BLOCKFROST_PROJECT_ID_MAINNET`, or generic `BLOCKFROST_PROJECT_ID`).
- **Examples:** `examples/non-evm-keys` now includes `npm run sign -- <chain> <to> <amount>` for sign + broadcast demos.
- **Tests:** New `scripts/test-nonevm-signing-prod.sh` wired into `run-production-tests.sh`; Shroud prod tests assert non-EVM dispatch.
- **SDK:** `SubmitTransactionRequest` / `SignTransactionRequest` extended with non-EVM fields; OpenAPI spec updated.

### API v2.22.0 / SDK 0.35.0 / Vault 0.35.0 — Platform resource grants (2026-07-03)

- **New:** Platform resource grants — users can grant platform apps access to specific vaults and agents via `POST /v1/platform/connections/{id}/grant`. Grants are per-vault with configurable `allowed_paths` and `permissions`. List active grants via `GET .../grants`, revoke individual grants via `DELETE .../grants/{grant_id}`.
- **New:** Dashboard grant page at `/connect/{slug}/grant` — vault/agent picker with checkboxes for selecting resources to share with a platform app. Linked from OAuth consent and claim flows.
- **Enhanced:** Connected Apps page (`/settings/connected-apps`) rewritten — now shows vault/agent counts per app, expandable "Resource Grants" panel with per-grant details, and individual revoke buttons with confirmation dialog.
- **Fixed:** `GET /v1/platform/connected-apps` response key changed from `connected_apps` to `apps` to match the SDK and dashboard expectations.
- **SDK:** New methods on `PlatformResource`: `grantAccess(connectionId, data)`, `listGrants(connectionId)`, `revokeGrant(connectionId, grantId)`.

## 2026-06

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
- **Docs:** [Shroud supported models](/docs/reference/shroud-supported-models#bankr-models), [Shroud guide](/docs/agents/shroud/overview#supported-providers), [Ecosystem](/docs/integrations/ecosystem).

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
- **Docs:** [Quickstart for agents](/docs/quickstart/agents), [Agent self-onboarding](/docs/agents/self-enrollment), [Give an agent access](/docs/vaults/golden-path), [OpenClaw](/docs/integrations/openclaw).

### MPC Secret Storage

- **New:** Multi-Party Computation (MPC) secret storage — split secret DEKs across multiple HSM providers so no single provider holds the complete key. Three custody modes: `2of2_client_custody` (XOR split, client holds one share), `2of3_multi_hsm` (Shamir 2-of-3 across GCP KMS + AWS KMS + Azure Key Vault, fully server-side), `2of3_client_custody` (Shamir 2-of-3 with client share).
- **New:** `POST /v1/vaults/{id}/mpc` — enable MPC on a vault (user-only, Business/Enterprise tiers).
- **New:** `client_share` returned in `SecretCreatedResponse` for client custody modes. Must be stored securely — only returned once. Required via `X-Client-Share` header on read.
- **New:** Crypto modules — `mpc_provider.rs` (orchestrates split/reconstruct), `shamir.rs` (Shamir secret sharing over GF(256)), `xor_split.rs` (XOR 2-of-2), `hsm_aws.rs` (AWS KMS CryptoProvider), `hsm_azure.rs` (Azure Key Vault CryptoProvider).
- **New:** Database tables `vault_mpc_keks` and `secret_dek_shares` (migration 063).
- **New:** [MPC guide](/docs/vaults/mpc) in documentation.

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
