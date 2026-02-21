---
title: Register an agent
description: Create an agent identity and receive an API key using POST /v1/agents; the key is shown only once.
sidebar_position: 0
---

# Register an agent

**Endpoint:** `POST /v1/agents`  
**Authentication:** Bearer JWT (human)

Creates a new agent identity and returns an **API key** (`ocv_...`). The key is returned only on create (and on rotate); store it securely for the agent to use with `POST /v1/auth/agent-token`.

## Request body

| Field                | Type    | Required | Description                                                                                                                                                                                                                                                     |
| -------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                 | string  | ✅       | Display name for the agent                                                                                                                                                                                                                                      |
| description          | string  | ❌       | Optional description                                                                                                                                                                                                                                            |
| auth_method          | string  | ❌       | Default `api_key`                                                                                                                                                                                                                                               |
| scopes               | array   | ❌       | Optional scope strings                                                                                                                                                                                                                                          |
| expires_at           | string  | ❌       | ISO 8601; agent token exchange fails after this                                                                                                                                                                                                                 |
| crypto_proxy_enabled | boolean | ❌       | Default `false`. When `true`, the agent **must** use the transaction proxy to broadcast crypto transactions and is **blocked** from reading `private_key` and `ssh_key` type secrets directly. See [Crypto Transaction Proxy](#crypto-transaction-proxy) below. |

## Example request

```bash
curl -X POST "https://api.1claw.xyz/v1/agents" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeFi Bot",
    "description": "Automated trading agent",
    "crypto_proxy_enabled": true,
    "scopes": ["vaults:read"]
  }'
```

## Example response (201)

```json
{
    "agent": {
        "id": "ec7e0226-30f0-4dda-b169-f060a3502603",
        "name": "DeFi Bot",
        "description": "Automated trading agent",
        "auth_method": "api_key",
        "scopes": ["vaults:read"],
        "is_active": true,
        "crypto_proxy_enabled": true,
        "created_at": "2026-02-18T12:00:00Z"
    },
    "api_key": "ocv_W3_eYj0BSdTjChKwCKRYuZJacmmhVn4ozWIxHV-zlEs"
}
```

Store the `api_key` securely; it cannot be retrieved again. Use [Deactivate agent / Rotate key](/docs/human-api/agents/deactivate-agent#rotate-agent-key) to get a new key if needed.

## Crypto Transaction Proxy

When `crypto_proxy_enabled` is set to `true`:

1. **Transaction proxy access** — The agent can call `POST /v1/agents/:id/transactions` to submit transactions that the signing proxy will broadcast using keys stored in the vault.

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
