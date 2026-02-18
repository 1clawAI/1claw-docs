---
title: Billing & Usage
description: How 1claw tracks API usage, the free tier, x402 pay-per-use micropayments, and how to monitor your consumption.
sidebar_position: 5
---

# Billing & Usage

1claw tracks every API request and provides a free tier with optional pay-per-use billing via the x402 protocol.

## Free tier

Every organization gets **1,000 API requests per month** at no cost. This includes requests from all sources — dashboard, SDK, MCP server, and direct API calls. Auth and health endpoints are not counted.

## Usage tracking

Every authenticated API request is recorded as a usage event with:

- **Method and endpoint** — e.g. `GET /v1/vaults/:id/secrets/:path`
- **Principal** — Which user or agent made the request
- **Status code** — Whether the request succeeded
- **Price** — The cost of the operation (see pricing below)
- **Timestamp** — When the request was made

Usage is unified across all access methods. Whether a secret is read from the dashboard, the TypeScript SDK, or an MCP tool call, it counts as one request against the same quota.

## Pricing

| Endpoint | Price |
|----------|-------|
| Read a secret (`GET /v1/vaults/*/secrets/*`) | $0.001 |
| Write a secret (`PUT /v1/vaults/*/secrets/*`) | $0.005 |
| Create a share link (`POST /v1/secrets/*/share`) | $0.002 |
| Access a shared secret (`GET /v1/share/*`) | $0.001 |
| Query audit events (`GET /v1/audit/events`) | $0.0005 |
| Auth, health, listing endpoints | Free |

## x402 Payment Required

When the free tier is exhausted, the API returns `402 Payment Required` with an [x402](https://www.x402.org/) payment envelope. Clients that support x402 can pay per-request on the Base network (EIP-155:8453).

```json
{
  "type": "https://httpproblems.com/http-status/402",
  "title": "Payment Required",
  "status": 402,
  "detail": "Free tier limit exceeded. Pay per-request or upgrade your plan.",
  "x402": {
    "scheme": "exact",
    "network": "eip155:8453",
    "maxAmountRequired": "0.001",
    "resource": "/v1/vaults/:vault_id/secrets/:path",
    "description": "Read a secret",
    "payTo": "0x...",
    "deadline": 1740000000
  }
}
```

## Monitoring usage

### Dashboard

Visit [1claw.xyz/settings/billing](https://1claw.xyz/settings/billing) to see:

- Current month's total requests
- Breakdown of free vs paid requests
- Total cost
- Recent usage history

### API

```bash
# Get current month summary
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/billing/usage

# Get recent usage events
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.1claw.xyz/v1/billing/history?limit=50"
```

### Usage summary response

```json
{
  "billing_tier": "free",
  "free_tier_limit": 1000,
  "current_month": {
    "total_requests": 247,
    "paid_requests": 0,
    "free_requests": 247,
    "total_cost_usd": 0.0
  }
}
```

## MCP and billing

MCP tool calls go through the same vault API and count toward the same usage quota. When an agent calls `get_secret` via MCP, that's one API request.

If the free tier is exhausted, the MCP server will return a clear error message:

> "Free tier quota exhausted. Upgrade your plan or add payment at https://1claw.xyz/settings/billing"
