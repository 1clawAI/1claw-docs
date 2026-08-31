# 1Claw Security Architecture Whitepaper

**Version:** 1.1  
**Date:** August 2026  
**Classification:** Public

---

## Section A — Current Security Model

### 1. Threat Model

1Claw operates a split-trust architecture with two security boundaries:

| Boundary | What runs inside | Trust assumption |
|----------|-----------------|-----------------|
| **HSM boundary** (GCP Cloud KMS, FIPS 140-2 Level 3) | Key wrapping, DEK generation, KEK management, JWT asymmetric signing | Cloud provider cannot extract key material; customers verify via FIPS certification |
| **TEE boundary** (AMD SEV-SNP via GKE Confidential Computing) | LLM traffic inspection, transaction signing, secret redaction, org-KEK Shamir reconstruction | Hypervisor cannot read enclave memory; customers verify via remote attestation |

**Attack surface partitioning:**

- **Outside both boundaries:** API handlers, auth middleware, policy evaluation, DB queries. Protected by standard application security (rate limiting, input validation, RBAC).
- **Inside HSM only:** KEK wrap/unwrap, JWT signing. Protected by KMS access controls + HSM hardware.
- **Inside TEE only:** Plaintext secrets during redaction, signing key material during signing, LLM request/response content, org-KEK reconstruction. Protected by AMD SEV-SNP memory encryption + attestation.

### 2. Cryptographic Key Hierarchy

```
Organization KEK (one shared KMS key per org; optional Shamir 2-of-3 across HSMs)
  └── Per-secret DEK (AES-256-GCM, unique per secret version)
        └── Secret value (encrypted at rest)

Separate asymmetric keys (not envelope KEKs):
  └── Ed25519 JWT signer + RS256 OIDC federation signer
```

- **Per-org shared KEK:** All vaults in an org share `organizations.kek_id`. Envelope isolation is at the DEK level (unique per secret, AAD-bound to `vault_id:path`).
- **KEK protection level:** HSM for paid tiers (FIPS 140-2 Level 3), SOFTWARE for Free.
- **Shamir custody:** Org-level Shamir (migration 203) splits the **org KEK** across GCP + AWS (+ optional client share on Business/Enterprise). Vault-level MPC splits **per-secret DEKs**. Reconstruction of org KEK material is forwarded to the **Shroud TEE**; returns 501 when Shroud is not configured.
- **Not threshold transaction signing:** Agent and treasury signing keys use standard HSM envelope encryption. Policy consensus gates who may authorize a sign/export action; it does not split a secp256k1/Ed25519 private key across signers.
- **Auto-rotation:** 365-day rotation period on KEKs. Nightly DEK re-wrap ensures old versions can be destroyed (`KEEP_RECENT=1`).
- **CMEK (opt-in):** Customer-managed AES-256-GCM layer on top of HSM envelope encryption. Key never touches server.

### 3. TEE Attestation & Verification

**Public endpoint (no authentication required):**

```
GET https://shroud.1claw.co/v1/shroud/attestation
```

Returns `attestation_level`, `identity_token`, `image_hash`, `confidential_claims`, and a `verification` object with step-by-step instructions. Verification summary:

1. Decode JWT from `identity_token`
2. Validate signature against Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`)
3. Confirm `aud` is `https://api.1claw.co`
4. At `confidential` / `sev_snp` levels, verify Confidential Computing claims (`secboot`, `hwmodel`, etc.)
5. At `sev_snp`, verify image digest / measurement match

This proves Shroud is running on AMD SEV-SNP hardware with the published image hash when `attestation_level` is `sev_snp`.

### 4. Audit Log Integrity

Every audit event is hash-chained:

```
integrity_hash = HMAC-SHA256(key, [prev_hash, org_id, actor_type, actor_id, action, metadata, timestamp])
```

:::info Status — **Live**
Hash chaining is written on every insert. `GET /v1/audit/verify` recomputes HMACs and checks linkage within an org-scoped window. See [Audit verification](/docs/security/audit-verification).
:::

**Verification endpoint:**

```
GET /v1/audit/verify
Authorization: Bearer <token>
```

Returns `chain_valid`, `tampered_events`, `unverifiable_events` (legacy pre-2026-08-21 rows), and `broken_at_event_id`.

### 5. Policy Engine

**Three tiers of policy expressiveness:**

| Tier | Engine | Status | Capability |
|------|--------|--------|------------|
| All tiers | `tx_conditions` (JSON) | **Live** | Field matching: `chain_in`, `to_address_in`, `value_above`, `function_selector_in`, `deep_inspect` |
| All tiers (v2 schema) | Expression engine | **Live** | Predicate logic: `&&`, `\|\|`, `>`, `<`, `in`, `contains` with 1000-step budget, 1024-char cap |
| Team+ | Cedar | **Live** (shadow/enforce modes) | AWS Cedar policy language with unified evaluator |
| Business+ | OPA | **Live** (shadow/enforce modes) | Open Policy Agent Rego |

**Expression engine hardening:**
- Expression length cap: **1024** bytes
- AST depth cap: 16 levels
- Evaluation step budget: 1000 operations
- Fail-closed on parse/eval errors (effect-aware for allow vs deny policies)
- Whitelisted context fields only

**Deep transaction inspection:**
- `deep_inspect: true` unwraps multicall, Safe `execTransaction`, ERC-4337 `handleOps`
- Conditions evaluated against inner calls, not just the outer wrapper
- Multi-chain decoders feed `TransactionContext` for Ethereum, Bitcoin, Solana, XRP, Cardano, Tron

### 6. Control-Plane Governance

Administrative mutations (policy CRUD, key export, member changes) can require multi-party approval:

```json
{
  "consensus_trigger": {
    "conditions": [
      { "type": "action_in", "actions": ["signing_key.export", "policy.delete"] }
    ],
    "approval": {
      "min_approvals": 2,
      "required_roles": ["admin"],
      "require_credential_types": ["passkey"]
    }
  }
}
```

**Composability:** `skip_when` and `require_when` arrays enable conditional consensus (e.g., skip for pre-approved automation identities; require for high-value transactions).

**Credential recovery:** Solo-owner orgs bypass consensus for credential recovery actions automatically. Multi-owner orgs use time-delayed recovery (default **72-hour** window + owner notification) to prevent lockout.

### 7. Embedded Wallet Custody

- **6-chain support:** Ethereum, Bitcoin, Solana, XRP, Cardano, Tron
- **HSM-backed generation:** Private keys stored via envelope encryption with the org KEK in `__treasury-keys`
- **MPC custody (vault-level option; org Shamir on Team+):** Tier-based **encryption key** custody. Org Shamir splits the **KEK**, not signing keys.
- **Spend policies enforced:** `allowed_tokens`, `to_allowlist`, `daily_limit_eth`, `max_value_per_tx_eth` via `validate_wallet_send()` on treasury send/swap
- **Role-based wallet access:** `wallet_access_policies` enforced via `enforce_wallet_access()` on send/swap/export
- **System vault isolation:** `__treasury-keys` blocks direct API reads; export requires password or passkey step-up

### 8. LLM Security (Shroud)

All agent LLM traffic can pass through the Shroud TEE proxy when `shroud_enabled`:

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

**Status:** Engagement scoped. Contact ops@1claw.co for published findings.

### SOC 2

Contact ops@1claw.co for current compliance attestation status.

---

## Section C — Architecture Differentiators vs Signing-Only Infrastructure

| Dimension | Signing-Only (e.g., Turnkey) | 1Claw |
|-----------|------------------------------|-------|
| Governance scope | Transaction signing | Whole agent (secrets + LLM + runtimes + memory + channels + automations + signing) |
| Policy evaluation point | Before signing | Before signing AND before secret access AND before LLM forwarding AND before execution |
| TEE usage | Signing enclave | Signing + LLM inspection + secret redaction + org-KEK Shamir reconstruction |
| Audit integrity | Event log | Hash-chained log with server-side HMAC verification API |
| Consensus composability | n-of-m quorum | `skip_when` / `require_when` with per-role minimums and credential-type requirements |
| Policy language | Proprietary DSL | Expression engine + Cedar + OPA + built-in `tx_conditions` |
| Deep inspection | Per-chain structs | Per-chain structs + multicall/Safe/4337 wrapper unwrapping |

---

## Appendix: Verification Commands

```bash
# 1. Verify TEE attestation
curl -s https://shroud.1claw.co/v1/shroud/attestation | jq .

# 2. Verify audit hash chain
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.co/v1/audit/verify | jq .

# 3. Verify OIDC public keys
curl -s https://api.1claw.co/.well-known/jwks.json | jq .

# 4. Dry-run Cedar policy (Team+)
curl -X POST https://api.1claw.co/v1/org/cedar-policies/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"policy": "...", "context": {...}}'
```

---

*This document describes systems as deployed at publication date. For the latest security updates, see the [changelog](/docs/reference/changelog) and [trust model comparison](/docs/security/trust-model-comparison).*
