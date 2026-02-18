---
title: Zero trust
description: "1claw enforces zero-trust style guarantees: secrets at rest encrypted, access only after auth and policy check, revocation immediate, all access audited."
sidebar_position: 2
---

# Zero trust

1claw is designed with zero-trust principles: no implicit trust of the network or the database; every access is authenticated and authorized, and secrets are protected at rest and in use.

## Secrets at rest

- Every secret is encrypted with a DEK; the DEK is wrapped by a KEK that never leaves the HSM. The database stores only ciphertext and wrapped DEKs. There is no “master key” in the app; decryption requires a successful KMS unwrap.

## No implicit access

- Every request must present a valid JWT. There is no “open” read. Policies explicitly grant read/write to principals for path patterns. Vault owners have full access to their vault; everyone else needs a policy. Agents have no access until a human creates a policy.

## Revocation is immediate

- Deleting a policy removes access on the next request. Deactivating an agent prevents new tokens; existing short-lived JWTs expire. Rotating an agent key invalidates the old key. There is no long-lived cache of secrets in the API.

## Audit

- Access (and relevant failures) are logged. Secret values are never written to the audit log. You can use the log for compliance and incident response.

## In transit

- Clients must use HTTPS. The API is served over TLS. Do not send tokens or secrets over plain HTTP.

See [Trust model](/docs/concepts/trust-model) for a short summary.
