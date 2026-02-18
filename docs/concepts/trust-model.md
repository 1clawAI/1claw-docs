---
title: Trust model
description: 1claw trusts the HSM and the API to enforce policy; clients get secrets only after authentication and policy checks; all access is audited.
sidebar_position: 4
---

# Trust model

## What 1claw trusts

- **HSM (e.g. Cloud KMS)** — Keys are generated and used only inside the HSM. The API never has access to raw KEKs or long-term signing keys; it only requests wrap/unwrap/sign operations.
- **Database** — Stores ciphertext, wrapped DEKs, metadata, policies, and audit events. The database is not trusted with plaintext secrets; it only holds encrypted data and policy records.
- **API** — The only component that can decrypt secrets. It authenticates every request (JWT), loads policies for the caller, and returns secret values only when policy allows. All access is logged for audit.

## What the client must do

- **Humans** — Keep credentials (password, API key) secure; use HTTPS; treat the JWT as sensitive (short-lived in the case of agent tokens).
- **Agents** — Store the agent API key securely (e.g. in the agent’s secure config, not in prompts or logs). Use the token endpoint to get a short-lived JWT and use it only over HTTPS.

## Zero-trust style guarantees

- **Secrets at rest** — Encrypted with DEKs wrapped by HSM KEKs; no plaintext in the DB.
- **Secrets in transit** — Served only over HTTPS; client must use TLS.
- **Access control** — Every request is authorized by policy; there is no “open” read. Vault creators can always access their vault; others need an explicit policy.
- **Revocation** — Disable an agent, delete a policy, or rotate a key; subsequent requests fail. No long-lived cache of secrets in the API.
- **Audit** — All access (and failures) can be recorded; see [Audit and compliance](/docs/guides/audit-and-compliance).

See [Zero trust](/docs/security/zero-trust) for a longer treatment.
