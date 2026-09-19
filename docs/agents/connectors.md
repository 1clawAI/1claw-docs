---
title: Connectors
description: One-click Gmail, Slack, GitHub, Notion and Discord access for an agent — a scoped binding plus the OAuth flow, in a single call.
sidebar_position: 46
---

# Connectors

Giving an agent access to Gmail used to be four steps: register OAuth app
credentials, create an HTTP binding with the right base URL, work out which
hosts and paths to allow, and start an OAuth flow with the right scopes. A
connector is those four steps as one call, with the last three already decided.

## The catalogue

```bash
curl -s https://api.1claw.co/v1/connectors/presets | jq '.presets[] | {slug, display_name, oauth_scopes}'
```

Public — this describes what 1Claw supports, not anything belonging to you.

| Preset | Provider | Reaches |
|---|---|---|
| `gmail` | Google | `gmail.googleapis.com/gmail/v1/` |
| `google-calendar` | Google | `www.googleapis.com/calendar/v3/` |
| `github` | GitHub | `api.github.com` |
| `slack` | Slack | `slack.com/api/` |
| `x` | X | `api.x.com/2/` |
| `discord` | Discord | `discord.com/api/` |
| `notion` | Notion | `api.notion.com/v1/` |
| `google-sheets` | Google | `sheets.googleapis.com/v4/spreadsheets` |
| `google-drive` | Google | `www.googleapis.com/drive/v3/`, `/upload/drive/v3/` (`drive.file` + `drive.readonly`) |
| `google-business` | Google | `mybusiness*.googleapis.com` (`business.manage`) |
| `stripe` | Stripe (Connect) | `api.stripe.com/v1/`, `files.stripe.com` (`read_only`, optionally `read_write`) |
| `hubspot` | HubSpot | `api.hubapi.com/crm/v3/`, `/crm/v4/` |
| `linkedin` | LinkedIn | `api.linkedin.com/v2/`, `/rest/` (`w_member_social` needs Marketing Developer Platform approval) |
| `honcho` | — (API key) | `demo.honcho.dev`, `api.honcho.dev` |
| `api-token` | — (pasted bearer token) | the one HTTPS host you name at install |

### Any HTTPS API with a pasted token

`api-token` is the generic "paste a token" connector: you name the host and paste the bearer token at install, the token is stored in the vault, and the binding is pinned to that host — so pasting a token never means pasting it into a third-party app's env file.

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/connectors/api-token/install" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"binding_name":"acme","host":"api.acme.example","token":"acme_live_…"}'
```

`host` is a bare hostname and goes through the same rules as every binding URL (no private, loopback, link-local, metadata or `.internal` hosts). `token` is optional — omit it and set the credential later with `PATCH …/bindings/{id}`. Every other preset pins its own host and refuses `host`/`token`.

## Installing one

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/connectors/gmail/install" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"redirect_after": "/agents/'"$AGENT_ID"'"}'
```

```json
{
  "binding_id": "…",
  "binding_name": "gmail",
  "preset_slug": "gmail",
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?…",
  "next_step": "Open authorization_url to connect a Gmail account. The binding is not usable until that completes."
}
```

Send the user to `authorization_url`. **Human users only** — installing gives an
agent reach into a third-party account, and the flow it starts is a person's
browser. An agent calling this for itself gets a 403.

:::note Installed is not connected
A `201` means the binding exists. It holds no credential until the user finishes
the OAuth round trip, and an execute against it will fail until they do.
`GET /v1/agents/{id}/connectors` reports `connected` separately from installed,
and `needs_reauth` when a stored token has since been rejected.
:::

## What you get

The binding an install creates is scoped to the connector:

```json
{
  "config":     { "base_url": "https://gmail.googleapis.com", "auth_type": "bearer" },
  "guardrails": { "allowed_hosts": ["gmail.googleapis.com"], "allowed_paths": ["/gmail/v1/"] }
}
```

That is the difference between a connector and a bare OAuth connection. An HTTP
binding with no `allowed_hosts` has no host restriction — so a binding holding a
user's Google token could be pointed anywhere. A connector's cannot.

Guardrails are yours to widen afterwards if you need a broader surface. Widening
them is a guardrail edit and is treated as one.

## Scopes

By default an install requests the preset's scopes. You can ask for fewer:

```json
{ "scopes": ["https://www.googleapis.com/auth/gmail.readonly"] }
```

You cannot ask for more. A scope outside the preset is a `400`, as is dropping
one the preset marks required — the reviewed scope list is what makes a
one-click install different from a general OAuth initiator.

## Two connectors on one provider

Gmail and Google Calendar are both Google. Installing both gives you two
bindings, `gmail` and `google-calendar`, each with its own token and its own
paths — not one binding whose configuration the second install overwrote. Pass
`binding_name` if you want to run two of the same connector against different
accounts.

## SDK

```typescript
const { data } = await client.connectors.listPresets();

const install = await client.connectors.install(agentId, "slack", {
  scopes: ["chat:write"],
  redirect_after: `/agents/${agentId}`,
});
window.location.href = install.data.authorization_url!;

// Polled event source → automation events (vault ≥ 0.61.32)
const sub = await client.connectors.subscribe(agentId, {
  binding_id: install.data.binding_id,
  event_type: "gmail.message.received",
});
await client.connectors.pollNow(agentId, sub.data!.id); // first poll primes, emits nothing
```

```python
client.connectors.install(agent_id, "stripe")
client.connectors.subscribe(agent_id, binding_id, "stripe.invoice.created", interval_secs=120)
client.connectors.list_subscriptions(agent_id)
```

```bash
1claw connector install <agent-id> api-token --name crm --host api.example.com --token $TOKEN
1claw connector subscribe <agent-id> <binding-id> gmail.message.received
1claw connector subscriptions <agent-id>
```

## Event sources

Some connectors advertise `event_sources` in the catalogue — list endpoints
1Claw can poll on your behalf and turn into automation events (`gmail.message.received`,
`stripe.invoice.created`, `drive.file.changed`, …). Subscribe an installed
binding with `POST /v1/agents/{agent_id}/event-subscriptions` (`connectors.subscribe`
in the SDK) and trigger an automation on the event type. See
[Automations → Connector events](/docs/automations/overview#connector-events-polled).

## MCP

`list_connector_presets`, `list_installed_connectors` and `list_event_subscriptions` let an
agent see what exists, what it has, and which event sources it is subscribed to. There is no
install or subscribe tool: those stay human actions.

## Prerequisites

Each OAuth connector needs your organisation's own app credentials for that
provider, registered once at
`POST /v1/agents/{agent_id}/oauth/app-credentials`. Without them the install
returns a `400` naming the provider.
