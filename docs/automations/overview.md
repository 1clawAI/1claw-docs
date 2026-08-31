---
title: Automations
description: Schedule, webhook-trigger, and event-drive agent workflows with cron, HTTP callbacks, and lifecycle events.
sidebar_label: "Automations — cron, webhooks, AI workflows"
sidebar_position: 20
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Automations

Automations let you run agent workflows on a schedule, in response to webhooks, or when vault/agent lifecycle events fire — without writing any orchestration code.

## Create contract

`POST /v1/automations` requires:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Display name |
| `agent_id` | yes | Agent that owns the automation |
| `trigger_type` | yes | `cron`, `webhook`, `event`, or `manual` (`schedule` is accepted and normalized to `cron`) |
| `cron_expr` | for cron | 5- or 6-field cron; minimum interval 1 minute |
| `workflow_spec` | yes | Bare step array `[...]` **or** `{ "steps": [...] }` |
| `timezone` | no | IANA timezone (default `UTC`) — cron fires in this zone, not server UTC |
| `event_filter` | for event | e.g. `{ "event_type": "policy.created" }` |

The dashboard maps legacy UI `action_type` / `action_config` fields onto `workflow_spec` before calling the API.

## Step types

`workflow_spec` is a list of steps. The full vocabulary is served by
**`GET /v1/automations/step-types`** (public, no auth), which returns each type
with whether an agent-created automation may use it and whether it can move
funds. Read it rather than copying this table.

| Step | Agent-created | Moves funds | What it does |
|---|---|---|---|
| `log` | yes | — | Record a message in the run output |
| `notify` | yes | — | Send on a configured channel |
| `wait` | yes | — | Pause for a bounded interval |
| `memory_get` / `memory_put` | yes | — | Read / write agent memory |
| `memory_search` | — | — | Search agent memory |
| `http` | — | — | Call a URL (SSRF-validated) |
| `condition` | — | — | Branch on an expression over earlier step output |
| `ai_generate` | — | — | Generate text via the agent's model |
| `rotate_generate` | — | — | Generate a rotated secret value |
| `approval_request` | — | — | Raise a human approval from inside the run |
| `submit_transaction` | — | **yes** | Sign and broadcast as the agent |
| `swap` | — | **yes** | Quote and execute a swap as the agent |
| `execute_intent` | — | **yes** | Run an execution-intent binding as the agent |

**Agent-created automations** are restricted to the five marked above, capped at
10 steps, and may only use `manual` or `webhook` triggers. Platform- and
human-created automations may use every type, capped at 50 steps.

### Steps that move funds

`submit_transaction`, `swap` and `execute_intent` run **as the agent**, using its
own signing key. They are not a way around the agent's limits: each passes the
same spend policy, transaction guardrails, delegation checks and control-plane
consensus as a direct API call, and each requires `execution_intents_enabled`.
`execute_intent` additionally refuses when `execution_require_tee` is set.

This is what makes a rule like "if the balance drops below X, move funds" a
workflow rather than something you need your own scheduler for. A step that
would exceed a cap can escalate with `approval_request` instead of failing.

:::note An unrecognised step type is skipped, not fatal

A step whose `type` is not in the list above is skipped and the run continues —
an older engine meeting a newer spec degrades rather than breaking. The run
output names the step and lists the known types, so check there if a workflow
appears to succeed without doing anything.
:::

## Trigger types

| Type | Description | Example |
|------|-------------|---------|
| `cron` | Cron expression (alias: `schedule`) | `0 */6 * * *` — every 6 hours in `timezone` |
| `webhook` | Public tokenized URL | `POST /v1/automations/{id}/webhook/{token}` |
| `event` | Vault or policy lifecycle event | `secret.rotated`, `policy.created` |
| `manual` | API call or dashboard button | One-off test runs |

## Webhook triggers

When `trigger_type` is `webhook`, the create response includes **one-time** credentials:

```json
{
  "id": "...",
  "name": "deploy-notify",
  "trigger_type": "webhook",
  "webhook_url": "https://api.1claw.co/v1/automations/{id}/webhook/whk_...",
  "webhook_token": "whk_..."
}
```

- **URL pattern:** `POST https://api.1claw.co/v1/automations/{automation_id}/webhook/{token}`
- The token is stored as a SHA-256 hash server-side; it is only returned on create (and after rotation).
- **Rotate:** `POST /v1/automations/{id}/rotate-webhook-token` (human-only) mints a new `whk_` token and returns a fresh URL once.
- No Bearer auth required — the token in the path is the secret.

## Assist (natural language)

Humans can draft automations without raw JSON:

| Endpoint | Description |
|----------|-------------|
| `POST /v1/automations/assist/draft` | `{ "message": "rotate stripe key weekly" }` → reviewable draft + `workflow_spec` |
| `POST /v1/automations/assist/session` | Mint a 15-minute user JWT for OpenClaude/CLI assist (`access_token`, optional `runtime_id`) |

Dashboard: **Automations → Assist** (recommended path on the create page). After draft, review a **structured step editor** (one card per step, type-specific fields and selectors for swap/http/wait/etc.) — not a raw JSON wall. Advanced JSON remains available collapsed. Confirm & create is disabled until fields validate.

When the bound agent has **`shroud_enabled`**, swap / submit_transaction steps sign via Shroud (TEE) after Vault quote/guardrails.

## Quickstart

### Create via CLI

```bash
# Cron automation — every day at midnight in America/New_York
1claw automation create nightly-rotate \
  --agent-id <uuid> \
  --trigger cron \
  --cron "0 0 * * *" \
  --timezone "America/New_York" \
  --workflow '{"steps":[{"action":"rotate_generate","params":{"length":32}}]}'

# Webhook trigger — save webhook_url from the create response
1claw automation create deploy-notify \
  --agent-id <uuid> \
  --trigger webhook \
  --workflow '{"steps":[{"action":"run_agent_task","params":{"prompt":"Deploy hook fired"}}]}'

# Manual trigger + runs
1claw automation trigger <automation-id>
1claw automation runs <automation-id>
```

### Create via SDK

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_API_KEY,
});

const { data: automation } = await client.automations.create({
  name: "nightly-rotate",
  agent_id: process.env.ONECLAW_AGENT_ID!,
  trigger_type: "cron",
  cron_expr: "0 0 * * *",
  timezone: "America/New_York",
  workflow_spec: {
    steps: [
      {
        action: "rotate_generate",
        params: { length: 32, charset: "alphanumeric" },
      },
    ],
  },
});

// Webhook automations: copy automation.webhook_url once
console.log(automation?.webhook_url);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/automations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nightly-rotate",
    "agent_id": "'"$AGENT_ID"'",
    "trigger_type": "cron",
    "cron_expr": "0 0 * * *",
    "timezone": "America/New_York",
    "workflow_spec": {
      "steps": [
        { "action": "rotate_generate", "params": { "length": 32 } }
      ]
    }
  }'
```

</TabItem>
</Tabs>

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/automations/presets` | List preset templates (public, no auth) |
| `POST` | `/v1/automations` | Create automation |
| `GET` | `/v1/automations` | List automations (enriched with stats) |
| `GET` | `/v1/automations/{id}` | Get automation detail |
| `PATCH` | `/v1/automations/{id}` | Update automation |
| `DELETE` | `/v1/automations/{id}` | Delete automation |
| `POST` | `/v1/automations/{id}/trigger` | Manual trigger (authenticated) |
| `POST` | `/v1/automations/webhook/{id}/{token}` | Public webhook trigger |
| `POST` | `/v1/automations/{id}/rotate-webhook-token` | Rotate webhook token (human-only) |
| `POST` | `/v1/automations/assist/draft` | NL → draft (human-only) |
| `POST` | `/v1/automations/assist/session` | Assist session JWT (human-only) |
| `GET` | `/v1/automations/{id}/runs` | List run history (`limit`, `offset`) |
| `GET` | `/v1/automations/{id}/runs/{run_id}` | Get run details |
| `POST` | `/v1/automations/{id}/runs/{run_id}/cancel` | Cancel run (human-only) |

## Event triggers

Set `trigger_type: "event"` and `event_filter: { "event_type": "<event>" }`. Supported lifecycle events:

| Event | Fires when |
|-------|-----------|
| `secret.created` | A new secret path is stored |
| `secret.updated` | An existing secret gets a new version |
| `secret.rotated` | Server-side `rotate_generate` completes |
| `secret.deleted` | A secret is deleted |
| `policy.created` | A new access policy is created |
| `policy.updated` | A policy is updated |
| `policy.deleted` | A policy is removed |

Event payload is injected into the workflow as `_event` (`type` + `payload`).

## Workflow steps

Steps run sequentially with context passing between them. Each step's output is available to subsequent steps via template variables.

### Step types reference

| Type | Aliases | Description | Key params |
|------|---------|-------------|------------|
| `log` | `run_agent_task` | Log a message or invoke the agent | `message` or `params.prompt` |
| `http` | `execute_http`, `http_request`, `webhook_alert`, `webhook_deliver` | HTTP request (SSRF-protected) | `url`, `method`, `headers`, `body` |
| `wait` | — | Pause execution | `duration_secs` (max 30) |
| `swap` | — | DEX token swap via 0x | `chain`, `token_in`, `token_out`, `amount_usd` or `sell_amount`, `dry_run?` |
| `submit_transaction` | `sign_intent` | EVM transaction signing | `chain`, `to`, `value`, `data?`, `token_mint?`, `sign_only?`, `dry_run?` |
| `execute_intent` | — | Execute via configured binding | `params.binding`, `params.params` |
| `rotate_generate` | — | Server-side secret rotation | `params.vault_id`, `params.path`, `length` (8–1024), `charset` |
| `ai_generate` | — | LLM text generation via Shroud or Vault | `prompt`, `system_prompt?`, `model?`, `provider?`, `max_tokens?` (max 16384) |
| `memory_get` | — | Read agent memory | `namespace` (default `default`), `key` |
| `memory_put` | — | Write agent memory | `namespace`, `key`, `value`, `tier`, `ttl_secs?` |
| `memory_search` | — | Semantic search over agent memory | `namespace`, `query`, `top_k?` (max 50) |
| `notify` | — | Send notifications | `channel` (`webhook`\|`slack`\|`email`), plus channel-specific params |
| `approval_request` | — | Pause run for human approval | `action?`, `summary`, `reason?`, `risk_tier?` |
| `condition` | — | Conditional branching | `expression`, `if_true[]`, `if_false[]` |

:::tip
Steps resolved by the `type` field in `workflow_spec`. Legacy `action` field is accepted as an alias.
:::

### Template variables

Steps can reference outputs from previous steps and trigger payloads using `{{...}}` syntax. Variables are resolved recursively across the entire step JSON before execution.

| Pattern | Description | Example |
|---------|-------------|---------|
| `{{steps.<index>.<field>}}` | Output from a step by index | `{{steps.0.output}}` |
| `{{steps.<name>.<field>}}` | Output from a step by name | `{{steps.dca_swap.output}}` |
| `{{webhook_payload.<path>}}` | Webhook request body value | `{{webhook_payload.email}}` |
| `{{trigger.<path>}}` | Alias for `webhook_payload` | `{{trigger.amount}}` |

Nested JSON paths use dot-separated keys (e.g. `{{steps.balance.output.native_balance}}`). String values starting with `{` or `[` after substitution are parsed back as JSON.

**Example — passing step output:**

```json
{
  "steps": [
    { "type": "http", "name": "fetch_price", "url": "https://api.example.com/price", "method": "GET" },
    {
      "type": "notify",
      "params": {
        "channel": "slack",
        "url": "https://hooks.slack.com/...",
        "text": "Current ETH price: {{steps.fetch_price.output}}"
      }
    }
  ]
}
```

### Conditional execution

Two root-level fields on any step control whether it runs:

| Field | Behavior |
|-------|----------|
| `skip_if` | Step is skipped when expression evaluates truthy |
| `run_if` | Step only runs when expression evaluates truthy |

**Operators:** `==`, `!=` (string equality), `contains` (substring), `>`, `<`, `>=`, `<=` (numeric), or bare truthy (non-empty, not `false`/`0`/`null`).

```json
{
  "type": "notify",
  "skip_if": "{{steps.check.http_status}} == 200",
  "params": { "channel": "slack", "url": "...", "text": "Service is down!" }
}
```

```json
{
  "type": "http",
  "run_if": "{{webhook_payload.enabled}} == true",
  "url": "https://api.example.com/deploy",
  "method": "POST"
}
```

The `condition` step type provides full if/else branching:

```json
{
  "type": "condition",
  "params": {
    "expression": "{{steps.0.output}} contains error",
    "if_true": [
      { "type": "notify", "params": { "channel": "email", "to": "ops@example.com", "subject": "Error detected" } }
    ],
    "if_false": [
      { "type": "log", "params": { "message": "All clear" } }
    ]
  }
}
```

Sub-steps within `if_true`/`if_false` are limited to: `log`, `http`, `notify`, `ai_generate`, `memory_get`, `memory_put`.

## Presets

`GET /v1/automations/presets` (public, no auth) returns 10 marketing-ready templates you can use as starting points:

| Preset | Trigger | Use case |
|--------|---------|----------|
| `rotate-api-keys-weekly` | cron | Security — rotate secrets on a schedule |
| `daily-dca-buy` | cron | DeFi — dollar-cost averaging |
| `health-check-alert` | cron | Monitoring — ping services, alert on failure |
| `database-sync` | cron | Integration — sync data between systems |
| `weekly-content-draft` | cron | Marketing — AI-generated content drafts |
| `lead-nurture-email` | webhook | Marketing — trigger email sequences |
| `competitor-watch` | cron | Intelligence — track competitor changes |
| `sentiment-alert` | webhook | Monitoring — react to sentiment signals |
| `campaign-report` | cron | Reporting — scheduled campaign summaries |
| `monitor-balance` | cron | Monitoring — wallet balance alerts |

Each preset includes `description`, `workflow_spec`, `default_cron`, `estimated_cost_per_run`, and optional `trigger_type`.

```bash
# Fetch presets via CLI
curl https://api.1claw.co/v1/automations/presets | jq '.[].name'
```

## Run history

Every trigger produces a **run** with status, duration, and output:

```bash
1claw automation runs <automation-id>
```

| Status | Meaning |
|--------|---------|
| `running` | Currently executing |
| `success` | Finished without error |
| `failed` | Failed (see `error` field) |
| `timed_out` | Exceeded 300-second timeout |
| `cancelled` | Cancelled by a human user |
| `awaiting_approval` | Paused on an `approval_request` step |

### Cancel a run

Human users can cancel in-progress or approval-waiting runs:

```
POST /v1/automations/{automation_id}/runs/{run_id}/cancel
```

Only runs with status `running` or `awaiting_approval` are cancellable. Agents receive 403 — only humans can cancel runs.

## MCP tools

| Tool | Description |
|------|-------------|
| `list_automations` | List automations for the current org |
| `trigger_automation` | Manually fire an automation |

## Dashboard

Navigate to **Automations** in the sidebar to:
- **Assist** — describe what to automate in plain language
- Create automations with a guided wizard (maps UI actions → `workflow_spec`)
- Copy one-time webhook URL/token after creating webhook automations
- Rotate webhook tokens from the automation detail page
- View run history with status and timing

## Tier limits

| Tier | Max automations | Runs / month |
|------|----------------|-------------|
| Free | 2 | 100 |
| Pro | 10 | 5,000 |
| Team | 50 | 50,000 |
| Business | 200 | 500,000 |
| Enterprise | Unlimited | Unlimited |

## Next steps

- [Cloud Runtimes](/docs/runtimes/overview) — deploy an always-on agent to trigger automations
- [Agent Memory](/docs/agents/memory) — persist state between automation runs
- [Intents API](/docs/agents/intents/overview) — sign transactions from automation workflows
