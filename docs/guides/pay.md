---
title: Paying x402 paywalls
description: 1claw pay — let an agent pay for a gated resource, under a passkey or a capped spending grant, with the vault deciding what may be signed.
sidebar_position: 7
---

# `1claw pay`

The [x402 guide](./x402.md) covers being on the receiving end of a 402 — paying
1Claw for overages. This is the other direction: your agent hits somebody else's
paywall and needs to pay it.

```bash
1claw pay --agent research-bot https://api.example.com/premium
```

```
  402 │ $0.001 → 0x2B62…8Abc
  Authorize: https://1claw.co/cli/pay-authorize?session=…
  ✔ Authorized
  signed │ $0.001
  200 │ paid
```

## What holds the money still

The CLI holds the network connection and nothing else. It sends the vault the
exact bytes the paywall served; the vault decides what may be signed, what you
are shown, and what the daily ledger says.

That division is the whole design:

- **The digest binds the transfer, not the ceiling.** An x402 challenge's
  `maxAmountRequired` is what the origin will accept. What leaves the wallet may
  be less, and it is that value the digest and the authorize page bind — so what
  you approve and what gets signed cannot drift apart.
- **The raw challenge is the preimage.** The CLI never parses the 402 into
  fields and sends those; anything reinterpreted first would fall outside what
  you actually approved.
- **Keys never leave the vault.** You get an `X-PAYMENT` header back, never key
  material.

## Turning it on

Pay is off until a human turns it on, and an agent cannot turn it on for itself.

```bash
curl -X PATCH https://api.1claw.co/v1/agents/$AGENT_ID/pay/settings \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pay_enabled": true,
    "pay_max_usd": "1.00",
    "pay_daily_limit_usd": "10.00"
  }'
```

The agent also needs an Ethereum signing key funded with USDC on Base:

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT_ID/signing-keys \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chain": "ethereum"}'
```

## The three modes

`--mode` is a **request**. The vault honours it only where the agent's own policy
already allows it.

| Mode | What it asks for |
|---|---|
| `strict` (default) | A passkey touch for each payment. |
| `session` | One touch creates a capped, time-bounded grant; payments inside it need no further prompt. |
| `auto` | No ceremony. Only reachable for an agent explicitly configured to run unattended. |

### When each is allowed

`pay_require_passkey` defaults to **true**, and while it is true every payment
needs a human touch. An allowlisted recipient does **not** bypass that — the
allowlist only widens which recipients a grant may cover.

| `pay_require_passkey` | `payTo` allowlisted | Requested | Result |
|---|---|---|---|
| true | either | `strict` | Passkey for this payment |
| true | either | `session` | Passkey creates a grant |
| true | either | `auto` | Refused as auto; degraded to the ceremony the agent is configured for |
| false | yes | any | Signed if under caps |
| false | no | any | **Denied** — unattended and unlisted |

An agent with `pay_require_passkey: false` and no allowlist pays nobody. A null
allowlist is not a wildcard; for an unattended agent it means no one.

## Spending grants

A grant is "allow this agent to spend up to $5 for 15 minutes". It is created by
a human, over a passkey assertion covering exactly those terms, and it cannot
exceed the agent's own `pay_grant_max_usd` or `pay_grant_max_ttl_secs` — a grant
is a delegation inside limits already set, never a way around them.

```bash
1claw pay --mode session --agent research-bot https://api.example.com/premium
```

The cap is decremented as payments are signed, in a single guarded statement, so
two concurrent payments cannot both spend the last dollar. Revoke early:

```bash
curl -X DELETE https://api.1claw.co/v1/pay-grants/$GRANT_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Limits are charged at signing

A payment counts against `pay_daily_limit_usd` the moment it is **signed**, not
when it settles. A signature that was produced and then lost still consumed
authority — the paywall may yet present it.

Reporting a failure afterwards does not give the headroom back. The response says
so explicitly:

```json
{ "recorded": "signed_failed", "limit_released": false }
```

Only a vault-verified reconciliation can return headroom, and that is not built
yet. "The payment failed, let me spend again" is the one claim a client must not
be able to make.

## When the challenge window closes

Many paywalls give you seconds. If the window closes before you authorize, the
CLI **re-fetches** the resource for a fresh 402 rather than re-using the one it
has — the stored bytes would reproduce the same closed window, and many
challenges carry a single-use nonce.

It tries twice, then stops:

```
The paywall's challenge window closed 2 times before the payment could be authorized.
Its window is likely too short for a per-payment approval. Try again, or use a
spending grant (--mode session) so payments inside the window need no prompt.
```

`prepare` also flags a window under 30 seconds up front, so you know before you
open the authorize page.

## Trying it without spending anything

The [`x402-pay-cli` example](https://github.com/1clawAI/examples/tree/main/x402-pay-cli)
runs a mock paywall locally:

```bash
node paywall.mjs &
ONECLAW_PAY_DEV=1 1claw pay --agent any http://localhost:4022/premium
```

The dev signer never contacts the vault and produces a header no paywall would
honour — it exercises the flow without ever being mistakable for a real payment.

## Limits today

- **Base USDC only.** Another asset is refused rather than converted: the daily
  limit is denominated in USD, and a guessed rate would put a fabricated number
  both in front of you and into the ledger.
- **Signing happens in the vault**, not yet in the Shroud TEE.
- **No reconciliation**, so limit headroom is never returned automatically.

## Endpoints

| Endpoint | Who |
|---|---|
| `POST /v1/agents/{id}/pay/prepare` | Agent or human |
| `POST /v1/agents/{id}/pay/sign` | Agent or human, plus authorization |
| `POST /v1/agents/{id}/pay/{payment_id}/result` | Agent or human |
| `GET /v1/agents/{id}/pay/{payment_id}` | Agent or human |
| `PATCH /v1/agents/{id}/pay/settings` | **Human only** |
| `POST /v1/agents/{id}/pay/grants` | **Human only**, plus a passkey assertion |
| `GET /v1/pay-sessions/{id}` | **The human it was raised for** |
| `POST /v1/pay-sessions/{id}/authorize` | **The human it was raised for** |
| `DELETE /v1/pay-grants/{id}` | **Human only** |

A pay session is readable only by the person who must authorize it — not an
agent, and not another member of the same org. The response decides whether a
payment may be signed, and a session id is not authorization.
