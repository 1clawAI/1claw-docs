---
title: Automations
description: Schedule cron jobs, webhook-triggered workflows, and manual automation runs for secret rotation, HTTP requests, and AI agent orchestration.
sidebar_position: 20
---

# Automations

Automations let you schedule recurring tasks, react to webhooks, and trigger AI workflows — all managed through the 1Claw API. Use them for secret rotation schedules, periodic health checks, webhook-driven pipelines, or any repeatable operation your agents need.

:::info Requirements
Automations are available on all tiers with varying limits. See [Tier Limits](#tier-limits) below.
:::

## Overview

An automation consists of:

- **Trigger** — what causes the automation to run (cron schedule, inbound webhook, lifecycle event, or manual invocation)
- **Action** — what happens when triggered (rotate a secret, make an HTTP request, or execute an AI workflow)
- **Workflow spec** — a JSON definition of the steps to execute

---

## Creating an Automation

```bash
curl -X POST "https://api.1claw.xyz/v1/automations" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rotate API Keys Weekly",
    "description": "Rotates all third-party API keys every Monday at 3am UTC",
    "trigger_type": "cron",
    "trigger_config": {
      "cron": "0 3 * * 1"
    },
    "action_type": "rotate_secret",
    "action_config": {
      "vault_id": "VAULT_UUID",
      "paths": ["api-keys/stripe", "api-keys/openai"],
      "length": 48,
      "charset": "alphanumeric"
    },
    "is_active": true
  }'
```

---

## Trigger Types

| Type | Description | `trigger_config` fields |
|---|---|---|
| `cron` | Runs on a cron schedule (UTC) | `cron` — standard 5-field cron expression |
| `webhook` | Runs when the auto-generated webhook URL receives a POST | `secret` (optional) — HMAC-SHA256 verification secret |
| `event` | Runs on vault/agent lifecycle events | `events[]` — e.g. `["secret.created", "agent.deactivated"]` |
| `manual` | Only runs when explicitly triggered via API or dashboard | (none) |

### Cron examples

| Expression | Meaning |
|---|---|
| `0 */6 * * *` | Every 6 hours |
| `0 3 * * 1` | Monday at 3:00 UTC |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | First of each month at midnight |

### Webhook trigger

When you create a webhook-triggered automation, the response includes a `webhook_url`:

```
https://api.1claw.xyz/v1/automations/AUTOMATION_ID/webhook
```

Send a POST request to this URL to trigger the automation. If you set a `secret` in the trigger config, include an `X-Webhook-Signature` header with the HMAC-SHA256 of the request body.

---

## Action Types

### `rotate_secret`

Generates a new cryptographically random value for one or more secret paths.

```json
{
  "action_type": "rotate_secret",
  "action_config": {
    "vault_id": "VAULT_UUID",
    "paths": ["api-keys/stripe"],
    "length": 32,
    "charset": "hex"
  }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `vault_id` | UUID | required | Target vault |
| `paths` | string[] | required | Secret paths to rotate |
| `length` | integer | `32` | New value length (8–1024) |
| `charset` | string | `"alphanumeric"` | `hex`, `base64`, `alphanumeric`, `ascii` |

### `http_request`

Makes an outbound HTTP request with optional secret injection.

```json
{
  "action_type": "http_request",
  "action_config": {
    "method": "POST",
    "url": "https://hooks.slack.com/services/T.../B.../xxx",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"text\": \"Secrets rotated successfully\"}",
    "timeout_ms": 10000
  }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `method` | string | `"POST"` | HTTP method |
| `url` | string | required | Target URL (SSRF-validated) |
| `headers` | object | `{}` | Request headers |
| `body` | string | `""` | Request body |
| `timeout_ms` | integer | `10000` | Request timeout |

### `ai_workflow`

Executes a multi-step AI workflow defined by a JSON spec.

```json
{
  "action_type": "ai_workflow",
  "action_config": {
    "agent_id": "AGENT_UUID",
    "workflow": {
      "steps": [
        {
          "name": "check-expiry",
          "type": "http_request",
          "config": {
            "method": "GET",
            "url": "https://api.example.com/key-status"
          }
        },
        {
          "name": "rotate-if-expired",
          "type": "rotate_secret",
          "condition": "steps.check-expiry.response.status == 'expired'",
          "config": {
            "vault_id": "VAULT_UUID",
            "paths": ["api-keys/example"],
            "length": 64
          }
        }
      ]
    }
  }
}
```

---

## Workflow Spec Structure

For `ai_workflow` actions, the `workflow` field defines a directed sequence of steps:

```json
{
  "steps": [
    {
      "name": "step-identifier",
      "type": "rotate_secret | http_request | notify",
      "condition": "optional expression — skip if false",
      "config": { },
      "on_error": "continue | abort"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Unique step identifier (referenced in conditions) |
| `type` | string | Step action type |
| `condition` | string | Expression evaluated before execution; step is skipped if falsy |
| `config` | object | Type-specific configuration (same schema as action configs) |
| `on_error` | string | `"abort"` (default) stops the workflow; `"continue"` proceeds |

---

## Listing and Managing Runs

Every time an automation fires, it creates a **run** with status tracking.

### List runs

```bash
curl "https://api.1claw.xyz/v1/automations/AUTOMATION_ID/runs?limit=20" \
  -H "Authorization: Bearer YOUR_JWT"
```

Response:

```json
{
  "runs": [
    {
      "id": "run-uuid",
      "automation_id": "...",
      "status": "success",
      "started_at": "2026-08-01T03:00:00Z",
      "completed_at": "2026-08-01T03:00:02Z",
      "trigger_type": "cron",
      "result": { "rotated_paths": ["api-keys/stripe"] }
    }
  ]
}
```

Run statuses: `pending`, `running`, `success`, `failed`, `cancelled`.

### Trigger manually

```bash
curl -X POST "https://api.1claw.xyz/v1/automations/AUTOMATION_ID/trigger" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Managing Automations

| Method | Path | Description |
|---|---|---|
| POST | `/v1/automations` | Create automation |
| GET | `/v1/automations` | List automations |
| GET | `/v1/automations/{id}` | Get automation details |
| PATCH | `/v1/automations/{id}` | Update automation |
| DELETE | `/v1/automations/{id}` | Delete automation |
| POST | `/v1/automations/{id}/trigger` | Trigger manually |
| GET | `/v1/automations/{id}/runs` | List runs |

---

## SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "1ck_YOUR_KEY",
});

// Create an automation
const automation = await client.automations.create({
  name: "Daily key rotation",
  trigger_type: "cron",
  trigger_config: { cron: "0 2 * * *" },
  action_type: "rotate_secret",
  action_config: {
    vault_id: "VAULT_UUID",
    paths: ["api-keys/openai"],
    length: 48,
    charset: "alphanumeric",
  },
});

// List automations
const { data } = await client.automations.list();

// Trigger manually
await client.automations.trigger(automation.data.id);

// List runs
const runs = await client.automations.listRuns(automation.data.id);
```

---

## CLI

```bash
# Create
1claw automation create --name "Rotate keys" \
  --trigger cron --cron "0 3 * * 1" \
  --action rotate_secret --vault VAULT_ID --paths "api-keys/*"

# List
1claw automation list

# Get details
1claw automation get AUTOMATION_ID

# Update
1claw automation update AUTOMATION_ID --name "Weekly rotation"

# Trigger manually
1claw automation trigger AUTOMATION_ID

# View runs
1claw automation runs AUTOMATION_ID

# Delete
1claw automation delete AUTOMATION_ID
```

---

## MCP Tools

The 1Claw MCP server provides automation tools for AI agents:

| Tool | Description |
|---|---|
| `list_automations` | List all automations in the org |
| `trigger_automation` | Trigger an automation by ID |

---

## Tier Limits

| Tier | Max Automations | Runs / Month |
|---|---|---|
| Free | 2 | 100 |
| Pro | 10 | 5,000 |
| Team | 50 | 50,000 |
| Business | 200 | 500,000 |
| Enterprise | Unlimited | Unlimited |

:::tip Upgrading
If you hit your automation or run limit, [upgrade your plan](https://1claw.xyz/settings/billing). Existing automations are paused (not deleted) when you downgrade.
:::

---

## Best Practices

1. **Use cron for periodic rotation** — Schedule key rotation during low-traffic windows.
2. **Use webhooks for event-driven flows** — Pair with CI/CD pipelines or external monitoring.
3. **Set `on_error: "continue"`** for non-critical steps in workflows to avoid full-pipeline failures.
4. **Monitor runs in the dashboard** — The Automations page shows run history with status and duration.
5. **Test with manual triggers** before enabling cron schedules to validate your action config.
