---
title: Compliance
description: 1claw supports compliance efforts through HSM-backed encryption, access control, audit logging, GDPR data export, and revocation; use the audit log and policies to demonstrate control.
sidebar_position: 3
---

# Compliance

1claw supports common compliance requirements by design:

- **Encryption at rest** — All secrets are encrypted with HSM-backed keys (envelope encryption). Keys never leave the HSM. This supports requirements for strong encryption and key management.

- **Access control** — Access is granted only via explicit policies. No default read; every request is authorized. Supports least-privilege and access review.

- **Audit trail** — All access (and failures) can be recorded. Secret values are never logged. You can export or forward events to your SIEM or compliance tooling. Supports accountability and incident response.

- **Revocation** — Policies can be deleted and agents deactivated immediately. When an agent's access policy is created, updated, or deleted, all of that agent's active JWTs are automatically revoked — the agent must re-authenticate to get a fresh token with updated scopes. Supports "revoke access when needed" and offboarding.

- **No long-term secret storage in clients** — Agents fetch secrets at runtime and do not need to store them. Reduces exposure in agent environments.

- **GDPR data portability** — `POST /v1/auth/export-data` returns a JSON archive of the calling user's personal data (profile, org membership, vaults, agents, policies, audit events, shares, billing). `DELETE /v1/auth/me` handles account deletion with cascade cleanup. Supports data portability and right-to-erasure requirements.

- **Tamper-resistant audit log** — Audit events are chained via SHA-256 hashes (`prev_event_id` + `integrity_hash`). The application database role (`vault_app`) cannot insert directly into the audit table — all writes go through a `SECURITY DEFINER` function that enforces the hash chain, preventing log fabrication from compromised connections.

- **KMS key rotation** — GCP KMS vault KEKs are created with a 90-day automatic rotation schedule. CRC32C checksums are verified on all KMS encrypt, decrypt, and sign operations to detect in-transit corruption or tampering.

Use the [Audit API](/docs/guides/audit-and-compliance) and policy model to document who had access to what and when. For specific standards (e.g. SOC 2, HIPAA), work with your compliance team to map controls to 1claw's capabilities and your deployment (e.g. GCP and Supabase compliance offerings).
