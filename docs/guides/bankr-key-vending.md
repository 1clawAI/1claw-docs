# Bankr Dynamic Key Vending

1Claw can act as a **dynamic secrets engine** for [Bankr](https://bankr.bot): store a long-lived partner key in the vault secure zone, then programmatically issue and destroy short-lived Bankr wallet API keys scoped to each agent's session.

## Overview

```
┌─────────┐            ┌──────────────────┐          ┌─────────────┐
│  Agent  │ ─ lease ─▶ │   1Claw Vault    │ ─ POST ─▶│ Bankr API   │
│         │ ◀── key ── │ (partner key in  │ ◀── key ─│             │
│         │            │  secure zone)     │          │             │
│         │            └──────────────────┘          └─────────────┘
│         │                    │
│         │ ─ LLM request ─▶  │ (Shroud auto-resolves leased key)
└─────────┘            ┌──────────────────┐
                       │  Shroud TEE      │
                       └──────────────────┘
```

**Key properties:**

- Partner key (`bk_ptr_`) never leaves the vault — agents only receive ephemeral `bk_usr_` keys.
- Leased keys are time-limited (default 1h, max 24h) and scoped (LLM Gateway only by default).
- Automatic revocation on agent delete, deactivation, or TTL expiry.
- Max 5 concurrent leases per agent.

## Configuration

Set these environment variables on the Vault service:

| Variable | Description | Required |
|----------|-------------|----------|
| `BANKR_PARTNER_KEY` | Your Bankr partner key (`bk_ptr_...`) | Yes |
| `BANKR_DEFAULT_WALLET_ID` | Default wallet ID (`wlt_...`) for key issuance | Recommended |
| `BANKR_DEFAULT_LEASE_TTL_SECS` | Default lease TTL in seconds (default: 3600) | No |

## API Endpoints

### Lease a key

```bash
curl -X POST https://api.1claw.xyz/v1/agents/{agent_id}/bankr-keys/lease \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_id": "wlt_abc123",
    "ttl_seconds": 3600,
    "permissions": {
      "llm_gateway_enabled": true,
      "agent_api_enabled": false,
      "read_only": true
    }
  }'
```

**Response:**

```json
{
  "lease_id": "550e8400-e29b-41d4-a716-446655440000",
  "api_key": "bk_usr_abc12345_xxxxxxxxxxx",
  "wallet_id": "wlt_abc123",
  "expires_at": "2026-06-05T18:00:00Z"
}
```

### List active leases

```bash
curl https://api.1claw.xyz/v1/agents/{agent_id}/bankr-keys \
  -H "Authorization: Bearer $TOKEN"
```

### Revoke a lease

```bash
curl -X DELETE https://api.1claw.xyz/v1/agents/{agent_id}/bankr-keys/{lease_id} \
  -H "Authorization: Bearer $TOKEN"
```

## SDK Usage

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({ apiKey: "1ck_..." });

// Lease a key
const { data: lease } = await client.agents.leaseBankrKey(agentId, {
  ttl_seconds: 3600,
  permissions: { llm_gateway_enabled: true },
});

console.log(lease.api_key); // bk_usr_...

// List active leases
const { data: list } = await client.agents.listBankrKeys(agentId);

// Revoke early
await client.agents.revokeBankrKey(agentId, lease.lease_id);
```

## CLI Usage

```bash
# Lease a key (default 1h TTL)
1claw agent bankr-key lease <agent-id> --ttl 3600

# List active leases
1claw agent bankr-key list <agent-id>

# Revoke a lease
1claw agent bankr-key revoke <agent-id> <lease-id>
```

## MCP Tool

The `lease_bankr_key` tool is available in the 1Claw MCP server:

```json
{
  "tool": "lease_bankr_key",
  "arguments": {
    "ttl_seconds": 3600,
    "llm_gateway_enabled": true
  }
}
```

## Shroud Integration

When an agent sends LLM traffic through Shroud with `X-Shroud-Provider: bankr`, Shroud automatically resolves the latest active leased key. No additional configuration needed — if the agent has an active lease, Shroud uses it.

Fallback order:
1. Active Bankr key lease (newest first)
2. Static key at `providers/bankr/api-key` in the agent's vault
3. Agent-supplied `X-Shroud-Api-Key` header

## Lifecycle & Security

| Event | Action |
|-------|--------|
| Agent deleted | All active leases revoked via Bankr API |
| Agent deactivated (`is_active: false`) | All active leases revoked |
| Lease TTL expires | Nightly sweep marks as revoked |
| Max leases (5) reached | New lease request returns 400 |

All lease/revoke operations are audit-logged as `bankr_key.leased` and `bankr_key.revoked`.

## Dashboard

The agent detail page shows a **Bankr Keys** card with:
- Table of active leases (ID, wallet, key ID, expiry)
- "Lease Key" button for one-click provisioning
- Per-lease "Revoke" action

## Permissions

- Leasing requires org membership (the agent must belong to the caller's org).
- The partner key is managed by org admins — agents cannot access it directly.
- Leased keys are stored in the `__agent-keys` vault (system vault, not visible in the UI vault list).
