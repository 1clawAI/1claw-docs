---
title: Changelog
description: Product and API changelog for 1claw.
sidebar_position: 3
---

# Changelog

For detailed release history, see the [1claw repository](https://github.com/1clawAI/1claw) commits.

## API stability

The **/v1** API is stable. Breaking changes would be accompanied by a new version prefix or clear deprecation notices. New optional fields or endpoints are added in a backward-compatible way.

## 2026-02 (latest)

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
