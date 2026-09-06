---
title: Declarative charts (`1claw apply`)
description: Provision a whole swarm from one file — vaults, agents, policies and connectors — with a preview you can trust and refusals you can act on.
sidebar_position: 30
---

# Declarative charts

One file describes what you want; `1claw apply` makes it so.

```bash
1claw diff  -f chart.yaml     # what would change
1claw apply -f chart.yaml
```

```yaml
apiVersion: 1claw/v1
kind: Chart
metadata:
  name: inbox-swarm
spec:
  vaults:
    - name: inbox-vault
  agents:
    - name: inbox-triage
      system_prompt: You triage an inbox.
      connectors:
        - preset: gmail
          scopes: [https://www.googleapis.com/auth/gmail.readonly]
  policies:
    - vault_ref: inbox-vault
      principal_ref: agent:inbox-triage
      paths: [integrations/**]
      permissions: [read]
```

## What apply will not do

This is the important half.

### It never deletes

A resource removed from the chart is left alone. There is no `--prune`. An apply
that silently deletes is an apply nobody runs twice, and the first time it
removes something load-bearing is the last time anyone trusts it. Tearing down
is explicit and separate.

Renaming an agent in the chart therefore does not rename the agent — it creates
a new one and leaves the old one running.

### It skips anything edited outside the chart

If someone changed an agent by hand — during an incident, say — apply leaves it
alone and tells you which fields differ:

```
  ! agent/inbox-triage changed outside this chart (system_prompt) — left alone
```

They changed it for a reason. Overwriting that because a file says otherwise is
how a deployment tool destroys a fix at three in the morning. Reconcile it
yourself, or drop those fields from the chart.

This needs `.1claw/apply-state.json`, which apply writes. It records what apply
set, which is what distinguishes "someone edited this" from "this existed before
I ever ran". A resource that existed before your first apply is not drift.

### It refuses guardrails

Transaction limits, host allowlists, approval policies — none of these are
chart fields. Editing them routes through the guardrail approval flow, and a
reconciler that wrote them directly would be a way around that flow wearing a
deployment tool's clothes. A chart asking to change one is refused and says so:

```
  ✗ agent/trader cannot change tx_max_value in place — use the endpoint that owns it
```

A refusal is not silence. Silently ignoring the difference would mean the chart
and reality disagree forever while every apply reports success.

### It does not skip your org's approval gates

Apply calls the same handlers the API routes call. If your org requires
control-plane consensus for `vault.create`, applying a chart queues an approval
exactly as clicking in the dashboard would:

```
  ⏸ vault/inbox-vault needs approval: 4f1c…
```

That resource is not created until someone approves. The rest of the chart still
applies — one gated resource is not a failed deployment.

## Names are the reconcile keys

`metadata.name` and each resource's `name` are how a second apply finds what the
first one made. Two agents with the same name is an error, not something
resolved by position — resolving by position would silently reassign resources
the moment someone reordered the file.

Names use lowercase letters, digits and hyphens. They end up in URLs, log lines
and a state file, and a name needing escaping in any of those is one that will
eventually be mis-escaped.

## Typos are errors

Unknown fields are rejected:

```
  system_promt: unknown field
```

A misspelled field that was quietly dropped would produce an apply reporting
success while doing nothing you asked for — and your only clue would be that the
field you were looking for had vanished.

## Connectors need a person

A chart can install the Gmail connector. Someone still has to sign in. Apply
returns the authorization URL and says so rather than pretending the binding is
usable:

```
  warning: agent 'inbox-triage' installs the Gmail connector, which needs
           someone to sign in before it can be used.
```

## Where the reconciler lives

Server-side, and only server-side. `1claw apply` parses your YAML, posts it to
`POST /v1/org/apply`, and renders the answer — it contains no reconcile logic at
all. Two implementations would drift, and the drift would show up as a CLI that
provisions differently from a platform rollout.

That also means the same reconcile semantics are available over the API without
the CLI:

| Endpoint | Purpose |
|---|---|
| `POST /v1/org/apply/diff` | What would change. Read-only. |
| `POST /v1/org/apply` | Make it so. |

Both are human-only. A chart provisions agents, vaults and access policies, so
an agent that could apply one could grant itself access to a vault it cannot
currently read.

## Current limits

v1 creates and reports. In-place patching of existing resources is not enabled
yet — a chart that would change one says so and does nothing. There is no
prune, and no offline apply.
