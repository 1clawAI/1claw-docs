---
title: Payment Cards
description: Order prepaid and gift cards for agents via x402, with human-in-the-loop approval and PCI-conscious reveal.
sidebar_position: 5
---

# Payment Cards

Agents can order **prepaid** and **gift cards** paid with USDC on Base via an outbound **x402 payment**. The agent never sees the PAN or CVV by default — humans reveal card details when needed.

## Human-in-the-loop approval (default)

By default, **`card_require_approval` is `true`** on every agent. When an agent calls `POST /v1/agents/{id}/cards/order`:

1. Guardrails are validated (amount caps, daily limit, payTo allowlist).
2. A `payment_cards` row is created with `status: awaiting_approval`.
3. An approval is created with `action: card_order` and assigned to the agent's creator.
4. The API returns **202 Accepted** with `approval_id` — **no x402 payment yet**.
5. A human approves via one of:
   - **Dashboard** — [1claw.xyz/approvals](https://1claw.co/approvals)
   - **Mobile app** — push notification + risk-tier step-up (biometric / TOTP)
   - **Email** — one-click Approve/Deny links (`GET /v1/approvals/quick-decide`, proxied at `/api/approvals/quick-decide` on the dashboard domain)

On **approve**, Vault runs the x402 payment and Laso order; the card moves to `pending` then `ready`. On **reject**, the card becomes `rejected`.

Set `card_require_approval: false` on trusted agents with tight guardrails to skip the queue (synchronous payment).

### Risk tiers (card orders)

| Tier | Amount (USD) | Step-up on approve |
|------|----------------|---------------------|
| T1 | ≤ $25 | None |
| T2 | $25 – $100 | Password or re-auth token (`X-Auth-Confirm`) |
| T3 | > $100 | Passkey or TOTP re-auth token |

Obtain a re-auth token: `POST /v1/auth/reauth/begin` with `{ "method": "password" \| "passkey" \| "totp" }`, then `POST /v1/auth/reauth/complete` → use the `rat_` token in `X-Auth-Confirm`.

## Ordering guardrails

Per-agent fields (human-set in the dashboard or API):

| Field | Description |
|-------|-------------|
| `cards_enabled` | Master toggle for card ordering (Pro+ tier) |
| `card_max_order_usd` | Max USD per order |
| `card_daily_limit_usd` | Rolling 24h spend cap (atomic) |
| `card_payto_allowlist` | Allowed x402 `payTo` addresses (empty = server default Laso recipients) |
| `card_reveal_enabled` | Whether agents may reveal (subject to per-card policy) |
| `card_require_approval` | Human approval before payment (default **true**) |

## Reveal card details

`POST /v1/cards/{id}/reveal` — humans must pass **`X-Auth-Confirm`**:

- Account password, or
- **`rat_` re-auth token** from passkey/TOTP flow (recommended for Google/social login users without a password)

Agents receive 403 unless a human enabled `reveal_policy.agent_reveal` on the card.

## Webhooks

Subscribe to: `approval.created`, `approval.decided`, `card.ordered`, `card.ready`, `card.rejected`, `card.revealed`, `card.voided`, `card.depleted`, `card.orphaned_payment`.

## SDK example

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ apiKey: process.env.ONECLAW_API_KEY! });

// Agent orders a card (returns 202 when approval required)
const order = await client.cards.order(agentId, {
  kind: "prepaid",
  amount_usd: "25.00",
}, { idempotencyKey: crypto.randomUUID() });

if (order.status === "awaiting_approval") {
  console.log("Waiting for human approval:", order.approval_id);
}

// Human approves in dashboard or via API
await client.approvals.decide(approvalId, { decision: "approved" });
```

See also: [Intents API](/docs/agents/intents/overview) (agent signing keys for x402 payment), [Approvals](/docs/treasury/approvals) (human-in-the-loop queue).
