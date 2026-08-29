---
title: "5-minute walkthrough: vault, key, transaction"
description: Create a vault, store a secret, provision a signing key, and sign your first on-chain transaction in five minutes.
sidebar_position: 50
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 5-Minute Walkthrough

This guide takes you from zero to a signed on-chain transaction. By the end you will have:

1. A vault with a secret stored inside it
2. An agent with a signing key provisioned on Ethereum
3. A policy granting the agent read access
4. A signed transaction on a testnet

The whole thing takes about five minutes assuming you already have an account. If you do not, [sign up at 1claw.co](https://1claw.co) first.

## Prerequisites

- A 1claw account (free tier works)
- A human API key (`1ck_...`) or a session token from the dashboard
- `curl` and `jq` installed (or use the SDK)

## Step 1: Create a vault

A vault is a container for secrets. Every secret lives inside exactly one vault.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
export TOKEN="your-jwt-or-1ck-key"

VAULT=$(curl -s -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Quickstart","description":"Five-minute walkthrough"}')

VAULT_ID=$(echo "$VAULT" | jq -r '.id')
echo "Vault ID: $VAULT_ID"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_API_KEY!,
});

const { data: vault } = await client.vault.create({
  name: "Quickstart",
  description: "Five-minute walkthrough",
});

const vaultId = vault.id;
console.log("Vault ID:", vaultId);
```

</TabItem>
</Tabs>

## Step 2: Store a secret

Put a secret into the vault. This could be an API key, a database URL, or any sensitive value. The value is encrypted at rest using AES-256-GCM with HSM-managed keys.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/demo/api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "sk-test-abc123def456",
    "type": "api_key",
    "description": "Demo API key for walkthrough"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.put(vaultId, "demo/api-key", {
  value: "sk-test-abc123def456",
  type: "api_key",
  description: "Demo API key for walkthrough",
});
```

</TabItem>
</Tabs>

## Step 3: Register an agent

An agent is a non-human caller (AI assistant, backend service, automation) that accesses secrets through scoped policies. Save the `api_key` from the response. You will only see it once.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
AGENT=$(curl -s -X POST https://api.1claw.xyz/v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Walkthrough Agent",
    "intents_api_enabled": true
  }')

AGENT_ID=$(echo "$AGENT" | jq -r '.agent.id')
AGENT_KEY=$(echo "$AGENT" | jq -r '.agent.api_key')
echo "Agent ID: $AGENT_ID"
echo "Agent API Key: $AGENT_KEY"   # save this, shown once
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const agent = await client.agents.create({
  name: "Walkthrough Agent",
  intents_api_enabled: true,
});

const agentId = agent.data.agent.id;
const agentKey = agent.data.agent.api_key; // save this, shown once
```

</TabItem>
</Tabs>

## Step 4: Create a policy

Policies define what an agent can access. This one grants read access on everything under the `demo/` path in the vault.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"principal_type\": \"agent\",
    \"principal_id\": \"$AGENT_ID\",
    \"secret_path_pattern\": \"demo/*\",
    \"permissions\": [\"read\"]
  }"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.access.grantAgent(vaultId, agentId, ["read"], {
  secretPathPattern: "demo/*",
});
```

</TabItem>
</Tabs>

## Step 5: Provision a signing key

Provision an Ethereum signing key for the agent. 1claw generates the keypair inside the HSM and stores the private key in the `__agent-keys` vault. The agent never sees the raw key.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
SIGNING_KEY=$(curl -s -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum"}')

echo "$SIGNING_KEY" | jq '{chain, address, public_key}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const signingKey = await client.signingKeys.create(agentId, {
  chain: "ethereum",
});

console.log("Address:", signingKey.data.address);
```

</TabItem>
</Tabs>

Fund the address with Sepolia ETH from a [faucet](https://sepoliafaucet.com) before submitting a transaction.

## Step 6: Sign a transaction

Exchange the agent API key for a JWT, then submit a transaction on Sepolia. The vault signs it server-side and broadcasts it.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Exchange agent key for JWT
AGENT_TOKEN=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d "{\"api_key\": \"$AGENT_KEY\"}" | jq -r '.token')

# Submit a testnet transaction
TX=$(curl -s -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "sepolia",
    "to": "0x000000000000000000000000000000000000dEaD",
    "value": "0.0001"
  }')

echo "$TX" | jq '{id, tx_hash, status}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const agentClient = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: agentKey,
});

const tx = await agentClient.agents.submitTransaction(agentId, {
  chain: "sepolia",
  to: "0x000000000000000000000000000000000000dEaD",
  value: "0.0001",
});

console.log("TX hash:", tx.data.tx_hash);
console.log("Status:", tx.data.status);
```

</TabItem>
</Tabs>

The response includes the `tx_hash` you can look up on [Sepolia Etherscan](https://sepolia.etherscan.io).

## What just happened

1. **Vault** encrypted your secret with a per-secret DEK wrapped by an HSM-managed KEK.
2. **Policy engine** scoped the agent to only the paths you allowed.
3. **Signing key** was generated inside the HSM. The private key lives in `__agent-keys` and never left the server.
4. **Transaction** was signed server-side and broadcast through the chain's RPC. The agent received a hash, not a key.

## Next steps

- Add [transaction guardrails](/docs/agents/intents/guardrails#transaction-guardrails) (allowlists, daily spend caps, per-tx limits)
- Enable [Shroud](/docs/agents/shroud/overview) to inspect and redact LLM traffic
- Connect via [MCP](/docs/integrations/mcp-integration) so your AI coding tools call 1claw directly
- Set up [human-in-the-loop approvals](/docs/treasury/approvals) for high-value operations
- Explore [multi-chain signing](/docs/agents/intents/multi-chain-signing) for Bitcoin, Solana, XRP, Cardano, and Tron
