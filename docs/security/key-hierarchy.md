---
title: Key hierarchy
description: Per-org shared KEK in HSM; DEK per secret; separate asymmetric JWT signing keys; envelope encryption with optional MPC and CMEK layers.
sidebar_position: 1
---

# Key hierarchy

1Claw uses envelope encryption for secrets. Signing keys for JWTs and transaction keys are separate from the symmetric KEK/DEK stack.

## Layers

### 1. JWT signing keys (asymmetric, KMS)

Two asymmetric KMS keys, separate from envelope KEKs:

| Key | Algorithm | Purpose |
|-----|-----------|---------|
| `1claw-jwt-eddsa-signer` | Ed25519 (EC_SIGN_ED25519) | Agent and human session JWTs (`EdDSA` in header, `kid` like `eddsa-v1`) |
| `1claw-jwt-rs256-signer` | RSA-2048 (HSM) | OIDC federation tokens and OAuth id_tokens (`RS256`, `kid` like `rs256-v3`) |

Private signing material never leaves KMS. Public keys are published at `GET /.well-known/jwks.json`.

### 2. Organization KEK (symmetric, KMS)

One **shared KEK per organization** (`organizations.kek_id`, migration 122). All vaults in the org reference this KEK via `vaults.kek_id`, including system vaults `__agent-keys` and `__treasury-keys`.

- **Protection level:** HSM (FIPS 140-2 Level 3) for Pro/Team/Business/Enterprise; SOFTWARE for Free.
- **Purpose:** Wrap and unwrap per-secret DEKs only. The KEK never encrypts plaintext secrets directly.
- **Rotation:** 365-day KMS rotation period. A nightly DEK re-wrap job moves secrets to the current primary version so old KMS versions can be destroyed.

Optional org-level Shamir custody (migration 203) splits the org KEK across HSM providers. Reconstruction for sensitive operations is forwarded to the Shroud TEE (`POST /v1/admin/shamir/reconstruct`). Vault-level MPC (`POST /v1/vaults/{id}/mpc`) is a separate feature that splits **per-secret DEKs**, not signing keys.

### 3. DEK (Data Encryption Key)

A random 256-bit AES key generated for each secret version. Used with **AES-256-GCM** to encrypt the secret value. The DEK is wrapped by the org KEK (or MPC provider KEKs when MPC is enabled) and stored with ciphertext, IV, and auth tag.

The DEK exists in plaintext only briefly inside the API during encrypt/decrypt. A `DekCache` (300s TTL, 5,000 entries) reduces KMS unwrap calls on hot paths.

## Write and read flow

**Write:**

1. Generate random DEK
2. Encrypt plaintext with DEK (AES-256-GCM, AAD bound to `vault_id:path`)
3. Wrap DEK with org KEK via KMS
4. Store ciphertext + wrapped DEK + IV + tag

**Read:**

1. Load ciphertext + wrapped DEK
2. Unwrap DEK with org KEK (KMS)
3. Decrypt ciphertext with DEK
4. Return plaintext to authorized caller

Compromise of the database or application memory dumps does not reveal secrets without KMS access and a valid authorization path.

## Optional layers on top

| Layer | What it adds |
|-------|--------------|
| **CMEK** (Business+) | Client-side AES-256-GCM before HSM envelope encryption. Only a SHA-256 fingerprint is stored server-side. |
| **Vault MPC** | Shamir or XOR split of per-secret DEK shares across GCP/AWS/Azure (and optional client share). |
| **Org Shamir KEK** | 2-of-3 split of the org KEK across HSM providers; reconstruction in Shroud TEE. |

These protect **encryption keys and ciphertext**. Agent and treasury **signing keys** use standard envelope encryption in `__agent-keys` / `__treasury-keys`, gated by policies and guardrails. 1Claw does not offer threshold transaction signing (no Turnkey-style MPC-CMP).

## KMS version cleanup

A nightly job calls `destroy_old_versions(kek_id, KEEP_RECENT=1)` for each distinct KEK. That keeps the current primary plus one prior enabled version (safety margin for in-flight wraps). Older versions are scheduled for destruction with a **7-day** destroy window.

## Integrity verification

All KMS requests include CRC32C checksums. The API verifies response checksums after every encrypt, decrypt, and sign call. A mismatch causes an immediate failure.
