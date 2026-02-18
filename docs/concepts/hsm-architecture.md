---
title: HSM architecture
description: 1claw uses envelope encryption with DEKs per secret and HSM-backed KEKs; in production Google Cloud KMS holds the keys.
sidebar_position: 1
---

# HSM architecture

1claw encrypts every secret with **envelope encryption**: a random **Data Encryption Key (DEK)** encrypts the secret; the DEK itself is encrypted (wrapped) by a **Key Encryption Key (KEK)** that lives in an HSM and never leaves it.

## Key hierarchy

- **KEK (Key Encryption Key)** — One per vault. Created in the HSM when you create a vault. Used only to wrap/unwrap DEKs. In production this is a symmetric key in **Google Cloud KMS**.
- **DEK (Data Encryption Key)** — Generated per secret (or per operation). Used with AES-256-GCM to encrypt the secret value. The DEK is wrapped with the vault’s KEK and stored alongside the ciphertext; it never exists in plain form outside the HSM boundary during wrap/unwrap.
- **JWT signing key** — A separate Ed25519 key in the same KMS key ring. Used to sign and verify JWTs for human and agent auth. Only the public part is used for verification; signing happens inside KMS.

## Flow (create secret)

1. Client sends plaintext secret to the API with a vault ID and path.
2. API generates a new DEK, encrypts the plaintext with AES-256-GCM using the DEK.
3. API calls KMS to wrap the DEK with the vault’s KEK; the wrapped DEK is stored with the ciphertext, IV, and auth tag.
4. Stored row: `vault_id`, `path`, `ciphertext`, `wrapped_dek`, `iv`, `auth_tag`, metadata, version, etc.

## Flow (read secret)

1. Client requests secret by vault ID and path (with valid JWT and policy allowing read).
2. API loads the latest version’s ciphertext and wrapped DEK.
3. API calls KMS to unwrap the DEK with the vault’s KEK.
4. API decrypts the ciphertext with the DEK and returns the plaintext to the client.

## Production vs local

- **Production** — KEKs and JWT key in **Google Cloud KMS** (same GCP project as Cloud Run). Service account has `cryptoKeyEncrypterDecrypter` and `signerVerifier` on the key ring.
- **Local** — SoftHSM or in-memory provider for development; same envelope design, keys not persisted to real HSM.

## Why this matters

Secrets at rest are encrypted with keys that never leave the HSM. Compromise of the database or application only exposes ciphertext and wrapped DEKs; without KMS access, secrets cannot be decrypted. Access is always mediated by the API and policies, and can be audited.

See [Key hierarchy](/docs/security/key-hierarchy) and [Security overview](/docs/security/hsm-overview) for more detail.
