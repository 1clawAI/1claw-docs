---
title: Agent discovery & machine-readable metadata
description: OIDC, MCP, auth.md, x402, and ARD endpoints for AI agents and agent-readiness scanners on 1claw.xyz and 1claw.co.
sidebar_position: 5
---

# Agent discovery

1Claw exposes machine-readable discovery metadata on the marketing site (**1claw.xyz** and **1claw.co**) and on the Vault API (**api.1claw.xyz**). Live OIDC keys and federation metadata always come from Vault; the dashboard proxies or host-aware routes avoid drift.

:::tip For AI page
Copy-friendly URLs and MCP config live at [1claw.xyz/for-ai](https://1claw.xyz/for-ai).
:::

## Marketing origin (1claw.xyz / 1claw.co)

| Endpoint | Purpose |
|----------|---------|
| `GET /.well-known/openid-configuration` | OIDC + OAuth AS metadata (proxied from Vault) |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 authorization server metadata |
| `GET /.well-known/jwks.json` | Public JWKS (EdDSA + RS256) |
| `GET /.well-known/oauth-protected-resource` | RFC 9728; `resource` matches scanned host |
| `GET /.well-known/mcp.json` | Alias → MCP server card |
| `GET /.well-known/mcp/server-card.json` | MCP server card (@1claw/mcp) |
| `GET /.well-known/ai-catalog.json` | Agent Registry Directory |
| `GET /auth.md` | Auth.md guide (`# auth.md` H1) |
| `GET /openapi.json` | Redirect → `api.1claw.xyz/openapi.json` |
| `GET /.well-known/x402` | x402 micropayment discovery |
| `GET /api/v1/agent-readiness/x402-probe` | Returns **402** with valid `accepts[]` |
| `GET /.well-known/ucp` | UCP discovery (x402 + Stripe; metadata only) |
| `GET /.well-known/acp.json` | ACP discovery (Platform API; metadata only) |
| `GET /robots.txt` | Includes `Content-Signal` and `Agentmap` |

## API origin (api.1claw.xyz)

Canonical issuer and protected-resource metadata for API clients:

- `GET https://api.1claw.xyz/.well-known/openid-configuration`
- `GET https://api.1claw.xyz/.well-known/oauth-protected-resource` — `resource` is `https://api.1claw.xyz`
- `GET https://api.1claw.xyz/.well-known/jwks.json`
- `GET https://api.1claw.xyz/openapi.json` — OpenAPI 3.1 with `x-payment-info` on x402-priced operations

See [Authentication](/docs/vaults/human-api/authentication) and [OIDC federation](/docs/agents/oidc-federation) for usage.

## DNS-AID (optional)

Publish `_index._agents`, `_catalog._agents`, `_mcp._agents`, and `_a2a._agents` records at your DNS provider. Runbook: `infra/dns-aid-records.md` in the monorepo. Enable DNSSEC on both zones.

## Verification

After deploy:

```bash
./scripts/test-agent-readiness-prod.sh
./scripts/check-discovery-parity.sh
```

Re-run the [Cloudflare Agent-Ready](https://developers.cloudflare.com/agents/) scan on both **1claw.xyz** and **1claw.co**.

## WebMCP (Chrome)

On [/for-ai](https://1claw.xyz/for-ai), when `navigator.modelContext` is available, read-only tools register: `searchDocs` (llms.txt), `getAuthGuide` (auth.md), `getMcpConfig` (MCP server card). No secrets are exposed.
