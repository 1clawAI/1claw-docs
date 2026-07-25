---
title: "Thirdweb integration"
description: Integrate 1claw alongside Thirdweb's SDK for agent-side signing, backend key management, and secret storage in full-stack web3 applications.
sidebar_position: 62
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Thirdweb Integration

[Thirdweb](https://thirdweb.com) is a full-stack web3 SDK covering wallet connection, smart accounts, contract deployment, and frontend components. Many projects use Thirdweb for the user-facing side and need something else for backend/agent operations. That is where 1claw fits.

## Where each tool fits

| Concern | Thirdweb | 1claw |
|---------|----------|-------|
| User wallet connection | ConnectWallet, in-app wallets | Not the primary path |
| Smart accounts (AA) | Engine + Account Factory | Agent signing keys as smart account owner |
| Contract deployment | Dashboard or SDK | Not applicable (Thirdweb handles this) |
| Backend signing | Thirdweb Engine (self-hosted) | Intents API (managed, HSM-backed) |
| API key management | Environment variables | Vault with HSM encryption |
| Transaction guardrails | Engine admin controls | Per-agent allowlists, spend caps, daily limits |
| AI agent integration | Not built in | Native agent auth, MCP, policy engine |

**Key difference:** Thirdweb Engine is a self-hosted backend signer you run on your own infrastructure. 1claw is a managed service where signing happens inside HSM/TEE and keys never leave the secure boundary. If you are already running Engine and happy with the ops burden, keep it. If you want managed signing with policy enforcement, use 1claw.

## Replacing Thirdweb Engine with 1claw

Thirdweb Engine requires you to host a server, manage a database, and hold private keys in the Engine wallet. 1claw removes that infrastructure.

**Thirdweb Engine (before):**

```typescript
import { Engine } from "@thirdweb-dev/engine";

const engine = new Engine({
  url: "https://your-engine.example.com",
  accessToken: process.env.ENGINE_ACCESS_TOKEN!,
});

// Engine signs with a wallet it holds
const result = await engine.contract.write({
  chain: "base",
  contractAddress: "0xContract...",
  backendWalletAddress: "0xYourEngineWallet...",
  functionName: "mint",
  args: [recipientAddress, tokenId],
});
```

**1claw (after):**

```typescript
import { createClient } from "@1claw/sdk";

const agent = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// 1claw signs with HSM-backed key, broadcasts, returns hash
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xContract...",
  value: "0",
  data: mintCalldata, // encoded function call
  simulate_first: true,
});
```

What changes:

- No self-hosted Engine server to manage
- Private keys are HSM-backed and never exposed
- Transaction guardrails are enforced before signing
- Full audit trail in 1claw

What stays the same:

- Your frontend Thirdweb components (ConnectWallet, contract reads) are untouched
- Smart account deployments stay with Thirdweb if you prefer

## Storing Thirdweb secrets in the vault

Move your Thirdweb credentials out of environment variables:

```bash
# Store the Thirdweb secret key
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/thirdweb/secret-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$THIRDWEB_SECRET_KEY"'",
    "type": "api_key",
    "description": "Thirdweb secret key for server-side SDK"
  }'

# Store the client ID (not sensitive but good practice)
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/thirdweb/client-id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "'"$THIRDWEB_CLIENT_ID"'",
    "type": "api_key",
    "description": "Thirdweb client ID"
  }'
```

Fetch at runtime:

```typescript
const secret = await agent.secrets.get(vaultId, "thirdweb/secret-key");
const thirdwebSecretKey = secret.data.value;
```

## Using 1claw with Thirdweb smart accounts

Thirdweb smart accounts (via Account Factory) need an owner/signer. A 1claw agent's signing key works as that owner.

```typescript
import { createClient } from "@1claw/sdk";

const oneclaw = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// The agent's signing key address becomes the smart account owner
// Provision via: POST /v1/agents/{id}/signing-keys { "chain": "ethereum" }
// The address is returned in the signing key response

// For ERC-4337 operations through the smart account,
// use 1claw's gasless mode:
const tx = await oneclaw.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xSmartAccountTarget...",
  value: "0",
  data: calldata,
  gasless: true, // wraps as UserOp, gas sponsored
});
```

See the [Account Abstraction guide](/docs/guides/account-abstraction) for more patterns.

## Hybrid architecture

Many teams keep Thirdweb for the frontend and use 1claw for the backend:

```
User (browser)                     Your server                   Blockchain
     |                                 |                              |
     |  Thirdweb ConnectWallet         |                              |
     |  (user signs in browser)        |                              |
     |  -----------------------------> |                              |
     |                                 |                              |
     |                             1claw vault                        |
     |                             - Thirdweb keys                   |
     |                             - RPC credentials                 |
     |                             - Agent signing keys              |
     |                                 |                              |
     |                             Intents API  ------------------>  |
     |                             (backend operations)              |
```

## Concept map

| Thirdweb concept | 1claw equivalent |
|-----------------|------------------|
| Engine backend wallet | Agent signing key |
| Engine access token | Agent API key (`ocv_`) |
| Secret key (server-side) | Vault secret |
| Contract write (Engine) | `submitTransaction` (Intents API) |
| Smart account (AccountFactory) | Agent smart account (`gasless: true`) |
| Dashboard environment | Vault |

## Further reading

- [Intents API](/docs/guides/intents-api) for the full signing reference
- [Account Abstraction](/docs/guides/account-abstraction) for ERC-4337 patterns
- [Give an agent access](/docs/guides/give-agent-access) for the golden path
- [Five-minute walkthrough](/docs/guides/five-minute-walkthrough) for a quick start
