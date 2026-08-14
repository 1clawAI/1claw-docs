---
title: Webhooks
description: Register HTTP endpoints to receive real-time event notifications for treasury, transactions, policies, platform lifecycle, and more.
sidebar_position: 15
---

# Webhooks

Register webhook endpoints to receive real-time HTTP POST notifications when events occur in your organization. Deliveries include an HMAC-SHA256 signature for verification. Failed deliveries retry up to 5 times with exponential backoff.

:::info Human-only management
Webhook CRUD endpoints require a **user JWT** (`principal_type: "user"`). Agents cannot register or modify webhooks.
:::

## Quickstart

```bash
curl -X POST "https://api.1claw.xyz/v1/webhooks" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/1claw",
    "events": ["agent.transaction.broadcast", "policy.created"],
    "description": "Production event handler"
  }'
```

The response includes a one-time `secret` — store it securely. All subsequent deliveries are signed with this secret in the `X-Webhook-Signature` header.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/v1/webhooks` | Register a webhook (returns signing secret once) |
| GET | `/v1/webhooks` | List webhooks for the org |
| GET | `/v1/webhooks/{id}` | Get webhook details |
| PATCH | `/v1/webhooks/{id}` | Update URL, events, active status, or description |
| DELETE | `/v1/webhooks/{id}` | Delete a webhook |
| POST | `/v1/webhooks/{id}/rotate-secret` | Rotate the HMAC signing secret (returns new secret once) |

## Verifying signatures

Each delivery includes an `X-Webhook-Signature` header containing an HMAC-SHA256 hex digest of the raw request body, computed with your webhook secret. Verify the signature before processing the payload.

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

## Supported events

Subscribe to one or more event types when creating or updating a webhook:

### Treasury & wallets

| Event | Description |
| ----- | ----------- |
| `wallet.transfer.sent` | Outgoing transfer from a treasury wallet |
| `wallet.transfer.received` | Incoming transfer to a treasury wallet |
| `deposit.received` | Inbound deposit detected |
| `deposit.confirmed` | Deposit confirmed on-chain |
| `deposit.credited` | Deposit credited to internal ledger |
| `deposit_destination.created` | New deposit destination created |
| `fiat.onramp.completed` | Fiat on-ramp completed |
| `fiat.offramp.completed` | Fiat off-ramp completed |
| `internal_transfer.completed` | Internal ledger transfer completed |

### Multisig proposals

| Event | Description |
| ----- | ----------- |
| `proposal.created` | New Safe multisig proposal created |
| `proposal.signed` | Proposal received a signature |
| `proposal.executed` | Proposal executed on-chain |
| `proposal.cancelled` | Proposal cancelled |

### Agent transactions & signing

| Event | Description |
| ----- | ----------- |
| `agent.transaction.broadcast` | Agent transaction broadcast to chain |
| `agent.transaction.signed` | Agent transaction signed (sign-only mode) |
| `signing_key.rotated` | Agent signing key rotated |

### Policies

| Event | Description |
| ----- | ----------- |
| `policy.created` | Access policy created |
| `policy.updated` | Access policy updated |
| `policy.deleted` | Access policy deleted |

### Payment cards

| Event | Description |
| ----- | ----------- |
| `card.ordered` | Card order submitted |
| `card.ready` | Card ready for use |
| `card.revealed` | Card PAN revealed (human or agent) |
| `card.voided` | Card voided |
| `card.depleted` | Card balance depleted |
| `card.orphaned_payment` | Order stuck in `ordering` (reconciliation needed) |
| `card.rejected` | Card order rejected |

### Approvals

| Event | Description |
| ----- | ----------- |
| `approval.created` | Agent approval request created |
| `approval.decided` | Approval approved or rejected |
| `pending_approval.created` | Consensus pending approval created |
| `pending_approval.approved` | Pending approval approved |
| `pending_approval.rejected` | Pending approval rejected |
| `pending_approval.executed` | Pending approval executed |
| `pending_approval.expired` | Pending approval expired |

### Platform API

| Event | Description |
| ----- | ----------- |
| `platform.user.connected` | User connected to platform app |
| `platform.user.claimed` | User claimed bootstrapped resources |
| `platform.user.disconnected` | User disconnected from platform app |
| `platform.bootstrap.completed` | Bootstrap finished for connected user |
| `platform.grant.created` | User granted platform app access to resources |
| `platform.grant.revoked` | Resource grant revoked |

### Policy backend (Cedar/OPA)

| Event | Description |
| ----- | ----------- |
| `policy_backend.circuit_breaker_opened` | Advanced policy backend circuit breaker opened |
| `policy_backend.circuit_breaker_closed` | Advanced policy backend circuit breaker closed |

## Secret rotation

Rotate the HMAC signing secret without deleting the webhook:

```bash
curl -X POST "https://api.1claw.xyz/v1/webhooks/WEBHOOK_ID/rotate-secret" \
  -H "Authorization: Bearer $USER_JWT"
```

The new secret is returned once. Update your verification logic before the next delivery.

## Delivery behavior

- Events are dispatched via HTTP POST to your registered URL
- A background worker processes pending deliveries every 5 seconds
- Failed deliveries retry up to **5 times** with exponential backoff
- Delivery history is stored in the `webhook_deliveries` table
- Webhook destination URLs are validated via SSRF protection (blocks private IPs, cloud metadata endpoints, and `.internal` hostnames)
- HTTP redirect following is disabled to prevent SSRF

## SDK

```typescript
// TypeScript SDK
const webhook = await client.webhooks.create({
  url: "https://your-app.com/webhooks/1claw",
  events: ["agent.transaction.broadcast"],
});

await client.webhooks.update(webhook.id, { is_active: false });
await client.webhooks.delete(webhook.id);
```

## Platform apps

Platform developers often subscribe to platform lifecycle events. See [Platform API — Webhook Events](/docs/guides/platform-api#platform-webhook-events) for platform-specific setup patterns and the `platform.*` event types.

Treasury-focused webhook examples (transfers, proposals) are also covered in the [Treasury guide](/docs/guides/treasury#webhooks).

## See also

- [Platform API](/docs/guides/platform-api) — bootstrap users and subscribe to platform events
- [Treasury](/docs/guides/treasury) — wallet transfers and multisig proposal events
- [Audit and compliance](/docs/guides/audit-and-compliance) — audit log for all API activity
- [API reference — Webhooks](/docs/reference/api-reference#webhooks)
