---
title: Billing & Usage
description: Subscription tiers, usage tracking, prepaid credits, x402 micropayments, and how to monitor your consumption.
sidebar_position: 5
---

# Billing & Usage

1claw tracks every API request and offers flexible billing through subscription tiers with optional prepaid credits or on-chain micropayments for overages.

## Subscription Tiers

Every organization starts on the **Free** tier and can upgrade to paid plans for higher limits:

| Tier           | Monthly Price | Annual Price | Requests/mo | Vaults    | Secrets   | Agents    |
| -------------- | ------------- | ------------ | ----------- | --------- | --------- | --------- |
| **Free**       | $0            | —            | 1,000       | 3         | 50        | 2         |
| **Pro**        | $29           | $290         | 25,000      | 25        | 500       | 10        |
| **Business**   | $149          | $1,490       | 100,000     | 100       | 5,000     | 50        |
| **Enterprise** | Custom        | Custom       | Unlimited   | Unlimited | Unlimited | Unlimited |

### Upgrading

Visit [1claw.xyz/settings/billing](https://1claw.xyz/settings/billing) to:

- Start a subscription checkout (Stripe)
- View your current tier and limits
- Manage your subscription (upgrade, downgrade, cancel)
- Access the Stripe customer portal for invoices and payment methods

## Usage Tracking

Every authenticated API request is recorded as a usage event with:

- **Method and endpoint** — e.g. `GET /v1/vaults/:id/secrets/:path`
- **Principal** — Which user or agent made the request
- **Status code** — Whether the request succeeded
- **Price** — The cost of the operation (see pricing below)
- **Timestamp** — When the request was made

Usage is unified across all access methods. Whether a secret is read from the dashboard, the TypeScript SDK, or an MCP tool call, it counts as one request against the same quota.

## Pricing

### Base Rates

| Endpoint                                         | Price   |
| ------------------------------------------------ | ------- |
| Read a secret (`GET /v1/vaults/*/secrets/*`)     | $0.001  |
| Write a secret (`PUT /v1/vaults/*/secrets/*`)    | $0.005  |
| Create a share link (`POST /v1/secrets/*/share`) | $0.002  |
| Access a shared secret (`GET /v1/share/*`)       | $0.001  |
| Query audit events (`GET /v1/audit/events`)      | $0.0005 |
| Auth, health, listing endpoints                  | Free    |

### Overage Rates (After Tier Limit)

When you exceed your tier's monthly request limit, overage charges apply. **Pro** and **Business** tiers get discounted overage rates:

| Tier       | Overage Rate per Request |
| ---------- | ------------------------ |
| Free       | $0.001 (standard rate)   |
| Pro        | $0.0008 (20% discount)   |
| Business   | $0.0006 (40% discount)   |
| Enterprise | Custom                   |

## Overage Methods

When your monthly tier limit is exhausted, you can choose how to pay for overages:

### 1. Prepaid Credits (Recommended)

Top up your account with credits ($5–$1,000) via Stripe. Credits are deducted automatically when you exceed your tier limit, expire after 12 months, and benefit from your tier's discounted overage rates.

**Benefits:**

- Automatic deduction — no per-request payment flow
- Tier discounts apply (Pro/Business save 20–40%)
- Simple billing — one-time top-up, credits last 12 months
- No blockchain interaction required

**How it works:**

1. Visit `/settings/billing` and click "Top Up Credits"
2. Choose an amount ($5, $10, $25, $50, $100, $250, $500, $1,000)
3. Complete Stripe checkout
4. Credits are added immediately and used automatically for overages

### 2. x402 Micropayments (On-Chain)

Pay per-request on the Base network (EIP-155:8453) using the [x402 protocol](https://www.x402.org/). Each overage request requires an on-chain payment before the API responds.

**Benefits:**

- Pay only for what you use — no prepayment
- On-chain transparency
- Works with any x402-compatible wallet

**How it works:**
When the free tier is exhausted, the API returns `402 Payment Required` with an x402 payment envelope:

```json
{
    "type": "https://httpproblems.com/http-status/402",
    "title": "Payment Required",
    "status": 402,
    "detail": "Tier limit exceeded. Pay per-request or top up credits.",
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

Clients that support x402 can pay the required amount on-chain and retry the request.

### Choosing Your Overage Method

Toggle between credits and x402 in the billing dashboard or via API:

```bash
# Use prepaid credits for overages
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overage_method": "credits"}' \
  https://api.1claw.xyz/v1/billing/overage-method

# Use x402 micropayments for overages
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overage_method": "x402"}' \
  https://api.1claw.xyz/v1/billing/overage-method
```

**Default:** New organizations default to `credits`. If you have no credits and haven't set up x402, you'll need to top up credits or configure x402 before overages can be processed.

## Monitoring Usage

### Dashboard

Visit [1claw.xyz/settings/billing](https://1claw.xyz/settings/billing) to see:

- Current subscription tier and limits
- Current month's total requests vs tier limit
- Usage breakdown (free tier vs overages)
- Credit balance and expiring credits (next 30 days)
- Overage method (credits or x402)
- Total cost (subscription + overages)
- Recent usage history
- Credit transaction ledger

### API

#### Get Full Subscription Summary

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/billing/subscription
```

Response includes subscription status, usage, and credits:

```json
{
    "subscription": {
        "tier": "pro",
        "status": "active",
        "current_period_end": "2026-03-20T00:00:00Z",
        "cancel_at_period_end": false
    },
    "usage": {
        "tier_limit": 25000,
        "current_month": {
            "total_requests": 18472,
            "tier_requests": 18472,
            "overage_requests": 0,
            "total_cost_usd": 0.0
        }
    },
    "credits": {
        "balance_usd": 50.0,
        "expiring_next_30_days": 0.0
    },
    "overage_method": "credits"
}
```

#### Get Credit Balance

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/billing/credits/balance
```

```json
{
    "balance_usd": 50.0,
    "expiring_next_30_days": 0.0,
    "expiring_credits": []
}
```

#### Get Credit Transactions

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.1claw.xyz/v1/billing/credits/transactions?limit=20&offset=0"
```

```json
{
    "transactions": [
        {
            "id": "uuid",
            "type": "topup",
            "amount_usd": 50.0,
            "balance_after_usd": 50.0,
            "created_at": "2026-02-15T10:30:00Z"
        },
        {
            "id": "uuid",
            "type": "usage",
            "amount_usd": -0.5,
            "balance_after_usd": 49.5,
            "description": "Overage charges for 625 requests",
            "created_at": "2026-02-18T14:22:00Z"
        }
    ],
    "total": 2,
    "limit": 20,
    "offset": 0
}
```

#### Legacy Usage Endpoints (Still Available)

```bash
# Get current month summary
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/billing/usage

# Get recent usage events
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.1claw.xyz/v1/billing/history?limit=50"
```

## MCP and Billing

MCP tool calls go through the same vault API and count toward the same usage quota. When an agent calls `get_secret` via MCP, that's one API request.

If your tier limit is exhausted and you have no credits (or x402 configured), the MCP server will return a clear error message:

> "Tier limit exceeded. Top up credits or configure payment at https://1claw.xyz/settings/billing"

## Enterprise

For organizations with custom requirements, unlimited usage, dedicated support, or on-premise deployments, contact us at [enterprise@1claw.xyz](mailto:enterprise@1claw.xyz) to discuss Enterprise pricing and terms.
