---
title: Browser Bridge
description: Let an agent log into a website without ever giving it the password.
---

# Browser Bridge

An agent needs to log into a site. The obvious way is to hand it the password
and hope. The Browser Bridge is the other way: the agent drives the browser,
asks *which* credential to use, and the bridge types it. The value never enters
the agent's context, its logs, or its model provider's.

The client is open source — [`1clawAI/browser-bridge`](https://github.com/1clawAI/browser-bridge),
Apache-2.0, published as `@1claw/browser-bridge`.

## Where this sits

It is not an alternative to Playwright, Puppeteer, browser-use, Stagehand or
Anthropic's Computer Use. Those answer *how does the agent drive*. This answers
*how does a credential get used without the agent holding it* — which they
leave to you.

| | Computer Use | browser-use | Browser Bridge |
|---|---|---|---|
| Who types the password | the model, as an action it chose | the library, from a value your code supplied | a separate process the agent cannot read from |
| Where the value lives | in the action stream, so in the model's context | in the agent process (`sensitive_data` keeps it out of the *prompt*) | only in the bridge, wrapped and zeroed after use |
| Under prompt injection | can be told to read the field back | can be told to submit what it holds somewhere else | can ask for a fill; cannot choose the page, read the field, or collect the value |

browser-use is Playwright-based, so it connects to the bridge unchanged. Stock
Puppeteer and Playwright clients do too.

## How fast

A full lifecycle against a live third-party site — create the account, sign in,
capture the API key the site issues, and make a real request with it. No human
at any step.

| Stage | Time | What happens |
|---|---:|---|
| Provision — register + store password | 2.13s | The bridge signs up, generates the password and stores it |
| Sign in — username + password + submit | 1.14s | The bridge logs in; the agent never sees the password |
| Capture — read + store the API key | 0.80s | The bridge reads the key in a window the agent never lands on |
| Use — request with the key injected | 0.37s | The key is injected; the agent passes only a city name |
| **End to end** | **4.43s** | |

Most of that is opening a fresh page for each credential operation. That cost is
also the control: the typing never happens on a page the agent has scripted, so
a listener it installed earlier has nothing to observe.

## The shape of it

```
agent  ──CDP──▶  bridge  ──HTTPS──▶  vault
                   │
                   └──CDP──▶  Chromium
```

The bridge is the only process attached to Chromium. The agent talks to the
bridge, not to the browser, and every command it sends crosses a gate.

Three separate credentials are involved, and the separation *is* the guarantee:

| Credential | Answers | Held by |
|---|---|---|
| `bb_` device credential | *which machine* | the bridge, from pairing |
| user session | *which person* | the human who paired it |
| agent JWT | *which agent* | the agent |

Collapsing any two lets one stand in for another. That is why authorising a
fill needs the agent's token **and** the bridge's, while redeeming the grant
needs the human's **and** the bridge's — and is refused outright for an agent
principal. The agent asks which binding; it is refused when it tries to collect
the answer.

## Getting started

```bash
npm install -g @1claw/browser-bridge
```

Or work from source — the repo is Apache-2.0 and the demo runs with no account:

```bash
git clone https://github.com/1clawAI/browser-bridge
cd browser-bridge && pnpm install && pnpm build
node packages/browser-bridge/examples/demo.mjs
```

Pair the machine (a human action, behind step-up re-auth):

```bash
1claw browser pair laptop --public-key "<bridge public key>"
```

Or against the API directly:

```bash
curl -X POST https://api.1claw.co/v1/browser/devices \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"laptop","public_key_pin":"<bridge public key>"}'
```

The `bb_` credential comes back once and is never returned again.

Define a binding — which secret may be typed, and where:

```bash
curl -X POST https://api.1claw.co/v1/browser/credentials \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acme-login",
    "vault_id": "<vault>",
    "secret_path": "acme/password",
    "login_url": "https://app.acme.example/login",
    "allowed_hosts": ["app.acme.example"]
  }'
```

Hosts are matched **exactly**. A wildcard is refused at creation rather than
stored, because a stored `*.example.com` would match nothing while looking
permissive.

Then point your framework at the bridge:

```js
await puppeteer.connect({ browserWSEndpoint: bridge.url });
await chromium.connectOverCDP(bridge.url);
```

Stock Puppeteer and Playwright clients work, and so do the agent frameworks
built on them.

## What the gate refuses

- **`Runtime.evaluate` during a fill.** The whole target is blocked while a
  credential is being typed, not just the field — and the fill happens on a
  page the agent has never had a session on, so a listener installed earlier
  has nothing to observe.
- **Another agent's pages.** Each client gets its own Chromium browser context.
  `Target.getTargets` is narrowed to the caller's own pages, and attaching to
  someone else's is refused even with the id in hand.
- **Response bodies.** `Network.getResponseBody` and the events carrying raw
  headers are not forwarded — filtering a response after the fact does not
  help when the side effect *is* the exfiltration.

## Authorising a fill

The bridge asks the vault whether this fill is allowed, on this page, right
now. The request carries what the vault needs to decide:

```json
{
  "session_id": "...",
  "binding_id": "...",
  "tab_origin": "https://app.acme.example",
  "frame_origin": "https://app.acme.example",
  "form_action_origin": "https://app.acme.example",
  "frame_id": "...",
  "generation": 7,
  "form_path": "/login",
  "field_names": ["username", "password"],
  "redirect_chain": ["sso.acme.example"],
  "current_generation": 7
}
```

:::warning All four of the last fields are required

`form_path`, `field_names`, `redirect_chain` and `current_generation` are not
optional. A request missing any of them is refused with a `400` naming them.

Send `current_generation` as the generation you observe **now**, and
`generation` as the one the request was decided against. Sending the same value
for both makes the staleness check compare a value to itself — which is exactly
the bug that made it useless before these fields were required.
:::

The vault answers with a grant, a denial and a reason, or a pending approval.
A grant is single-use, lives 60 seconds, is refused if the page navigated in
the meantime, and is capped at five fills per binding per ten minutes.

## Losing a laptop

List what is paired, and revoke it:

```bash
1claw browser devices          # revoked ones are listed too
1claw browser revoke <device-id>
```

Revoked devices stay in the list rather than disappearing, because "was this
machine ever paired" is the question people ask after a laptop goes missing.
Revocation takes effect immediately — a revoked `bb_` opens no sessions and
authorises no fills.
