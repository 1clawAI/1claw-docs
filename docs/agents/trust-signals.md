---
title: "Trust signals"
description: Public trust badges, reviews and reports on listed agents — and the limits that keep them from being gamed.
sidebar_position: 14
---

# Trust signals

A public listing in the agent directory carries trust signals so someone
deciding whether to use an agent has something to go on.

```bash
curl https://api.1claw.co/v1/agents/$AGENT/trust
```

```json
{
  "badges": ["verified_publisher", "popular"],
  "rating": 4.6,
  "review_count": 23,
  "flagged_for_review": false
}
```

## What is deliberately absent

The public view carries **no reviewer notes and no report reasons**. Those are
queue-internal. Publishing them would publish accusations about an agent's
owner, from parties with no accountability.

## Reviews

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT/review \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rating":5,"comment":"Reliable"}'
```

Ratings are `1..=5`; anything outside is refused. **One review per person per
agent** — reviewing again replaces your previous one. Without that constraint an
average rating is whatever the most persistent reviewer wants it to be.

**Human users only.** An agent rating another agent is a way to manufacture
reputation at machine speed.

## Reports

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT/report \
  -H "Authorization: Bearer $TOKEN" -d '{"reason":"spam"}'
```

**One report per person per agent**, on the same reasoning as reviews. Reporting
again is idempotent rather than an error.

Reports are counted from distinct reporters. Past a threshold a listing is
flagged and its badges are withheld pending review — which is why the
one-per-person constraint matters: without it a single account could strip every
badge off any listing by clicking three times.

A flag is **clearable**. A moderator dismissal returns the count to zero. A
permanent, unappealable state set by a handful of anonymous clicks would be
worse than no flag at all.

## Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/v1/agents/{agent_id}/trust` | Public |
| `POST` | `/v1/agents/{agent_id}/review` | Human |
| `POST` | `/v1/agents/{agent_id}/report` | Human |
