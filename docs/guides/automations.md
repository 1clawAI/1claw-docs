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
  "webhook_url": "https://api.1claw.xyz/v1/automations/{id}/webhook/whk_...",
  "webhook_token": "whk_..."
}
```

- **URL pattern:** `POST https://api.1claw.xyz/v1/automations/{automation_id}/webhook/{token}`
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
  baseUrl: "https://api.1claw.xyz",
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
curl -X POST "https://api.1claw.xyz/v1/automations" \
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
| `POST` | `/v1/automations` | Create automation |
| `GET` | `/v1/automations` | List automations |
| `GET` | `/v1/automations/{id}` | Get automation detail |
| `PATCH` | `/v1/automations/{id}` | Update automation |
| `DELETE` | `/v1/automations/{id}` | Delete automation |
| `POST` | `/v1/automations/{id}/trigger` | Manual trigger (authenticated) |
| `POST` | `/v1/automations/webhook/{id}/{token}` | Public webhook trigger |
| `POST` | `/v1/automations/{id}/rotate-webhook-token` | Rotate webhook token (human-only) |
| `POST` | `/v1/automations/assist/draft` | NL → draft |
| `POST` | `/v1/automations/assist/session` | Assist session JWT |
| `GET` | `/v1/automations/{id}/runs` | List run history |

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

Steps run sequentially. Common step shapes:

| `action` | Description |
|----------|-------------|
| `run_agent_task` | Invoke the linked agent with a prompt/message |
| `execute_http` / `execute_intent` | HTTP or Execution Intent binding call |
| `submit_transaction` | Intents API transaction (guardrails apply) |
| `swap` | Scheduled DEX swap step (preset workflows) |
| `rotate_generate` | Server-side secret rotation |
| `notify` / `log` | Emit a notification or structured log step |

## Run history

Every trigger produces a **run** with status, duration, and output:

```bash
1claw automation runs <automation-id>
```

| Status | Meaning |
|--------|---------|
| `pending` | Queued, not yet started |
| `running` | Currently executing |
| `completed` / `success` | Finished without error |
| `failed` / `error` | Failed (see `error` field) |
| `denied` | Guardrail / policy rejection |

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

- [Cloud Runtimes](/docs/guides/runtimes) — deploy an always-on agent to trigger automations
- [Agent Memory](/docs/guides/agent-memory) — persist state between automation runs
- [Intents API](/docs/guides/intents-api) — sign transactions from automation workflows
