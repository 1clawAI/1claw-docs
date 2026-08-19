---
title: Audit Hash Chain Verification
description: How 1Claw links audit events into a tamper-evident chain, how to call GET /v1/audit/verify, and what chain_valid means.
sidebar_position: 3
---

# Audit Hash Chain Verification

Every audit event in 1Claw is linked to the previous event in the same organization via `prev_event_id` and an `integrity_hash`. Together they form a tamper-evident chain scoped to your org.

:::info Status — **Live**
The hash chain is written on every audit insert. `GET /v1/audit/verify` is available today for org-authenticated callers. Full client-side HMAC recomputation requires the server-held audit key and is **not** performed by the verify endpoint (see [Limitations](#limitations)).
:::

## Chain structure

Each row in `audit_events` contains:

| Field | Role |
|-------|------|
| `prev_event_id` | UUID of the prior event in this org's chain (`NULL` for the genesis event) |
| `integrity_hash` | HMAC digest binding this event to the previous hash |

Events are ordered by `timestamp`. The chain is **per-organization** — there is no cross-org link.

### Hash algorithm (at insert time)

When Vault inserts an event, it computes:

```
integrity_hash = HMAC-SHA256(
  key = ONECLAW_AUDIT_HMAC_KEY,   // 32-byte server secret; not exposed to clients
  message = JSON.stringify([
    prev_hash,           // previous event's integrity_hash, or "" for genesis
    org_id,
    actor_type,
    actor_id,
    action,
    metadata,            // JSON object serialized to string
    timestamp            // RFC 3339
  ])
)
```

The result is stored as a lowercase hex string in `integrity_hash`.

:::note Historical docs vs live scheme
Some older references describe `SHA-256(prev_hash | event_id | actor_id | action | resource_type | resource_id | timestamp)`. The **live** scheme uses **HMAC-SHA256** over the JSON array above (including `org_id`, `actor_type`, and `metadata` rather than `resource_type` / `resource_id`). The verify API's `scheme` object in the response reflects the current algorithm.
:::

## Calling `GET /v1/audit/verify`

**Endpoint:** `GET https://api.1claw.xyz/v1/audit/verify`

**Authentication:** Required. Use a human JWT or org API key (`1ck_…`) with access to the org whose chain you want to verify.

**Query parameters (optional):**

| Parameter | Description |
|-----------|-------------|
| `from` | RFC 3339 start timestamp (inclusive filter on event query) |
| `to` | RFC 3339 end timestamp (inclusive filter on event query) |
| `limit` | Max events to check (default `1000`, max `10000`) |

### Example

```bash
export TOKEN="your-jwt-or-1ck-key"

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.1claw.xyz/v1/audit/verify?limit=5000" | jq .
```

### Example response

```json
{
  "chain_valid": true,
  "events_verified": 4821,
  "events_checked": 4821,
  "broken_at_event_id": null,
  "scheme": {
    "algorithm": "HMAC-SHA256",
    "chain_structure": "prev_hash | org_id | actor_type | actor_id | action | metadata | timestamp",
    "hash_field": "integrity_hash",
    "link_field": "prev_event_id",
    "documentation": "https://docs.1claw.xyz/security/audit-verification"
  }
}
```

## What `chain_valid` means

`chain_valid: true` when, for the events returned in the query window:

1. Every event has a non-null `integrity_hash`.
2. Linkage rules hold: the chronologically first event has `prev_event_id = null`; later events have `prev_event_id` set.

`chain_valid: false` when the walk hits an event missing `integrity_hash`, or linkage breaks (`broken_at_event_id` identifies the first failing event).

:::warning What verify does **not** do today
The endpoint walks the chain in timestamp order and checks **presence and linkage** of hash fields. It does **not** recompute HMAC-SHA256 over event payloads on the server or in your client — that would require `ONECLAW_AUDIT_HMAC_KEY`, which stays server-side. Treat `chain_valid` as a structural integrity check within the returned window, not a full independent cryptographic audit you can reproduce offline without operator cooperation.
:::

## Limitations

| Limitation | Detail |
|------------|--------|
| **Org-scoped** | You only verify your org's events. Platform admins have separate cross-org audit tooling. |
| **Windowed** | Default limit is 1000 events. Use `limit` and `from`/`to` for larger or bounded checks. |
| **No client-side HMAC recompute** | Independent verification requires the audit HMAC key or an export API that returns recomputed digests — not available to customers today. |
| **Best-effort insert** | Audit logging is awaited but failures are logged without failing the underlying operation (availability trade-off). A missing event would appear as a chain gap if inserts fail silently. |
| **Metadata in hash** | Because `metadata` is part of the HMAC input, post-insert metadata mutation would break the chain. Events should be append-only. |

## Related endpoints

- **`GET /v1/audit/events`** — Paginated audit log for your org (same auth as verify).
- **`POST /v1/auth/export-data`** — GDPR data export including audit history (requires step-up auth).

## See also

- [Security overview](/docs/security/security-overview) — threat model and verifiable controls
- [Audit and compliance guide](/docs/guides/audit-and-compliance) — operational audit workflows
- [Trust model comparison](/docs/security/trust-model-comparison) — how hash-chained audit differs from signing-only platforms
