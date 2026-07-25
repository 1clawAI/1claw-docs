---
title: "Safe (Gnosis Safe) integration"
description: Use 1claw's treasury API with Safe multisigs. Agents propose transactions, humans approve, and auto-execute fires when threshold is met.
sidebar_position: 54
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Safe (Gnosis Safe) Integration

1claw uses [Safe](https://safe.global) (formerly Gnosis Safe) as the multisig layer for treasury operations. This guide covers how to connect an existing Safe, how agents propose and sign transactions, and how auto-execute works when the signer threshold is met.

If you already run a Safe for your DAO, project treasury, or team funds, this is how you wire it into 1claw so agents can propose transactions and humans retain final approval.

## How it works

```
Agent                     1claw Vault                    Safe (on-chain)
  |                           |                               |
  |  POST /treasury/{id}/     |                               |
  |    proposals              |                               |
  |  { to, value, data }      |                               |
  | ----------------------->  |                               |
  |                           |  Create proposal record       |
  |                           |  Compute Safe tx hash         |
  |                           |                               |
  |  <----- proposal_id ----  |                               |
  |                           |                               |
  |                        Human signs (dashboard / API)       |
  |                           |                               |
  |                           |  Threshold met?               |
  |                           |  Yes: build execTransaction   |
  |                           |  calldata, broadcast -------> |
  |                           |                               |
  |  <-- executed_tx_hash --- |                               |
```

1. An agent (or human) creates a proposal with the target address, value, and calldata.
2. Signers approve by submitting EIP-712 signatures.
3. When the number of approvals reaches the Safe's threshold, 1claw builds the `execTransaction` calldata (sorted signatures, as Safe requires), broadcasts it, and updates the proposal to `executed`.

## Prerequisites

- A deployed Safe on a supported EVM chain
- A 1claw account on Pro or higher
- At least one agent with `intents_api_enabled: true`

## Step 1: Create a treasury

Register your Safe with 1claw:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
TREASURY=$(curl -s -X POST https://api.1claw.xyz/v1/treasury \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DAO Treasury",
    "safe_address": "0xYourSafeAddress...",
    "chain": "ethereum",
    "chain_id": 1,
    "threshold": 2,
    "signers": [
      "0xSigner1...",
      "0xSigner2...",
      "0xSigner3..."
    ]
  }')

TREASURY_ID=$(echo "$TREASURY" | jq -r '.id')
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const treasury = await client.treasury.create({
  name: "DAO Treasury",
  safe_address: "0xYourSafeAddress...",
  chain: "ethereum",
  chain_id: 1,
  threshold: 2,
  signers: ["0xSigner1...", "0xSigner2...", "0xSigner3..."],
});
```

</TabItem>
</Tabs>

## Step 2: Delegate signing authority to an agent

Create a delegation that lets the agent propose and sign transactions using the treasury:

```bash
# Approve the agent's access request with delegation
curl -X POST "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/access-requests/$REQUEST_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_add_signer": true,
    "delegation_mode": "owner",
    "guardrails": {
      "to_allowlist": ["0xAllowedContract..."],
      "max_value_eth": "1.0",
      "allowed_chains": ["ethereum"]
    }
  }'
```

Delegation modes:

| Mode | How it works |
|------|--------------|
| `owner` | Agent's EOA is added as an on-chain Safe signer. Agent signs UserOps with its own key. Safe threshold still applies. |
| `delegated` | Agent signs using the treasury wallet key through the Intents API. The key never leaves the `__treasury-keys` vault. |
| `both` | Agent can use either mode depending on the request. |

Per-delegation guardrails override or intersect with agent-level guardrails. The strictest of both wins.

## Step 3: Agent proposes a transaction

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
PROPOSAL=$(curl -s -X POST "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/proposals" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "to_address": "0xRecipient...",
    "value_wei": "500000000000000000",
    "data_hex": "0x"
  }')

PROPOSAL_ID=$(echo "$PROPOSAL" | jq -r '.id')
echo "Proposal: $PROPOSAL_ID"
echo "Status: $(echo "$PROPOSAL" | jq -r '.status')"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const proposal = await agentClient.treasury.propose(treasuryId, {
  chain: "ethereum",
  to_address: "0xRecipient...",
  value_wei: "500000000000000000", // 0.5 ETH
  data_hex: "0x",
});

console.log("Proposal ID:", proposal.data.id);
console.log("Status:", proposal.data.status); // "pending"
```

</TabItem>
</Tabs>

The proposal starts in `pending` status. It does not execute until enough signers approve.

## Step 4: Signers approve

Each signer submits an EIP-712 signature:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/proposals/$PROPOSAL_ID/sign" \
  -H "Authorization: Bearer $SIGNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approve",
    "signature": "0xEIP712Signature..."
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.treasury.signProposal(treasuryId, proposalId, {
  decision: "approve",
  signature: eip712Signature,
});
```

</TabItem>
</Tabs>

To reject:

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/proposals/$PROPOSAL_ID/sign" \
  -H "Authorization: Bearer $SIGNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "reject"}'
```

## Step 5: Auto-execute on threshold

When the number of `approve` signatures reaches the Safe's threshold:

1. 1claw collects all approve signatures, sorted by signer address (Safe requirement)
2. Builds `execTransaction` calldata using `crypto/safe_exec.rs`
3. Broadcasts the transaction via RPC
4. Updates the proposal to `executed` with the on-chain `executed_tx_hash`

No manual execution step is needed unless you want to force-execute:

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/proposals/$PROPOSAL_ID/execute" \
  -H "Authorization: Bearer $TOKEN"
```

## Auto-approve rules

For low-value, routine transactions, you can configure auto-approve rules on the delegation. When an agent creates a proposal matching a rule, 1claw automatically inserts the agent's signature. If that meets the threshold, the transaction executes immediately with no human interaction.

```bash
curl -X PATCH "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/delegations/$DELEGATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_approve_rules": [
      {
        "max_value_eth": "0.01",
        "to_allowlist": ["0xKnownContract..."],
        "auto": true
      }
    ]
  }'
```

This rule means: if the agent proposes a transaction to `0xKnownContract...` with value under 0.01 ETH, auto-sign with the agent's key. If that meets threshold (e.g., 1-of-2), execute immediately.

:::warning
Auto-approve rules bypass human review for matching transactions. Set tight constraints (low value, specific contracts) to limit exposure.
:::

## Monitoring proposals

List all proposals for a treasury:

```bash
curl -s "https://api.1claw.xyz/v1/treasury/$TREASURY_ID/proposals?status=pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.proposals[] | {id, status, to_address, value_wei}'
```

Proposal statuses:

| Status | Meaning |
|--------|---------|
| `pending` | Waiting for signatures |
| `approved` | Threshold met, not yet executed |
| `executing` | Execution transaction in progress |
| `executed` | On-chain, `executed_tx_hash` is set |
| `rejected` | Majority rejected |
| `expired` | Past `expires_at` |

## Dashboard

The treasury detail page in the 1claw dashboard has a **Proposals** tab showing all proposals with their signature status. Signers can approve or reject directly from the UI without needing to craft API calls.

## For existing Safe users

If you already manage a Safe through the Safe app (app.safe.global), you can continue to use it alongside 1claw. The Safe's on-chain state is the source of truth. 1claw adds:

- Agent delegation (let bots propose transactions)
- Server-side auto-execute (no manual relay step)
- Per-delegation guardrails (spend caps, allowlists)
- Audit trail in 1claw for every proposal and signature

## Further reading

- [Treasury wallets](/docs/guides/treasury) for HSM-backed native wallets
- [Intents API](/docs/guides/intents-api) for direct agent signing (non-multisig)
- [Account Abstraction](/docs/guides/account-abstraction) for ERC-4337 smart accounts
- [Human-in-the-loop approvals](/docs/guides/approvals) for the general approval framework
