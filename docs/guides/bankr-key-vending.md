# Bankr Dynamic Key Vending

1Claw can act as a **dynamic secrets engine** for [Bankr](https://bankr.bot): store a long-lived partner key in the vault secure zone, then programmatically issue and destroy short-lived Bankr wallet API keys scoped to each agent's session.

## Overview

```
┌─────────┐            ┌──────────────────┐          ┌─────────────┐
│  Agent  │ ─ lease ─▶ │   1Claw Vault    │ ─ POST ─▶│ Bankr API   │
│         │ ◀ metadata │ (org partner key │ ◀── key ─│             │
│         │            │  encrypted)      │          │             │
│         │            └──────────────────┘          └─────────────┘
│         │                    │
│         │ ─ LLM request ─▶  │ (Shroud auto-resolves leased key)
└─────────┘            ┌──────────────────┐
                       │  Shroud TEE      │
                       └──────────────────┘
```

**Key properties:**

- Partner key (`bk_ptr_`) never leaves the vault — agents never receive it in API or MCP responses.
- Leased `bk_usr_` keys are stored in `__agent-keys` for Shroud; **agent callers do not get `api_key` in the lease response** (secret output protection).
- Leased keys are time-limited and scoped (LLM Gateway only by default).
- Automatic revocation on agent delete, deactivation, or TTL expiry.
- Max 5 concurrent leases per agent.

## Permission model (deny-by-default)

Bankr key leasing is a **privileged action**. Agents have **zero access by default** — same as all 1Claw secrets.

| Caller | Requirement |
|--------|-------------|
| **Agent** | Explicit access policy on the org's `__agent-keys` vault granting `write` on `agents/{agent_id}/bankr/*`. JWT scope must match `agents/{agent_id}/bankr/lease`. Agent may only lease for **its own** `agent_id`. |
| **Human** | Org membership; agent must belong to caller's org. Receives `api_key` once in the lease response (for CI/dashboard use). |

Without a matching policy, agent lease requests return **403**.

### Least-privilege policy example

Grant lease access only — not broad `__agent-keys` read:

```json
POST /v1/vaults/{agent_keys_vault_id}/policies
{
  "principal_type": "agent",
  "principal_id": "550e8400-e29b-41d4-a716-446655440000",
  "secret_path_pattern": "agents/550e8400-e29b-41d4-a716-446655440000/bankr/*",
  "permissions": ["write"]
}
```

Resolve `agent_keys_vault_id` via `GET /v1/org/agent-keys-vault`.

After creating or changing policies, **re-exchange the agent token** so JWT scopes include the new path pattern.

### Approval-gated access (recommended for production)

For high-risk agents, do not grant the policy directly. Have the agent request human approval first:

```json
POST /v1/approvals/request
{
  "action": "policy_change",
  "target_type": "agent",
  "target_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "{\"vault_id\":\"...\",\"principal_type\":\"agent\",\"principal_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"secret_path_pattern\":\"agents/550e8400-e29b-41d4-a716-446655440000/bankr/*\",\"permissions\":[\"write\"]}",
  "reason": "Need short-lived Bankr LLM access for one task",
  "risk_tier": 2
}
```

When the human approves, the policy is applied automatically. Revoke the policy (or the lease) when the task completes.

## TTL guidance

| Context | Recommended TTL | Notes |
|---------|-----------------|-------|
| Autonomous / public agents | **5–15 minutes** (300–900 s) | Default **15 min** when an agent omits `ttl_seconds` |
| Human / CI one-off | 15–60 minutes | Set explicitly via `--ttl` or request body |
| Long-running batch jobs | Up to 24 hours | Hard cap; prefer revoke-after-task |

**Revoke-after-task pattern:** lease → use Shroud (`X-Shroud-Provider: bankr`) → `DELETE .../bankr-keys/{lease_id}` when done. Do not rely on TTL alone for sensitive workflows.

## Secret output handling

- **REST / MCP (agent JWT):** Response includes `lease_id`, `wallet_id`, `expires_at` only — **no `api_key`**.
- **REST (human JWT):** Response includes `api_key` once; treat like any other secret (do not log, paste into chat, or store in prompts).
- **MCP `lease_bankr_key`:** Tool output never includes the key; use Shroud for LLM traffic or list/revoke by lease ID.

## Configuration

### Per-organization (BYOK — recommended)

Each 1Claw org stores **its own** Bankr partner credentials. The partner key is encrypted at rest and never returned by the API after save.

**Dashboard:** Settings → Bankr — paste your `bk_ptr_...` partner key and optional default `wlt_...` wallet ID.

**API (owner/admin only):**

```bash
# Save org credentials
curl -X PUT https://api.1claw.xyz/v1/org/bankr-config \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partner_key": "bk_ptr_...",
    "default_wallet_id": "wlt_..."
  }'

# Check status (prefix only — no secret)
curl https://api.1claw.xyz/v1/org/bankr-config \
  -H "Authorization: Bearer $USER_TOKEN"
```

**SDK:** `client.org.getBankrConfig()`, `client.org.setBankrConfig({ partner_key, default_wallet_id })`, `client.org.deleteBankrConfig()`.

Obtain partner keys from the [Bankr partner dashboard](https://docs.bankr.bot/partnership/api-keys) (`bk_ptr_<keyId>_<secret>`). Apply for partner access at [bankr.bot/partner](https://bankr.bot/partner) if needed.

### Deployment fallback (self-hosted operators only)

Optional global fallback on the Vault service. **Off by default** in multi-tenant SaaS — do not set `BANKR_PARTNER_KEY` on `api.1claw.xyz`. Use only when you intentionally run a single-tenant or self-hosted deployment where all orgs share one Bankr partner account.

| Rule | Behavior |
| --- | --- |
| Precedence | Org BYOK always wins when configured (`credential_source: org_byok`) |
| Fallback | Used only when org has no BYOK and `BANKR_PARTNER_KEY` is set (`credential_source: platform_fallback`) |
| Opt-in | Treat fallback as an explicit operator choice — not for shared multi-tenant environments |
| Audit | Each `bankr_key.leased` event includes `credential_source` |
| Alerting | Production Vault (`hsm_provider=gcp`) emits a warning log when fallback is used — monitor in prod |

| Variable | Description | Required |
|----------|-------------|----------|
| `BANKR_PARTNER_KEY` | Platform Bankr partner key (`bk_ptr_...`) | No (BYOK per org) |
| `BANKR_DEFAULT_WALLET_ID` | Default wallet ID (`wlt_...`) when org has no default | No |
| `BANKR_DEFAULT_LEASE_TTL_SECS` | Default TTL for **human** callers when omitted (default: 3600) | No |

## API Endpoints

### Lease a key

```bash
curl -X POST https://api.1claw.xyz/v1/agents/{agent_id}/bankr-keys/lease \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ttl_seconds": 600,
    "permissions": {
      "llm_gateway_enabled": true,
      "agent_api_enabled": false,
      "read_only": true
    }
  }'
```

**Agent response (no secret):**

```json
{
  "lease_id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_id": "wlt_abc123",
  "expires_at": "2026-06-05T18:10:00Z"
}
```

**Human response (includes key once):**

```json
{
  "lease_id": "550e8400-e29b-41d4-a716-446655440000",
  "api_key": "bk_usr_abc12345_xxxxxxxxxxx",
  "wallet_id": "wlt_abc123",
  "expires_at": "2026-06-05T18:10:00Z"
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

const client = new OneclawClient({ apiKey: "ocv_..." }); // agent key

const { data: lease } = await client.agents.leaseBankrKey(agentId, {
  ttl_seconds: 600,
  permissions: { llm_gateway_enabled: true, agent_api_enabled: false, read_only: true },
});

// Agent: lease.api_key is undefined — use Shroud
console.log(lease.lease_id, lease.expires_at);

await client.agents.revokeBankrKey(agentId, lease.lease_id);
```

## CLI Usage

```bash
# Lease (human token; default TTL 15 min)
1claw agent bankr-key lease <agent-id> --ttl 600

1claw agent bankr-key list <agent-id>
1claw agent bankr-key revoke <agent-id> <lease-id>
```

## MCP Tool

`lease_bankr_key` is **privileged** and **deny-by-default** (requires policy on `agents/{id}/bankr/*`). It does **not** return the `bk_usr_` key in tool output.

```json
{
  "tool": "lease_bankr_key",
  "arguments": {
    "ttl_seconds": 600,
    "llm_gateway_enabled": true,
    "agent_api_enabled": false,
    "read_only": true
  }
}
```

After leasing, route LLM traffic through Shroud with `X-Shroud-Provider: bankr`. Revoke the lease when the task completes.

## Shroud Integration

When an agent sends LLM traffic through Shroud with `X-Shroud-Provider: bankr`, Shroud automatically resolves the latest active leased key. No `get_secret` or tool output handling required.

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

All lease/revoke operations are audit-logged as `bankr_key.leased` and `bankr_key.revoked` (never logs secret values).

## Dashboard

The agent detail page shows a **Bankr Keys** card with:

- Table of active leases (ID, wallet, key ID, expiry)
- "Lease Key" button for one-click provisioning (human session; key shown once if returned)
- Per-lease "Revoke" action
