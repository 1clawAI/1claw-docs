---
title: Automations
description: Schedule, webhook, and event-driven workflows for AI agents on 1Claw.
sidebar_label: "Automations — cron, webhooks, AI workflows"
---

# Automations

Automations let you run agent workflows on a schedule, in response to webhooks, or triggered by vault/agent lifecycle events — without writing deployment infrastructure.

## What are automations?

An automation is a named workflow attached to your org. Each automation has:

- **Trigger** — when it fires (cron schedule, incoming webhook, vault event, or manual)
- **Action** — what it does (call an agent endpoint, rotate a secret, run a script)
- **Status** — active or paused

## Trigger types

| Type | Description | Example |
|------|-------------|---------|
| `schedule` | Cron expression (UTC) | `0 2 * * *` — every day at 2 AM |
| `webhook` | Auto-generated URL that fires on POST | CI/CD pipeline completion |
| `event` | Vault/agent lifecycle events | `secret.rotated`, `agent.deactivated` |
| `manual` | Fire via API, CLI, or dashboard button | Ad-hoc test runs |

## Create via dashboard

1. Navigate to **Automations** in the sidebar
2. Click **Create Automation**
3. Choose a trigger type
4. Configure the action (rotate secret, call URL, trigger agent)
5. Set a name and optional description
6. Click **Create**

The wizard supports presets for common patterns like "rotate API keys every 30 days" or "notify on policy change."

## Create via CLI

```bash
# Create a scheduled rotation
1claw automation create \
  --name "rotate-openai-key" \
  --trigger schedule \
  --cron "0 0 1 * *" \
  --action rotate-secret \
  --action-params '{"vault_id": "...", "path": "openai/api-key", "length": 64}'

# Create from a preset
1claw automation create --preset "rotate-api-keys"

# List automations
1claw automation list

# Trigger manually
1claw automation trigger <automation-id>

# View run history
1claw automation runs <automation-id>
```

## Create via SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({ apiKey: "1ck_..." });

const automation = await client.automations.create({
  name: "daily-key-rotation",
  trigger_type: "schedule",
  trigger_config: { cron: "0 2 * * *" },
  action_type: "rotate_secret",
  action_config: {
    vault_id: "uuid-here",
    path: "services/stripe-key",
    length: 32,
    charset: "alphanumeric",
  },
});

// Trigger manually
await client.automations.trigger(automation.id);

// List runs
const runs = await client.automations.listRuns(automation.id);
```

## Preset gallery

| Preset | Trigger | Action |
|--------|---------|--------|
| `rotate-api-keys` | Monthly cron | Rotate all secrets matching `*/api-key` |
| `expire-shares` | Daily cron | Clean up expired share links |
| `notify-on-breach` | Event: `risk.critical` | Send webhook to Slack/PagerDuty |
| `backup-vault` | Weekly cron | Export vault snapshot (encrypted) |
| `revoke-idle-agents` | Daily cron | Deactivate agents with no activity in 30d |

## Cron expressions cheat sheet

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

| Expression | Meaning |
|-----------|---------|
| `0 * * * *` | Every hour |
| `0 2 * * *` | Daily at 2:00 AM UTC |
| `0 0 * * 1` | Every Monday at midnight |
| `0 0 1 * *` | First of every month |
| `*/15 * * * *` | Every 15 minutes |
| `0 9-17 * * 1-5` | Weekdays, 9 AM – 5 PM (hourly) |

All schedules are evaluated in **UTC**.

## Billing & limits

| Tier | Active automations | Runs / month |
|------|-------------------|--------------|
| Free | 2 | 100 |
| Pro | 10 | 5,000 |
| Team | 50 | 50,000 |
| Business | 200 | 500,000 |
| Enterprise | Unlimited | Unlimited |

Exceeding run limits pauses the automation until the next billing cycle. Upgrade at **Settings → Billing** or via `1claw billing subscribe`.

## Monitoring

- **Dashboard**: Each automation shows a sparkline of recent runs with success/failure status.
- **CLI**: `1claw automation runs <id>` shows the last 50 runs with timestamps and exit status.
- **Webhooks**: Subscribe to `automation.run.completed` and `automation.run.failed` events.

## Next steps

- [Cloud Runtimes](/docs/guides/runtimes) — deploy the agent that your automation triggers
- [Agent Memory](/docs/guides/agent-memory) — persist state between automation runs
- [Billing](/docs/guides/billing-and-usage) — understand tier limits and overage
