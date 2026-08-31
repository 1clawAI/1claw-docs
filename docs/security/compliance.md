---
title: Compliance
description: 1claw supports compliance efforts through HSM-backed encryption, access control, audit logging, GDPR data export, and revocation; use the audit log and policies to demonstrate control.
sidebar_position: 3
---

# Compliance

1Claw supports common compliance requirements by design:

- **Encryption at rest** — All secrets use envelope encryption with a per-org shared KEK in KMS (HSM for paid tiers). Optional CMEK adds a client-side AES-256-GCM layer (Business+). Keys never leave the HSM for wrap/unwrap operations.

- **Access control** — Access is granted only via explicit policies. No default read; every request is authorized. Supports least privilege and access review. Vault owners bypass policy checks for their own vaults.

- **Audit trail** — Access and failures are recorded. Secret values are never logged. Export events via `GET /v1/audit/events` or forward to your SIEM. Supports accountability and incident response.

- **Revocation** — Policies can be deleted and agents deactivated immediately. Policy changes for an agent revoke all active JWTs. Password change invalidates human sessions via `tokens_revoked_before`.

- **No long-term secret storage in clients** — Agents fetch secrets at runtime. MCP defaults to exfil protection mode `block`.

- **GDPR data portability** — `POST /v1/auth/export-data` returns a JSON archive of the calling user's personal data (profile, org membership, vault metadata, agents, policies, audit events, shares, billing). Requires step-up authentication (`X-Auth-Confirm` with purpose `account.export`, or passkey/TOTP when enrolled). Account deletion: `DELETE /v1/auth/me` with body `{ "confirmation": "DELETE MY ACCOUNT" }` and the same step-up policy.

- **Tamper-resistant audit log** — Events are chained via `prev_event_id` and **HMAC-SHA256** `integrity_hash`. The `vault_app` role cannot insert directly into `audit_events`. `GET /v1/audit/verify` recomputes HMACs server-side and checks linkage within a query window.

- **KMS key rotation** — Org KEKs use a 365-day rotation period. Nightly DEK re-wrap migrates secrets to the current primary version. A nightly cleanup job schedules destruction of KMS versions older than `KEEP_RECENT=1` (current primary plus one prior version). CRC32C checksums are verified on all KMS encrypt, decrypt, and sign operations.

Use the [Audit API](/docs/guides/audit-and-compliance) and policy model to document who had access to what and when. For specific standards (e.g. SOC 2, HIPAA), work with your compliance team to map controls to 1Claw's capabilities and your deployment (GCP, Supabase, Vercel compliance offerings).

Contact **ops@1claw.co** for current SOC 2 status and attestation letters.
