# 1Claw Security Architecture Whitepaper

**Version:** 1.0  
**Date:** August 2026  
**Classification:** Public

---

## Section A — Current Security Model

### 1. Threat Model

1Claw operates a split-trust architecture with two security boundaries:

| Boundary | What runs inside | Trust assumption |
|----------|-----------------|-----------------|
| **HSM boundary** (GCP Cloud KMS, FIPS 140-2 Level 3) | Key wrapping, DEK generation, KEK management | Google cannot extract keys; customers verify via FIPS certification |
| **TEE boundary** (AMD SEV-SNP via GKE Confidential Computing) | LLM traffic inspection, transaction signing, secret redaction, Shamir reconstruction | Google/hypervisor cannot read enclave memory; customers verify via remote attestation |

**Attack surface partitioning:**

- **Outside both boundaries:** API handlers, auth middleware, policy evaluation, DB queries. Protected by standard application security (rate limiting, input validation, RBAC).
- **Inside HSM only:** KEK operations, DEK wrap/unwrap. Protected by GCP KMS access controls + HSM hardware.
- **Inside TEE only:** Plaintext secrets during redaction, signing key material during signing, LLM request/response content. Protected by AMD SEV-SNP memory encryption + attestation.

### 2. Cryptographic Key Hierarchy

```
Organization KEK (GCP KMS / Shamir 2-of-3)
  └── Per-secret DEK (AES-256-GCM, unique per secret version)
        └── Secret value (encrypted at rest)
```

- **Per-org shared KEK:** All vaults in an org share a single KMS CryptoKey. Envelope encryption isolation at the DEK level (unique per secret, AAD-bound to `vault_id:path`).
- **KEK protection level:** HSM for paid tiers (FIPS 140-2 Level 3), SOFTWARE for free tier.
- **Shamir custody (Business/Enterprise):** Org KEK split 2-of-3 across GCP KMS + AWS KMS + client share. Reconstruction inside Shroud TEE only.
- **Auto-rotation:** 365-day rotation period on KEKs. Nightly DEK re-wrap ensures old versions can be destroyed.
- **CMEK (opt-in):** Customer-managed AES-256-GCM layer on top of HSM envelope encryption. Key never touches server.

### 3. TEE Attestation & Verification

**Public endpoint (no authentication required):**

```
GET https://shroud.1claw.xyz/v1/shroud/attestation
```

Returns a GCE identity token signed by Google's Confidential Computing attestation service. Verification steps:

1. Decode JWT from response
2. Validate signature against Google's well-known JWKS (`https://www.googleapis.com/oauth2/v3/certs`)
3. Confirm `swname: "CONFIDENTIAL_SPACE"` in claims
4. Confirm `eat_nonce` contains the Shroud image digest
5. Confirm `aud` matches the 1Claw service account

This proves the Shroud enclave is running on AMD SEV-SNP hardware with the published image hash.

### 4. Audit Log Integrity

Every audit event is hash-chained:

```
integrity_hash = SHA-256(prev_hash | event_id | actor_id | action | resource_type | resource_id | timestamp)
```

**Independent verification endpoint:**

```
GET /v1/audit/verify
Authorization: Bearer <token>
```

Walks the organization's audit chain and reports:
- Total events verified
- Any gaps (missing `prev_event_id` links)
- Any hash mismatches (tampered events)
- Chain completeness percentage

### 5. Policy Engine

**Three tiers of policy expressiveness:**

| Tier | Engine | Capability |
|------|--------|-----------|
| All tiers | `tx_conditions` (JSON) | Field matching: `chain_in`, `to_address_in`, `value_above`, `function_selector_in`, `deep_inspect` |
| All tiers (v2) | Expression engine | Predicate logic: `&&`, `||`, `>`, `<`, `in`, `contains` with 1000-step budget |
| Team+ | Cedar | AWS Cedar policy language with full RBAC |
| Business+ | OPA | Open Policy Agent Rego for arbitrary authorization logic |

**Security hardening (expression engine):**
- Expression length cap: 4096 bytes
- AST depth cap: 16 levels
- Evaluation step budget: 1000 operations
- Fail-closed on any parse or eval error
- No recursion, no side effects
- Whitelisted field set only

**Deep transaction inspection:**
- `deep_inspect: true` unwraps multicall, Safe `execTransaction`, ERC-4337 `handleOps`
- Conditions evaluated against inner calls, not just the outer wrapper
- Per-chain struct depth: full decode for Ethereum, Bitcoin, Solana, XRP, Cardano, Tron

### 6. Control-Plane Governance

Administrative mutations (policy CRUD, key export, member changes) can require multi-party approval:

```json
{
  "consensus_trigger": {
    "action_in": ["signing_key.export", "policy.delete"],
    "min_approvals": 2,
    "required_roles": ["admin"],
    "require_credential_types": ["passkey"]
  }
}
```

**Composability:** `skip_when` and `require_when` arrays enable conditional consensus (e.g., skip for pre-approved automation identities; require for high-value transactions).

**Credential recovery:** Solo-owner orgs bypass consensus for credential recovery actions automatically. Small orgs use time-delayed recovery (72-hour window + notification) to prevent lockout.

### 7. Embedded Wallet Custody

- **6-chain support:** Ethereum, Bitcoin, Solana, XRP, Cardano, Tron
- **HSM-backed generation:** Private keys generated and stored via envelope encryption with the org KEK
- **MPC custody (Pro+):** Automatic tier-based custody: XOR 2-of-2 (Pro/Team) or Shamir 2-of-3 (Business/Enterprise)
- **Spend policies enforced:** `allowed_tokens`, `to_allowlist`, `daily_limit_eth`, `max_value_per_tx_eth`
- **Role-based access:** `wallet_access_policies` gate sign/send/swap/export/view per principal, role, or platform app
- **System vault isolation:** `__treasury-keys` vault blocks direct API reads — private keys accessible only through designated export endpoints with password re-authentication

### 8. LLM Security (Shroud)

All agent LLM traffic passes through the Shroud TEE proxy:

- **Secret redaction:** Per-org Aho-Corasick automata redact secrets before upstream transmission
- **Injection scoring:** Bi-directional prompt injection detection (request + response)
- **Content policy:** Per-agent `shroud_config` with block/redact/warn actions per detector
- **Tool call inspection:** Function arguments scanned for credential exfiltration attempts
- **Header filtering:** Sensitive headers stripped before upstream forwarding
- **Body size limit:** 5MB cap prevents TEE OOM attacks

### 9. OIDC Federation

1Claw acts as a first-class OpenID Connect Identity Provider:

- Public discovery: `GET /.well-known/openid-configuration`
- Public JWKS: `GET /.well-known/jwks.json` (EdDSA + RS256, 5-minute cache)
- Token exchange: `POST /v1/auth/federated-token` (RFC 8693)
- Compatible with Anthropic Workload Identity Federation, GCP/AWS STS

---

## Section B — Third-Party Validation

### External Security Review

**Scope:** Expression evaluator, public attestation endpoint, Shamir reconstruction path, audit hash chain verification.

**Status:** Engagement scoped. Review targets:
- Expression evaluator parser correctness and DoS resistance
- Attestation endpoint replay/forgery resistance
- Shamir share confidentiality and reconstruction boundary enforcement
- Audit chain tamper detection completeness

**Findings:** [To be included upon review completion]

### SOC 2

**Status:** [Document current status — in flight / Type II achieved / planned quarter]

Contact ops@1claw.xyz for compliance attestation details.

---

## Section C — Architecture Differentiators vs Signing-Only Infrastructure

| Dimension | Signing-Only (e.g., Turnkey) | 1Claw |
|-----------|------------------------------|-------|
| Governance scope | Transaction signing | Whole agent (secrets + LLM + runtimes + memory + channels + automations + signing) |
| Policy evaluation point | Before signing | Before signing AND before secret access AND before LLM forwarding AND before execution |
| TEE usage | Signing enclave | Signing + LLM inspection + secret redaction + Shamir reconstruction |
| Audit integrity | Event log | Hash-chained log with public verification API |
| Consensus composability | n-of-m quorum | `skip_when` / `require_when` with per-role minimums and credential-type requirements |
| Policy language | Proprietary DSL | Expression engine (open) + Cedar (standard) + OPA (standard) |
| Deep inspection | Per-chain structs | Per-chain structs + multicall/Safe/4337 wrapper unwrapping |

---

## Appendix: Verification Commands

```bash
# 1. Verify TEE attestation
curl https://shroud.1claw.xyz/v1/shroud/attestation

# 2. Verify audit hash chain
curl -H "Authorization: Bearer $TOKEN" https://api.1claw.xyz/v1/audit/verify

# 3. Verify OIDC public keys
curl https://api.1claw.xyz/.well-known/jwks.json

# 4. Test policy enforcement
curl -X POST https://api.1claw.xyz/v1/org/cedar-policies/test \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"policy": "...", "context": {...}}'
```

---

*This document describes systems as deployed at publication date. For the latest security updates, see the [changelog](/reference/changelog) and [trust model comparison](/security/trust-model-comparison).*
