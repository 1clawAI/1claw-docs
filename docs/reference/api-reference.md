---
title: API reference
description: Complete list of all v1 API endpoints for the 1claw vault, grouped by domain.
sidebar_position: 0
---

# API reference

The canonical API spec is the **OpenAPI 3.1** document shipped with the project. It defines all paths, request/response schemas, and error shapes.

## Base URL

- **Production:** `https://api.1claw.xyz`
- **Dashboard proxy:** `https://1claw.xyz/api` (proxies to the same API)

All endpoints are under **/v1**.

---

## Public (no auth)

| Method | Path                  | Description                                           |
| ------ | --------------------- | ----------------------------------------------------- |
| GET    | `/v1/health`          | Service health                                        |
| GET    | `/v1/health/hsm`      | HSM connectivity                                      |
| GET    | `/v1/share/:share_id` | Access a shared secret (checks expiry + access count) |

## Authentication

| Method | Path                        | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| POST   | `/v1/auth/signup`           | Self-service signup (email + password) → JWT        |
| POST   | `/v1/auth/token`            | Email/password → JWT                                |
| POST   | `/v1/auth/agent-token`      | Agent ID + API key → JWT                            |
| POST   | `/v1/auth/api-key-token`    | Personal API key → JWT                              |
| POST   | `/v1/auth/google`           | Google id_token → JWT                               |
| DELETE | `/v1/auth/token`            | Revoke token                                        |
| POST   | `/v1/auth/change-password`  | Change password                                     |
| POST   | `/v1/auth/forgot-password`  | Request password reset email (returns `status`: `email_sent`, `no_account`, or `social_account`) |
| POST   | `/v1/auth/reset-password`   | Complete password reset with email token             |
| POST   | `/v1/auth/set-password`     | Set password for OIDC-provisioned users (no existing password) |
| POST   | `/v1/auth/change-email`     | Initiate email change (sends verification code)     |
| POST   | `/v1/auth/verify-email-change` | Complete email change with verification code     |
| POST   | `/v1/auth/reauth`           | Step-up re-authentication (returns `reauth_token`)  |

## Account Management

| Method | Path                    | Description                                  |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/v1/auth/me`           | Get current user profile                     |
| PATCH  | `/v1/auth/me`           | Update profile (display name, marketing opt-in) |
| DELETE | `/v1/auth/me`           | Delete account and all associated data       |
| POST   | `/v1/auth/export-data`  | GDPR data export (JSON archive of user data) |

## MFA (Two-Factor Authentication)

| Method | Path                       | Description                        |
| ------ | -------------------------- | ---------------------------------- |
| GET    | `/v1/auth/mfa/status`      | Check MFA enrollment status        |
| POST   | `/v1/auth/mfa/setup`       | Begin TOTP MFA enrollment          |
| POST   | `/v1/auth/mfa/verify-setup`| Verify TOTP code to complete setup |
| POST   | `/v1/auth/mfa/verify`      | Verify MFA code during login (public) |
| DELETE | `/v1/auth/mfa`             | Disable MFA (requires code or password) |

## Device Authorization (CLI Login)

| Method | Path                                 | Description                      |
| ------ | ------------------------------------ | -------------------------------- |
| POST   | `/v1/auth/device/code`               | Request device authorization code |
| POST   | `/v1/auth/device/token`              | Poll for device authorization token |
| GET    | `/v1/auth/device/code/:user_code`    | Check device code status (public) |
| POST   | `/v1/auth/device/approve`            | Approve CLI device login          |
| POST   | `/v1/auth/device/deny`               | Deny CLI device login             |

## Personal API Keys

| Method | Path                        | Description    |
| ------ | --------------------------- | -------------- |
| POST   | `/v1/auth/api-keys`         | Create API key |
| GET    | `/v1/auth/api-keys`         | List API keys  |
| DELETE | `/v1/auth/api-keys/:key_id` | Revoke API key |

## Mobile Devices

Device registration and step-up authentication for the 1Claw mobile companion app. WebAuthn passkey-based attestation for high-risk approvals.

| Method | Path                                           | Description                              |
| ------ | ---------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/auth/devices`                             | Register a mobile device                 |
| GET    | `/v1/auth/devices`                             | List registered devices                  |
| DELETE | `/v1/auth/devices/:device_id`                  | Revoke a device                          |
| POST   | `/v1/auth/devices/:device_id/challenge`        | Create a step-up authentication challenge |
| POST   | `/v1/auth/devices/:device_id/attest`           | Attest a step-up challenge (WebAuthn)    |
| POST   | `/v1/auth/devices/:device_id/push-token`       | Register push notification token         |

## Approvals

Human-in-the-loop approval queue for irreversible agent actions. Agents submit approval requests; humans review and decide via mobile app, dashboard, or CLI.

| Method | Path                                    | Description                                          |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| GET    | `/v1/approvals`                         | List approval requests (filterable by status)        |
| GET    | `/v1/approvals/:approval_id`            | Get approval details                                 |
| POST   | `/v1/approvals/:approval_id/decide`     | Approve or reject (requires step-up for critical)    |

## Vaults

| Method | Path                   | Description  |
| ------ | ---------------------- | ------------ |
| POST   | `/v1/vaults`           | Create vault |
| GET    | `/v1/vaults`           | List vaults  |
| GET    | `/v1/vaults/:vault_id` | Get vault    |
| DELETE | `/v1/vaults/:vault_id` | Delete vault |

## CMEK (Customer-Managed Encryption Keys)

| Method | Path                                           | Description                    |
| ------ | ---------------------------------------------- | ------------------------------ |
| POST   | `/v1/vaults/:vault_id/cmek`                    | Enable CMEK on a vault         |
| DELETE | `/v1/vaults/:vault_id/cmek`                    | Disable CMEK on a vault        |
| POST   | `/v1/vaults/:vault_id/cmek-rotate`             | Start CMEK key rotation job    |
| GET    | `/v1/vaults/:vault_id/cmek-rotate/:job_id`     | Get rotation job status        |

## Secrets

| Method | Path                                 | Description                  |
| ------ | ------------------------------------ | ---------------------------- |
| GET    | `/v1/vaults/:vault_id/secrets`       | List secrets (metadata only) |
| PUT    | `/v1/vaults/:vault_id/secrets/*path` | Create or update secret      |
| GET    | `/v1/vaults/:vault_id/secrets/*path` | Get secret value (decrypted) |
| DELETE | `/v1/vaults/:vault_id/secrets/*path` | Soft-delete secret           |

## Policies

| Method | Path                                       | Description   |
| ------ | ------------------------------------------ | ------------- |
| POST   | `/v1/vaults/:vault_id/policies`            | Create policy |
| GET    | `/v1/vaults/:vault_id/policies`            | List policies |
| PUT    | `/v1/vaults/:vault_id/policies/:policy_id` | Update policy |
| DELETE | `/v1/vaults/:vault_id/policies/:policy_id` | Delete policy |

## Agent Self-Enrollment (Public)

| Method | Path               | Description                                                                |
| ------ | ------------------ | -------------------------------------------------------------------------- |
| POST   | `/v1/agents/enroll`| Self-enroll (optional `human_email`, or link-only with `approval_url`); credentials after approval (no auth) |

## Agents

| Method | Path                              | Description                                             |
| ------ | --------------------------------- | ------------------------------------------------------- |
| POST   | `/v1/agents`                      | Register agent                                          |
| GET    | `/v1/agents`                      | List agents                                             |
| GET    | `/v1/agents/me`                   | Get calling agent's own profile (includes `created_by`) |
| GET    | `/v1/agents/:agent_id`            | Get agent                                               |
| PATCH  | `/v1/agents/:agent_id`            | Update agent (name, description, intents_api_enabled)  |
| DELETE | `/v1/agents/:agent_id`            | Deactivate agent                                        |
| POST   | `/v1/agents/:agent_id/rotate-key` | Rotate agent API key                                    |

## Sharing

| Method | Path                           | Description                                                                     |
| ------ | ------------------------------ | ------------------------------------------------------------------------------- |
| POST   | `/v1/secrets/:secret_id/share` | Create share (`creator`, `user`, `agent`, `external_email`, `anyone_with_link`) |
| GET    | `/v1/shares/outbound`          | List shares you created                                                         |
| GET    | `/v1/shares/inbound`           | List shares sent to you                                                         |
| POST   | `/v1/shares/:share_id/accept`  | Accept an inbound share                                                         |
| POST   | `/v1/shares/:share_id/decline` | Decline an inbound share                                                        |
| DELETE | `/v1/share/:share_id`          | Revoke share (creator only)                                                     |

## Chains (public, no auth)

| Method | Path                     | Description                      |
| ------ | ------------------------ | -------------------------------- |
| GET    | `/v1/chains`             | List supported blockchain chains |
| GET    | `/v1/chains/:identifier` | Get chain by ID or chain_id      |

## Treasury

Multi-chain treasury wallets and Safe multisig management. See [Treasury guide](/docs/guides/treasury).

### Treasury wallets (multi-chain, human-only)

| Method | Path                                      | Description                                    |
| ------ | ----------------------------------------- | ---------------------------------------------- |
| POST   | `/v1/treasury/wallets/generate`           | Generate wallets for specified or all chains   |
| GET    | `/v1/treasury/wallets`                    | List all active treasury wallets               |
| GET    | `/v1/treasury/wallets/:chain`             | Get wallet for a specific chain                |
| GET    | `/v1/treasury/wallets/:chain/balance`     | Get native + ERC-20 token balances             |
| POST   | `/v1/treasury/wallets/:chain/send`        | Send native/ERC-20 (requires X-Auth-Confirm)   |
| POST   | `/v1/treasury/wallets/:chain/swap`        | Swap tokens via 0x (requires X-Auth-Confirm)   |
| POST   | `/v1/treasury/wallets/:chain/export`      | Export wallet with private key (audit-logged)   |
| POST   | `/v1/treasury/wallets/:chain/import`      | Import wallet (BYOK, requires X-Auth-Confirm)  |
| POST   | `/v1/treasury/wallets/:chain/rotate`      | Rotate wallet keypair                          |
| DELETE | `/v1/treasury/wallets/:chain`             | Deactivate wallet                              |

### Safe multisig management

| Method | Path                                                                 | Description                    |
| ------ | -------------------------------------------------------------------- | ------------------------------ |
| POST   | `/v1/treasury`                                                      | Create a treasury (Safe multisig) |
| GET    | `/v1/treasury`                                                      | List treasuries                |
| GET    | `/v1/treasury/:treasury_id`                                         | Get treasury details           |
| POST   | `/v1/treasury/:treasury_id/signers`                                 | Add a signer (user or agent)   |
| DELETE | `/v1/treasury/:treasury_id/signers/:signer_id`                      | Remove a signer                |
| POST   | `/v1/treasury/:treasury_id/access-requests`                         | Request access (agent-only)    |
| GET    | `/v1/treasury/:treasury_id/access-requests`                         | List access requests           |
| POST   | `/v1/treasury/:treasury_id/access-requests/:request_id/approve`      | Approve an access request      |
| POST   | `/v1/treasury/:treasury_id/access-requests/:request_id/deny`         | Deny an access request        |

### Treasury proposals (multisig)

| Method | Path                                                                  | Description                              |
| ------ | --------------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/treasury/:treasury_id/proposals`                                 | Create a proposal                        |
| GET    | `/v1/treasury/:treasury_id/proposals`                                 | List proposals (filterable by status)    |
| GET    | `/v1/treasury/:treasury_id/proposals/:proposal_id`                    | Get proposal + collected signatures      |
| POST   | `/v1/treasury/:treasury_id/proposals/:proposal_id/sign`               | Submit signature (approve/reject)        |
| POST   | `/v1/treasury/:treasury_id/proposals/:proposal_id/execute`            | Force-execute if threshold met           |
| DELETE | `/v1/treasury/:treasury_id/proposals/:proposal_id`                    | Cancel a pending proposal                |

## Agent Signing Keys

Per-agent, per-chain signing keys provisioned by humans. Keys are stored in the HSM-backed `__agent-keys` vault. Supported chains: Ethereum, Bitcoin, Solana, XRP, Cardano, Tron.

| Method | Path                                                      | Description                              |
| ------ | --------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/signing-keys`                       | Provision a signing key for a chain      |
| GET    | `/v1/agents/:agent_id/signing-keys`                       | List all signing keys for the agent      |
| POST   | `/v1/agents/:agent_id/signing-keys/:chain/rotate`         | Rotate a chain's signing key             |
| DELETE | `/v1/agents/:agent_id/signing-keys/:chain`                | Deactivate a chain's signing key         |
| POST   | `/v1/agents/:agent_id/signing-keys/:chain/export`         | Export signing key (requires X-Auth-Confirm) |
| POST   | `/v1/agents/:agent_id/signing-keys/:chain/import`         | Import signing key (BYOK, requires X-Auth-Confirm) |
| GET    | `/v1/agents/:agent_id/signing-keys/:chain/balance`        | Get balance for signing key address      |

## Agent Smart Accounts

Import existing Gnosis Safe smart accounts for agents.

| Method | Path                                                      | Description                              |
| ------ | --------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/smart-accounts/import`              | Import an existing Safe (optional on-chain verification) |

## Transactions & Signing (Intents API)

Requires `intents_api_enabled: true` on the agent. When enabled, the agent is also **blocked** from reading `private_key` and `ssh_key` type secrets through the standard secrets endpoint — it must use the proxy to sign transactions.

| Method | Path                                                | Description                                                    |
| ------ | --------------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/v1/agents/:agent_id/transactions`                 | Submit a transaction (supports `simulate_first` flag)          |
| POST   | `/v1/agents/:agent_id/transactions/sign`            | Sign a transaction without broadcasting (BYORPC)               |
| GET    | `/v1/agents/:agent_id/transactions`                 | List agent transactions                                        |
| GET    | `/v1/agents/:agent_id/transactions/:tx_id`          | Get transaction details                                        |
| POST   | `/v1/agents/:agent_id/transactions/simulate`        | Simulate a transaction via Tenderly (no signing)               |
| POST   | `/v1/agents/:agent_id/transactions/simulate-bundle` | Simulate a bundle of sequential transactions (approve + swap)  |
| POST   | `/v1/agents/:agent_id/sign`                         | Unified sign: EIP-191, EIP-712, or transaction (types 0–4)    |

## Secret Versioning & Rotation

| Method | Path                                                           | Description                                     |
| ------ | -------------------------------------------------------------- | ----------------------------------------------- |
| GET    | `/v1/vaults/:vault_id/secret-versions/*path`                   | List all versions of a secret (newest first)    |
| GET    | `/v1/vaults/:vault_id/secret-version/*path/:version`           | Get a specific version of a secret              |
| POST   | `/v1/vaults/:vault_id/secret-version/*path/:version/disable`   | Disable a version (retained for audit, 410 on read) |
| POST   | `/v1/vaults/:vault_id/secret-rotate/*path`                     | Server-side rotation (generate new random value) |

## Agent Memory

Three-tier memory: scratch (TTL-based), durable (persistent KV), and semantic (vector-indexed). Encrypted at rest. Requires `memory_enabled: true` on agent.

| Method | Path                                                  | Description                                |
| ------ | ----------------------------------------------------- | ------------------------------------------ |
| GET    | `/v1/agents/:agent_id/memory`                         | List memory namespaces                     |
| GET    | `/v1/agents/:agent_id/memory/:namespace`               | List entries in a namespace                |
| PUT    | `/v1/agents/:agent_id/memory/:namespace/:key`          | Upsert a memory entry                     |
| GET    | `/v1/agents/:agent_id/memory/:namespace/:key`          | Get a memory entry                         |
| DELETE | `/v1/agents/:agent_id/memory/:namespace/:key`          | Delete a memory entry                      |
| POST   | `/v1/agents/:agent_id/memory/search`                   | Semantic search (`{ namespace, query, top_k }`) |

## Automations

Cron-scheduled, webhook-triggered, event-driven, and manual automation workflows. Multi-step pipelines with 14 step types.

| Method | Path                                                                  | Description                                  |
| ------ | --------------------------------------------------------------------- | -------------------------------------------- |
| GET    | `/v1/automations/presets`                                             | List marketing-ready automation presets (public) |
| POST   | `/v1/automations`                                                     | Create automation (requires `workflow_spec` + `agent_id`) |
| GET    | `/v1/automations`                                                     | List automations (enriched with stats)       |
| GET    | `/v1/automations/:id`                                                 | Get automation details                       |
| PATCH  | `/v1/automations/:id`                                                 | Update automation                            |
| DELETE | `/v1/automations/:id`                                                 | Delete automation                            |
| POST   | `/v1/automations/:id/trigger`                                         | Manually trigger an automation               |
| GET    | `/v1/automations/:id/runs`                                            | List automation runs                         |
| GET    | `/v1/automations/:id/runs/:run_id`                                    | Get run details                              |
| POST   | `/v1/automations/:id/runs/:run_id/cancel`                             | Cancel a running/awaiting run (human-only)   |
| POST   | `/v1/automations/webhook/:id/:token`                                  | Public webhook trigger                       |
| POST   | `/v1/automations/:id/rotate-webhook-token`                            | Rotate webhook token (human-only)            |
| POST   | `/v1/automations/assist/draft`                                        | NL → workflow heuristic parser (human-only)  |
| POST   | `/v1/automations/assist/session`                                      | Create 15-min assist session (human-only)    |

## Cloud Runtimes

Managed containers with lifecycle management, hosting, idle auto-stop, and interactive shell.

| Method | Path                                            | Description                                  |
| ------ | ----------------------------------------------- | -------------------------------------------- |
| POST   | `/v1/runtimes`                                  | Create a runtime                             |
| GET    | `/v1/runtimes`                                  | List runtimes                                |
| GET    | `/v1/runtimes/:id`                              | Get runtime details                          |
| PATCH  | `/v1/runtimes/:id`                              | Update runtime                               |
| DELETE | `/v1/runtimes/:id`                              | Delete runtime                               |
| POST   | `/v1/runtimes/:id/start`                        | Start a runtime                              |
| POST   | `/v1/runtimes/:id/stop`                         | Stop a runtime                               |
| GET    | `/v1/runtimes/:id/logs`                         | Get runtime logs                             |
| GET    | `/v1/runtimes/slug-check/:slug`                 | Check slug availability for hosting          |
| POST   | `/v1/runtimes/:id/shell/session`                | Create interactive shell session (human-only) |
| POST   | `/v1/runtimes/:id/shell/passkey/begin`          | Begin passkey auth for shell access          |
| POST   | `/v1/runtimes/:id/chat`                         | Chat with runtime agent (SSE streaming)      |
| POST   | `/v1/runtimes/:id/chat/unlock`                  | Step-up auth to unlock runtime chat          |

## Agent Chat

Dashboard and API chat with agents via Shroud LLM proxy. Conversations persist across sessions.

| Method | Path                                                              | Description                              |
| ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/chat`                                       | Send message (SSE streaming response)    |
| POST   | `/v1/agents/:agent_id/chat/unlock`                                 | Step-up auth to unlock chat              |
| GET    | `/v1/agents/:agent_id/chat/conversations`                          | List conversations                       |
| GET    | `/v1/agents/:agent_id/chat/conversations/:id`                      | Get conversation with messages           |
| DELETE | `/v1/agents/:agent_id/chat/conversations/:id`                      | Delete conversation                      |

## Messaging Channels

Connect agents to Telegram, WhatsApp, and Discord. Bi-directional messaging with auto-respond.

| Method | Path                                                            | Description                              |
| ------ | --------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/channels`                                 | Create a channel                         |
| GET    | `/v1/agents/:agent_id/channels`                                 | List agent's channels                    |
| PATCH  | `/v1/agents/:agent_id/channels/:id`                              | Update channel                           |
| DELETE | `/v1/agents/:agent_id/channels/:id`                              | Delete channel                           |
| POST   | `/v1/agents/:agent_id/channels/:id/send`                         | Send outbound message                    |
| POST   | `/v1/agents/:agent_id/channels/:id/test`                         | Test channel connectivity                |
| POST   | `/v1/agents/:agent_id/channels/:id/refresh-webhook`              | Refresh/repair channel webhook           |
| GET    | `/v1/agents/:agent_id/channels/:id/messages`                     | List channel messages                    |

### Public channel webhook endpoints

| Method | Path                                    | Description            |
| ------ | --------------------------------------- | ---------------------- |
| POST   | `/v1/webhooks/telegram/:webhook_path`   | Telegram inbound       |
| GET/POST | `/v1/webhooks/whatsapp/:webhook_path` | WhatsApp inbound       |
| POST   | `/v1/webhooks/discord/:webhook_path`    | Discord inbound        |

## Agent Discovery

Public agent directory and platform marketplace.

| Method | Path                                       | Description                                  |
| ------ | ------------------------------------------ | -------------------------------------------- |
| GET    | `/v1/agents/directory`                     | Search public agent directory (no auth)      |
| GET    | `/v1/agents/org-directory`                 | List agents in caller's org (authenticated)  |
| GET    | `/v1/agents/:agent_id/card`                | Get agent's public card (no auth)            |
| PATCH  | `/v1/agents/:agent_id/discovery`           | Update discovery settings (human-only)       |
| GET    | `/v1/platform/marketplace`                 | Browse platform app marketplace (no auth)    |

## OAuth Connected Accounts

Connect agents to external services via OAuth flows. Human-initiated, agent-consumed.

| Method | Path                                                            | Description                              |
| ------ | --------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/v1/oauth/providers`                                           | List available OAuth providers (public)  |
| POST   | `/v1/agents/:agent_id/oauth/connect`                             | Initiate OAuth flow (human-only)         |
| GET    | `/v1/agents/:agent_id/oauth/connections`                         | List agent's OAuth connections            |
| POST   | `/v1/agents/:agent_id/oauth/disconnect/:binding_id`              | Revoke tokens and delete connection       |
| POST   | `/v1/agents/:agent_id/oauth/app-credentials`                     | Save OAuth app credentials (human-only)  |
| GET    | `/v1/agents/:agent_id/oauth/app-credentials`                     | List app credentials (secrets redacted)   |
| DELETE | `/v1/agents/:agent_id/oauth/app-credentials/:provider_slug`     | Delete OAuth app credentials              |
| GET    | `/v1/oauth/callback`                                             | OAuth provider callback (public)          |

## Execution Intents (Bindings)

Agent-to-service proxy with credential injection. Requires `execution_intents_enabled: true`.

| Method | Path                                                               | Description                                  |
| ------ | ------------------------------------------------------------------ | -------------------------------------------- |
| POST   | `/v1/agents/:agent_id/bindings`                                     | Create a binding (human-only)                |
| GET    | `/v1/agents/:agent_id/bindings`                                     | List bindings                                |
| GET    | `/v1/agents/:agent_id/bindings/:binding_id`                         | Get binding details                          |
| PATCH  | `/v1/agents/:agent_id/bindings/:binding_id`                         | Update binding                               |
| DELETE | `/v1/agents/:agent_id/bindings/:binding_id`                         | Delete binding                               |
| POST   | `/v1/agents/:agent_id/bindings/:binding_id/test`                    | Test binding connectivity                    |
| POST   | `/v1/agents/:agent_id/bindings/:binding_id/rotate-credential`       | Rotate binding credential (human-only)       |
| POST   | `/v1/agents/:agent_id/execute`                                      | Execute via binding (credential injected)    |
| GET    | `/v1/agents/:agent_id/executions`                                   | List execution events                        |

## Payment Cards

Agent-ordered prepaid/gift cards via x402 on Base. Agent never sees PAN/CVV.

| Method | Path                                  | Description                                        |
| ------ | ------------------------------------- | -------------------------------------------------- |
| POST   | `/v1/agents/:agent_id/cards/order`    | Order a card (Idempotency-Key required)            |
| GET    | `/v1/cards`                           | List cards                                         |
| GET    | `/v1/cards/:id`                       | Get card details (always masked)                   |
| POST   | `/v1/cards/:id/reveal`                | Reveal full card details (human: re-auth; agent: policy) |
| PATCH  | `/v1/cards/:id`                       | Update card (reveal policy, void_after)            |
| POST   | `/v1/cards/:id/void`                  | Void a card                                        |
| POST   | `/v1/cards/:id/refresh`               | Refresh card data from Laso                        |
| POST   | `/v1/cards/import`                    | Import a card manually (human-only)                |
| POST   | `/v1/cards/gift-cards/search`         | Search available gift cards                        |

## Known Tokens Registry

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/v1/tokens`                    | List known tokens (filterable by chain)  |
| GET    | `/v1/chains/:chain/tokens`      | List tokens for a specific chain         |

## Shroud Activity

| Method | Path                   | Description                                    |
| ------ | ---------------------- | ---------------------------------------------- |
| GET    | `/v1/shroud/activity`  | List recent Shroud inspection events           |
| POST   | `/v1/shroud/activity`  | Submit/query filtered Shroud activity          |

## Billing & Usage

| Method | Path                  | Description                    |
| ------ | --------------------- | ------------------------------ |
| GET    | `/v1/billing/usage`   | Usage summary (current period) |
| GET    | `/v1/billing/history` | Usage history                  |

## Billing V2: Subscriptions & Credits

| Method | Path                               | Description                                           |
| ------ | ---------------------------------- | ----------------------------------------------------- |
| POST   | `/v1/billing/subscribe`            | Start subscription checkout (Stripe)                  |
| POST   | `/v1/billing/portal`               | Open Stripe customer portal                           |
| GET    | `/v1/billing/subscription`         | Full subscription + usage + credits summary           |
| POST   | `/v1/billing/credits/topup`        | Start credit top-up checkout (Stripe)                 |
| GET    | `/v1/billing/credits/balance`      | Credit balance + expiring credits                     |
| GET    | `/v1/billing/credits/transactions` | Paginated credit transaction ledger                   |
| PATCH  | `/v1/billing/overage-method`       | Toggle overage method (credits or x402)               |
| POST   | `/v1/billing/webhooks`             | Stripe webhook handler (no auth — signature verified) |

## Audit

| Method | Path               | Description        |
| ------ | ------------------ | ------------------ |
| GET    | `/v1/audit/events` | Query audit events |

## Organization

| Method | Path                       | Description            |
| ------ | -------------------------- | ---------------------- |
| GET    | `/v1/org/members`          | List org members       |
| POST   | `/v1/org/invite`           | Invite member by email |
| PATCH  | `/v1/org/members/:user_id` | Update member role     |
| DELETE | `/v1/org/members/:user_id` | Remove member          |

## Webhooks

| Method | Path                  | Description                                           |
| ------ | --------------------- | ----------------------------------------------------- |
| POST   | `/v1/webhooks`        | Register a webhook endpoint                           |
| GET    | `/v1/webhooks`        | List webhooks for the org                             |
| GET    | `/v1/webhooks/:id`    | Get webhook details                                   |
| PATCH  | `/v1/webhooks/:id`    | Update webhook (URL, events, active)                  |
| DELETE | `/v1/webhooks/:id`    | Delete webhook                                        |

## OIDC Federation

| Method | Path                         | Description                                              |
| ------ | ---------------------------- | -------------------------------------------------------- |
| GET    | `/.well-known/openid-configuration` | OIDC discovery document                          |
| GET    | `/.well-known/jwks.json`     | Public JWKS (EdDSA + RS256 keys)                         |
| POST   | `/v1/auth/federated-token`   | Exchange agent token for RS256 OIDC JWT (RFC 8693)       |

## Risk Engine

| Method | Path                               | Description                                    |
| ------ | ---------------------------------- | ---------------------------------------------- |
| GET    | `/v1/risk/events`                  | List risk events (filterable by severity)      |
| GET    | `/v1/risk/verdicts`                | List active risk verdicts                      |
| GET    | `/v1/risk/verdicts/:type/:id`      | Get verdict for a specific principal           |
| GET    | `/v1/risk/honeytokens`             | List honeytoken registrations                  |
| POST   | `/v1/risk/honeytokens`             | Create a honeytoken (canary secret)            |
| DELETE | `/v1/risk/honeytokens/:id`         | Delete a honeytoken                            |

## WebAuthn Passkeys

| Method | Path                                    | Description                                  |
| ------ | --------------------------------------- | -------------------------------------------- |
| POST   | `/v1/auth/passkeys/register/begin`      | Begin passkey registration ceremony          |
| POST   | `/v1/auth/passkeys/register/complete`   | Complete passkey registration                |
| POST   | `/v1/auth/passkeys/assert/begin`        | Begin passkey login assertion                |
| POST   | `/v1/auth/passkeys/assert/complete`     | Complete passkey login                       |
| GET    | `/v1/auth/passkeys`                     | List registered passkeys                     |
| DELETE | `/v1/auth/passkeys/:passkey_id`         | Delete a passkey                             |

## Email OTP (Passwordless)

| Method | Path                         | Description                                |
| ------ | ---------------------------- | ------------------------------------------ |
| POST   | `/v1/auth/email-otp/send`    | Send 6-digit verification code to email    |
| POST   | `/v1/auth/email-otp/verify`  | Verify code, return JWT + auto-provision   |

## Social Login

| Method | Path                         | Description                                       |
| ------ | ---------------------------- | ------------------------------------------------- |
| POST   | `/v1/auth/social-login`      | Google/Apple/Discord login (returns JWT)           |

## OAuth2 Authorization Server

| Method | Path                         | Description                                       |
| ------ | ---------------------------- | ------------------------------------------------- |
| GET    | `/v1/oauth/authorize`        | Get consent info for a platform app               |
| POST   | `/v1/oauth/authorize`        | Approve/deny authorization request                |
| POST   | `/v1/oauth/token`            | Exchange authorization code for tokens            |
| GET    | `/v1/oauth/userinfo`         | Get user profile (Bearer from code exchange)      |

## Bankr Key Vending

| Method | Path                                        | Description                       |
| ------ | ------------------------------------------- | --------------------------------- |
| POST   | `/v1/agents/:agent_id/bankr-keys/lease`     | Lease a short-lived Bankr API key |
| GET    | `/v1/agents/:agent_id/bankr-keys`           | List active Bankr key leases      |
| DELETE | `/v1/agents/:agent_id/bankr-keys/:lease_id` | Revoke a Bankr key lease          |

## Deposit Destinations

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| POST   | `/v1/deposit-destinations`      | Create a deposit destination             |
| GET    | `/v1/deposit-destinations`      | List deposit destinations                |
| GET    | `/v1/deposit-destinations/:id`  | Get deposit destination + events         |
| PATCH  | `/v1/deposit-destinations/:id`  | Update status (active/paused/archived)   |

## Fiat On/Off Ramps

| Method | Path                          | Description                              |
| ------ | ----------------------------- | ---------------------------------------- |
| POST   | `/v1/fiat/onramp/session`     | Get onramp widget URL (Coinbase/MoonPay) |
| POST   | `/v1/fiat/offramp/initiate`   | Get offramp widget URL                   |
| POST   | `/v1/fiat/webhooks`           | Partner completion webhook receiver      |

## Internal Accounts & Ledger

| Method | Path                                   | Description                              |
| ------ | -------------------------------------- | ---------------------------------------- |
| POST   | `/v1/internal-accounts`                | Create a named sub-account               |
| GET    | `/v1/internal-accounts`                | List accounts with balances              |
| GET    | `/v1/internal-accounts/:id`            | Get account details                      |
| POST   | `/v1/internal-transfers`               | Transfer between accounts                |
| GET    | `/v1/internal-accounts/:id/ledger`     | Paginated ledger history                 |

## Wallet Spend Policies

| Method | Path                                                 | Description                                    |
| ------ | ---------------------------------------------------- | ---------------------------------------------- |
| POST   | `/v1/platform/apps/:id/spend-policies`               | Create app-level spend policy                  |
| GET    | `/v1/platform/apps/:id/spend-policies`               | List spend policies for app                    |
| PUT    | `/v1/platform/connections/:id/spend-policy`          | Set per-user spend policy override             |
| GET    | `/v1/treasury/wallets/spend-policy`                  | View effective spend policy (user-only)        |
| DELETE | `/v1/platform/apps/:id/spend-policies/:pid`          | Deactivate a spend policy                      |

## Security (IP Rules)

| Method | Path                             | Description               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/v1/security/ip-rules`          | List IP allow/block rules |
| POST   | `/v1/security/ip-rules`          | Create IP rule            |
| DELETE | `/v1/security/ip-rules/:rule_id` | Delete IP rule            |

## Admin

Admin endpoints are for platform operators only. They are not documented in detail here; see your internal operations documentation.

| Method | Path                            | Description                  |
| ------ | ------------------------------- | ---------------------------- |
| GET    | `/v1/admin/settings`            | List all settings            |
| PUT    | `/v1/admin/settings/:key`       | Update a setting             |
| DELETE | `/v1/admin/settings/:key`       | Delete a setting             |
| GET    | `/v1/admin/x402`                | Get x402 payment config      |
| PUT    | `/v1/admin/x402`                | Update x402 payment config   |
| GET    | `/v1/admin/users`               | List all users (super-admin) |
| DELETE | `/v1/admin/users/:user_id`      | Delete user (cascade; platform admin only) |
| GET    | `/v1/admin/chains`              | List chains (admin view)     |
| POST   | `/v1/admin/chains`              | Create chain                 |
| PUT    | `/v1/admin/chains/:chain_id`    | Update chain                 |
| DELETE | `/v1/admin/chains/:chain_id`    | Delete chain                 |
| GET    | `/v1/admin/orgs/:org_id/limits` | Get org limits               |
| PUT    | `/v1/admin/orgs/:org_id/limits` | Update org limits            |
| PUT    | `/v1/admin/orgs/:org_id/billing-tier` | Set org billing tier (free/pro/business) |

## Platform API

Build applications on top of 1Claw. Requires Pro or higher plan. Authenticate with `plt_` prefixed API keys.

| Method | Path                                          | Description                                                      |
| ------ | --------------------------------------------- | ---------------------------------------------------------------- |
| POST   | `/v1/platform/apps`                           | Register a platform app (returns `plt_` key one-time)            |
| GET    | `/v1/platform/apps`                           | List platform apps for org                                       |
| GET    | `/v1/platform/apps/:id`                       | Get platform app details                                         |
| PATCH  | `/v1/platform/apps/:id`                       | Update platform app                                              |
| DELETE | `/v1/platform/apps/:id`                       | Delete platform app                                              |
| POST   | `/v1/platform/apps/:id/rotate-key`            | Rotate platform API key (optional `api_key_expires_at`)          |
| POST   | `/v1/platform/apps/:id/templates`             | Create bootstrap template                                        |
| GET    | `/v1/platform/apps/:id/templates`             | List templates                                                   |
| PATCH  | `/v1/platform/apps/:id/templates/:tid`        | Update template                                                  |
| DELETE | `/v1/platform/apps/:id/templates/:tid`        | Delete template                                                  |
| POST   | `/v1/platform/users/upsert`                   | Provision or find user (platform-only)                           |
| POST   | `/v1/platform/connections/:id/bootstrap`      | Bootstrap resources from template                                |
| POST   | `/v1/platform/connections/:id/reissue-claim`  | Reissue expired claim URL (no re-provisioning)                   |
| GET    | `/v1/platform/claim/:token`                   | Preview claim token (public)                                     |
| POST   | `/v1/platform/claim/:token`                   | Redeem claim token (public)                                      |
| GET    | `/v1/platform/apps/:id/users`                 | List connected users                                             |
| GET    | `/v1/platform/connected-apps`                 | List apps connected to calling user                              |
| DELETE | `/v1/platform/connected-apps/:connection_id`  | Disconnect from platform app                                     |
| POST   | `/v1/platform/connections/:id/grant`          | Grant platform app access to resources (user-only)               |
| GET    | `/v1/platform/connections/:id/grants`         | List active resource grants for a connection                     |
| DELETE | `/v1/platform/connections/:id/grants/:gid`    | Revoke a specific resource grant                                 |
| GET    | `/v1/platform/apps/:id/audit`                 | Platform audit events                                            |

## Cedar Policies (Team+)

Declarative AWS Cedar policy language for advanced authorization.

| Method | Path                                  | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| POST   | `/v1/org/cedar-policies`              | Create a Cedar policy                    |
| GET    | `/v1/org/cedar-policies`              | List Cedar policies                      |
| GET    | `/v1/org/cedar-policies/:id`          | Get Cedar policy details                 |
| DELETE | `/v1/org/cedar-policies/:id`          | Delete a Cedar policy                    |
| POST   | `/v1/org/cedar-policies/test`         | Dry-run a Cedar policy                   |

## OPA Policies (Business+)

Open Policy Agent Rego policies for advanced authorization.

| Method | Path                                  | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| POST   | `/v1/org/opa-policies`                | Create an OPA policy                     |
| GET    | `/v1/org/opa-policies`                | List OPA policies                        |
| GET    | `/v1/org/opa-policies/:id`            | Get OPA policy details                   |
| DELETE | `/v1/org/opa-policies/:id`            | Delete an OPA policy                     |
| POST   | `/v1/org/opa-policies/test`           | Dry-run an OPA policy                    |

## Sub-Organizations (Enterprise)

Hierarchical org management for enterprise customers.

| Method | Path                                              | Description                              |
| ------ | ------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/org/sub-orgs`                                | Create a sub-organization                |
| GET    | `/v1/org/sub-orgs`                                | List sub-organizations                   |
| GET    | `/v1/org/sub-orgs/:id`                            | Get sub-organization details             |
| DELETE | `/v1/org/sub-orgs/:id`                            | Archive (soft-delete) a sub-org          |
| POST   | `/v1/org/sub-orgs/:id/permissions`                | Grant permission to user/agent           |
| DELETE | `/v1/org/sub-orgs/:id/permissions/:perm`          | Revoke permission                        |
| POST   | `/v1/org/sub-orgs/:id/users`                      | Add user to sub-org                      |
| POST   | `/v1/org/sub-orgs/:id/wallets/generate`           | Generate treasury wallets for sub-org    |

## Portfolio

Unified balance aggregator across all wallets (treasury wallets, signing keys, smart accounts).

| Method | Path              | Description                              |
| ------ | ----------------- | ---------------------------------------- |
| GET    | `/v1/portfolio`   | Get aggregated balances across all wallets (filterable by `?chains=`, `?include_tokens=`) |

## Agent Delegations

Human-controlled inter-agent delegation authorization.

| Method | Path                                                       | Description                              |
| ------ | ---------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/delegations`                         | Create delegation (human-only)           |
| GET    | `/v1/agents/:agent_id/delegations`                         | List delegations                         |
| GET    | `/v1/agents/:agent_id/delegations/effective`               | Get effective delegations (agent-callable) |
| GET    | `/v1/agents/:agent_id/delegations/:delegation_id`          | Get delegation details                   |
| PATCH  | `/v1/agents/:agent_id/delegations/:delegation_id`          | Update delegation (human-only)           |
| DELETE | `/v1/agents/:agent_id/delegations/:delegation_id`          | Revoke delegation (human-only)           |

---

## Notes

- The API expects `email` and `password` for `/v1/auth/token` (not `username`).
- Secret paths are wildcard routes — e.g. `api-keys/openai`, `config/prod/db`.
- **POST /v1/auth/refresh** exists but returns **400** with "Refresh tokens not yet implemented". Use token issuance (e.g. `POST /v1/auth/token` or `POST /v1/auth/agent-token`) instead.
- Request processing order (rate limit, auth, billing, handler) and how to interpret 401, 402, 403, 429: see [Request pipeline](/docs/reference/request-pipeline).
- Intents API routes additionally require the `intents_api_enabled` claim in the JWT.
- See [Authentication](/docs/human-api/authentication) for details on obtaining JWTs.
