---
title: HSM overview
description: 1claw uses an HSM to hold KEKs and the JWT signing key; in production this is Google Cloud KMS; secrets are encrypted with keys that never leave the HSM.
sidebar_position: 0
---

# HSM overview

1claw encrypts secrets with keys that never leave a **Hardware Security Module (HSM)**. In production the HSM is **Google Cloud KMS**: a key ring holds the JWT signing key (Ed25519) and one Key Encryption Key (KEK) per vault (symmetric). The vault API runs on Cloud Run and has IAM permissions to use KMS for sign, encrypt, and decrypt; it never has access to raw key material.

## What the HSM protects

- **KEKs** — Used only to wrap and unwrap Data Encryption Keys (DEKs). Each vault has one KEK. DEKs encrypt secret values; KEKs encrypt DEKs. Without KMS access, ciphertext and wrapped DEKs in the database are useless.
- **JWT signing key** — Ed25519 key used to sign and verify access tokens. Signing is done inside KMS; only the public key is used for verification. This prevents token forgery.

## Key rotation

GCP KMS KEKs are created with a **365-day rotation period** (NIST SP 800-57 maximum for symmetric KEKs). When KMS rotates a key, it creates a new key version and marks it as the primary. New encrypt operations use the latest version; existing ciphertext remains decryptable because KMS retains all prior versions and selects the correct one based on the ciphertext metadata. A nightly cleanup job schedules destruction of old versions, keeping the two most recent active.

No application-side re-encryption is needed on rotation — GCP KMS handles version selection transparently.

## Data integrity verification

All KMS operations (encrypt, decrypt, sign) include **CRC32C checksum verification**:

- **Request side** — The API sends a CRC32C of the input plaintext or data alongside the payload. KMS verifies this before processing.
- **Response side** — The API computes a CRC32C of the returned ciphertext, plaintext, or signature and compares it against the checksum in the KMS response.

If any checksum mismatches (indicating in-transit corruption or tampering), the operation fails immediately with an internal error. This protects against silent data corruption between the application and the HSM.

## Operational security

- Key material does not exist in application memory except as wrapped ciphertext or short-lived DEK during decrypt.
- Access to KMS is via IAM; the vault service account has least-privilege roles (cryptoKeyEncrypterDecrypter for KEKs, signerVerifier for JWT).
- Production KMS keys use **HSM protection level** (protection_level = 2), meaning cryptographic operations occur inside a FIPS 140-2 Level 3 hardware module.
- Audit logging records access and failures without logging secret values.

See [Key hierarchy](/docs/security/key-hierarchy) and [HSM architecture](/docs/concepts/hsm-architecture) for the encryption flow.
