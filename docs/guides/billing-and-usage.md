---
title: Billing & Usage
description: Subscription tiers, usage tracking, prepaid credits, x402 micropayments, and how to monitor your consumption.
sidebar_position: 5
---

# Billing & Usage

1claw tracks every API request and offers flexible billing through subscription tiers with optional prepaid credits or on-chain micropayments for overages.

:::tip Try it out
Try out the examples in this repo: **[Ampersend x402](https://github.com/1clawAI/1claw-examples/tree/main/ampersend-x402)** (x402 with Ampersend + MCP/HTTP/hybrid) and **[x402 Payments](https://github.com/1clawAI/1claw-examples/tree/main/x402-payments)** (real x402 against 1Claw endpoints with EOA key).
:::

## Subscription Tiers

Every organization starts on the **Free** tier and can upgrade to paid plans for higher limits:

| Tier           | Monthly Price | Annual (billed yearly) | API calls/mo | Wallets   | Signatures/mo | Vaults    | Secrets   | Agents    | Team seats |
| -------------- | ------------- | ---------------------- | ------------ | --------- | ------------- | --------- | --------- | --------- | ---------- |
| **Free**       | $0            | —                      | 1,000       | 10        | 100         | 3         | 50        | 2         | 1 (owner)  |
| **Pro**        | $29           | $290 (~$24.17/mo)      | 20,000      | 10,000    | 20,000      | 5         | 500       | 10        | 2          |
| **Team**       | $299          | $2,990 (~$249.17/mo)   | 200,000     | 250,000   | 200,000     | 100       | 5,000     | 50        | 20         |
| **Business**   | $999          | $9,990 (~$832.50/mo)   | 1,000,000   | 1,000,000 | 1,000,000   | Unlimited | Unlimited | 200       | 50         |
| **Enterprise** | Custom        | Custom                 | Unlimited   | Unlimited | Unlimited   | Unlimited | Unlimited | Unlimited | Unlimited  |

Limits match the live [pricing page](https://1claw.co/pricing) and backend `tier_limits` in the Vault (`vault/src/domain/billing.rs`).

### Execution Intents vs Intents API

Two separate products with different meters:

| Product | What it does | Tier availability | Quota type |
| ------- | ------------ | ----------------- | ---------- |
| **Execution Intents** | HTTP/GraphQL binding calls with server-side credentials | Pro+ (Free: not included) | Hard monthly cap (403 when exceeded) |
| **Intents API** | On-chain transaction signing (TEE-backed) | Business+ | Signatures/mo with per-signature overage |

**Execution Intents monthly limits:** Pro 1,000 · Team 10,000 · Business 50,000 · Enterprise unlimited.

**Binding types:** Pro+ — all binding types (http, graphql, postgres, mysql, redis, grpc, smtp, cloud_sdk, s3, custom). Business+ — TEE execution mode (`execution_mode: "tee"`) for HTTP/GraphQL when Shroud execution URL is configured.

Signatures = on-chain signing. Executions = HTTP/GraphQL binding calls.

### Resource Limits

Each tier enforces hard limits on the number of vaults, secrets, and agents your organization can create. When you attempt to create a resource beyond your limit, the API returns **403 Forbidden** with `type: "resource_limit_exceeded"`:

```json
{
    "type": "resource_limit_exceeded",
    "title": "Resource Limit Exceeded",
    "status": 403,
    "detail": "Vault limit reached (3/3 on free tier). Upgrade your plan for more."
}
```

Unlike request quotas (which support overages via credits or x402), resource limits require upgrading your subscription tier. The dashboard displays an upgrade prompt automatically when a limit is hit.

### Upgrading

Visit [1claw.co/settings/billing](https://1claw.co/settings/billing) to:

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

### Overage Rates (After Tier Limit)

Included plan requests are covered by your subscription and do not incur per-request charges. When you exceed your monthly request limit, overage charges apply at tier-discounted rates (same rates for prepaid credits and x402):

| Operation | Free | Pro | Team | Business |
| --------- | ---- | --- | ---- | -------- |
| Read secret | $0.0045 | $0.003 | $0.0015 | $0.0008 |
| Write secret | $0.0225 | $0.015 | $0.0075 | $0.004 |
| Create share | $0.009 | $0.006 | $0.003 | $0.0015 |
| Access shared secret | $0.0045 | $0.003 | $0.0015 | $0.0008 |
| Audit query | $0.0024 | $0.0016 | $0.0008 | $0.0004 |
| Other API requests | $0.001 | $0.0005 | $0.0002 | $0.0001 |
| Transaction simulate | $0.225 | $0.15 | $0.075 | $0.04 |
| Signature (overage) | $0.225 | $0.15 | $0.075 | $0.04 |

Signature overage (after the included monthly quota) is a **flat per-signature rate** — not a percentage of transaction value. Simulation endpoints use the same rate as the table above.

Exact per-endpoint prices are also shown in the [pricing page](https://1claw.co/pricing) x402 table, the dashboard billing UI, and x402 `402` responses. Source of truth: `overage_cost_cents` in `vault/src/domain/billing.rs`.

## Overage Methods

When your monthly tier limit is exhausted, you can choose how to pay for overages:

### 1. Prepaid Credits (Recommended)

Top up your account with credits ($5–$1,000) via Stripe. Credits are deducted automatically when you exceed your tier limit, expire after 12 months, and benefit from your tier's discounted overage rates.

**Benefits:**

- Automatic deduction — no per-request payment flow
- Tier discounts apply (paid tiers vs Free)
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
When the free tier is exhausted (or the request is unauthenticated on a paid route), the API returns `402 Payment Required` with a spec-compliant body ([docs.g402.ai](https://docs.g402.ai/docs/api/response-format), x402scan marketplace):

```json
{
    "x402Version": 1,
    "error": "X-PAYMENT header is required",
    "accepts": [
        {
            "scheme": "exact",
            "network": "eip155:8453",
            "maxAmountRequired": "1500",
            "resource": "https://api.1claw.co/v1/vaults/{vault_id}/secrets/{path}",
            "payTo": "0x...",
            "maxTimeoutSeconds": 60,
            "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "description": "read_secret",
            "mimeType": "application/json"
        }
    ],
    "description": "read_secret"
}
```

Amounts are in atomic units (e.g. USDC 6 decimals). Clients that support x402 pay the required amount on-chain and retry with the `X-PAYMENT` header.

### Choosing Your Overage Method

Toggle between credits and x402 in the billing dashboard or via API:

```bash
# Use prepaid credits for overages
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overage_method": "credits"}' \
  https://api.1claw.co/v1/billing/overage-method

# Use x402 micropayments for overages
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overage_method": "x402"}' \
  https://api.1claw.co/v1/billing/overage-method
```

**Default:** New organizations default to `credits`. If you have no credits and haven't set up x402, you'll need to top up credits or configure x402 before overages can be processed.

## Monitoring Usage

### Dashboard

Visit [1claw.co/settings/billing](https://1claw.co/settings/billing) to see:

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
  https://api.1claw.co/v1/billing/subscription
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
        "tier_limit": 20000,
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
  https://api.1claw.co/v1/billing/credits/balance
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
  "https://api.1claw.co/v1/billing/credits/transactions?limit=20&offset=0"
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
  https://api.1claw.co/v1/billing/usage

# Get recent usage events
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.1claw.co/v1/billing/history?limit=50"
```

## Quota Response Headers

Every authenticated API response includes headers that let you monitor usage programmatically without polling the billing endpoint:

| Header                         | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `X-RateLimit-Requests-Used`    | Requests consumed this billing period            |
| `X-RateLimit-Requests-Limit`   | Tier request limit for this period               |
| `X-RateLimit-Requests-Percent` | Usage percentage (e.g. `74`)                     |
| `X-Quota-Warning`              | Present when usage exceeds 80% of the tier limit |
| `X-Credit-Balance-Cents`       | Current credit balance in cents                  |
| `X-Credit-Expiring-Soon`       | Present when credits expire within 30 days       |
| `X-Overage-Method`             | Active overage method (`credits` or `x402`)      |

These headers are useful for building dashboards, alerting on approaching limits, and triggering automatic credit top-ups.

:::tip Programmatic monitoring
Check `X-Quota-Warning` and `X-RateLimit-Requests-Percent` after each API call to trigger alerts before your quota is exhausted.
:::

## Credit Expiry

Prepaid credits expire **12 months** after purchase. The system sends automated email reminders at 30 days and 7 days before expiry. A nightly job at 00:05 UTC processes expired top-ups. Credits are consumed in FIFO order (oldest first), so topping up regularly ensures you always have fresh credits.

## LLM Token Billing (Optional Add-On)

Organizations can opt into **LLM token billing** to automatically meter and bill agent LLM usage through Stripe AI Gateway. This is a separate subscription add-on that works alongside your main tier subscription.

### How It Works

1. **Enable in Dashboard**: Visit **Settings → Billing → LLM Token Billing** and click "Enable LLM Token Billing"
2. **Stripe Checkout**: Complete the Stripe checkout for the LLM pricing plan
3. **Automatic Metering**: When enabled, Shroud routes eligible LLM requests through Stripe AI Gateway
4. **Billing**: Charges follow your Stripe pricing plan and billing cycle; see invoices and the Stripe customer portal for amounts and usage detail.

### Supported Providers

- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude models)
- Google (Gemini models)

### Enable/Disable

- **Enable**: Click "Enable LLM Token Billing" → Complete Stripe checkout
- **Disable**: Click "Disable" → Cancels the subscription immediately
- **Re-enable**: You can toggle LLM billing on or off at any time via the dashboard

Once enabled, LLM billing remains active until you disable it. Disabling cancels the subscription and stops metered billing for future requests.

### Duplicate Subscription Detection

If multiple LLM billing subscriptions are created for the same organization (e.g. due to a race condition or repeated checkout), the system automatically detects and cleans up duplicates. `POST /v1/billing/llm-token-billing/subscribe` returns the active subscription instead of creating a new one. The dashboard displays a warning banner when duplicate subscriptions are detected, and the backend consolidates them on the next subscribe or status check.

### Viewing Usage and Invoices

- **Stripe Portal**: Click "View invoices in your Stripe portal" to see detailed usage, invoices, and payment history
- **Usage tracking**: Stripe AI Gateway automatically tracks token usage per request
- **Billing**: Charges appear on your Stripe invoice at the end of each billing period

### Requirements

- **`STRIPE_LLM_PRICING_PLAN_ID`** (`bpp_...`) set on Vault — **required** for LLM Checkout subscribe. Stripe Checkout uses **`pricing_plan_subscription_item`** (with `Stripe-Version: 2025-09-30.preview;checkout_product_catalog_preview=v1`). Copy the pricing plan ID from the Stripe Dashboard (Billing for LLM tokens). Also used for subscription matching, disable, and webhooks.
- **`STRIPE_LLM_RATE_CARD_ID`** (`rcd_...`) — optional; used for `GET /v1/billing/llm-pricing` display.
- Active Stripe customer (created automatically when you enable)
- Shroud proxy enabled for agents (LLM requests must go through `shroud.1claw.co`)
- Agent JWT must include `llm_token_billing: true` and `stripe_customer_id` claims

### API Endpoints

```bash
# Check LLM billing status
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/billing/llm-token-billing

# Enable (returns Stripe checkout URL)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/billing/llm-token-billing/subscribe

# Disable
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/billing/llm-token-billing/disable
```

Response shape (fields vary by org and Stripe data availability):

```json
{
    "enabled": true,
    "subscription_status": "active",
    "credit_balance": {
        "available_cents": 0,
        "ledger_cents": 0,
        "used_cents": 0,
        "currency": "usd"
    },
    "billing_cycle_usage": {
        "accrued_usage_cents": 0,
        "currency": "usd",
        "metered_lines": [
            {
                "description": "Metered usage",
                "amount_cents": 0,
                "quantity": null,
                "price_nickname": null
            }
        ]
    }
}
```

`credit_balance` and `billing_cycle_usage` are omitted when Stripe does not return them. The dashboard (**Settings → Billing**) shows the same provider list and usage detail when present.

## Payment Card Ordering

Card ordering via the [Payment Card Vault](/docs/cards/overview) is available on all tiers with monthly volume quotas:

| Tier | Cards/month | Default max order | Default daily limit |
|------|------------|-------------------|---------------------|
| Free | 5 | $25 | $25 |
| Pro | 50 | — | — |
| Team | 200 | — | — |
| Business+ | Unlimited | — | — |

A **3% platform fee** per order is debited from prepaid credits (best-effort; orders still proceed if credit balance is insufficient). Humans can override the per-agent max order and daily limit to values above or below the tier defaults.

## MCP and Billing

MCP tool calls go through the same vault API and count toward the same usage quota. When an agent calls `get_secret` via MCP, that's one API request.

If your tier limit is exhausted and you have no credits (or x402 configured), the MCP server will return a clear error message:

> "Tier limit exceeded. Top up credits or configure payment at https://1claw.co/settings/billing"

## Enterprise

For organizations with custom requirements, unlimited usage, dedicated support, or on-premise deployments, contact us at [ops@1claw.co](mailto:ops@1claw.co) to discuss Enterprise pricing and terms.
