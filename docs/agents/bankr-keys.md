---
title: Bankr Key Vending
description: Dynamic key vending for short-lived Bankr wallet API keys — deny-by-default, policy-gated, no secret in tool output.
sidebar_position: 16
---

# Bankr Dynamic Key Vending

The Bankr key vending system issues short-lived `bk_usr_` API keys to agents on demand, replacing static `put_secret` patterns. The partner key (`bk_ptr_`) is stored server-side; the vault issues scoped, TTL-bound user keys. This is the recommended pattern for Bankr wallet access.

:::tip Security model
- **Deny-by-default:** Agents need an explicit policy on `agents/{id}/bankr/*` in `__agent-keys` vault with `write` permission.
- **No secret in output:** Agent lease responses and MCP `lease_bankr_key` omit the `bk_usr_` key value — Shroud resolves it server-side.
- **Short TTL:** Recommend 5–15 min for autonomous agents; max 86400s (24h).
:::

## Setup

### 1. Configure Your Org's Bankr Partner Key

Store your `bk_ptr_` partner key via the dashboard or API:

**Dashboard:** Settings → Bankr → enter your partner key + default wallet ID.

**API:**

```bash
curl -X PUT "https://api.1claw.co/v1/org/bankr-config" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "partner_key": "bk_ptr_YOUR_KEY",
    "default_wallet_id": "wlt_YOUR_WALLET"
  }'
```

**SDK:**

```typescript
await client.org.setBankrConfig({
  partner_key: "bk_ptr_YOUR_KEY",
  default_wallet_id: "wlt_YOUR_WALLET",
});
```

The partner key is encrypted at rest (AES-256-GCM + org_id AAD).

### 2. Grant Agent Access

Create a policy allowing your agent to lease keys:

```bash
curl -X POST "https://api.1claw.co/v1/vaults/AGENT_KEYS_VAULT_ID/policies" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "principal_type": "agent",
    "principal_id": "YOUR_AGENT_ID",
    "secret_path_pattern": "agents/YOUR_AGENT_ID/bankr/*",
    "permissions": ["write"]
  }'
```

The `__agent-keys` vault ID can be found via `GET /v1/org/agent-keys-vault`.

### 3. Agent Leases a Key

```bash
curl -X POST "https://api.1claw.co/v1/agents/AGENT_ID/bankr-keys/lease" \
  -H "Authorization: Bearer AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "ttl": 600 }'
```

Response (agent callers do NOT receive `api_key`):

```json
{
  "lease_id": "a1b2c3d4-...",
  "wallet_id": "wlt_default",
  "expires_at": "2026-06-29T10:10:00Z"
}
```

### 4. Shroud Resolves the Key

When the agent makes requests with `X-Shroud-Provider: bankr`, Shroud looks up the latest active leased key from `__agent-keys` at `agents/{id}/bankr/{lease_id}` and injects it automatically.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/{id}/bankr-keys/lease` | Lease a new key (max 5 concurrent per agent) |
| `GET` | `/v1/agents/{id}/bankr-keys` | List active leases |
| `DELETE` | `/v1/agents/{id}/bankr-keys/{lease_id}` | Revoke a lease early |

## MCP Tool

The `lease_bankr_key` tool is available in the MCP server. It is **privileged** — it never returns the `bk_usr_` key in the tool output to prevent accidental exfiltration.

```
Agent: "I need a Bankr API key to check wallet balances"
→ lease_bankr_key(ttl: 600)

Bankr key leased:
  Lease ID: a1b2c3d4-...
  Expires in: 600s
  Wallet ID: wlt_default
```

## SDK / CLI

**SDK:**

```typescript
const lease = await client.agents.leaseBankrKey(agentId, { ttl: 600 });
const leases = await client.agents.listBankrKeys(agentId);
await client.agents.revokeBankrKey(agentId, leaseId);
```

**CLI:**

```bash
1claw agent bankr-key lease <agent-id> --ttl 600
1claw agent bankr-key list <agent-id>
1claw agent bankr-key revoke <agent-id> LEASE_ID
```

## Lifecycle

- Keys are automatically revoked when an agent is deleted or deactivated.
- A nightly sweep revokes expired leases via the Bankr DELETE API.
- Maximum 5 concurrent leases per agent.

## Best Practices

1. **Use the shortest TTL practical** — 5–15 min for autonomous task execution.
2. **Revoke after task completion** — don't let leases expire naturally if the task is done.
3. **Monitor via audit log** — events `bankr_key.leased` and `bankr_key.revoked` are recorded (never logs secret values).
4. **Prefer over static secrets** — dynamic vending with short TTL is safer than storing a static Bankr key in a vault path.
