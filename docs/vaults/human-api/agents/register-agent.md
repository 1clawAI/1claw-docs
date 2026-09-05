---
title: Register an agent
description: Create an agent identity and receive an API key using POST /v1/agents; the key is shown only once.
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Register an agent

**Endpoint:** `POST /v1/agents`  
**Authentication:** Bearer JWT (human)

Creates a new agent identity and returns an **API key** (`ocv_...`). The key is returned only on create (and on rotate); store it securely for the agent to use with `POST /v1/auth/agent-token`.

In addition to the API key, each agent automatically receives:

- **Ed25519 signing keypair** — public key on the agent record (`ssh_public_key`), private key in the org's `__agent-keys` vault.
- **P-256 ECDH keypair** — public key on the agent record (`ecdh_public_key`), private key in `__agent-keys`.

See [Agent keys](/docs/security/agent-keys) for details on key formats and how to access private keys.

## Request body

| Field                | Type    | Required | Description                                                                                                                                                                                                                                                     |
| -------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                 | string  | ✅       | Display name for the agent                                                                                                                                                                                                                                      |
| description          | string  | ❌       | Optional description                                                                                                                                                                                                                                            |
| auth_method          | string  | ❌       | Default `api_key`                                                                                                                                                                                                                                               |
| scopes               | array   | ❌       | Optional scope strings                                                                                                                                                                                                                                          |
| expires_at           | string  | ❌       | ISO 8601; agent token exchange fails after this                                                                                                                                                                                                                 |
| api_key_expires_at   | string  | ❌       | ISO 8601; the agent's `ocv_` API key is rejected after this date. Use for time-limited credentials.                                                                                                                                                             |
| intents_api_enabled | boolean | ❌       | Default `false`. When `true`, the agent **must** use the Intents API to broadcast crypto transactions and is **blocked** from reading `private_key` and `ssh_key` type secrets directly. See [Intents API](#intents-api) below. |

## Example request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/agents" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeFi Bot",
    "description": "Automated trading agent",
    "intents_api_enabled": true,
    "scopes": ["vaults:read"]
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.create({
  name: "DeFi Bot",
  description: "Automated trading agent",
  intents_api_enabled: true,
  scopes: ["vaults:read"],
});
console.log(data.agent.id, data.api_key); // Store api_key securely
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

## Example response (201)

```json
{
    "agent": {
        "id": "00000000-0000-4000-8000-000000000000",
        "name": "DeFi Bot",
        "description": "Automated trading agent",
        "auth_method": "api_key",
        "scopes": ["vaults:read"],
        "is_active": true,
        "intents_api_enabled": true,
        "ssh_public_key": "m+Z6jV5W86WMTV27cpk9QGXIo+fP1OX88dHxdj6DHUI=",
        "ecdh_public_key": "BDq8k3Lw...base64...65bytes...",
        "created_at": "2026-02-18T12:00:00Z"
    },
    "api_key": "ocv_EXAMPLE_KEY_NOT_REAL_replace_with_your_own"
}
```

Store the `api_key` securely; it cannot be retrieved again. Use [Deactivate agent / Rotate key](/docs/vaults/human-api/agents/deactivate-agent#rotate-agent-key) to get a new key if needed.

## Intents API

When `intents_api_enabled` is set to `true`:

1. **Intents API access** — The agent can call `POST /v1/agents/:id/transactions` to submit transactions that the signing proxy will broadcast using keys stored in the vault.

2. **Private key reads blocked** — The agent is **blocked** from reading secrets of type `private_key` or `ssh_key` through the normal `GET /v1/vaults/:vault_id/secrets/:path` endpoint. Any attempt returns `403 Forbidden`.

3. **Other secrets unaffected** — The agent can still read `api_key`, `password`, `certificate`, `env_bundle`, and other secret types normally (subject to policies).

This enforcement means the agent can never exfiltrate raw signing keys — it can only request that the server sign and broadcast transactions on its behalf.

### When to enable

- The agent needs to initiate financial transactions (swaps, transfers, contract calls)
- You want to prevent the agent from ever seeing the raw private key
- You want a full audit trail of every transaction the agent submits

### When to leave disabled

- The agent only needs to read API keys, passwords, or config secrets
- The agent doesn't interact with blockchain transactions
