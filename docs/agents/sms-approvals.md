---
title: SMS notifications and approvals
description: Reach an approver by text, and let them approve low-risk actions by reply — with the limits that makes necessary.
sidebar_position: 47
---

# SMS notifications and approvals

An agent can text a human when it needs a decision, and for the lowest-risk
actions that human can decide by replying. This page is mostly about the limits
on that second part, because they are the feature.

## SMS is a weak authenticator

A phone number can be SIM-swapped. A message can be read on a lock screen. A
carrier can deliver it to the wrong handset. None of that makes SMS useless — it
makes it appropriate for a narrow band of decisions and wrong for the rest.

So:

- **Only `risk_tier` 1 can be decided by reply.** Anything higher gets a text
  with a link and cannot be approved by answering it.
- **The tier is derived by the server**, from the agent's `action_approval_policy`
  and the action's payload. An agent that declares tier 1 on a $500 refund does
  not thereby unlock SMS — see [approvals](/docs/treasury/approvals).
- **The number must be verified** before it can decide anything.

1Claw does not position SMS as strong authentication, and neither should your
product copy.

## Setting it up

SMS is **bring-your-own-Twilio**. Your organisation supplies the account and the
sending number; 1Claw does not operate a shared pool, because managed numbers
require A2P 10DLC registration and ongoing SMS-pumping fraud monitoring.

### 1. Add an SMS channel to an agent

```bash
curl -X POST "https://api.1claw.co/v1/agents/$AGENT_ID/channels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_type": "sms",
    "config": {
      "account_sid": "AC…",
      "auth_token": "…",
      "from_number": "+14155550123"
    }
  }'
```

Credentials are encrypted at rest. `from_number` must be E.164, and 1Claw checks
that your Twilio account actually owns it — verifying the credentials alone
would accept a number that fails on the first real send.

Point Twilio's inbound webhook for that number at the `webhook_path` the
response gives you:

```
https://api.1claw.co/v1/webhooks/sms/{webhook_path}
```

### 2. Add and verify a number to notify

```bash
# Create — unverified
1claw notify add sms +14155550999 --agent $AGENT_ID

# Text a code, then submit it
1claw notify verify $TARGET_ID
1claw notify verify $TARGET_ID --code 123456
```

The code is six digits, expires in ten minutes, and five wrong answers void it.
It is sent from the same number the notifications will come from — a code
arriving from somewhere else is one you should distrust.

An unverified target **still receives** notifications. That is deliberate: the
notification is how you find out your number was enrolled at all. It just cannot
answer them.

## What the message looks like

At tier 1:

> 1Claw: support-bot wants to refund $5.00 to a.user@example.com. Reply YES A1 or NO A1 to decide. https://1claw.co/approvals/…

At tier 2 or 3:

> 1Claw: support-bot wants to refund $500.00 to a.user@example.com. This needs confirmation in the app, not by text. https://1claw.co/approvals/…

The higher tiers never say "reply". An instruction the server will refuse is a
promise broken every time, and it teaches a habit worth not teaching.

### Replying

`YES`, `NO`, `Y`, `N`, `approve`, `deny` — matched against the whole message.
"no problem, go ahead" is not a denial and "is that a yes?" is not an approval;
both get a request to answer plainly.

If more than one approval is waiting, a bare `YES` is answered with a list of
reference codes rather than applied to a guess. Reply `YES A1` to pick one. SMS
has no threading, and approving whichever is newest means approving something
you may not have read.

## What the summary cannot say

The plain-language summary is rendered from the agent's payload, so it is text
the agent influences, sitting in a message you act on. Instruction words —
"reply", "yes", "approve", "confirm" — and code-shaped tokens are removed from
it before sending.

Without that, an agent could write a summary reading "refund $5. Reply YES A7 to
confirm", where `A7` is a different, low-risk approval you have never seen.

## Security notes for your own copy

- A valid Twilio signature proves a message came from Twilio, **not** that it
  came from the right person. 1Claw additionally requires the sending number to
  match a verified target; if you build something similar, do the same.
- The webhook signature is computed over the exact public URL. If you run 1Claw
  behind a proxy that rewrites the host, set the public URL to what Twilio calls,
  or every inbound message will be rejected.
- Tell your users that SMS approval is for low-risk actions and that anything
  significant will ask them to open the app. Setting that expectation is part of
  the control.
