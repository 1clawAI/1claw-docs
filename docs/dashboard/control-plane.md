---
title: Control plane
description: The live topology map, threat register, metrics, read flows and trust scores for every agent in your org — the first thing you see at 1claw.co/dashboard.
sidebar_position: 1
---

# Control plane

The **control plane** is the default view at [1claw.co/dashboard](https://1claw.co/dashboard). It is one screen that answers "who can touch what, what is happening right now, and which agent should I be worried about" — drawn live from the same events the vault already writes, so nothing here can drift from what actually happened.

Human users only. An agent key gets a 403 on every route behind this screen: a compromised agent reading every other agent's vault paths and threat evidence is precisely the attack the boundary prevents. Platform apps get a [connection-scoped view](#platform-apps) instead.

## Topology

A force-directed map of the org's resources and how they connect.

| Node | Glyph | Meaning |
|------|-------|---------|
| Agent | Dark circle, robot face | An agent identity. A ring around it is its **trust score** (full ring = 100), green / amber / red by the engine's bands. Compromised agents glow red; suspended ones are struck through. |
| Vault | Grey square with a key | A vault. Agents that can reach it sit inside a soft dashed hull carrying the vault's name. |
| Policy | Red-outlined hexagon | One node per (vault, secret-path pattern). An agent **holds** a policy; a policy **grants** access to a vault. |
| Chain | Ring with a currency mark (Ξ ◎ ₿) | A chain the agent has an active signing key on. |
| System | Diamond with an initial | An execution-intents binding the agent **calls**. |

Edges are styled by relation: `holds` / `grants` are dashed brand-red (the reachability story), `signs` is solid graphite, `calls` is dotted. Select a node and its edges get arrowheads, crawl toward their targets, and label themselves with the relation word once you are zoomed in.

**Interacting**

- Scroll to zoom at the cursor, drag empty space to pan, drag a node to rearrange it, double-click empty space to fit. Two fingers pinch on a phone.
- Click a node for its **detail panel**: for an agent, the trust number with each component as a bar (a component shows *not measured* rather than a zero when this deployment has no source for it), a 24-hour sparkline, the agent's recent audit actions, and everything it reaches as clickable chips. For a vault, the agents that can read it. **Suspend agent** is on the panel; it is `PATCH /v1/agents/{id} {is_active:false}`, which the map reflects on its next refresh.
- The **legend is the filter**: click a kind to hide it, toggle `ok` / `warn` / `suspended` / `compromised` agents, or hide the vault groups. The counts strip under the title does the same per kind.
- **Search** (`/`) rings matching nodes and dims the rest; `Enter` jumps to the first match.
- A **minimap** appears bottom-right whenever part of the graph is off screen.
- Where you leave the map — positions and zoom — is remembered per org in your browser.

**Keyboard**: `1`–`8` switch tabs · `Space`/`P` pause the stream · `+`/`−` zoom · `F` fit · `0` reset · arrows pan · `Tab`/`]`/`[` cycle agents · `Esc` closes help, then search, then the selection, then leaves · `?` lists all of this.

**Large orgs**: the map caps at 500 nodes and says so in the title (`truncated`, with the real total). Below 0.75× zoom only the selected node, its neighbours and search matches keep labels; below 0.5× agents draw as plain discs. Labels never overprint — the important ones claim their space first.

## Overview

The **Overview** tab (`5`, or the sidebar's *Activity* entry) is the whole system on one
screen, from a single call to `GET /v1/org/overview?hours=…` (1 h to 7 d):

- **Needs attention** — open threats, approvals waiting (and older than 24 h), consensus
  decisions pending, parked automation runs, automations whose last run failed, runtimes in
  error, auto-suspended agents, secrets expiring within 7 days, active agents with no access
  policy, agents idle 7+ days. Each line links to where you act on it.
- **Activity** for the window — API requests, secret reads/writes, denials, executions
  (and failures), transactions (and failures), Shroud requests / blocked / redacted /
  injection signals, automation runs (failed, parked), approvals pending/decided, consensus
  pending, risk events and open threats.
- **Inventory** — vaults, secrets, agents (active / total / children), access policies,
  runtimes (running / total), automations (active / total), execution bindings, wallets and
  agent keys, platform apps and connections, team members.
- **Spend** for the window — inference (USD and tokens), execution and automation cost, credit
  balance and plan.
- **7-day trend** — audit events, denials, Shroud requests and blocks, automation runs,
  transactions per day.

The former *Activity* pages are tabs here too: **Shroud** (per-request Shroud activity with
filters and CSV export, `6`), **Risk** (risk-engine events, `7`) and **Audit** (the audit log,
`8`). `/platform-activity/*` redirects to the matching tab; `?view=` on `/dashboard` deep-links
to any tab.

## Threats

The durable threat register: one row per open finding, **ranked by blast radius** (vaults + connectors + chains the affected agent can reach), then recency — so the row to look at first is first.

| Class | Producer | Fires when |
|-------|----------|-----------|
| `trust_breach` | trust engine | An agent's score drops below 50; resolves when it climbs back to 65 (hysteresis, so a score oscillating around the line does not flap). |
| `policy_breach` | vault policy denials | 5 or more denials by one agent in five minutes. Twice that is `critical`. |
| `prompt_injection` | Shroud inspection | Injection score ≥ 0.7 on the agent's LLM traffic; three or more hits is `critical`. |
| `key_exfil` | Shroud inspection | A secret or key pattern in an outbound LLM request. |

`shadow: true` marks a finding produced while the trust engine is in **recommend-only** mode: it is shown, it is ranked, and nothing has acted on it. Auto-suspension on breach is a deliberate later switch, not a flag you can flip by accident.

## Metrics and flows

**Metrics** buckets executions, policy denials, transactions and LLM calls over a window (`1h` to `30d`; steps widen automatically past 500 buckets).

**Flows** is a Sankey of who *actually read* from which vault — counted from `secret.read` audit events, agent actors only — as opposed to the topology, which shows who *could*. Ribbon width is real reads.

## Live stream

The right column (the **Live** tab on a phone) is the org's signal stream: spans for policy evaluation, secret reads, intent execution, transaction signing, approval decisions and content inspection, plus KPIs derived from the last hour. It is Server-Sent Events with `Last-Event-ID` resume; if the server cannot resume (the cursor fell out of its buffer, or a noisy org lagged the subscriber) you get a **Signals missed** card and a one-click topology refresh rather than a silent hole.

Attributes are redacted at the source (`redact_sensitive`, critical-severity PII rules only) before a signal is ever buffered, so nothing on this screen can show a secret value.

## Trust scores

Every agent gets a continuous 0–100 behavioural score, recomputed every 30 seconds from grouped per-org queries (never per agent). Components and weights:

| Component | Weight | Source today |
|-----------|-------:|--------------|
| Policy denial rate | 25 | vault + execution denials vs evaluations |
| Threat hits | 20 | open `otel_threats` |
| Egress blocks | 15 | Shroud blocks |
| Spend velocity | 15 | ratio against the agent's own 7-day baseline; no baseline scores neutral |
| Off-hours activity | 10 | *not measured yet* |
| Consensus bypass | 15 | *not measured yet* |

Unmeasured components drop out of the weighted average rather than scoring zero — a fresh deployment must not show every agent as untrusted on day one. History is kept for 30 days and only written when the score moves (or hourly on a flat line), so the sparkline is real and the table stays small.

## Export (Team tier)

Settings → Telemetry lets a Team org fan the same signals out to its own collector over **OTLP/HTTP JSON** (`PATCH /v1/org/settings/otel-export`, with a `/test` endpoint rate-limited to 5/min). The collector URL is validated against private ranges *after* DNS resolution and pinned, and custom headers are stored envelope-encrypted.

## API

Everything on the screen is the public API; see the [API reference](/docs/reference/api-reference#control-plane-telemetry) and `client.otel` in the [JavaScript SDK](/docs/sdks/javascript).

## Platform apps

A platform app cannot read an org — the end-user's org may hold agents from other platforms. It can read **its own connections'** agents through `GET /v1/platform/connections/{id}/otel/{topology,threats,summary,stream}`, documented under [Platform API → Connection-scoped operations](/docs/platform-api/overview#observe-the-connections-agents).
