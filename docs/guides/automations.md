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

## Trigger types

| Type | Description | Example |
|------|-------------|---------|
| `schedule` | Cron expression (UTC) | `0 */6 * * *` — every 6 hours |
| `webhook` | Auto-generated URL, fires on POST | External CI/CD callback |
| `event` | Vault or agent lifecycle event | `secret.rotated`, `agent.created` |
| `manual` | API call or dashboard button | One-off test runs |

## Quickstart

### Create via CLI

```bash
# Cron automation — rotate a secret every day at midnight UTC
1claw automation create \
  --name "nightly-rotate" \
  --trigger schedule \
  --cron "0 0 * * *" \
  --action rotate_secret \
  --action-params '{"vault_id":"...","path":"integrations/stripe-key"}'

# Webhook trigger — fires when your CI posts to the URL
1claw automation create \
  --name "deploy-notify" \
  --trigger webhook

# Event trigger — fires when any secret is rotated
1claw automation create \
  --name "post-rotate-hook" \
  --trigger event \
  --event "secret.rotated" \
  --action execute_http \
  --action-params '{"binding":"slack-webhook","method":"POST","path":"/","body":"{\"text\":\"Secret rotated\"}"}'

# Manual trigger
1claw automation trigger <automation-id>

# List runs
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
  trigger_type: "schedule",
  cron_expression: "0 0 * * *",
  action: "rotate_secret",
  action_params: {
    vault_id: "550e8400-...",
    path: "integrations/stripe-key",
  },
});
console.log(automation.id, automation.webhook_url);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/automations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nightly-rotate",
    "trigger_type": "schedule",
    "cron_expression": "0 0 * * *",
    "action": "rotate_secret",
    "action_params": {
      "vault_id": "550e8400-...",
      "path": "integrations/stripe-key"
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

## Webhook triggers

When you create a webhook automation, 1Claw generates a unique URL:

```
https://api.1claw.xyz/v1/automations/{id}/hook/{secret}
```

Any POST to this URL triggers the automation. The request body is passed as `event_payload` to the action.

## Event triggers

Supported lifecycle events:

| Event | Fires when |
|-------|-----------|
| `secret.created` | A new secret is stored |
| `secret.rotated` | A secret is rotated (version incremented) |
| `secret.deleted` | A secret is deleted |
| `agent.created` | A new agent is registered |
| `agent.deactivated` | An agent is deactivated |
| `policy.created` | A new access policy is created |
| `policy.deleted` | A policy is removed |

## Actions

Automations support multiple action types:

| Action | Description |
|--------|-------------|
| `rotate_secret` | Server-side secret rotation (random value) |
| `execute_http` | HTTP request through an Execution Intent binding |
| `run_workflow` | Multi-step LLM-driven workflow |
| `notify` | Send a notification (email, webhook) |

## Run history

Every trigger produces a **run** with status, duration, and output:

```bash
1claw automation runs <automation-id>
```

| Status | Meaning |
|--------|---------|
| `pending` | Queued, not yet started |
| `running` | Currently executing |
| `success` | Completed without error |
| `error` | Failed (see `error` field) |

## MCP tools

| Tool | Description |
|------|-------------|
| `list_automations` | List automations for the current agent |
| `trigger_automation` | Manually fire an automation |

## Dashboard

Navigate to **Automations** in the sidebar to:
- Create automations with a guided wizard
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
