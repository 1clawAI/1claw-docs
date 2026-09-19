---
title: Meta Muse
description: Approve what your agents are asking for, and see what they did, from Meta's Muse assistant — via the 1Claw Muse connector.
sidebar_position: 45
---

# Meta Muse

[Muse](https://muse.ai) is Meta's personal AI assistant. It can add services as
**Custom Connectors**: you tell Muse about a service's API and give it a credential, and Muse
stores that credential and calls the API on your behalf.

1Claw ships a connector built for exactly that: a small, read-and-decide API at
`https://muse.1claw.co` in front of your 1Claw account, so you can ask Muse things like:

- "Is anything waiting on me in 1Claw?"
- "Approve the payment my trading agent asked for" / "No — reject it, we're over budget."
- "How much is in my agents' wallets?"
- "What did my agents do today?"

Muse **cannot** read your secrets, move funds, or create or change an agent through this
connector. Those stay in the dashboard.

## Connect (once)

1. Signed in to 1Claw, open **[1claw.co/connect/muse](https://1claw.co/connect/muse)** and click
   **Connect Muse**. The first time, 1Claw asks you to confirm linking the Muse app.
2. Under **Settings → Connected apps → Muse**, grant the **agents** Muse may see. A connection with
   no grants shows Muse nothing — that is the whole permission model.
3. Copy the connector token (`mcn_…`; shown once). In Muse, ask to add a custom connector for
   1Claw and give it:
   - Base URL: `https://muse.1claw.co`
   - API description: `https://muse.1claw.co/openapi.json`
   - Credential: the token, as a Bearer token

Revoke any time: **Settings → Connected apps → Muse → Disconnect**. The token stops working on the
next request.

## What Muse can call

| Route | What it returns |
|---|---|
| `GET /v1/me` | Which account, and what Muse has been granted |
| `GET /v1/approvals` | Everything waiting on you — consensus approvals and agent action requests in one list, each with a one-line summary |
| `GET /v1/approvals/{id}` | Full details of one |
| `POST /v1/approvals/{id}/decide` | `{ "decision": "approve" \| "reject", "reason"? }` — the only write. One item per decision |
| `GET /v1/portfolio`, `GET /v1/balances` | Wallets on the granted agents |
| `GET /v1/automations` | The agents' scheduled and event-driven jobs |
| `GET /v1/activity` | Recent delegated actions |

Errors are RFC 9457 problem JSON; a `401` means the token expired or Muse was disconnected.

## How it is secured

- The token is an HMAC-signed statement naming one platform connection on the 1Claw-owned
  **Muse** platform app. It is not a 1Claw account credential (the `mcn_` prefix is unknown to the
  vault), and the connector's own platform key never leaves the service.
- Every call is a [Platform API](/docs/platform-api/overview) call scoped to your connection, so
  your grants, each agent's guardrails, the sanctions screen and the audit log apply unchanged.
  Decisions are recorded in your audit log as you, via the Muse app.
- Consensus decisions bind to what was shown: the connector echoes the approval's `payload_hash`
  it read, never one supplied in the request.
- The connector is stateless and stores nothing about you. Source:
  [github.com/1clawAI/muse-connector](https://github.com/1clawAI/muse-connector) (Apache-2.0).
