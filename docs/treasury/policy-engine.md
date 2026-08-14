---
title: Policy Engine — Cedar, OPA & Consensus
description: Configure Cedar and OPA policy backends, shadow mode, contract ABIs, consensus triggers, and pending approvals for agent signing workflows.
keywords: [policy engine, Cedar, OPA, consensus, pending approvals, contract ABI]
---

# Policy Engine — Cedar, OPA & Consensus

1claw ships a **built-in policy engine** (glob paths, permissions, conditions, priority, deny/allow) on every tier. **Team+** orgs can add **Cedar** policies; **Business+** orgs can add **OPA (Rego/WASM)** policies. **v0.48.0** wires Cedar/OPA into live enforcement with **shadow mode** (observe-only) and **consensus triggers** (human approval before signing).

:::info Tier gating
- **Cedar:** Team, Business, Enterprise
- **OPA:** Business, Enterprise
- **Built-in policies:** all tiers
:::

## Architecture

| Layer | Role |
| ----- | ---- |
| **Built-in** | Glob path patterns, permissions, IP/time conditions, effect + priority |
| **Cedar / OPA** | Declarative rules evaluated alongside built-in (AND logic in enforce mode) |
| **Transaction introspection** | ABI-decoded calldata, normalized ERC-20 fields, EIP-712 typed data in policy context |
| **Consensus** | Structured triggers on access policies → pending approval before sign/submit |

**Default for new orgs:** backend `builtin`, advanced backends opt-in via org settings. Cedar/OPA start in **`shadow`** mode — they evaluate live traffic and log divergence without blocking until you switch to **`enforce`**.

## Org policy backend settings

Human owners/admins configure the backend via API or dashboard (**Settings → Policy Engine**).

```bash
# Read current config
curl -s https://api.1claw.xyz/v1/org/settings/policy-backend \
  -H "Authorization: Bearer $ONECLAW_TOKEN" | jq

# Enable Cedar in shadow mode for signing actions
curl -s -X PATCH https://api.1claw.xyz/v1/org/settings/policy-backend \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backend": "builtin+cedar",
    "mode": "shadow",
    "scope": ["sign"],
    "breaker_behavior": "fail_closed"
  }'
```

| Field | Values | Default |
| ----- | -------- | ------- |
| `backend` | `builtin`, `cedar`, `opa`, `builtin+cedar`, `builtin+opa` | `builtin` |
| `mode` | `shadow`, `enforce` | `shadow` |
| `scope` | `sign`, `read`, `write`, `delete` (actions Cedar/OPA apply to) | `["sign"]` |
| `breaker_behavior` | `fail_closed`, `fail_open_builtin` | `fail_closed` |

### Shadow mode

In **shadow**, Cedar/OPA run on every matching request. Decisions are logged; **built-in enforcement is unchanged**. Use the divergence report before flipping to enforce:

```bash
curl -s https://api.1claw.xyz/v1/org/policy-shadow-report \
  -H "Authorization: Bearer $ONECLAW_TOKEN" | jq
```

### Circuit breaker

If Cedar/OPA fail repeatedly (timeouts, WASM errors), the **circuit breaker** trips. Default **`fail_closed`** denies requests with a policy-backend-unavailable error — security does not silently degrade. Optional **`fail_open_builtin`** falls back to built-in only (explicit opt-in).

Webhook events: `policy_backend.circuit_breaker_opened`, `policy_backend.circuit_breaker_closed`.

## Cedar policies

CRUD at `/v1/org/cedar-policies`. Dry-run at `POST /v1/org/cedar-policies/test`.

```bash
curl -s -X POST https://api.1claw.xyz/v1/org/cedar-policies \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "deny-large-eth-transfer",
    "policy_text": "forbid(principal, action, resource) when { resource has chain && resource.value_gwei > 1000000000 };"
  }'
```

**Cedar numeric fields:** use `value_gwei` (i64) and `value_overflow` — not raw `value_wei` strings. Always guard optional attributes with `has`:

```cedar
permit(principal, action, resource)
when { resource has function_name && resource.function_name == "transfer" };
```

Policy responses include dynamic **`enforcement_status`**: `shadow`, `enforce`, or `inactive`.

## OPA policies

CRUD at `/v1/org/opa-policies`. Upload Rego compiled to WASM. Dry-run at `POST /v1/org/opa-policies/test`.

Enforcement-path evaluation timeout is **100 ms** (5 s on `/test` only). Fuel limits apply to WASM execution.

## Contract ABI registry

Upload ABIs so policies can inspect decoded calldata (`function_name`, normalized `erc20_transfer_*` fields, `decode_failed` flag).

```bash
curl -s -X POST https://api.1claw.xyz/v1/org/contract-abis \
  -H "Authorization: Bearer $ONECLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "name": "USDC",
    "token_decimals": 6,
    "abi_json": [ ... ]
  }'
```

:::warning Nested calls
ABI introspection sees **outermost calldata only**. Multicall, Safe `execTransaction`, and ERC-4337 `handleOps` can hide inner transfers. Prefer **allowlist known selectors on known contracts** over forbid-single-function rules.
:::

## Consensus & pending approvals

Attach a **`consensus_trigger`** JSON object to an access policy. When a sign/submit request matches, the API returns **202** with a `pending_approval_id` instead of signing immediately.

### Structured trigger (no expression parser)

```json
{
  "conditions": [
    { "type": "value_above", "threshold_gwei": 1000000000 },
    { "type": "chain_in", "chains": ["ethereum", "base"] }
  ],
  "approval": {
    "min_approvals": 2,
    "required_roles": ["admin"]
  },
  "expiry_secs": 86400,
  "self_approval_allowed": false
}
```

Condition types: `value_above`, `chain_in`, `to_address_in`, `function_selector_in`, `erc20_amount_above`, `intent_type_in`, `always`.

### Workflow

1. Agent submits sign/transaction → **202** with `pending_approval_id`
2. Humans approve via `POST /v1/pending-approvals/{id}/approve` (payload hash binding prevents TOCTOU)
3. Execute via `POST /v1/pending-approvals/{id}/execute` — guardrails and policies **re-run at execution time**

Webhook events: `pending_approval.created`, `.approved`, `.rejected`, `.executed`, `.expired`.

```bash
# List pending approvals
curl -s "https://api.1claw.xyz/v1/pending-approvals?status=pending" \
  -H "Authorization: Bearer $ONECLAW_TOKEN" | jq
```

## SDK & CLI

```typescript
// Policy backend settings
await client.org.getPolicyBackendSettings();
await client.org.updatePolicyBackendSettings({
  backend: "builtin+cedar",
  mode: "shadow",
  scope: ["sign"],
});

// Pending approvals
await client.pendingApprovals.list({ status: "pending" });
await client.pendingApprovals.approve(id, { decision: "approve", payload_hash });
```

```bash
1claw policy-backend get
1claw policy-backend set --backend builtin+cedar --mode shadow
1claw pending-approval list --status pending
```

## Next steps

- [Scoped permissions](/docs/vaults/scoped-permissions) — built-in glob policies
- [Intents API guardrails](/docs/agents/intents/guardrails) — per-agent tx caps and allowlists
- [Webhooks](/docs/platform-api/webhooks) — `pending_approval.*` and circuit breaker events
- [Cedar policies API](/docs/reference/api-reference) — full endpoint list in OpenAPI spec (`@1claw/openapi-spec`)
