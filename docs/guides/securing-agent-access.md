---
title: Securing Agent Access
description: Best practices for token scoping, vault binding, and TTL configuration to minimize blast radius when an agent token is compromised.
sidebar_position: 2
---

# Securing Agent Access

Agents are 1claw's primary use case — AI systems that need credentials at runtime. Because agents operate autonomously, a leaked or over-privileged token can do more damage than a leaked human token. This guide covers the controls available to minimize that risk.

## The default is safe-by-default

When an agent has **no explicit scopes** and **no access policies**, its JWT contains an empty scope list. Empty scopes means zero access — the agent cannot read or write any secret until a human grants it a policy. You never need to worry about a misconfigured agent silently getting full vault access.

## 1. Vault binding

By default, an agent token is valid for any vault in the organization. **Vault binding** restricts the token to a specific set of vaults.

### When to use it

Always, unless the agent genuinely needs to access every vault. Most agents serve one purpose (e.g., "production secrets for the web app") and should be bound to the vault(s) that purpose requires.

### How it works

Set `vault_ids` on the agent (via the dashboard, SDK, or API):

```bash
# SDK
const agent = await client.agents.create({
    name: "web-backend",
    vault_ids: ["<vault-uuid>"],
});
```

The agent's JWT will include a `vault_ids` claim. Every vault endpoint checks this claim — if the vault is not in the list, the request is rejected with 403 before the policy engine is even consulted.

### Dashboard

On the agent detail page, the **Token Scoping** card has a "Vault Binding" section. Check the vaults this agent should access. Unchecked = all vaults (current behavior, preserved for backward compatibility).

## 2. Token TTL

The default agent token lifetime is 1 hour. For agents that run briefly (CI/CD, batch jobs, one-shot tasks), shorter tokens limit the window of exposure if a token leaks.

### Recommended TTLs

| Use case | Recommended TTL |
|---|---|
| CI/CD pipeline | 5 minutes (`300`) |
| Short-lived script or cron job | 15 minutes (`900`) |
| Long-running agent (chatbot, daemon) | 30–60 minutes (`1800`–`3600`) |

### How to set it

Set `token_ttl_seconds` on the agent:

```bash
# API (PATCH — not PUT)
PATCH /v1/agents/{agent_id}
{ "token_ttl_seconds": 300 }
```

Or in the dashboard: Agent detail → Token Scoping → Token TTL.

The SDK and MCP server automatically refresh tokens 60 seconds before expiry, so short TTLs don't cause downtime for long-running processes — the agent seamlessly gets a fresh token.

## 3. Scopes as an outer boundary

Agent JWTs contain a `scopes` field — a list of secret path glob patterns (e.g., `keys/**`, `prod/*`). Scopes are derived from the agent's access policies at token issuance time.

Scopes act as a **ceiling** on the token. Even if a policy later changes to grant broader access, the existing token can only access paths that match its scopes. The policy engine is still the source of truth for fine-grained checks, but scopes prevent a token from ever exceeding the access it was issued with.

### Scope + policy two-layer model

```
Request → Vault binding check → Scope glob check → Policy engine check → Owner bypass → Allow/Deny
```

1. **Vault binding**: Is this vault in the token's `vault_ids`? (If set.)
2. **Scope check**: Does any scope glob-match the secret path?
3. **Policy engine**: Does a matching policy grant the required permission?
4. **Owner bypass**: Is the caller the vault creator?

All four layers must pass. Scopes and vault binding are evaluated from the JWT alone (no DB query), making them fast and tamper-proof.

## 4. Policy conditions

Beyond scopes and vault binding, access policies support runtime conditions:

- **IP allowlist**: Only allow requests from specific IPs or CIDR ranges.
- **Time window**: Restrict access to certain hours and days of the week.

These conditions are evaluated by the policy engine on every request and can further narrow what a valid, in-scope token is allowed to do.

## 5. Intents API and transaction guardrails

For agents that interact with blockchains, enable the **Intents API** to prevent the agent from reading raw private keys. The agent submits transactions through a proxy that signs on its behalf.

Additionally, configure **transaction guardrails**:

- `tx_to_allowlist`: Permitted destination addresses.
- `tx_max_value_eth`: Maximum value per transaction.
- `tx_daily_limit_eth`: Rolling 24-hour spend cap.
- `tx_allowed_chains`: Restrict to specific chains.

See [Intents API guide](/docs/guides/intents-api) for details.

## Checklist for production agents

- [ ] Vault binding configured (agent only accesses the vaults it needs)
- [ ] Token TTL set to the shortest practical value
- [ ] Access policies use narrow path patterns (not `**`)
- [ ] Scopes are derived from policies (don't manually set `["*"]`)
- [ ] IP allowlist set if the agent runs from known infrastructure
- [ ] Intents API enabled if the agent handles blockchain operations
- [ ] Agent key rotated on a regular schedule
