---
title: Guardrail governance
description: Convention 6 execution shadow mode, widening approvals, address screening, revision history, and dry-run replay.
sidebar_label: Guardrail governance
---

# Guardrail governance (v0.56+)

Beyond per-transaction guardrails, v0.56 adds operational controls for **execution guardrails**, **guardrail change governance**, and **address screening**.

## Convention 6 — execution shadow vs enforce

Execution bindings and agents support `enforcement: "log"` (default shadow) or `"enforce"` on guardrail JSON:

- **Binding:** `guardrails.enforcement` on `agent_bindings`
- **Agent:** `execution_guardrails.enforcement` on the agent record

In **log** mode, violations are audit-logged as `guardrail_shadow.would_deny` and appear in the shadow report — the request still succeeds. In **enforce** mode, violations return **403** with `{ error: "guardrail_violation", reason_code, ... }`.

Dashboard: **Settings → Security → Guardrails** tab.

## Guardrail widening approvals (v0.56.2)

When org setting `guardrail_changes_require_approval` is `"true"`, **widening** agent or binding guardrail edits (relaxed hosts/paths/limits, relaxed enforcement) queue behind a `policy_change` approval. PATCH handlers return **202** with `pending_approval_id` until a human approves via `/v1/approvals/{id}/decide`. Narrowing edits apply immediately. All guardrail edits require step-up re-auth (`X-Auth-Confirm`).

After approval, resubmit the PATCH with `approval_id` from the decide response.

## Address screening

Per-agent `address_screening_policy` JSON:

```json
{ "mode": "off" }
{ "mode": "deny" }
{ "mode": "approve" }
```

Evaluated at transaction signing time via `address_screening::screen_recipient()`. Org operators can seed a global deny list with env `ONECLAW_SCREENING_DENY_LIST` (comma-separated addresses). `approve` mode can route screened recipients to tx HITL when configured.

CLI: `--address-screening-policy '{"mode":"deny"}'` on `agent create|update`.

## Governance APIs

| Endpoint | Description |
| -------- | ----------- |
| `GET /v1/org/guardrail-shadow-report` | Aggregate `guardrail_shadow.would_deny` by `reason_code` (owner/admin) |
| `GET /v1/org/guardrail-revisions` | Revision history for agent/binding guardrail PATCH |
| `POST /v1/agents/{id}/guardrails/replay` | Dry-run draft guardrails against recent txs (read-only) |

### SDK

```typescript
await client.org.getGuardrailShadowReport({ since: "2026-01-01T00:00:00Z" });
await client.org.listGuardrailRevisions();
await client.agents.replayGuardrails(agentId, {
  days: 7,
  draft_guardrails: { tx_max_value_eth: "0.1" },
});
```

### CLI

```bash
1claw guardrails shadow-report
1claw guardrails revisions
1claw guardrails replay <agent-id> --days 7 --draft-guardrails '{"tx_max_value_eth":"0.1"}'
```

### MCP

`get_guardrail_shadow_report`, `list_guardrail_revisions`, `replay_agent_guardrails`

## Gas budget and outbound idempotency (v0.56.3)

**Cumulative EVM gas:** `per_chain_guardrails.{chain}.gas_daily_budget_native` — UTC-day sum of `gas_limit × max_fee_per_gas` tracked in `agent_gas_ledger` (migration 213). Complements per-tx `max_fee_per_gas_gwei` and `max_gas_limit`.

**Outbound idempotency:** Binding guardrail `inject_idempotency_key: true` — Vault injects a deterministic `Idempotency-Key` header on HTTP/GraphQL execute when the agent did not supply one. Key material: SHA-256 hex of `binding_id|METHOD|path|body_json` (stable for identical retries).

See [Intents API — Guardrails](/docs/agents/intents/guardrails) for transaction guardrails and [Execution Intents](/docs/agents/intents/guardrails#execution-intents) for binding guardrails.
