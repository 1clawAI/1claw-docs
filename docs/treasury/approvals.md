---
title: "Human-in-the-loop approvals"
description: Set up approval policies so agents propose actions and humans approve them. Covers approval requests, risk tiers, mobile approval, and auto-approve rules.
sidebar_position: 65
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Human-in-the-Loop Approvals

Agents operate autonomously, but some actions need human sign-off. 1claw's approval system lets agents request permission for sensitive operations while humans retain final control. Approvals work through the dashboard, API, or the mobile companion app.

## How it works

```
Agent                           1claw                         Human
  |                               |                             |
  |  POST /v1/approvals/request   |                             |
  |  { action, summary, reason }  |                             |
  | ----------------------------> |                             |
  |                               |  Create pending approval    |
  |                               |  Route to agent's creator   |
  |                               |  --------------------------> |
  |                               |                             |
  |                               |  Human reviews              |
  |                               |  (dashboard, mobile, API)   |
  |                               |                             |
  |                               |  POST /v1/approvals/{id}/   |
  |                               |    decide                   |
  |                               |  <------------------------- |
  |                               |                             |
  |  <-- approval result -------- |                             |
  |  (approved or denied)         |                             |
```

1. The agent creates an approval request: what the action is, a `summary` for the
   human, and a `payload` describing what will actually happen.
2. 1claw derives the risk tier from the agent's approval policy and the payload,
   and routes the request to the human who registered the agent (`agents.created_by`).
3. The human reviews and decides (approve or deny) through the dashboard, mobile app, or API.

## Which actions an agent may request

Two families:

- **Business actions**, named `namespace.verb` — `refund.create`, `social.post`,
  `invoice.send`. These are yours to define; 1claw does not act on them, it asks
  a human and tells you the answer.
- **Access requests** — `access_request`, `policy_request`, `binding_request`.
  These ask a human to widen what the agent itself may do.

Actions that 1claw executes on your behalf when approved — `policy_change`,
`card_order`, `agent_transaction`, `agent_execution`, `agent_sign_intent` — are
created by the platform and **rejected** on this endpoint with a 403. They are
raised for you when you call the endpoint that needs them (ordering a card, say),
because the wording a human reads and the side effect that follows have to come
from the same place.

## Creating an approval request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.co/v1/approvals/request \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refund.create",
    "target_type": "order",
    "target_id": "order_1234",
    "summary": {
      "title": "Refund $49.99",
      "body": "Customer says the order arrived damaged.",
      "fields": [
        { "label": "Order", "value": "#1234" },
        { "label": "Reason", "value": "Damaged on arrival" }
      ]
    },
    "payload": {
      "amount_usd": "49.99",
      "customer_email": "a.user@example.com"
    },
    "reason": "Customer support ticket #5567"
  }'
```

The response is `202` with the approval id, plus `risk_tier` — the tier actually
enforced — and `human_summary`, the line your operator will see.

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const approval = await agentClient.approvals.request({
  action: "refund.create",
  target_type: "order",
  target_id: "order_1234",
  summary: {
    title: "Refund $49.99",
    body: "Customer says the order arrived damaged.",
    fields: [
      { label: "Order", value: "#1234" },
      { label: "Reason", value: "Damaged on arrival" },
    ],
  },
  payload: {
    amount_usd: "49.99",
    customer_email: "a.user@example.com",
  },
  reason: "Customer support ticket #5567",
});

console.log("Approval ID:", approval.data.id);
console.log("Status:", approval.data.status); // "pending"
console.log("Enforced tier:", approval.data.risk_tier);
```

</TabItem>
</Tabs>

### `summary` and `payload` are different things

`summary` is what the human reads. `payload` is what happens if they approve.

Keep them accurate to each other. The risk tier and, later, the auto-approval
learning are derived from `payload`, never from `summary` — so a flattering
summary changes what your operator reads and nothing about how strong the
approval has to be. Both are shown in the dashboard, side by side, which means a
summary that disagrees with its payload is visible rather than persuasive.

### Risk tiers

| Tier | Meaning | Mobile app behavior |
|------|---------|---------------------|
| 1 | Informational | Simple tap to approve |
| 2 | Moderate risk | Biometric verification required |
| 3 | High risk | TOTP code + countdown timer |

**The server sets the tier.** You may send `declared_risk_tier` to say how
sensitive *you* believe an action is, and 1claw takes the higher of that and the
floor it derives itself:

- an amount at or above the threshold in the agent's `action_approval_policy`
  (default $50) is at least tier 2;
- a recipient the agent has not paid before is at least tier 2, whatever the amount;
- actions that grant or destroy authority are tier 3.

So you can ask for a stricter review than the policy requires. You cannot ask for
a weaker one: an agent declaring tier 1 on a $500 refund gets tier 2, and the
response returns both `risk_tier` (enforced) and `declared_risk_tier` (asked
for), with `declared_below_floor: true`. Your operator sees that too — an agent
that keeps under-declaring is worth looking at.

`risk_tier` is still accepted as the old name for `declared_risk_tier`.

### Telling 1claw when to ask

Set `action_approval_policy` on the agent — in the dashboard under the agent's
guardrails, or over the API:

```json
{
  "default_mode": "deny",
  "rules": [
    {
      "action_type": "refund.create",
      "mode": "approve",
      "require_for_amount_above_usd": "50",
      "summary_template": "Refund {{amount_usd}} to {{customer_email}}"
    }
  ]
}
```

`summary_template` is filled from the payload and becomes the line sent to SMS,
push, and email. If a named field is missing from the payload, no summary is
sent rather than half a sentence.

Editing this policy counts as widening a guardrail — raising a threshold or
switching a rule to `allow` takes a human out of the loop — so it goes through
the same approval flow as loosening a transaction limit. Malformed rules are
rejected when you save them, not ignored when they are read.

## Deciding an approval

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Approve
curl -X POST "https://api.1claw.co/v1/approvals/$APPROVAL_ID/decide" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved"}'

# Deny
curl -X POST "https://api.1claw.co/v1/approvals/$APPROVAL_ID/decide" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "denied"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
// Approve
await client.approvals.decide(approvalId, { decision: "approved" });

// Deny
await client.approvals.decide(approvalId, { decision: "denied" });
```

</TabItem>
</Tabs>

### Auto-execution on approval

Some approvals do something when approved: 1claw applies the policy change,
places the card order, or submits the transaction, so the human does not have to
go and do it afterwards.

Those approvals are created by 1claw itself, on the endpoint that needs them —
which is why an agent cannot request one directly. A business action is the
other way round: 1claw records the decision and your code acts on it.

## Listing pending approvals

```bash
curl -s "https://api.1claw.co/v1/approvals?status=pending" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.approvals[] | {id, action, human_summary, risk_tier, created_at}'
```

## Dashboard

The approval inbox is at `/approvals` in the dashboard. It shows:

- Pending, approved, and denied requests
- Risk tier badges (color-coded)
- Agent name and the human who created the agent
- The plain-language summary, its fields, and separately the payload
- Approve/Reject buttons

The sidebar shows a badge with the count of pending approvals.

## Mobile companion app

The mobile app (iOS, TestFlight) provides push-notification-based approval. When an agent submits a request:

1. The human receives a push notification
2. Tapping opens the approval detail screen
3. Risk tier determines the verification step:
   - Tier 1: tap "Approve"
   - Tier 2: Face ID / Touch ID
   - Tier 3: Enter TOTP code within countdown

## Patterns

### Agent requests access to new secrets

```typescript
// Agent realizes it needs a secret it cannot access
try {
  await agentClient.secrets.get(vaultId, "production/stripe-key");
} catch (err) {
  if (err.status === 403) {
    // Request access through the approval flow
    await agentClient.approvals.request({
      action: "access_request",
      target_type: "agent",
      target_id: agentId,
      summary: {
        vault_id: vaultId,
        path_pattern: "production/stripe-key",
        permissions: ["read"],
      },
      reason: "Need Stripe key to process refunds",
    });
  }
}
```

### Agent requests a higher spend limit

```typescript
await agentClient.approvals.request({
  action: "policy_request",
  target_type: "agent",
  target_id: agentId,
  summary: {
    update_agent: {
      tx_daily_limit_eth: "10.0",
    },
  },
  reason: "Portfolio rebalancing requires larger daily limit during high-volatility periods",
  declared_risk_tier: 3,
});
```

### Gate high-value transactions on approval

For this pattern, the agent checks with its own logic before submitting a transaction:

```typescript
const txValue = 5.0; // ETH
const APPROVAL_THRESHOLD = 1.0;

if (txValue > APPROVAL_THRESHOLD) {
  const approval = await agentClient.approvals.request({
    action: "transaction",
    target_type: "transaction",
    target_id: agentId,
    summary: `Transfer ${txValue} ETH to 0xRecipient... on Ethereum`,
    reason: "Large position exit required by strategy",
    risk_tier: 3,
  });

  // Poll for decision (or set up a webhook)
  // Only proceed if approved
}

// Submit the transaction
const tx = await agentClient.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xRecipient...",
  value: txValue.toString(),
});
```

### Combine with treasury proposals

For multisig operations, use treasury proposals instead of approvals. Proposals collect EIP-712 signatures and auto-execute when the threshold is met. See [Safe integration](/docs/treasury/safe-multisig).

For non-multisig operations (policy changes, guardrail updates, access requests), use the approval system described here.

## Webhooks

Set up a webhook to get notified when approvals are decided:

```bash
curl -X POST https://api.1claw.co/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/1claw",
    "events": ["policy.created", "policy.updated", "policy.deleted"],
    "secret": "your-webhook-signing-secret"
  }'
```

## Further reading

- [Safe integration](/docs/treasury/safe-multisig) for multisig treasury proposals
- [Transaction guardrails](/docs/agents/intents/guardrails#transaction-guardrails) for programmatic limits
- [Agent self-enrollment](/docs/agents/self-enrollment) for the self-onboarding flow
- [Securing agent access](/docs/vaults/securing-access) for reducing blast radius
