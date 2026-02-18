---
title: Compliance
description: 1claw supports compliance efforts through HSM-backed encryption, access control, audit logging, and revocation; use the audit log and policies to demonstrate control.
sidebar_position: 3
---

# Compliance

1claw supports common compliance requirements by design:

- **Encryption at rest** — All secrets are encrypted with HSM-backed keys (envelope encryption). Keys never leave the HSM. This supports requirements for strong encryption and key management.

- **Access control** — Access is granted only via explicit policies. No default read; every request is authorized. Supports least-privilege and access review.

- **Audit trail** — All access (and failures) can be recorded. Secret values are never logged. You can export or forward events to your SIEM or compliance tooling. Supports accountability and incident response.

- **Revocation** — Policies can be deleted and agents deactivated immediately. Supports “revoke access when needed” and offboarding.

- **No long-term secret storage in clients** — Agents fetch secrets at runtime and do not need to store them. Reduces exposure in agent environments.

Use the [Audit API](/docs/guides/audit-and-compliance) and policy model to document who had access to what and when. For specific standards (e.g. SOC 2, HIPAA), work with your compliance team to map controls to 1claw’s capabilities and your deployment (e.g. GCP and Supabase compliance offerings).
