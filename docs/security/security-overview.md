# 1Claw Security Overview

**Version:** 0.2  
**Date:** 2026-08  
**Classification:** Public  
**Contact:** ops@1claw.co

---

## 1. Threat Model Summary

1Claw protects AI agent credentials, signing keys, and operational secrets across their full lifecycle. The threat model assumes:

- **Compromised agent runtime** — agents may be prompt-injected or otherwise manipulated
- **Compromised network path** — all agent-to-API traffic traverses untrusted networks
- **Insider risk** — platform operators should not have unilateral access to customer keys
- **Supply chain attack** — container images may be tampered with in transit

### Trust Boundaries

```
Agent Runtime (untrusted)
    │
    ├── Shroud TEE Proxy (AMD SEV-SNP attested)
    │       ├── LLM inspection + redaction
    │       └── Transaction signing (keys never leave TEE)
    │
    └── Vault API (Cloud Run, HSM-backed encryption)
            ├── Envelope encryption (GCP KMS / AWS KMS / Azure Key Vault)
            ├── Policy engine (deny-by-default)
            └── Audit hash chain (tamper-evident)
```

---

## 2. What Is Verifiable Today

### TEE Attestation (Public, No Auth Required)

Shroud runs on GKE Confidential Nodes with AMD SEV-SNP. Verify the deployment:

```bash
curl -s https://shroud.1claw.co/v1/shroud/attestation | jq .
```

**Response fields:**

| Field | Meaning |
|-------|---------|
| `attestation_level` | `none`, `identity`, `confidential`, or `sev_snp` |
| `identity_token` | GCE metadata JWT (verify against Google JWKS) |
| `image_hash` | Published container digest |
| `confidential_claims` | `secboot`, `hwmodel`, `instance_confidentiality`, `sw_name` when present |
| `verification.steps` | Level-specific checklist returned by the endpoint |

**Verification steps (summary):**

1. Decode `identity_token` as a JWT (do not trust before signature verify)
2. Fetch Google public keys from `https://www.googleapis.com/oauth2/v3/certs`
3. Verify the JWT signature
4. Confirm `aud` is `https://api.1claw.co` (see `verification.expected_audience` in the response)
5. Compare `image_hash` against the published Docker digest (`ghcr.io/1clawai/shroud`)
6. At `sev_snp` level, confirm measurement/digest claims match your expected build

### Audit Hash Chain (Org-Scoped, Authenticated)

Every audit event is linked to the previous via `prev_event_id` and an HMAC-SHA256 `integrity_hash`:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/audit/verify | jq .
```

The verify endpoint **recomputes HMAC-SHA256 server-side** for events in the query window and checks `prev_event_id` linkage. It returns `chain_valid`, `tampered_events`, and `unverifiable_events` (for pre-2026-08-21 legacy rows).

**Chain structure:** `integrity_hash = HMAC-SHA256(key, JSON.stringify([prev_hash, org_id, actor_type, actor_id, action, metadata, timestamp]))`

See [Audit hash chain verification](/docs/security/audit-verification) for limits (org-scoped window; no offline client recompute without the server key).

### Envelope Encryption

- Every secret gets a unique Data Encryption Key (AES-256-GCM)
- DEKs are wrapped by a **per-org shared KEK** in KMS (HSM for paid tiers)
- Optional CMEK (Customer-Managed Encryption Keys) for Business/Enterprise
- Optional vault MPC splits DEK shares across HSM providers

### Policy Enforcement

- **Deny-by-default:** agents have zero access until a human creates an explicit policy
- **Scope-bound JWTs:** agent tokens carry path scopes derived from policies when `agents.scopes` is empty
- **Token revocation on policy change:** stale permissions are invalidated via `agent_active_tokens`
- **Control-plane consensus:** sensitive admin operations can require multi-party approval (202 + `pending_approval_id`)
- **Expression policies (v2):** `tx_conditions.expression` evaluated at signing time alongside field matching

---

## 3. Architecture Differentiators

| Capability | Description |
|-----------|-------------|
| Whole-agent governance | Secrets, LLM traffic, runtimes, memory, and signing under one policy plane |
| Shroud LLM inspection | Redact secrets from prompts, detect injection, enforce output policies |
| Deep transaction inspection | `deep_inspect` decodes multicall, Safe execTransaction, ERC-4337 inner calls |
| Consensus composability | `skip_when` / `require_when` on policies prevent automation breakage |
| Hash-chained audit | Every event cryptographically linked; `payload_hash` binds pending approvals to actions |
| Shamir-split key custody | Org KEK and optional vault DEK shares split across HSM providers (envelope encryption, not threshold signing) |

### MPC and Shamir key custody (not threshold signing)

1Claw uses Shamir secret sharing for **encryption key custody**, not for multi-party **transaction signing**:

| Layer | What is split | Where shares live | Where reconstruction happens |
|-------|----------------|-------------------|------------------------------|
| **Vault MPC** (`2of3_multi_hsm`, optional per vault) | Per-secret **DEK** | GCP KMS, AWS KMS, Azure Key Vault | Vault API during authorized secret read/write |
| **Org Shamir KEK** (Team+ / Business+, migration 203) | Organization **KEK** | GCP + AWS (+ optional client share on Business/Enterprise) | Shroud TEE via `POST .../shamir/reconstruct` (501 when Shroud unconfigured) |
| **Treasury / agent signing keys** | N/A (single HSM envelope) | `__treasury-keys` / `__agent-keys` vaults | Standard envelope encryption, gated by policies |

This is **envelope encryption with Shamir-split KEKs/DEKs**. It is not Turnkey-style MPC-CMP **threshold signing**, where multiple parties co-sign a transaction without assembling the full private key.

**Turnkey comparison:** Turnkey's QuorumOS performs n-of-m **signature** quorum on private keys. 1Claw's Shamir modes ensure no single cloud HSM provider holds a complete DEK or org KEK, but transaction signatures are produced by a single signing key after policy checks.

---

## 4. Compliance Status

| Framework | Status |
|-----------|--------|
| SOC 2 Type II | Contact ops@1claw.co for current status |
| GDPR | Data export (`POST /v1/auth/export-data`) and account deletion (`DELETE /v1/auth/me`) with step-up auth |
| PCI DSS | Reference-mode card storage; PAN never persisted for Laso partner cards |

---

## 5. Contact and Next Steps

- **Security questions:** ops@1claw.co
- **Attestation endpoint:** `GET https://shroud.1claw.co/v1/shroud/attestation`
- **Audit verification:** [Audit hash chain verification](/docs/security/audit-verification) — `GET https://api.1claw.co/v1/audit/verify` (authenticated)
- **Full documentation:** https://docs.1claw.co/security/

---

*This document is versioned. Check the date above and request the latest version from ops@1claw.co if older than 90 days.*
