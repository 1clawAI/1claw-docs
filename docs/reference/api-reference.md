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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/health` | Service health |
| GET | `/v1/health/hsm` | HSM connectivity |
| GET | `/v1/share/:share_id` | Access a shared secret (checks expiry + access count) |

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/signup` | Self-service signup (email + password) → JWT |
| POST | `/v1/auth/token` | Email/password → JWT |
| POST | `/v1/auth/agent-token` | Agent ID + API key → JWT |
| POST | `/v1/auth/api-key-token` | Personal API key → JWT |
| POST | `/v1/auth/google` | Google id_token → JWT |
| POST | `/v1/auth/refresh` | Refresh token → new JWT |
| DELETE | `/v1/auth/token` | Revoke token |
| POST | `/v1/auth/change-password` | Change password |

## Personal API Keys

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/api-keys` | Create API key |
| GET | `/v1/auth/api-keys` | List API keys |
| DELETE | `/v1/auth/api-keys/:key_id` | Revoke API key |

## Vaults

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/vaults` | Create vault |
| GET | `/v1/vaults` | List vaults |
| GET | `/v1/vaults/:vault_id` | Get vault |
| DELETE | `/v1/vaults/:vault_id` | Delete vault |

## Secrets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/vaults/:vault_id/secrets` | List secrets (metadata only) |
| PUT | `/v1/vaults/:vault_id/secrets/*path` | Create or update secret |
| GET | `/v1/vaults/:vault_id/secrets/*path` | Get secret value (decrypted) |
| DELETE | `/v1/vaults/:vault_id/secrets/*path` | Soft-delete secret |

## Policies

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/vaults/:vault_id/policies` | Create policy |
| GET | `/v1/vaults/:vault_id/policies` | List policies |
| PUT | `/v1/vaults/:vault_id/policies/:policy_id` | Update policy |
| DELETE | `/v1/vaults/:vault_id/policies/:policy_id` | Delete policy |

## Agents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/agents` | Register agent |
| GET | `/v1/agents` | List agents |
| GET | `/v1/agents/me` | Get calling agent's own profile (includes `created_by`) |
| GET | `/v1/agents/:agent_id` | Get agent |
| PATCH | `/v1/agents/:agent_id` | Update agent (name, description, crypto_proxy_enabled) |
| DELETE | `/v1/agents/:agent_id` | Deactivate agent |
| POST | `/v1/agents/:agent_id/rotate-key` | Rotate agent API key |

## Sharing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/secrets/:secret_id/share` | Create share (`creator`, `user`, `agent`, `external_email`, `anyone_with_link`) |
| GET | `/v1/shares/outbound` | List shares you created |
| GET | `/v1/shares/inbound` | List shares sent to you |
| POST | `/v1/shares/:share_id/accept` | Accept an inbound share |
| POST | `/v1/shares/:share_id/decline` | Decline an inbound share |
| DELETE | `/v1/share/:share_id` | Revoke share (creator only) |

## Chains

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/chains` | List supported blockchain chains |
| GET | `/v1/chains/:identifier` | Get chain by ID or chain_id |

## Transactions (Crypto Proxy)

Requires `crypto_proxy_enabled: true` on the agent. When enabled, the agent is also **blocked** from reading `private_key` and `ssh_key` type secrets through the standard secrets endpoint — it must use the proxy to sign transactions.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/agents/:agent_id/transactions` | Submit a transaction |
| GET | `/v1/agents/:agent_id/transactions` | List agent transactions |
| GET | `/v1/agents/:agent_id/transactions/:tx_id` | Get transaction details |

## Billing & Usage

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/billing/usage` | Usage summary (current period) |
| GET | `/v1/billing/history` | Usage history |

## Billing V2: Subscriptions & Credits

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/billing/subscribe` | Start subscription checkout (Stripe) |
| POST | `/v1/billing/portal` | Open Stripe customer portal |
| GET | `/v1/billing/subscription` | Full subscription + usage + credits summary |
| POST | `/v1/billing/credits/topup` | Start credit top-up checkout (Stripe) |
| GET | `/v1/billing/credits/balance` | Credit balance + expiring credits |
| GET | `/v1/billing/credits/transactions` | Paginated credit transaction ledger |
| PATCH | `/v1/billing/overage-method` | Toggle overage method (credits or x402) |
| POST | `/v1/billing/webhooks` | Stripe webhook handler (no auth — signature verified) |

## Audit

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/audit/events` | Query audit events |

## Organization

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/org/members` | List org members |
| POST | `/v1/org/invite` | Invite member by email |
| PATCH | `/v1/org/members/:user_id` | Update member role |
| DELETE | `/v1/org/members/:user_id` | Remove member |

## Security (IP Rules)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/security/ip-rules` | List IP allow/block rules |
| POST | `/v1/security/ip-rules` | Create IP rule |
| DELETE | `/v1/security/ip-rules/:rule_id` | Delete IP rule |

## Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/settings` | List all settings |
| PUT | `/v1/admin/settings/:key` | Update a setting |
| DELETE | `/v1/admin/settings/:key` | Delete a setting |
| GET | `/v1/admin/x402` | Get x402 payment config |
| PUT | `/v1/admin/x402` | Update x402 payment config |
| GET | `/v1/admin/users` | List all users (super-admin) |
| GET | `/v1/admin/chains` | List chains (admin view) |
| POST | `/v1/admin/chains` | Create chain |
| PUT | `/v1/admin/chains/:chain_id` | Update chain |
| DELETE | `/v1/admin/chains/:chain_id` | Delete chain |
| GET | `/v1/admin/orgs/:org_id/limits` | Get org limits |
| PUT | `/v1/admin/orgs/:org_id/limits` | Update org limits |

---

## Notes

- The API expects `email` and `password` for `/v1/auth/token` (not `username`).
- Secret paths are wildcard routes — e.g. `api-keys/openai`, `config/prod/db`.
- Middleware layers applied to authenticated routes: **auth → IP filter → usage tracking**.
- Crypto proxy routes additionally require the `crypto_proxy_enabled` claim in the JWT.
- The **x402 middleware** runs on all routes and can gate access behind payment for configured endpoints.
- See [Authentication](/docs/human-api/authentication) for details on obtaining and refreshing JWTs.
