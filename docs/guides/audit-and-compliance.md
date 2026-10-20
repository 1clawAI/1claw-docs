---
title: Audit and compliance
description: 1claw records access and failures in an audit log; query events via GET /v1/audit/events; secret values are never logged.
sidebar_position: 5
---

# Audit and compliance

All API access (and relevant failures) can be recorded in an **audit log**. Secret **values** are never stored in audit events; only metadata (e.g. path, action, actor, timestamp) is recorded.

## Querying audit events

**GET /v1/audit/events** — Returns events for the caller’s organization. Query parameters may include:

- `resource_id` — Filter by resource UUID.
- `actor_id` — Filter by actor (user or agent UUID).
- `action` — Filter by action type.
- `from`, `to` — Time range (ISO 8601).
- `limit`, `offset` — Pagination.

### Example request

```bash
curl "https://api.1claw.co/v1/audit/events?action=secret.read&limit=25" \
  -H "Authorization: Bearer $TOKEN"
```

### Example response

```json
{
  "events": [
    {
      "id": "a7e2c...",
      "org_id": "org-uuid",
      "actor_type": "agent",
      "actor_id": "agent-uuid",
      "action": "secret.read",
      "resource_type": "secret",
      "resource_id": "secret-uuid",
      "metadata": { "vault_id": "vault-uuid", "path": "keys/eth-signer" },
      "timestamp": "2026-02-27T14:00:00Z",
      "request_id": null,
      "prev_event_id": "prev-event-uuid",
      "integrity_hash": "hex..."
    }
  ],
  "count": 1
}
```

Each event includes `id`, `org_id`, `actor_type`, `actor_id`, `action`, `resource_type`, `resource_id`, `metadata`, `timestamp`, `request_id`, `prev_event_id`, and `integrity_hash`. Sensitive keys inside `metadata` (for example `token`, `password`, `api_key`) are returned as `"[REDACTED]"`. `limit` defaults to 50 and is capped at 1000.

## Typical events

- `secret.read`, `secret.write`, `secret.delete`: Secret access (path and actor; no value).
- `policy.denied`: A secret read refused by policy.
- `auth.login`: Human sign-in (no credentials logged).
- `policy.create`, `policy.update`, `policy.delete`: Access policy changes.
- `agent.create`, `agent.update`, `agent.delete`, `agent.tokens_revoked`: Agent lifecycle events.
- `transaction.sign`, `transaction.submit`: Transactions signed or submitted via the Intents API.
- `transaction.guardrail_rejected`: A transaction refused by agent guardrails.

## Tamper-evident hash chain

Every audit event includes a cryptographic hash chain that links it to the previous event:

- `prev_event_id` — UUID of the immediately preceding event in the org's audit log.
- `integrity_hash` — **HMAC-SHA256**, keyed, over `prev_hash`, `org_id`, `actor_type`, `actor_id`, `action`, `metadata` and `timestamp`.

Two things follow from `metadata` being inside the hash. A verifier must read the event's metadata exactly as stored, and a field cannot be edited after the fact without breaking the chain from that event onward. The hash is keyed rather than a plain digest, so the chain cannot be recomputed by someone who has the rows but not the key.

Not covered by the hash: `resource_type`, `resource_id` and `request_id`. They are recorded and returned, but altering them would not break the chain.

This makes the audit log **append-only and tamper-evident**: modifying or deleting any event breaks the hash chain for all subsequent entries. You can verify integrity by walking the chain from the latest event back to the first (`prev_event_id = NULL`).

## Retention

Audit events are **never deleted**. There is no retention window and no expiry job. `DELETE` and `UPDATE` on `audit_events` are rewritten to no-ops by the `no_delete_audit` and `no_update_audit` rules and further blocked by the `audit_events_immutable` trigger, so immutability does not depend on the application behaving correctly, or on which database role it connects as.

The consequence worth planning for: anything written into an event's `metadata` is there permanently, because the hash covers `metadata` and editing it would invalidate every event after it. Personal identifiers are therefore stored as keyed one-way digests (`email_digest` rather than `email`) rather than in clear, and identifiers in events written before 2026-10-11 are masked on the way out by the query and export endpoints.

The `from` parameter on export defaults to 90 days ago. That is a default, not a limit: pass an earlier `from` to reach older events, up to 100,000 events per request.

## Audit insert hardening

The audit log is protected at the database level, and it is worth being precise about which protections apply to every connection and which depend on configuration.

**Applies to every connection, including the application's own:**

- `DELETE` and `UPDATE` are rewritten to no-ops by the `no_delete_audit` and `no_update_audit` rules, and blocked again by the `audit_events_immutable` trigger.
- `TRUNCATE` is refused by the `audit_events_no_truncate` trigger. This needed its own mechanism: rules only rewrite `DELETE` and `UPDATE`, the row trigger does not fire on `TRUNCATE`, and row-level security does not apply to `TRUNCATE` at all, so for a time a single statement would have emptied the table with nothing in the way.
- Row-level security is enabled with no permissive policy, which denies the PostgREST `anon` and `authenticated` roles everything regardless of the grants they hold. Their write grants have also been revoked, because `TRUNCATE` is the case row-level security would not have covered.

These are statement-level rules and triggers, so they apply to every connection including a superuser's. What they do not survive is a connection that deliberately removes them: the role the service connects as owns the table and could drop a trigger first. Running the service as a non-owning role is what would close that, and is the same change described below.

**Depends on which role the application connects as:**

- A restricted **`vault_app`** role exists with `INSERT` revoked, alongside a `SECURITY DEFINER` function (`insert_audit_event`) intended to be the only write path. Connecting as `vault_app` is what would prevent a compromised application connection from *fabricating* events.
- As configured today the service connects as a role with `BYPASSRLS`, so that particular protection is not currently in the path. Immutability of existing events (above) is unaffected: a compromised connection could append a false event but could not alter or delete a true one, and an appended event joins the keyed chain, so it cannot be back-dated into the middle of the history.

Combined with the hash chain above: the chain and the immutability rules detect and prevent tampering with recorded history, and moving the service onto `vault_app` is what closes the remaining gap at write time.

## Best practices

Use the audit log for compliance reviews, incident response, and access analysis. Export or forward events to your SIEM or logging pipeline as needed.

### SDK AuditSink plugin

The TypeScript SDK supports an `AuditSink` plugin interface for forwarding audit events to external systems (e.g. Splunk, Datadog, or a custom webhook). Register a sink when constructing the client and every event your SDK session produces will be mirrored to your target in real time. See the [SDK overview](/docs/sdks/overview) for details on the plugin architecture.
