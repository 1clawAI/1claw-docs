---
title: "Coinbase Wallet and Smart Wallet"
description: Use 1claw alongside Coinbase Wallet and Coinbase Smart Wallet for agent operations, approvals, and server-side key management.
sidebar_position: 53
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Coinbase Wallet and Smart Wallet

[Coinbase Wallet](https://www.coinbase.com/wallet) and [Coinbase Smart Wallet](https://www.smartwallet.dev/) are self-custody wallets. Smart Wallet uses passkeys and ERC-4337 account abstraction for gasless, recoverable accounts. 1claw does not replace either. Instead, it handles the operations that happen outside the user's wallet: agent-driven transactions, server-side signing, treasury management, and secret storage.

## How they complement each other

| Concern | Coinbase Wallet / Smart Wallet | 1claw |
|---------|-------------------------------|-------|
| User custody and signing | User holds keys (EOA or smart account) | Not applicable: 1claw does not hold user keys |
| Passkey-based authentication | Smart Wallet uses passkeys for signing | 1claw uses passkeys for dashboard login and tx authorization |
| Agent/backend operations | Not designed for headless agents | Agent API keys, signing keys, Intents API |
| Transaction guardrails | Wallet-level UX confirmations | Server-side policy engine (allowlists, spend caps, chain restrictions) |
| Secret management | Not applicable | HSM-encrypted vault with policies |
| Multisig treasury | Not built in | Safe-based proposals with agent delegation |
| LLM proxy | Not applicable | Shroud TEE proxy |

**In short:** Coinbase Smart Wallet is a user's wallet. 1claw is the infrastructure behind your backend and your agents. Use both.

## Architecture

```
User with Smart Wallet              Your backend + agents           Blockchain
        |                                   |                           |
        |  Coinbase Smart Wallet            |                           |
        |  (passkey, ERC-4337)              |                           |
        |  User-initiated txs ------------>  |  ----------------------> |
        |                                   |                           |
        |                               1claw vault                     |
        |                               - Backend secrets              |
        |                               - Agent signing keys           |
        |                                   |                           |
        |                               Agent calls Intents API ------> |
        |                               (automated ops, no user click) |
        |                                   |                           |
        |  <-- approval request --      Approval queue                 |
        |  (dashboard / mobile)         (human-in-the-loop)            |
```

## Use case 1: Agent operations alongside Smart Wallet

Your users sign transactions with Coinbase Smart Wallet in the browser. Your agents handle background operations (rebalancing, liquidation protection, yield harvesting) through 1claw.

```typescript
import { createClient } from "@1claw/sdk";

// Agent client, configured with the agent's own API key
const agent = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Agent submits a background transaction
// The signing key is HSM-backed, never extracted
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xYieldVault...",
  value: "0",
  data: harvestCalldata,
  simulate_first: true,
});
```

The user's Smart Wallet and the agent's signing key are completely separate. The user controls their funds through their passkey. The agent controls its own signing key through policies set by a human admin.

## Use case 2: Store Coinbase API keys in the vault

If you integrate with Coinbase's APIs (Commerce, Exchange, Onramp), store those credentials in a 1claw vault instead of environment variables.

```bash
curl -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/coinbase/commerce-api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$COINBASE_COMMERCE_KEY"'",
    "type": "api_key",
    "description": "Coinbase Commerce API key"
  }'
```

Your agent fetches the key at runtime:

```typescript
const secret = await agent.secrets.get(vaultId, "coinbase/commerce-api-key");
const commerceKey = secret.data.value;
```

Benefits over environment variables:

- HSM encryption at rest
- Access policies with expiry, IP conditions, and time windows
- Audit log of every read
- Secret rotation without redeploying

## Use case 3: Human approvals for agent transactions

Smart Wallet uses passkeys for user-level transaction confirmation. For agent-level governance, 1claw provides an approval system where agents propose actions and humans approve them.

```typescript
// Agent requests approval for a high-value operation
const approval = await agent.approvals.request({
  action: "policy_request",
  target_type: "agent",
  target_id: agentId,
  summary: { title: "Increase daily spend limit to 10 ETH" },
  reason: "Portfolio rebalancing requires larger position sizes",
  declared_risk_tier: 2, // asks for biometric approval on mobile; 1claw may require more
});
```

The human approves or denies in the dashboard, mobile app, or via API. This is separate from the user's Smart Wallet flow. It governs what the agent can do, not what the user can do.

## Use case 4: Smart account as a Safe signer

If you deploy a Safe multisig and want both a Smart Wallet user and a 1claw agent as signers:

1. Deploy a Safe with the Smart Wallet address and the agent's EOA as signers
2. Set threshold to 2 (both must approve)
3. The agent proposes transactions through 1claw's treasury API
4. The human signs with their Smart Wallet

```typescript
// Agent proposes a treasury transaction
const proposal = await agent.treasury.propose(treasuryId, {
  chain: "base",
  to_address: "0xRecipient...",
  value_wei: "1000000000000000000", // 1 ETH
});

// Human signs with Smart Wallet (EIP-712 signature)
// When threshold is met, 1claw auto-executes
```

See the [Safe integration guide](/docs/treasury/safe-multisig) for the full setup.

## Use case 5: ERC-4337 smart accounts with 1claw

Smart Wallet uses ERC-4337. 1claw also supports ERC-4337 for agent-owned smart accounts. The agent's signing key becomes the owner of a Safe deployed via 1claw:

```typescript
// Gasless transaction via ERC-4337 paymaster
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xContract...",
  value: "0",
  data: calldata,
  gasless: true, // sponsors gas via Pimlico paymaster
});
```

This is useful when you want agents to operate smart accounts without holding native tokens for gas.

## Concept map

| Coinbase Smart Wallet concept | 1claw equivalent | Relationship |
|------------------------------|------------------|--------------|
| Passkey signer | Dashboard passkey login | Different contexts: user vs. admin |
| ERC-4337 UserOperation | `gasless: true` on Intents API | Same protocol, different actors |
| Self-custody | HSM custody (agent keys) | Users self-custody; agents get HSM-backed keys |
| Transaction confirmation (UI) | Policy engine + approval queue | UI prompts vs. server-side policy |
| Onchain session keys | Agent JWT (scoped, short-lived) | Scoped access, automatic expiry |

## Further reading

- [Account Abstraction guide](/docs/treasury/account-abstraction) for ERC-4337 with ZeroDev, Alchemy, and Biconomy
- [Safe integration](/docs/treasury/safe-multisig) for multisig treasury operations
- [Intents API](/docs/agents/intents/overview) for the full transaction signing reference
- [Human-in-the-loop approvals](/docs/treasury/approvals) for agent governance
