---
title: "Fleet management"
description: Manage every agent one bootstrap template provisioned as a single cohort — version skew, drift, bulk patches, and rollouts.
sidebar_position: 67
---

# Fleet management

A platform app bootstraps a template once per end user. After a thousand
bootstraps you have a thousand agents that came from one description, and the
template is the only thing that still describes them all.

Two questions become hard at that point, and neither has a good answer through
the per-agent API:

- **How many are behind?** Each agent records the template version it was
  provisioned from. Nothing aggregates that.
- **How do I move them forward?** Editing the template changes what *future*
  bootstraps produce. It does not touch the agents already out there.

The fleet routes answer both. A **fleet** is simply every agent one template
provisioned.

:::info Requirements
The Platform API requires a **Pro or higher** subscription. Fleet routes accept
your `plt_` app key or a user JWT for the org that owns the app.
:::

## The thing to understand first

Every route on this page does what it does *a thousand times*, and nobody
reviews it per agent.

That single fact explains every restriction below. A patch that would be
unremarkable on one agent — raising a spend limit, enabling transaction signing
— is a different kind of act when it lands on an entire cohort at once. So the
fleet surface is deliberately **narrower** than the per-agent API, not wider.

## Fleet status

```bash
1claw platform fleet status <appId> <templateId>
```

```json
{
  "template_id": "…",
  "template_name": "onboarding",
  "current_version": 4,
  "spec_hash": "9f2a…",
  "total_agents": 1240,
  "version_skew": [
    { "template_version": 2, "agents": 310 },
    { "template_version": 3, "agents": 500 },
    { "template_version": 4, "agents": 430 }
  ],
  "agents_on_current_version": 430,
  "agents_behind": 810,
  "drifted_agents": 12,
  "bulk_patchable_fields": ["system_prompt", "description", "…"]
}
```

`spec_hash` is a hash of the template spec. A version number moves on every
edit, including edits that changed nothing meaningful; the hash tells you
whether the cohort is actually behind anything.

`drifted_agents` counts agents a previous rollout **declined to touch** because
someone had changed them outside fleet control. It is the standing answer to
"why is this agent still behind?".

## What is bulk-patchable

```bash
1claw platform fleet patch <appId> <templateId> --set system_prompt="You are…"
```

The allowlist is returned on the fleet summary as `bulk_patchable_fields`.
**Read it from there rather than hard-coding it** — it is narrower than a
single-agent `PATCH` and may narrow further.

Two categories are excluded, and will stay excluded:

**Guardrails** — `max_transaction_value_usd`, `daily_spend_limit_usd`, and the
rest. Raising a spend limit across a fleet is not a deployment operation. It is
a thousand separate decisions that happen to share a form, and each one belongs
to the agent it affects, through the guardrail approval flow.

**Capability flags** — `intents_api_enabled`, `execution_intents_enabled`.
Turning on transaction signing for an entire cohort in one request is the
largest privilege change this API can express. It should not be reachable
without per-agent review.

A field outside the allowlist returns `400` naming the field, and **refuses the
whole patch** rather than applying the acceptable parts. A partially-applied
bulk patch across a thousand agents is far worse than a rejected one.

## Rollouts

```bash
1claw platform fleet rollout <appId> <templateId> --dry-run
1claw platform fleet rollout <appId> <templateId>
```

A rollout brings the cohort up to the template's current version.

**Hand edits are skipped, not corrected.** If an agent's field was changed
outside fleet control, the rollout leaves it alone and records the field on the
agent. Someone changed it for a reason; a rollout that overwrites that reason
at cohort scale destroys a thousand reasons at once. This is the same rule
`1claw apply` uses.

```json
{
  "job_id": "…",
  "to_version": 4,
  "synced": 798,
  "already_current": 430,
  "skipped_drifted": 12,
  "outcomes": [
    { "outcome": "synced", "agent_id": "…", "fields": ["system_prompt"] },
    { "outcome": "skipped_drifted", "agent_id": "…", "drift_fields": ["system_prompt"] }
  ]
}
```

`--force` overrides the skip. It still **cannot carry a guardrail or a
capability flag**, even when the template specifies one — those are filtered
out of what a rollout is allowed to move, forced or not.

`--dry-run` reports the plan and changes nothing. It also **claims no job**, so
`job_id` comes back `null` and a dry run never blocks the real rollout that
follows it.

Only one rollout runs per template at a time. A second returns `409`: two
concurrent rollouts would race and leave the cohort half on each version.

## Pausing

```bash
1claw platform fleet pause <appId> <templateId>
```

Deactivates every agent in the cohort. The blast radius is the point — this
exists for the moment you need a thousand agents to stop at once.

## MCP

The MCP server exposes fleets **read-only**: `platform_get_fleet`,
`platform_list_fleet_agents`, and `platform_plan_fleet_rollout`, which always
runs as a dry run.

Bulk-patch and pause are not available to agents through MCP. Changing a
thousand agents from one call, with no per-agent review, is a decision for a
human at a terminal or a deliberate SDK call.

## Endpoints

| Method | Path |
| --- | --- |
| `GET` | `/v1/platform/apps/{app_id}/fleets/{template_id}` |
| `GET` | `/v1/platform/apps/{app_id}/fleets/{template_id}/agents` |
| `POST` | `/v1/platform/apps/{app_id}/fleets/{template_id}/bulk-patch` |
| `POST` | `/v1/platform/apps/{app_id}/fleets/{template_id}/rollout` |
| `POST` | `/v1/platform/apps/{app_id}/fleets/{template_id}/pause` |

## SDK

```ts
const { data: fleet } = await client.platform.getFleet(appId, templateId);
console.log(`${fleet.agents_behind} of ${fleet.total_agents} behind`);

// Read the allowlist rather than assuming it.
if (fleet.bulk_patchable_fields.includes("system_prompt")) {
  await client.platform.bulkPatchFleet(appId, templateId, {
    system_prompt: "You are a careful assistant.",
  });
}

const { data: plan } = await client.platform.rolloutFleet(appId, templateId, {
  dry_run: true,
});
// A dry run claims no job.
console.log(plan.job_id); // null
```

```python
fleet = client.platform.get_fleet(app_id, template_id).data
plan = client.platform.rollout_fleet(app_id, template_id, dry_run=True).data
```
