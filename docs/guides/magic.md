---
title: "Magic integration"
description: Use Magic for auth-focused embedded wallets and 1claw for agent signing, backend key management, and vault operations.
sidebar_position: 63
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Magic Integration

[Magic](https://magic.link) provides passwordless authentication and embedded wallets, primarily used in enterprise and B2B web3 applications. Users log in via email magic links or social auth and get an embedded wallet. 1claw handles the server-side: agent credentials, backend signing keys, and operations that run without a user present.

## Where each tool fits

| Concern | Magic | 1claw |
|---------|-------|-------|
| User login (email magic link, social) | Magic Auth / Magic Connect | Not the primary path |
| User-facing embedded wallet | Magic wallet (Delegated Key Management) | Not needed for user wallets |
| Backend signing | Not provided | Agent signing keys + Intents API |
| Enterprise SSO (SAML, OIDC) | Magic Enterprise | 1claw supports SSO via WorkOS |
| API credential storage | Not provided | Vault with HSM encryption |
| Transaction guardrails | Not provided | Per-agent allowlists, spend caps |
| LLM proxy | Not provided | Shroud TEE proxy |

## Store Magic credentials in the vault

Magic's publishable and secret keys should be in a vault, not in environment variables:

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/magic/secret-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "sk_live_...",
    "type": "api_key",
    "description": "Magic secret key for server-side SDK"
  }'
```

Fetch at runtime:

```typescript
const secret = await oneclaw.secrets.get(vaultId, "magic/secret-key");
const magicSecretKey = secret.data.value;
```

## Backend operations with 1claw

Magic handles user-facing auth and signing. For background operations that run without a user session, use 1claw:

```typescript
import { createClient } from "@1claw/sdk";

const agent = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Server-side batch operation, no Magic user session involved
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "ethereum",
  to: "0xContract...",
  value: "0",
  data: batchCalldata,
  simulate_first: true,
});
```

## Enterprise pattern

For enterprise B2B applications where Magic provides SSO login:

1. Users authenticate through Magic with SAML/OIDC
2. Your backend validates the Magic DID token
3. Backend operations (batch mints, reward distributions, automated compliance) run through 1claw

```typescript
// Validate Magic DID token (your existing auth)
import { Magic } from "@magic-sdk/admin";
const magic = new Magic(await getSecretFromVault("magic/secret-key"));
await magic.token.validate(didToken);

// Trigger agent operation
const tx = await agent.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xRewardsContract...",
  value: "0",
  data: distributeRewardsCalldata,
});
```

## Concept map

| Magic concept | 1claw equivalent |
|--------------|------------------|
| Publishable API key | Not applicable (frontend only) |
| Secret key | Vault secret |
| DID token (user auth) | Agent JWT (agent auth) |
| Delegated Key Management | HSM-backed signing keys |
| Magic Admin SDK | 1claw SDK / Intents API |

## Further reading

- [Intents API](/docs/guides/intents-api) for the full signing reference
- [Give an agent access](/docs/guides/give-agent-access) for the golden path
- [Shroud](/docs/guides/shroud) for LLM traffic inspection
