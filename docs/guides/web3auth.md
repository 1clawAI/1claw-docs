---
title: "Web3Auth integration"
description: Use Web3Auth for user-facing social login wallets and 1claw for agent signing, backend key management, and vault operations.
sidebar_position: 61
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Web3Auth Integration

[Web3Auth](https://web3auth.io) (formerly Torus) provides social login wallets with MPC key splitting for consumer dapps. Users log in with Google, Twitter, or email and get a non-custodial wallet without managing seed phrases. 1claw handles the other side: backend agents, server-side signing, credential storage, and transaction guardrails.

## When to use which

| Use case | Web3Auth | 1claw |
|----------|----------|-------|
| User login (Google, Twitter, email) | Web3Auth PnP or Core Kit | Not the primary path |
| User-facing wallet in the browser | Web3Auth-managed MPC wallet | Not needed |
| Backend signing (agents, automations) | Requires manual key management | Agent signing keys + Intents API |
| API key and credential storage | Not provided | Vault with HSM encryption |
| Transaction guardrails | Not provided | Allowlists, spend caps, daily limits |
| LLM secret redaction | Not provided | Shroud TEE proxy |

**Pattern:** Web3Auth handles user onboarding and in-browser signing. 1claw handles everything that runs without a user clicking a button.

## Architecture

```
User (browser)                    Your backend                  Blockchain
     |                                |                             |
     |  Web3Auth social login         |                             |
     |  (MPC wallet, user signs)      |                             |
     |  ---------------------------> |                             |
     |                                |                             |
     |                            1claw vault                       |
     |                            - Agent keys (HSM)               |
     |                            - API credentials                |
     |                            - Webhook secrets                |
     |                                |                             |
     |                            Intents API  ------------------> |
     |                            (automated txs, no user click)   |
```

## Step 1: Store Web3Auth credentials in the vault

Your Web3Auth client ID and verifier secrets should not sit in `.env` files. Store them in a 1claw vault:

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/web3auth/client-id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$WEB3AUTH_CLIENT_ID"'",
    "type": "api_key",
    "description": "Web3Auth client ID"
  }'

curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/web3auth/client-secret" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$WEB3AUTH_CLIENT_SECRET"'",
    "type": "api_key",
    "description": "Web3Auth verifier secret"
  }'
```

Your backend fetches these at startup or runtime:

```typescript
const clientId = await oneclaw.secrets.get(vaultId, "web3auth/client-id");
const clientSecret = await oneclaw.secrets.get(vaultId, "web3auth/client-secret");
```

## Step 2: Use 1claw for backend agent operations

Web3Auth wallets are user-controlled. For operations that do not have a user driving them (yield farming bots, automated rebalancing, scheduled contract calls), use a 1claw agent:

```typescript
import { createClient } from "@1claw/sdk";

const agent = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Background job: compound yields
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xYieldVault...",
  value: "0",
  data: compoundCalldata,
  simulate_first: true,
});
```

The agent's signing key is HSM-backed. It cannot be extracted by the agent or your code. Transaction guardrails (allowlists, spend caps) are enforced before signing.

## Step 3: Bridge user actions to agent operations

A common pattern: a user logs in with Web3Auth, and their action triggers a backend operation that requires server-side signing.

```typescript
// API route: user requests a portfolio rebalance
// User is authenticated via Web3Auth JWT
export async function POST(req: Request) {
  const { userAddress, strategy } = await req.json();

  // Verify the Web3Auth JWT (your existing auth)
  // ...

  // Trigger the agent to execute the rebalance
  const tx = await agent.agents.submitTransaction(agentId, {
    chain: "base",
    to: strategy.contractAddress,
    value: "0",
    data: strategy.calldata,
    simulate_first: true,
  });

  return Response.json({ txHash: tx.data.tx_hash });
}
```

## Web3Auth-to-1claw concept map

| Web3Auth concept | 1claw equivalent | Notes |
|-----------------|------------------|-------|
| Client ID | Org + human API key | 1claw auto-creates on signup |
| Verifier (custom JWT verifier) | Access policy + agent JWT | Policy-based, not verifier-based |
| MPC wallet (user) | Agent signing key (backend) | Different actors, same chains |
| `web3auth.provider` (ethers/viem) | Intents API | Web3Auth: browser. 1claw: server. |
| Custom auth (bring your own JWT) | Agent token exchange | Exchange `ocv_` key for short-lived JWT |
| Social recovery | Key rotation via API | `POST /v1/agents/{id}/signing-keys/{chain}/rotate` |

## Further reading

- [Intents API](/docs/guides/intents-api) for the full transaction signing reference
- [Multi-chain signing keys](/docs/guides/multi-chain-signing) for provisioning keys across six chains
- [Give an agent access](/docs/guides/give-agent-access) for the golden path
- [Agent frameworks](/docs/guides/agent-frameworks) for LangChain, CrewAI, and more
