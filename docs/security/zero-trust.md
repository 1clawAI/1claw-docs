---
title: Zero trust
description: "1claw enforces zero-trust style guarantees: secrets at rest encrypted, access only after auth and policy check, revocation immediate, all access audited."
sidebar_position: 2
---

# Zero trust

1Claw is designed with zero-trust principles: no implicit trust of the network or the database; every access is authenticated and authorized, and secrets are protected at rest and in use.

## Secrets at rest

Every secret is encrypted with a unique DEK. The DEK is wrapped by the org's shared KEK in KMS (HSM for paid tiers). The database stores only ciphertext and wrapped DEKs. There is no application-level master key; decryption requires a successful KMS unwrap plus policy authorization.

System vaults `__agent-keys` and `__treasury-keys` use the same org KEK. Direct `get_secret` reads from those vaults return **403**; private key material is only reachable through designated export/reveal endpoints with step-up authentication.

## No implicit access

Every request must present a valid JWT or API key (`1ck_`, `ocv_`, `plt_`). There is no open read path. Policies explicitly grant read/write to principals for path patterns. Vault owners have full access to their vaults; everyone else needs a policy. Agents have **zero access** until a human creates a policy.

When `intents_api_enabled` is true, agents are also blocked from reading `private_key` and `ssh_key` type secrets even with a read policy, forcing use of the transaction proxy instead of raw key exfiltration.

## Revocation is immediate

Deleting a policy removes access on the next request. When an agent's access policy is created, updated, or deleted, all active JWTs for that agent are revoked via `agent_active_tokens` and `revoked_tokens`. The agent must re-exchange its API key at `POST /v1/auth/agent-token` to get fresh scopes.

Deactivating an agent prevents new tokens. Rotating an agent API key invalidates the old key. Human password change sets `tokens_revoked_before`, invalidating all existing session JWTs.

## Audit

Access and relevant failures are logged. Secret values are never written to the audit log.

Each event is linked via `prev_event_id` and an **HMAC-SHA256** `integrity_hash` (key = `ONECLAW_AUDIT_HMAC_KEY`, not exposed to clients). The application DB role `vault_app` cannot insert directly into `audit_events`; writes go through a `SECURITY DEFINER` function.

Verify your org's chain:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/audit/verify | jq .
```

See [Audit hash chain verification](/docs/security/audit-verification) for what `chain_valid` means and known limitations.

## In transit

Clients must use HTTPS. The API is served over TLS. Do not send tokens or secrets over plain HTTP.

## Production deployment

**`ONECLAW_PROXY_SECRET`** (required in production when `hsm_provider=gcp`): shared secret used to validate trusted proxy headers for IP-based policy conditions and rate limiting. Without it, the IP filter middleware cannot safely trust `X-Forwarded-For` behind a load balancer.

**DPoP** (optional org setting): JWTs can be bound to a client keypair via `cnf.jkt`. When enabled at `required`, requests with a `cnf` claim must include a valid `DPoP` proof header.

See [Trust model](/docs/concepts/trust-model) for a short summary.
