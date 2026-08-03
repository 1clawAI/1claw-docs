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
| `timezone` | no | IANA timezone (default `UTC`) |
| `event_filter` | for event | Filter object for lifecycle events |

The dashboard maps legacy UI `action_type` / `action_config` fields onto `workflow_spec` before calling the API.

## Trigger types

| Type | Description | Example |
|------|-------------|---------|
| `cron` | Cron expression (alias: `schedule`) | `0 */6 * * *` — every 6 hours |
| `webhook` | Trigger via `POST /v1/automations/{id}/trigger` | External CI/CD callback |
| `event` | Vault or agent lifecycle event | `secret.rotated`, `agent.created` |
| `manual` | API call or dashboard button | One-off test runs |

## Quickstart

### Create via CLI

```bash
# Cron automation — every day at midnight UTC
1claw automation create nightly-rotate \
  --agent-id <uuid> \
  --trigger cron \
  --cron "0 0 * * *" \
  --workflow '{"steps":[{"type":"log","action":"run_agent_task","message":"Rotate nightly keys"}]}'

# Webhook / manual trigger
1claw automation create deploy-notify \
  --agent-id <uuid> \
  --trigger webhook \
  --workflow '{"steps":[{"type":"log","action":"notify","message":"Deploy hook fired"}]}'

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
  timezone: "UTC",
  workflow_spec: {
    steps: [
      {
        type: "log",
        action: "run_agent_task",
        message: "Rotate integrations/stripe-key",
      },
    ],
  },
});
console.log(automation?.id, automation?.trigger_type);
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
    "timezone": "UTC",
    "workflow_spec": {
      "steps": [
        { "type": "log", "action": "run_agent_task", "message": "Rotate nightly keys" }
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
| `POST` | `/v1/automations/{id}/trigger` | Manual trigger |
| `GET` | `/v1/automations/{id}/runs` | List run history |

## Event triggers

Supported lifecycle events (via `event_filter`):

| Event | Fires when |
|-------|-----------|
| `secret.created` | A new secret is stored |
| `secret.rotated` | A secret is rotated (version incremented) |
| `secret.deleted` | A secret is deleted |
| `agent.created` | A new agent is registered |
| `agent.deactivated` | An agent is deactivated |
| `policy.created` | A new access policy is created |
| `policy.deleted` | A policy is removed |

## Workflow steps

Steps run sequentially. Common step shapes:

| `action` / `type` | Description |
|-------------------|-------------|
| `run_agent_task` | Invoke the linked agent with a prompt/message |
| `execute_http` / `http` | HTTP request through an Execution Intent binding |
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
- Create automations with a guided wizard (maps UI actions → `workflow_spec`)
- View run history with status and timing
- Edit trigger configuration inline
- Toggle automations active/inactive

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
