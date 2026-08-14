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

1. The agent creates an approval request, specifying the action, a summary, and a risk tier.
2. 1claw routes the request to the human who registered the agent (`agents.created_by`).
3. The human reviews and decides (approve or deny) through the dashboard, mobile app, or API.
4. If the action is `policy_change` and the decision is `approved`, 1claw auto-executes the policy change.

## Creating an approval request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/approvals/request \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "policy_change",
    "target_type": "agent",
    "target_id": "'"$AGENT_ID"'",
    "summary": "Request read access to secrets/production/*",
    "reason": "Need production database credentials for migration task",
    "risk_tier": 2
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const approval = await agentClient.approvals.request({
  action: "policy_change",
  target_type: "agent",
  target_id: agentId,
  summary: "Request read access to secrets/production/*",
  reason: "Need production database credentials for migration task",
  risk_tier: 2,
});

console.log("Approval ID:", approval.data.id);
console.log("Status:", approval.data.status); // "pending"
```

</TabItem>
</Tabs>

### Risk tiers

| Tier | Meaning | Mobile app behavior |
|------|---------|---------------------|
| 1 | Informational | Simple tap to approve |
| 2 | Moderate risk | Biometric verification required |
| 3 | High risk | TOTP code + countdown timer |

Set the risk tier based on the sensitivity of the action. A request to read a test secret might be tier 1. A request to increase a daily spend limit should be tier 3.

## Deciding an approval

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Approve
curl -X POST "https://api.1claw.xyz/v1/approvals/$APPROVAL_ID/decide" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved"}'

# Deny
curl -X POST "https://api.1claw.xyz/v1/approvals/$APPROVAL_ID/decide" \
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

When `action` is `policy_change` and the decision is `approved`, 1claw automatically executes the policy change described in the `summary` JSON. The human does not need to manually create the policy after approving.

## Listing pending approvals

```bash
curl -s "https://api.1claw.xyz/v1/approvals?status=pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.approvals[] | {id, action, summary, risk_tier, created_at}'
```

## Dashboard

The approval inbox is at `/approvals` in the dashboard. It shows:

- Pending, approved, and denied requests
- Risk tier badges (color-coded)
- Agent name and the human who created the agent
- Summary and reason text
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
      action: "policy_change",
      target_type: "agent",
      target_id: agentId,
      summary: JSON.stringify({
        vault_id: vaultId,
        path_pattern: "production/stripe-key",
        permissions: ["read"],
      }),
      reason: "Need Stripe key to process refunds",
      risk_tier: 2,
    });
  }
}
```

### Agent requests a higher spend limit

```typescript
await agentClient.approvals.request({
  action: "policy_change",
  target_type: "agent",
  target_id: agentId,
  summary: JSON.stringify({
    update_agent: {
      tx_daily_limit_eth: "10.0",
    },
  }),
  reason: "Portfolio rebalancing requires larger daily limit during high-volatility periods",
  risk_tier: 3,
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

For multisig operations, use treasury proposals instead of approvals. Proposals collect EIP-712 signatures and auto-execute when the threshold is met. See [Safe integration](/docs/guides/safe-multisig).

For non-multisig operations (policy changes, guardrail updates, access requests), use the approval system described here.

## Webhooks

Set up a webhook to get notified when approvals are decided:

```bash
curl -X POST https://api.1claw.xyz/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/1claw",
    "events": ["policy.created", "policy.updated", "policy.deleted"],
    "secret": "your-webhook-signing-secret"
  }'
```

## Further reading

- [Safe integration](/docs/guides/safe-multisig) for multisig treasury proposals
- [Transaction guardrails](/docs/guides/intents-guardrails#transaction-guardrails) for programmatic limits
- [Agent self-enrollment](/docs/guides/agent-self-onboarding) for the self-onboarding flow
- [Securing agent access](/docs/guides/securing-agent-access) for reducing blast radius
