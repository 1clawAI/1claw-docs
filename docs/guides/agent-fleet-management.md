---
title: Managing Agent Fleets
description: "Patterns for operating dozens or hundreds of AI agents: enrollment, vault organization, policy design, sharing at scale, and monitoring."
sidebar_position: 2
---

# Managing Agent Fleets

When you have many AI agents — from CI bots to coding assistants to autonomous workflows — you need patterns that scale. This guide covers enrollment, vault architecture, policy design, sharing, and monitoring for fleets of 10 to 1,000+ agents.

## Enrollment at scale

### Self-enrollment pattern

Agents self-enroll via `POST /v1/agents/enroll`. This is the recommended approach when agents are deployed independently and discover their human counterpart by email:

```typescript
import { AgentsResource } from "@1claw/sdk";

await AgentsResource.enroll("https://api.1claw.xyz", {
  name: `worker-${process.env.HOSTNAME}`,
  human_email: "ops@mycompany.com",
});
```

**Rate limits to be aware of:**
- One enrollment per email per 10 minutes (per-email cooldown).
- IP rate limiting: 5-burst, 1/sec.

For bulk provisioning (e.g. deploying 50 agents simultaneously), stagger enrollment requests or use the authenticated `POST /v1/agents` endpoint with a human API key.

### Batch provisioning with the SDK

When a human is provisioning many agents at once:

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_API_KEY,
});

const agents = ["worker-1", "worker-2", "worker-3", "scanner-a", "scanner-b"];

for (const name of agents) {
  const { data } = await client.agents.create({
    name,
    description: `Fleet agent: ${name}`,
    scopes: ["vaults:read"],
  });
  console.log(`${name}: ID=${data.agent.id} KEY=${data.api_key}`);
  // Store each key securely in your deployment system
}
```

### CLI batch provisioning

```bash
for name in worker-1 worker-2 worker-3; do
  1claw agent create "$name" --scopes "vaults:read"
done
```

## Vault organization

### Shared vault with path-scoped policies

For fleets where agents access a common set of secrets, use one vault with path-based policies:

```
production-vault/
  ├── api-keys/openai          (shared by all agents)
  ├── api-keys/anthropic       (shared by all agents)
  ├── agents/worker-1/config   (worker-1 only)
  ├── agents/worker-2/config   (worker-2 only)
  └── keys/base-signer         (Intents API agents only)
```

Policies:
- All agents: `api-keys/**` → read
- Per-agent: `agents/{agent-name}/**` → read, write
- Intents API agents: `keys/**` → read

### Per-agent vaults

For strict isolation (e.g. multi-tenant or compliance), create a vault per agent:

```typescript
for (const agentName of agents) {
  const { data: vault } = await client.vault.create({
    name: `vault-${agentName}`,
    description: `Isolated vault for ${agentName}`,
  });

  // Create a policy granting this agent access to its own vault
  await client.access.grantAgent(vault.id, agentIds[agentName], ["read", "write"], {
    secretPathPattern: "**",
  });
}
```

### Vault binding

Use `vault_ids` on the agent record to restrict which vaults an agent's JWT can access, regardless of policies:

```bash
1claw agent update $AGENT_ID --vault-ids "$VAULT_1,$VAULT_2"
```

This adds a second layer: even if a policy accidentally grants broader access, the agent's JWT only works for the bound vaults.

## Policy design

### Wildcard patterns

| Pattern | Matches |
| --- | --- |
| `**` | Everything in the vault |
| `api-keys/*` | Direct children of `api-keys/` |
| `api-keys/**` | All secrets under `api-keys/` recursively |
| `env/production/*` | Production env secrets only |

### Conditional policies

Add time windows and IP restrictions for sensitive paths:

```bash
curl -s -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "secret_path_pattern": "keys/**",
    "principal_type": "agent",
    "principal_id": "'$AGENT_ID'",
    "permissions": ["read"],
    "conditions": {
      "ip_allowlist": ["10.0.0.0/8"],
      "time_window": {"after": "08:00", "before": "20:00", "timezone": "UTC"}
    },
    "expires_at": "2026-06-01T00:00:00Z"
  }'
```

### Token TTL tuning

For short-lived tasks (CI pipelines), reduce the token TTL:

```bash
1claw agent update $AGENT_ID --token-ttl 300  # 5 minutes
```

For long-running agents, the default 3600s (1 hour) is usually fine — the SDK auto-refreshes before expiry.

## Agent-to-human sharing at scale

### The `creator` pattern

Every enrolled agent has a `created_by` field linking it to the human who registered or enrolled it. Agents share secrets back using `recipient_type: "creator"`:

```typescript
await client.sharing.create(secretId, {
  recipient_type: "creator",
  expires_at: "2026-12-31T00:00:00Z",
  max_access_count: 5,
});
```

This works even if the human has hundreds of agents — each share is tracked individually.

### Managing inbound shares

Humans can manage inbound shares from the dashboard **Sharing** page or via the CLI:

```bash
# List all inbound shares (from agents and users)
1claw share list --inbound

# Accept a specific share
1claw share accept <share-id>

# Decline shares you don't need
1claw share decline <share-id>
```

### Share rate limits

Share creation is rate-limited to 10 per minute per organization. For agents creating many shares in bursts, stagger the requests or batch the secrets into a single share.

## Transaction guardrails for fleets

When agents use the Intents API for on-chain transactions, per-agent guardrails prevent runaway spending:

```bash
1claw agent update $AGENT_ID \
  --tx-to-allowlist "0xRecipient1,0xRecipient2" \
  --tx-max-value 0.1 \
  --tx-daily-limit 1.0 \
  --tx-allowed-chains "base,ethereum"
```

For fleet-wide defaults, apply the same guardrails to all agents in a loop:

```bash
for id in $AGENT_IDS; do
  1claw agent update "$id" \
    --tx-max-value 0.05 \
    --tx-daily-limit 0.5 \
    --tx-allowed-chains "base"
done
```

## Monitoring and audit

### Audit log filtering

Filter audit events by agent to monitor a specific agent's activity:

```bash
1claw audit list --actor-type agent --actor-id $AGENT_ID --limit 50
```

In the dashboard, the **Audit Log** page supports filtering by actor type and ID.

### Usage tracking

Monitor organization-wide usage via the billing API:

```bash
1claw billing usage
```

This shows requests, vaults, secrets, and agents used vs. tier limits — helpful for forecasting when you need to upgrade.

### Deactivating agents

Deactivate agents that are no longer needed without deleting their audit trail:

```bash
1claw agent update $AGENT_ID --active false
```

Deactivated agents cannot exchange tokens or access secrets, but their records and audit events are preserved.

## Security checklist for fleets

- [ ] Use **vault binding** (`vault_ids`) to limit each agent to its intended vaults.
- [ ] Set **token TTL** appropriate to the agent's task duration.
- [ ] Apply **path-scoped policies** — avoid `**` on production vaults unless necessary.
- [ ] Use **conditional policies** (IP allowlist, time windows) for sensitive paths.
- [ ] Enable **transaction guardrails** for any agent with Intents API access.
- [ ] Review the **audit log** regularly for unexpected access patterns.
- [ ] **Rotate agent keys** periodically via `1claw agent rotate-key <id>`.
- [ ] **Deactivate** agents when their task is complete rather than deleting (preserves audit trail).

## Next steps

- [Agent Self-Onboarding](/docs/guides/agent-self-onboarding) — The agent-first enrollment flow.
- [Securing Agent Access](/docs/guides/securing-agent-access) — Deep dive on policy conditions and scoping.
- [Audit and Compliance](/docs/guides/audit-and-compliance) — Tamper-proof audit log and compliance features.
