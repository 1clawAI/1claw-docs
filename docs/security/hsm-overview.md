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

## Operational security

- Key material does not exist in application memory except as wrapped ciphertext or short-lived DEK during decrypt.
- Access to KMS is via IAM; the vault service account has least-privilege roles (cryptoKeyEncrypterDecrypter for KEKs, signerVerifier for JWT).
- Audit logging records access and failures without logging secret values.

See [Key hierarchy](/docs/security/key-hierarchy) and [HSM architecture](/docs/concepts/hsm-architecture) for the encryption flow.
