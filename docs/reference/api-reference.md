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

### Treasury wallets (multi-chain, human-only, Pro+)

| Method | Path                                      | Description                                    |
| ------ | ----------------------------------------- | ---------------------------------------------- |
| POST   | `/v1/treasury/wallets/generate`           | Generate wallets for specified or all chains   |
| GET    | `/v1/treasury/wallets`                    | List all active treasury wallets               |
| GET    | `/v1/treasury/wallets/:chain`             | Get wallet for a specific chain                |
| POST   | `/v1/treasury/wallets/:chain/export`      | Export wallet with private key (audit-logged)   |
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

## Agent Signing Keys

Per-agent, per-chain signing keys provisioned by humans. Keys are stored in the HSM-backed `__agent-keys` vault. Supported chains: Ethereum, Bitcoin, Solana, XRP, Cardano, Tron.

| Method | Path                                                      | Description                              |
| ------ | --------------------------------------------------------- | ---------------------------------------- |
| POST   | `/v1/agents/:agent_id/signing-keys`                       | Provision a signing key for a chain      |
| GET    | `/v1/agents/:agent_id/signing-keys`                       | List all signing keys for the agent      |
| POST   | `/v1/agents/:agent_id/signing-keys/:chain/rotate`         | Rotate a chain's signing key             |
| DELETE | `/v1/agents/:agent_id/signing-keys/:chain`                | Deactivate a chain's signing key         |

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

---

## Notes

- The API expects `email` and `password` for `/v1/auth/token` (not `username`).
- Secret paths are wildcard routes — e.g. `api-keys/openai`, `config/prod/db`.
- **POST /v1/auth/refresh** exists but returns **400** with "Refresh tokens not yet implemented". Use token issuance (e.g. `POST /v1/auth/token` or `POST /v1/auth/agent-token`) instead.
- Request processing order (rate limit, auth, billing, handler) and how to interpret 401, 402, 403, 429: see [Request pipeline](/docs/reference/request-pipeline).
- Intents API routes additionally require the `intents_api_enabled` claim in the JWT.
- See [Authentication](/docs/human-api/authentication) for details on obtaining JWTs.
