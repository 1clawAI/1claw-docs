---
title: Peer memory
description: A shared model of one person across the agents serving them — with the limits that makes necessary.
sidebar_position: 48
---

# Peer memory

Several agents serve the same human. Without a shared model, each one learns
that person independently and none of them learns much. A **peer** is that
shared model: what the person has approved, how confidently, and why the system
believes it.

It is also the most sensitive thing an agent can read about someone — and unlike
a secret, it is *derived*, so nobody deliberately granted it. Most of this page
is about that.

## Access is by observer list, and nothing else

An agent may read or write a peer only if it is named in `observer_agent_ids`.

- Being in the same organisation grants nothing.
- Being in the same platform connection grants nothing.
- Holding a broad scope grants nothing.
- **A peer with no observers is readable by no agent at all.**

That last one is deliberate. If an empty list meant "everyone", then forgetting
to set observers would expose someone's behavioural profile to every agent in
the org — the failure would be silent and total. Empty means nobody.

Creating a peer, which decides who observes it, is **human-only**. An agent that
could do it could add itself.

A peer in another organisation returns `404`, the same as an unknown id: whether
one exists elsewhere is not something a caller should be able to learn.

## What gets derived, and how narrowly

v1 derives approval tendencies, and only from a consistent history:

- **Per fingerprint bucket, never per action type.** Three approvals of $5 do
  not become a belief that spans $500. The bucket is `action | amount band |
  new-or-known recipient | recipient`, so those are different beliefs.
- **Three observations minimum.** Two is a coincidence.
- **A mixed history is not a tendency.** Someone who sometimes says no is the
  most important case *not* to record — deciding case by case is the opposite of
  something to automate for.
- **Confidence is capped below certainty.** No number of past decisions makes
  the next one certain, and a `1.0` would read downstream as "no need to check".

## Prediction is not permission

`POST /v1/peers/{id}/predict-approval` returns two things, and they answer
different questions:

```json
{
  "likelihood": 0.83,
  "reasoning": "This person has approved every comparable request so far (6).",
  "suggest_auto": false,
  "blocked_reason": "no_matching_rule"
}
```

`likelihood` is an **observation about a person**.

`suggest_auto` is a **statement about your policy**. It is true only where a rule
you already wrote in `action_approval_policy` would auto-approve this exact case.
A confident model never becomes new authority. It is false, with a reason, when:

| `blocked_reason` | Meaning |
|---|---|
| `no_matching_rule` | Nothing covers this action. An absent rule is not permission. |
| `rule_requires_approval` | You wrote "ask me". That is your answer to this question. |
| `above_configured_threshold` | Your rule allows below an amount; this is above it. |
| `risk_tier_requires_step_up` | The derived tier is above the lowest. |
| `action_is_sensitive` | The action grants or destroys authority. |

The policy consulted is the **calling agent's own**, so a prediction cannot
inherit authority from another agent that happens to observe the same person.

## Why the system believes something

Every fact carries `provenance`. While the underlying events exist, entries name
them. When events pass the 90-day retention window, each entry becomes a
**tombstone** — keeping the kind of event and the decision, dropping the content:

```json
{ "type": "tombstone", "event_type": "approval", "decision": "approved", "at": "…" }
```

The belief outlives its transcript, but never loses its basis. Without this, an
expired event would leave a fact pointing at an id that no longer resolves —
which is precisely what someone asking *"why does this system think that about
me?"* is entitled to an answer for.

**A human correction outranks any inference.** Edit a fact and the processor
will not overwrite it; re-deriving over the top would make the correction look
like it never happened.

## Context for a prompt

```typescript
const { data } = await client.peers.getAgentContext(agentId, 1500);
// data.context is prose, or "" when nothing has been derived
```

Best-supported facts first, so a tight budget drops the least-supported beliefs
rather than an arbitrary tail — and a human-corrected fact is the last thing
cut. It never truncates mid-line: half a sentence about a person is worse than
one fewer sentence. It ends by saying these are observations and not
instructions, because an agent reading it needs to know the difference.

A peer with no derived facts returns an empty string, not a header describing
nobody.

## Platform connections

Bootstrapping a connection provisions its peer automatically, with that
connection's agents as observers. Re-running bootstrap **merges** observers
rather than replacing them, so adding an agent does not revoke the ones already
watching.

MCP exposes `get_peer_context` for agents. Creating peers and changing observers
have no MCP tool — those stay human actions.
