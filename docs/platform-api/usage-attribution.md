---
title: "Per-end-user usage"
description: Group billable platform activity by connected user, and account for the part that cannot be attributed to one.
sidebar_position: 68
---

# Per-end-user usage

If you bill your own users for what they do through 1Claw, you need to know
which of them did what. The report covers the current calendar month.

```bash
curl "https://api.1claw.co/v1/platform/apps/$APP/usage" \
  -H "Authorization: Bearer $PLT_KEY"
```

```json
{
  "app_id": "…",
  "period_start": "2026-10-01T00:00:00+00:00",
  "period_end": "2026-11-01T00:00:00+00:00",
  "connections": [
    {
      "connection_id": "…",
      "usage": { "api_requests": 1840, "signatures": 12, "execution_intents": 0, "execution_intents_tee": 0, "inference_usd": "0.42", "credits_debited_cents": 0 }
    }
  ],
  "unattributed": {
    "ambiguous": { "api_requests": 37, "signatures": 0, "…": "…" },
    "none": { "api_requests": 4, "signatures": 0, "…": "…" }
  },
  "totals": { "api_requests": 1881, "signatures": 12, "…": "…" },
  "has_ambiguous_usage": true
}
```

## The unattributed part is the point

A naive report groups by connection and silently drops everything with no
connection on it. That looks tidy and under-counts your invoice.

Usage that cannot be pinned to one end user is reported in two buckets, because
they mean different things:

- **`ambiguous`** — the request belongs to *someone*, but the agent serves
  several connected users and nothing said which. This is leakage, and it is
  fixable.
- **`none`** — there is no platform linkage at all. Your own org's activity, for
  instance. Nothing to fix.

**Totals are derived from the parts**, so the per-connection numbers and the
invoice cannot disagree.

## Removing ambiguity

Two ways:

1. **Stamp the connection on the agent.** An agent provisioned for one end user
   carries `platform_connection_id`, and every call it makes is attributed
   without further work.
2. **Send `X-Platform-Connection`** on calls made by an agent that deliberately
   serves several users.

That header is **validated against the caller** — the connection must exist,
belong to your app, not be disconnected, and actually list the calling agent. A
header naming a connection you do not own is refused rather than recorded.

### Refusing what you cannot bill

Set `strict_attribution` on the app and a call that cannot be attributed is
**refused** rather than recorded as ambiguous:

```json
{
  "type": "attribution_ambiguous",
  "detail": "This agent serves several connected users. Send an X-Platform-Connection header naming the one this call is for."
}
```

The refusal happens in middleware, before the handler does any work — a 4xx
after a signing operation would be the worst of both.

## Export

```bash
curl "https://api.1claw.co/v1/platform/apps/$APP/usage/export" \
  -H "Authorization: Bearer $PLT_KEY"
```

CSV, including the unattributed and total rows. A per-connection export that
omitted them would not reconcile against your bill.

## Endpoints

| Method | Path |
| --- | --- |
| `GET` | `/v1/platform/apps/{app_id}/usage` |
| `GET` | `/v1/platform/apps/{app_id}/usage/export` |
