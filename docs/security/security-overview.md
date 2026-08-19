# 1Claw Security Overview

**Version:** 0.1  
**Date:** 2026-08  
**Classification:** Public  
**Contact:** ops@1claw.xyz

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
# Fetch attestation proof (public endpoint, no API key needed)
curl https://shroud.1claw.xyz/v1/shroud/attestation | jq .
```

**Verification steps:**
1. Decode the `identity_token` as a JWT (do not verify yet)
2. Fetch Google's public keys from `https://www.googleapis.com/oauth2/v3/certs`
3. Verify the JWT signature against Google's keys
4. Confirm the `aud` claim is `https://api.1claw.xyz`
5. Compare `image_hash` against the published Docker digest
6. (Optional) Verify SEV-SNP measurement via AMD attestation report

### Audit Hash Chain (Org-Scoped, Authenticated)

Every audit event is linked to the previous via HMAC-SHA256, forming a tamper-evident chain:

```bash
# Verify your org's audit chain integrity
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/audit/verify | jq .
```

**Chain structure:** `HMAC-SHA256(prev_hash | org_id | actor_type | actor_id | action | metadata | timestamp)`

The scheme is publicly documented — only chain data requires org authentication.

### Envelope Encryption

- Every secret gets a unique Data Encryption Key (AES-256-GCM)
- DEKs are wrapped by a Key Encryption Key stored in hardware (GCP Cloud HSM)
- Tier-aware protection: paid plans get HSM-grade; free tier uses software keys
- Optional CMEK (Customer-Managed Encryption Keys) for Business/Enterprise

### Policy Enforcement

- **Deny-by-default:** agents have zero access until a human creates an explicit policy
- **Scope-bound JWTs:** agent tokens carry only the permissions granted by policies
- **Token revocation on policy change:** stale permissions are immediately invalidated
- **Control-plane consensus:** sensitive admin operations can require multi-party approval

---

## 3. Architecture Differentiators

| Capability | Description |
|-----------|-------------|
| Whole-agent governance | Secrets, LLM traffic, runtimes, memory, and signing under one policy plane |
| Shroud LLM inspection | Redact secrets from prompts, detect injection, enforce output policies |
| Deep transaction inspection | `deep_inspect` decodes multicall, Safe execTransaction, ERC-4337 inner calls |
| Consensus composability | `skip_when` / `require_when` on policies prevent automation breakage |
| Hash-chained audit | Every event cryptographically linked; `payload_hash` binds approvals to actions |
| Multi-party signing | Shamir threshold across HSM providers; no single provider holds the full key |

---

## 4. Compliance Status

| Framework | Status |
|-----------|--------|
| SOC 2 Type II | [Status TBD — contact ops@1claw.xyz] |
| GDPR | Data export endpoint available (`POST /v1/auth/export-data`) |
| PCI DSS | Reference-mode card storage; PAN never persisted for partner cards |

---

## 5. Contact and Next Steps

- **Security questions:** ops@1claw.xyz
- **Attestation endpoint:** `GET https://shroud.1claw.xyz/v1/shroud/attestation`
- **Audit verification:** `GET https://api.1claw.xyz/v1/audit/verify` (authenticated)
- **Full documentation:** https://docs.1claw.xyz/security/

---

*This document is versioned. Check the date above and request the latest version from ops@1claw.xyz if older than 90 days.*
