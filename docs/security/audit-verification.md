---
title: Audit Hash Chain Verification
description: How 1Claw links audit events into a tamper-evident chain, how to call GET /v1/audit/verify, and what chain_valid means.
sidebar_position: 3
---

# Audit Hash Chain Verification

Every audit event in 1Claw is linked to the previous event in the same organization via `prev_event_id` and an `integrity_hash`. Together they form a tamper-evident chain scoped to your org.

:::info Status — **Live**
The hash chain is written on every audit insert. `GET /v1/audit/verify` is available today for org-authenticated callers. The endpoint **recomputes HMAC-SHA256** server-side and compares against stored hashes for events in the query window.
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
Some older references describe `SHA-256(prev_hash | event_id | actor_id | action | resource_type | resource_id | timestamp)`. The **live** scheme uses **HMAC-SHA256** over the JSON array above (including `org_id`, `actor_type`, and `metadata` rather than `resource_type` / `resource_id`). The verify API's `scheme` object reflects the current algorithm.
:::

## Calling `GET /v1/audit/verify`

**Endpoint:** `GET https://api.1claw.co/v1/audit/verify`

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
  "https://api.1claw.co/v1/audit/verify?limit=5000" | jq .
```

### Example response

```json
{
  "chain_valid": true,
  "events_verified": 4821,
  "events_checked": 4821,
  "tampered_events": [],
  "unverifiable_events": [],
  "broken_at_event_id": null,
  "legacy_cutoff": "2026-08-21T00:00:00Z",
  "note": "Verification covers the requested range only; events outside this window are not checked. Events before legacy_cutoff may be listed as unverifiable rather than tampered.",
  "scheme": {
    "algorithm": "HMAC-SHA256",
    "chain_structure": "prev_hash | org_id | actor_type | actor_id | action | metadata | timestamp",
    "hash_field": "integrity_hash",
    "link_field": "prev_event_id",
    "genesis_prev_hash": "",
    "documentation": "https://docs.1claw.co/security/audit-verification"
  }
}
```

## What `chain_valid` means

`chain_valid: true` when, for the events in the query window:

1. Every event has a non-null `integrity_hash`.
2. Recomputed HMAC matches the stored `integrity_hash` (for events at or after `legacy_cutoff`).
3. `prev_event_id` linkage is consistent within the window (each event's predecessor hash chains correctly).

`chain_valid: false` when any event fails HMAC verification (`tampered_events`), has broken linkage (`broken_at_event_id`), or falls into the legacy bucket incorrectly.

### Legacy cutoff

Events before **`2026-08-21T00:00:00Z`** used a separate Rust-side timestamp in the HMAC pre-image while the DB row used `DEFAULT NOW()`. Those events may appear in `unverifiable_events` rather than `tampered_events` when recomputation does not match. This is a known migration artifact, not necessarily tampering.

## Limitations

| Limitation | Detail |
|------------|--------|
| **Org-scoped** | You only verify your org's events. Platform admins have separate cross-org audit tooling. |
| **Windowed** | Default limit is 1000 events. Use `limit` and `from`/`to` for larger or bounded checks. Events outside the window are not checked even if the chain continues beyond it. |
| **No client-side HMAC recompute** | The server holds `ONECLAW_AUDIT_HMAC_KEY`. Customers cannot independently reproduce digests offline without operator cooperation or a future export API. |
| **Best-effort insert** | Audit logging is awaited but failures are logged without failing the underlying operation. A missing event would appear as a chain gap. |
| **Metadata in hash** | Because `metadata` is part of the HMAC input, post-insert metadata mutation would break the chain. Events should be append-only. |

## Related endpoints

- **`GET /v1/audit/events`** — Paginated audit log for your org (same auth as verify).
- **`POST /v1/auth/export-data`** — GDPR data export including audit history (requires step-up auth).

## See also

- [Security overview](/docs/security/security-overview) — threat model and verifiable controls
- [Audit and compliance guide](/docs/guides/audit-and-compliance) — operational audit workflows
- [Trust model comparison](/docs/security/trust-model-comparison) — how hash-chained audit differs from signing-only platforms
