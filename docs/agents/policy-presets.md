---
title: "Policy presets"
description: Four plain-language presets that compile to guardrails, access policies and approval rules — and, on Team+, to reviewable Cedar.
sidebar_position: 12
---

# Policy presets

Most people configuring an agent are not writing policy. They are answering one
question: *what should this thing be allowed to do?*

A preset answers it in a sentence, then compiles to the same guardrail columns,
access policies and approval rules you would have written by hand.

```bash
curl https://api.1claw.co/v1/policy-presets
```

| Preset | The sentence |
| --- | --- |
| `read-only-assistant` | Nothing this agent does can cost you money. |
| `small-business-spender` | Up to $100 a day. Anything over $25 asks you first. |
| `inbox-agent` | It can draft. You approve before anything is sent. |
| `treasury-operator` | Every payment over $250 needs a second approver. |

## Preview before you apply

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT/policy-preset/preview \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"preset":"small-business-spender"}'
```

The response names every field the preset would **widen** — loosen relative to
what the agent can already do:

```json
{
  "widens": ["tx_daily_limit", "intents_api_enabled"],
  "requires_guardrail_approval": true,
  "explanation": "… This would loosen: tx_daily_limit, intents_api_enabled. Loosening a guardrail goes through approval, the same as editing one by hand."
}
```

Show that list rather than a generic warning. "This raises your daily limit from
$10 to $100" is actionable; "this widens guardrails" is not.

Preview changes nothing.

## A preset is not a way around approval

Applying a preset that loosens a guardrail returns **202** (queued for approval)
or **403** (step-up required) — never a silent 200.

This is deliberate and it is the whole design. A preset builds the same
`UpdateAgentRequest` a person editing the agent by hand would send and passes it
to the same handler, which means the same widening classification, the same
approval queue, the same step-up. A wizard that wrote guardrail columns directly
would be a way around that flow wearing a friendlier interface.

Narrowing applies immediately. Widening does not.

**Human users only.** An agent that could apply a preset to itself could widen
its own limits.

## Cedar export (Team+)

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT/policy-preset/cedar \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"preset":"treasury-operator"}'
```

Returns the Cedar text the preset compiles to, already validated against the
deployed schema. Read-only — it creates no policy.

```json
{
  "cedar": "// Generated from the `treasury-operator` policy preset.\n…",
  "residual_guardrails": [
    "daily spend cap $5000 (USD — guardrail)",
    "human approval above $250 (USD — guardrail)"
  ],
  "enforcement_mode": "shadow"
}
```

### The Cedar is not the whole policy

Presets state limits in **dollars**. The Cedar schema exposes transaction value
only as `value_gwei`, a native-token amount. Converting needs a live price, and
a price written into a policy is wrong the moment it is written and stays wrong
silently.

So the compiler does not convert. The USD limits come back in
`residual_guardrails` and stay enforced by the guardrail columns, where a live
price is applied at evaluation time. They are also repeated as a comment block
inside the Cedar itself.

**Render `residual_guardrails` next to the text.** A generated policy shown
alone reads as complete while permitting every amount.

### Shadow first

Policies created from an export start in **shadow** mode: they report what they
would decide without deciding it, until someone promotes them. Dry-run one with
`POST /v1/org/cedar-policies/test`.

## Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/v1/policy-presets` | Any |
| `POST` | `/v1/agents/{agent_id}/policy-preset/preview` | Human |
| `POST` | `/v1/agents/{agent_id}/policy-preset` | Human |
| `POST` | `/v1/agents/{agent_id}/policy-preset/cedar` | Human |
