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
| `read_contract` | yes | — | `eth_call` a view function and decode the result |
| `http` | — | — | Call a URL (SSRF-validated) |
| `condition` | — | — | Branch on an expression over earlier step output |
| `ai_generate` | — | — | Generate text via the agent's model |
| `rotate_generate` | — | — | Generate a rotated secret value |
| `approval_request` | — | — | Raise a human approval from inside the run |
| `submit_transaction` | — | **yes** | Sign and broadcast as the agent |
| `swap` | — | **yes** | Quote and execute a swap as the agent |
| `execute_intent` | yes | **yes** | Run one of the agent's execution-intent bindings — the binding's host/path/method allowlists, conditions, secret scan and approval policy apply, and a policy that wants a human parks the run |
| `wait_until` | yes | — | Park until a time (`until`, RFC 3339) or for `duration_secs`, up to 72 h; no wall clock is spent parked |
| `awaiting_callback` | yes | — | Park until an external system POSTs to `{{run.callback_url}}`; `timeout_secs` up to 72 h |
| `for_each` | — | — | Run `steps` once per element of `items` (max 50) with `{{item}}` / `{{index}}` in scope |
| `call_automation` | — | — | Run another automation of the org inline as a sub-workflow (depth 1) |

**Agent-created automations** are restricted to the types marked above, capped at
10 steps, and may only use `manual` or `webhook` triggers. Platform- and
human-created automations may use every type, capped at 50 steps.

### Error policy, budgets and parks (engine v2)

Every step may carry **`on_error`**: `"fail"` (default), `"continue"` (record a
`failed` result and go on — later steps see `{{steps.N.status}} == "failed"`),
`"retry"` (3 attempts, 2 s linear backoff) or
`{"action": "retry", "max_attempts": 5, "backoff_secs": 10}` (max 5 / 30 s). Steps
that move funds (`submit_transaction`, `swap`, `execute_intent`) and steps that
park the run are never retried automatically — a failure after broadcast retried
is a double spend.

A spec may carry a **`budget`**: `{"max_tokens": …, "max_cost_cents": …, "max_steps": …}`.
The engine-wide ceiling (500 cents, 500 steps) still applies above it. `max_steps`
counts every `for_each` iteration and sub-workflow step, which is what bounds fan-out.
A run over budget fails closed at the step that crossed it.

Three step types **park** the run — the row moves to `awaiting_approval`, `waiting`
or `awaiting_callback`, its state is snapshotted, and the 300-second clock stops
until it continues:

- `approval_request` — continues when the approval is decided (see below).
- `wait_until` — the scheduler wakes it at `until`. Waits under 5 minutes sleep inline.
- `awaiting_callback` — continues when something POSTs to the run's callback URL.
  A spec containing this step gets a per-run token at start, exposed as
  `{{run.callback_url}}` and `{{run.callback_token}}`; a preceding `http` or
  `notify` step hands the URL to the external system. The POST body becomes
  `{{resume.*}}`. Unclaimed within `timeout_secs` (default 1 h, max 72 h) the run
  becomes `timed_out`.

```json
{
  "budget": { "max_cost_cents": 200, "max_steps": 40 },
  "steps": [
    { "type": "http", "name": "kickoff", "url": "https://ops.example/jobs",
      "method": "POST", "body": { "callback": "{{run.callback_url}}" },
      "on_error": { "action": "retry", "max_attempts": 4, "backoff_secs": 5 } },
    { "type": "awaiting_callback", "timeout_secs": 7200 },
    { "type": "notify", "channel": "email", "message": "Job finished: {{resume.result}}" }
  ]
}
```

Parks are refused inside `condition` branches, `for_each` bodies and sub-workflows.

### Preview a run (dry run)

`POST /v1/automations/{id}/dry-run` (or `POST /v1/automations/dry-run` with a
`workflow_spec` that is not saved yet) renders every step after template
substitution against a simulated context and reports, per step: the resolved
fields, the side effect it would have, its `on_error` policy, templates that
would resolve to nothing, conditions that would skip it, and the point at which
the budget would be exceeded. Nothing runs. The dashboard's **Preview run**
button (editor and detail page) is this endpoint; SDK `automations.dryRun()`.

### Re-run from a step

`POST /v1/automations/{id}/runs/{run_id}/rerun` `{ "from_step": N }` starts a
new run seeded with the finished run's results up to step `N` and continues
from there, on the spec version that run executed. The new run carries
`parent_run_id` and `trigger_source: "rerun"`. On the run timeline in the
dashboard every step has **Re-run from here**. Step results now record
`duration_ms`, `attempts`, `continued` and the resolved `input` (credentials
removed), which is what the timeline shows.

### Versions and rollback

Every `workflow_spec` an automation has had is kept: version 1 is the spec it was
created with, and each update that changes the spec publishes the next version
(`GET /v1/automations/{id}/versions`). Runs record the version they executed;
a run parked mid-way is pinned to the version it started on and refuses to
continue if the spec changed while it was parked. `POST …/versions/{n}/rollback`
republishes an earlier spec as a new version. Edits and rollbacks that **widen**
the automation — adding `submit_transaction`, `swap`, `execute_intent`, `http`,
`rotate_generate`, `call_automation` or `ai_generate` where there was none, or
raising/removing a `budget` cap — go through the org's control-plane consensus
policy under the `automation.widen` action; pass `approval_id` on the request
once approved. Narrowing never needs approval.

### Idempotent triggers

`POST /v1/automations/{id}/trigger` takes `{ "input": …, "idempotency_key": "…" }`
(or an `Idempotency-Key` header). The same key twice returns the run already
started for it with **200** rather than starting another (**201**). Webhook
deliveries use `X-GitHub-Delivery`, a Stripe `evt_…` id or `Idempotency-Key` the
same way, so provider retries never double-run.

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

### Signed deliveries

The token in the URL proves the URL; a **signature** proves the sender. Set a
scheme on the automation and unsigned or mis-signed deliveries start nothing:

```
PATCH /v1/automations/{id}
{ "webhook_signature": { "scheme": "stripe", "secret": "whsec_…" } }
```

Schemes: `stripe` (`Stripe-Signature: t=…,v1=…` over `<t>.<body>`, 5-minute
tolerance), `github` (`X-Hub-Signature-256: sha256=…` over the body) and
`hmac_sha256` (`<header>: <hex|base64>` over the body; set `header`). The secret
is stored encrypted in the org's agent-keys vault and never returned; the
automation exposes only `webhook_signature_scheme`. Send `"webhook_signature": null`
to remove it.

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

### Connector events (polled)

An automation can also react to what happens in a connected account — a new
Gmail message, a new Stripe invoice, a Drive file changed — without polling on
a cron and deduping itself. Subscribe an installed connector binding to one of
its preset's event sources and 1Claw does the polling centrally:

```bash
# What each connector offers: `event_sources` on GET /v1/connectors/presets
curl -X POST https://api.1claw.co/v1/agents/$AGENT_ID/event-subscriptions \
  -H "Authorization: Bearer $USER_JWT" -H "Content-Type: application/json" \
  -d '{"binding_id":"'$GMAIL_BINDING'","event_type":"gmail.message.received"}'
```

Then `trigger_type: "event"` with `event_filter: { "event_type":
"gmail.message.received" }`. The payload is `{ "subscription_id",
"binding_id", "binding", "connector", "item" }` where `item` is the list
entry the source returned (for Gmail, `{id, threadId}` — fetch the message with
an `execute_intent` step on the same binding).

| Connector | Event types |
|-----------|-------------|
| `gmail` | `gmail.message.received` |
| `google-drive` | `drive.file.changed` |
| `google-calendar` | `calendar.event.changed` |
| `github` | `github.notification.received` |
| `stripe` | `stripe.invoice.created`, `stripe.customer.created`, `stripe.payment_intent.created` |
| `hubspot` | `hubspot.contact.created`, `hubspot.deal.created` |

How it behaves, so you can rely on it:

- **Same reach as the binding.** Every poll goes through the binding's own
  executor — its host and path allowlists, its credential, the SSRF guard. A
  source cannot read anything the binding could not.
- **The first poll primes.** It records what already exists and emits nothing,
  so a new subscription does not replay the whole inbox as fresh events.
- **Deduplicated by item identity.** The poller keeps the last 500 item ids per
  subscription; a Drive file counts as new again when its `modifiedTime`
  changes. At most 25 new items are emitted per poll, oldest first; only the
  source's first page is read.
- **Intervals have a floor** per source (60–120 s) and a ceiling of a day.
  Failures back off exponentially on the interval and switch the subscription
  off after 20 in a row; `POST …/event-subscriptions/{id}/poll` retries now and
  switches it back on if that works.
- **Human-only** to create, delete and poll now. Agents can list their own.
  The agent needs Execution Intents enabled.

This is the polling interim. Provider push (Gmail `watch`, Drive change
channels) with registration and renewal is the next step and will keep the
same event types and payload shape.

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
| `read_contract` | `eth_call` | Read a view function on an EVM chain (v0.61.16) | `chain`, `address`, `function` (e.g. `balanceOf(address)`), `args[]`, `outputs[]` (ABI types; optional when an ABI is uploaded for the contract), `block?` |
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

Sub-steps within `if_true`/`if_false` are limited to: `log`, `http`, `read_contract`, `notify`, `ai_generate`, `memory_get`, `memory_put`.

### `read_contract`

Reads on-chain state before a decision, so a stop-loss or liquidation guardian conditions on the chain rather than on a price API. Static ABI types only (`address`, `bool`, `uintN`, `intN`, `bytesN`); numbers come back as decimal strings because `uint256` does not fit a JSON number. The RPC is the chain registry's; the step never signs anything.

```json
{
  "steps": [
    { "type": "read_contract", "name": "eth_usd",
      "chain": "base", "address": "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      "function": "latestRoundData()",
      "outputs": ["uint80", "int256", "uint256", "uint256", "uint80"] },
    { "type": "condition",
      "expression": "{{steps.eth_usd.output.values.1}} < 200000000000",
      "if_true": [ { "type": "submit_transaction", "chain": "base", "to": "0x…", "value": "0", "data": "0x…" } ] }
  ]
}
```

Step output: `{ "raw": "0x…", "values": [...], "value": values[0], "named": { "answer": "…" } }`. `named` is filled when the org has uploaded the contract's ABI (`POST /v1/contract-abis`), in which case `outputs` can be omitted.

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
| `timed_out` | Exceeded the 300-second run clock, or parked on an approval nobody decided within 72 hours |
| `cancelled` | Cancelled by a human user |
| `awaiting_approval` | Paused on an `approval_request` step — the clock is stopped |

### Approval steps park the run, and the decision resumes it

An `approval_request` step creates an approval, parks the run in `awaiting_approval` with its state so far, and stops the 300-second clock. When the approval is decided — from the dashboard, the API (`POST /v1/approvals/{id}/decide`), the one-tap email link, or the phone — the run continues automatically: **approved** resumes from the next step (the approval step's output is `{ "status": "approved", "approval_id": … }`, so later steps can read `{{steps.N.status}}`), **rejected** fails the run with `approval rejected at step N`. Time spent parked does not count against the run clock; a parked run that nobody decides within 72 hours becomes `timed_out`.

If the decision was made somewhere else, hand it off:

```
POST /v1/automations/{automation_id}/runs/{run_id}/resume
{"payload": {"ticket": "OPS-42"}}
```

Human-only. It carries an approval that was already decided forward (a still-pending approval is 409 — decide it via `POST /v1/approvals/{id}/decide`, which enforces approver identity, expiry and step-up, and the run resumes on its own). A run parked on `wait_until` or `awaiting_callback` can be pushed on by an org owner/admin the same way. `payload` reaches later steps as `{{resume.*}}`. Idempotent — a run that is not parked is returned unchanged. SDK: `client.automations.resumeRun(automationId, runId, payload?)`; Python `resume_run`. Webhook: `automation.run.resumed`.

An `execute_intent` step whose binding approval policy wants a human parks the run the same way; on approval the **same step runs again** with the approval granted, so the call is made exactly once and only after a human saw it.

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
