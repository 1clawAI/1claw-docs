---
title: Audit and compliance
description: 1claw records access and failures in an audit log; query events via GET /v1/audit/events; secret values are never logged.
sidebar_position: 5
---

# Audit and compliance

All API access (and relevant failures) can be recorded in an **audit log**. Secret **values** are never stored in audit events; only metadata (e.g. path, action, actor, timestamp) is recorded.

## Querying audit events

**GET /v1/audit/events** — Returns events for the caller’s organization. Query parameters may include:

- `resource_id` — Filter by resource (e.g. secret path).
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
      "action": "secret.read",
      "actor_id": "agent-uuid",
      "actor_type": "agent",
      "resource_type": "secret",
      "resource_id": "secret-uuid",
      "org_id": "org-uuid",
      "details": { "vault_id": "vault-uuid", "path": "keys/eth-signer" },
      "ip_address": "203.0.113.50",
      "created_at": "2026-02-27T14:00:00Z"
    }
  ],
  "count": 1
}
```

Each event includes `id`, `org_id`, `actor_type`, `actor_id`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, and `created_at`.

## Typical events

- `secret.read`, `secret.write`, `secret.delete` — Secret access (path and actor; no value).
- `auth.success`, `auth.failure` — Authentication attempts (no credentials logged).
- `policy.create`, `policy.update`, `policy.delete` — Access policy changes.
- `agent.register`, `agent.rotate_key`, `agent.deactivate` — Agent lifecycle events.
- `transaction.submit` — Transaction submitted via Intents API.
- `transaction.simulate` — Transaction simulation requested.

## Tamper-evident hash chain

Every audit event includes a cryptographic hash chain that links it to the previous event:

- `prev_event_id` — UUID of the immediately preceding event in the org's audit log.
- `integrity_hash` — SHA-256 of `prev_hash|event_id|actor_id|action|resource_type|resource_id|timestamp`.

This makes the audit log **append-only and tamper-evident**: modifying or deleting any event breaks the hash chain for all subsequent entries. You can verify integrity by walking the chain from the latest event back to the first (`prev_event_id = NULL`).

## Audit insert hardening

The audit log is protected at the database level against fabrication or bypass:

- The application connects as a restricted **`vault_app`** database role that does not have `BYPASSRLS` or `SUPERUSER` privileges.
- Direct `INSERT` on the `audit_events` table is **revoked** from `vault_app`. All audit writes go through a **`SECURITY DEFINER`** function (`insert_audit_event`) owned by a privileged role.
- This means even if the application connection is compromised, the attacker cannot insert arbitrary audit events or bypass the hash chain — all writes are funneled through the trusted function that enforces the integrity chain.

Combined with the hash chain above, this provides defense in depth: the chain detects tampering after the fact, and the restricted insert path prevents fabrication at write time.

## Best practices

Use the audit log for compliance reviews, incident response, and access analysis. Export or forward events to your SIEM or logging pipeline as needed.

### SDK AuditSink plugin

The TypeScript SDK supports an `AuditSink` plugin interface for forwarding audit events to external systems (e.g. Splunk, Datadog, or a custom webhook). Register a sink when constructing the client and every event your SDK session produces will be mirrored to your target in real time. See the [SDK overview](/docs/sdks/overview) for details on the plugin architecture.
