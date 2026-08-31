---
title: "Fireblocks integration"
description: Position 1claw alongside Fireblocks for institutional custody. Use Fireblocks for cold storage and 1claw for agent-native hot signing, vault operations, and AI workflows.
sidebar_position: 64
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Fireblocks Integration

[Fireblocks](https://www.fireblocks.com) is an enterprise custody and settlement platform used by institutions, exchanges, and funds. If your organization uses Fireblocks, this guide explains how 1claw complements it for agent-driven operations, AI workflows, and application-level key management.

## How they differ

| Dimension | Fireblocks | 1claw |
|-----------|-----------|-------|
| Target user | Institutional custody teams, treasury managers | Developers, AI agents, application backends |
| Key storage | MPC-CMP across Fireblocks nodes | Google Cloud KMS HSM (FIPS 140-2 L3) |
| Signing model | Transaction Authorization Policy (TAP) with human approvals | Intents API with programmable guardrails |
| Agent support | API-based, no native agent auth | Native agent auth, JWT scoping, self-enrollment |
| Pricing | Enterprise contracts (typically $10K+/mo) | Free tier available, Pro at $29/mo |
| Secret management | Not provided | Full vault with HSM encryption |
| LLM proxy | Not provided | Shroud TEE proxy |
| Smart contracts | Raw message signing | Full Intents API (sign, broadcast, simulate) |

**In practice:** Fireblocks manages your institution's cold and warm wallets. 1claw manages your application's hot signing keys, agent credentials, and developer secrets. They operate at different layers.

## Architecture: Fireblocks + 1claw

```
Institution                        Application layer               Blockchain
     |                                   |                              |
     |  Fireblocks custody               |                              |
     |  (cold/warm wallets, TAP)         |                              |
     |  Large transfers, treasury ops --> |  --------------------------> |
     |                                   |                              |
     |                               1claw vault                        |
     |                               - Fireblocks API credentials      |
     |                               - Agent signing keys (hot)        |
     |                               - Application secrets             |
     |                                   |                              |
     |                               Agent Intents API  --------------> |
     |                               (high-frequency, low-value ops)   |
```

## Store Fireblocks API credentials in the vault

Fireblocks API keys and private keys for API authentication should be stored in 1claw, not in files or environment variables:

```bash
# Store the Fireblocks API secret key
curl -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/fireblocks/api-secret" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$(cat fireblocks-secret.key)"'",
    "type": "private_key",
    "description": "Fireblocks API private key for JWT signing"
  }'

curl -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/fireblocks/api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$FIREBLOCKS_API_KEY"'",
    "type": "api_key",
    "description": "Fireblocks API key"
  }'
```

Your application fetches these at runtime:

```typescript
const apiKey = await oneclaw.secrets.get(vaultId, "fireblocks/api-key");
const apiSecret = await oneclaw.secrets.get(vaultId, "fireblocks/api-secret");

const fireblocks = new FireblocksSDK(apiSecret.data.value, apiKey.data.value);
```

Benefits:

- Fireblocks credentials are HSM-encrypted at rest, not in config files
- Access policies control which agents can read the credentials
- Audit log tracks every access
- Secret rotation via the vault API, no redeployment needed

## Use 1claw for high-frequency hot operations

Fireblocks excels at institutional-grade custody with human approval flows. For operations that happen frequently and at lower value (bot trading, gas refills, automated claim harvesting), use 1claw's Intents API:

```typescript
// High-frequency: agent harvests yield every hour
// Uses 1claw signing key (HSM-backed, guardrailed)
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xYieldVault...",
  value: "0",
  data: harvestCalldata,
  simulate_first: true,
});

// Low-frequency, high-value: treasury rebalance
// Uses Fireblocks with TAP approvals
const fbTx = await fireblocks.createTransaction({
  assetId: "ETH",
  source: { type: "VAULT_ACCOUNT", id: vaultAccountId },
  destination: { type: "ONE_TIME_ADDRESS", oneTimeAddress: { address: "0x..." } },
  amount: "100",
});
```

Split by risk profile:

| Operation | Tool | Reason |
|-----------|------|--------|
| Gas refills | 1claw | Low value, high frequency, no human needed |
| Yield harvesting | 1claw | Automated, recurring, agent-driven |
| Token swaps (small) | 1claw | Guardrails cap exposure |
| Large transfers | Fireblocks | TAP policies, multi-person approval |
| Cold storage movements | Fireblocks | Institutional custody |
| Treasury rebalancing | Fireblocks (or 1claw treasury) | Depends on value and policy |

## Agent workflows that call Fireblocks

An agent can use 1claw to securely call the Fireblocks API:

```typescript
import { createClient } from "@1claw/sdk";
import { FireblocksSDK } from "fireblocks-sdk";

const oneclaw = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Agent fetches Fireblocks credentials from the vault
const apiKey = await oneclaw.secrets.get(vaultId, "fireblocks/api-key");
const apiSecret = await oneclaw.secrets.get(vaultId, "fireblocks/api-secret");

const fireblocks = new FireblocksSDK(apiSecret.data.value, apiKey.data.value);

// Agent queries Fireblocks for balances
const vaultAccounts = await fireblocks.getVaultAccountsWithPageInfo({});
for (const account of vaultAccounts.accounts) {
  console.log(`${account.name}: ${account.assets.map(a => `${a.id}: ${a.total}`).join(", ")}`);
}
```

The agent never stores the Fireblocks credentials locally. They are fetched just-in-time from the vault, used in memory, and discarded. Every access is logged.

## Concept map

| Fireblocks concept | 1claw equivalent |
|-------------------|------------------|
| Vault account | Vault |
| API user (service account) | Agent |
| Transaction Authorization Policy (TAP) | Transaction guardrails + access policies |
| Callback handler (webhook) | Webhooks |
| Exchange/fiat settlement | Not applicable (different scope) |
| MPC signing | HSM signing (single-party, faster) |

## Further reading

- [Intents API](/docs/agents/intents/overview) for the full signing reference
- [Secret rotation](/docs/vaults/rotation-bindings) for rotating credentials without redeploying
- [Multi-chain signing](/docs/agents/intents/multi-chain-signing) for provisioning keys on six chains
- [Human-in-the-loop approvals](/docs/treasury/approvals) for agent governance
