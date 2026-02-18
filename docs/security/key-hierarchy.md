---
title: Key hierarchy
description: KEK per vault in HSM; DEK per secret (or operation); DEK wraps plaintext, KEK wraps DEK; JWT key is separate Ed25519 in same key ring.
sidebar_position: 1
---

# Key hierarchy

1. **JWT signing key (Ed25519)** — One per deployment. Lives in the same KMS key ring. Used only to sign and verify JWTs. Public key is used by the API to validate tokens; private key never leaves KMS.

2. **KEK (Key Encryption Key)** — One per vault. Symmetric key in KMS. Created when the vault is created. Used only to:
   - **Wrap** a DEK (encrypt the DEK) when storing a secret.
   - **Unwrap** a DEK (decrypt the DEK) when reading a secret.

3. **DEK (Data Encryption Key)** — Random 256-bit key generated per secret (or per write). Used with AES-256-GCM to encrypt the secret value. The DEK is then wrapped by the vault’s KEK and stored with the ciphertext. It exists in plain form only inside the API during the encrypt/decrypt operation and is never persisted in the clear.

## Flow summary

- **Write:** Generate DEK → Encrypt plaintext with DEK (AES-GCM) → Wrap DEK with KEK (KMS) → Store ciphertext + wrapped DEK + IV + tag.
- **Read:** Load ciphertext + wrapped DEK → Unwrap DEK with KEK (KMS) → Decrypt ciphertext with DEK → Return plaintext.

This is standard **envelope encryption**. Compromise of the database or application does not reveal secrets without KMS access.
