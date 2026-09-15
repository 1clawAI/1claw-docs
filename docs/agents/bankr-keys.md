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

## First: keep the key off the agent's machine

Key vending controls what 1claw hands out. It cannot control a key the Bankr CLI already holds. `bankr login` writes the key to `~/.bankr/config.json`, and the CLI also reads `BANKR_API_KEY`; an agent with a shell on that host can read either and call `api.bankr.bot` directly, bypassing every 1claw policy. So the first step of any setup is to make sure the key exists only inside 1claw, and every Bankr call goes through it:

```
BNKR agent ──► 1claw (binding "bankr") ──► host allowlist api.bankr.bot ──► X-API-Key injected ──► api.bankr.bot

~/.bankr/config.json and BANKR_API_KEY on the agent host: must not contain a real key.
If 1claw is unavailable, the agent has no route to Bankr and stops.
```

**1. Store the key as an execution binding** (the credential is injected server-side; the agent only ever sees responses):

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bankr",
    "binding_type": "http",
    "credential": "bk_usr_...",
    "config": {
      "base_url": "https://api.bankr.bot",
      "auth_type": "header",
      "auth_header": "X-API-Key",
      "allowed_hosts": ["api.bankr.bot"],
      "allowed_paths": ["/agent/*"],
      "timeout_ms": 30000
    }
  }'
```

and enable intents on the agent: `PATCH /v1/agents/$AGENT_ID` with `{"execution_intents_enabled": true}`. Narrow `allowed_paths` to the Bankr endpoints you use.

**2. Remove the key from the host:**

```bash
rm -f ~/.bankr/config.json
unset BANKR_API_KEY BANKR_LLM_KEY      # and remove them from shell rc files, .env, service units
bankr whoami                            # must now fail: "Not authenticated"
```

**3. Route Bankr calls through 1claw.** Either call the binding directly —

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"binding":"bankr","intent_type":"http","execution_mode":"vault",
       "params":{"method":"POST","path":"/agent/prompt","body":{"prompt":"..."}}}'
```

(or the `execute_http` MCP tool with `binding: "bankr"`) — or keep using the Bankr CLI unchanged by pointing it at a local 1claw proxy:

```bash
1claw agent binding proxy bankr --agent-key "$AGENT_ID:$AGENT_KEY" --port 8787
export BANKR_API_URL=http://127.0.0.1:8787
export BANKR_API_KEY=managed-by-1claw     # any non-empty placeholder; the proxy never forwards it
bankr agent prompt "..."
```

The proxy turns each CLI request into `POST /v1/agents/{id}/execute` for the binding. The vault checks the host and path allowlists and the agent's policies, injects the real key, and returns the upstream response. Whatever the CLI sends as its own credential is dropped locally. A 1claw refusal comes back as 403; if 1claw is unreachable the proxy answers 502 and the CLI stops. Every call is in the audit log.

Belt and braces: run the agent inside a 1claw runtime (there is no `~/.bankr` in the container), and block outbound `api.bankr.bot` from the agent host with a firewall rule so a leaked key would be useless from that machine.

## Setup: dynamic key vending

Key vending is for the case where you hold a Bankr **partner** key and want each agent to get its own short-lived user key instead of sharing one static credential. Combine it with the binding pattern above: the leased key is what you put in the binding, or what Shroud injects for the LLM endpoint.

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

### 4. Shroud Resolves the Key (LLM endpoint only)

When the agent sends chat completions through Shroud with `X-Shroud-Provider: bankr`, Shroud looks up the latest active leased key at `agents/{id}/bankr/{lease_id}` and injects it. This covers Bankr's OpenAI-compatible `/v1/chat/completions` endpoint only. The Bankr agent API that the `bankr` CLI uses (`/agent/*`) goes through an execution binding, as described at the top of this page.

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
5. **Never on the agent host** — no `~/.bankr/config.json`, no `BANKR_API_KEY` with a real value. The binding (and the local proxy, if you use the CLI) is the only path to `api.bankr.bot`.
