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
| `honcho` | — (API key) | `demo.honcho.dev`, `api.honcho.dev` |

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
```

## MCP

`list_connector_presets` and `list_installed_connectors` let an agent see what
exists and what it has. There is no install tool: that stays a human action.

## Prerequisites

Each OAuth connector needs your organisation's own app credentials for that
provider, registered once at
`POST /v1/agents/{agent_id}/oauth/app-credentials`. Without them the install
returns a `400` naming the provider.
