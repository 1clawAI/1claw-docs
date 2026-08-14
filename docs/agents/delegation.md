---
title: Agent-to-Agent Delegation
description: "Set up human-controlled delegation between agents: security model, delegation modes, tool restrictions, rate limits, and depth limits."
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent-to-Agent Delegation

Delegation lets agents communicate with and assign tasks to other agents — with human-controlled authorization. An agent **cannot** delegate to another agent without an explicit delegation record created by a human. This ensures humans remain in control of inter-agent coordination.

## Security model

- **Human-only creation** — agents cannot create, modify, or revoke delegations (403).
- **Self-delegation blocked** — an agent cannot delegate to itself (400).
- **Tool restrictions** — per-delegation allowlists and blocklists control which tools the delegate can use.
- **Rate limits** — `max_daily_delegations` caps how many times an agent can delegate per day.
- **Depth limits** — `max_depth` (1–10) prevents recursive delegation chains. Tracked via `X-Delegation-Depth` header.
- **Expiration** — delegations can have an `expires_at` timestamp; expired delegations are rejected.
- **Audit trail** — all delegation operations are audit-logged: `agent.delegation.created`, `.updated`, `.revoked`, `.invoked`, `.blocked`.

## Delegation modes

| Mode | Behavior | Best for |
|------|----------|----------|
| `caller` (default) | Delegate executes with its own credentials and tools | Most secure; isolation between agents |
| `target` | Delegate executes with the target agent's configuration | When the delegate needs access to the target's Shroud config or tools |
| `both` | Either mode can be requested per invocation | Flexible orchestration patterns |

## Creating a delegation

Only human users can create delegations. The delegator is the agent that will send tasks; the delegate is the agent that will execute them.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.xyz/v1/agents/$DELEGATOR_ID/delegations" \
  -H "Authorization: Bearer $HUMAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delegate_id": "'$DELEGATE_ID'",
    "delegation_mode": "caller",
    "allowed_tools": ["web_search", "memory_get", "memory_put"],
    "max_daily_delegations": 50,
    "max_depth": 2,
    "expires_at": "2026-12-31T00:00:00Z"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript SDK">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_API_KEY, // human API key
});

const delegation = await client.agents.createDelegation(delegatorId, {
  delegate_id: delegateId,
  delegation_mode: "caller",
  allowed_tools: ["web_search", "memory_get", "memory_put"],
  max_daily_delegations: 50,
  max_depth: 2,
  expires_at: "2026-12-31T00:00:00Z",
});
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent delegation create $DELEGATOR_ID \
  --delegate $DELEGATE_ID \
  --mode caller \
  --allowed-tools "web_search,memory_get,memory_put" \
  --max-daily 50 \
  --max-depth 2
```

</TabItem>
</Tabs>

## Checking delegation status

Agents can check their own effective delegations (which agents they're authorized to delegate to):

```typescript
const delegations = await client.agents.getEffectiveDelegations(agentId);
for (const d of delegations.delegations) {
  console.log(`Can delegate to ${d.delegate_id}: mode=${d.delegation_mode}, remaining=${d.max_daily_delegations - (d.delegations_today || 0)}`);
}
```

## How delegation enforcement works

When an agent calls `POST /v1/agents/{target_id}/chat`, the delegation engine:

1. Checks if the caller and target are the same agent (self-chat always allowed).
2. Looks up an active, non-expired delegation from the caller to the target.
3. Validates the current depth against `max_depth`.
4. Checks the daily delegation count against `max_daily_delegations`.
5. Validates that the requested tool (if any) is in the allowlist and not in the blocklist.
6. Records a `delegation_events` entry and emits an `agent.delegation.invoked` audit event.

If any check fails, the request is rejected with 403 and a descriptive error.

## Sub-agent creation wizard

The dashboard provides a guided wizard at `/agents/sub-agent-wizard` for creating sub-agents with pre-configured delegation rules:

1. **Choose a role preset** — Research, Image Gen, Treasury, Comms, Code, or Custom.
2. **Configure capabilities** — name, description, Shroud config, Intents API settings.
3. **Set delegation rules** — select parent agents, define tool restrictions, rate limits, and depth.
4. **Review and create** — creates the agent and delegation records in one flow.

## Managing delegations in the dashboard

The agent detail page has a **Delegations** tab showing:

- **Outbound delegations** — agents this agent delegates TO, with status, mode, and daily usage.
- **Inbound delegations** — agents that delegate TO this agent.
- Create, edit, and revoke dialogs for managing delegation records.

## Runtime tool integration

When agents run in Cloud Runtimes, the `sub-agents.js` tool module provides delegation-aware tools:

| Tool | What it does |
|------|-------------|
| `delegate_task` | Sends a task to another agent; automatically tracks `X-Delegation-Depth` and returns delegation-specific 403 errors |
| `list_my_sub_agents` | Lists org agents merged with delegation status: `{ authorized, mode, allowed_tools, remaining_daily }` |
| `get_delegation_status` | Shows which agents the caller can delegate to, with remaining daily quota and tool details |

## Security checklist

- [ ] Enable `delegation_enabled` on agents that need to participate in delegation.
- [ ] Use **tool allowlists** to restrict what delegates can do — prefer allowlists over blocklists.
- [ ] Set **`max_daily_delegations`** to prevent runaway delegation loops.
- [ ] Keep **`max_depth`** low (1–2) unless you have a clear need for deep chains.
- [ ] Set **`expires_at`** on delegations for time-bounded tasks.
- [ ] Review delegation audit events (`agent.delegation.*`) regularly.
- [ ] Use `caller` mode by default — `target` mode grants more access.

## Next steps

- [Managing Agent Fleets](/docs/agents/fleet-management) — Patterns for operating many agents at scale.
- [Securing Agent Access](/docs/vaults/securing-access) — Deep dive on policy conditions and scoping.
- [Audit and Compliance](/docs/guides/audit-and-compliance) — Tamper-proof audit log and compliance features.
