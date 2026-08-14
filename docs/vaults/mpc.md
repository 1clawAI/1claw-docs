---
title: Multi-Party Computation (MPC)
description: Split secret DEKs across multiple HSM providers so no single provider holds the complete key — XOR 2-of-2, Shamir 2-of-3, and client-custody modes.
sidebar_position: 17
---

# Multi-Party Computation (MPC)

MPC splits each secret's data-encryption key (DEK) across multiple HSM providers. Even if one provider is fully compromised, the attacker cannot reconstruct the DEK — they hold only one share. This is an opt-in, vault-level feature that layers on top of 1claw's standard HSM envelope encryption.

## Custody modes

1claw supports three custody modes, each with different trust and operational trade-offs:

### `2of2_client_custody` — XOR split

The DEK is XOR-split into two shares: one stored on the server (encrypted by GCP KMS), one returned to **you** as a `client_share`. Both shares are required to reconstruct the DEK.

- **Write:** `PUT` response includes `client_share` (base64). You must store this.
- **Read:** `GET` requires the `X-Client-Share` header with your share.
- **Trust model:** 1claw cannot decrypt without your share; you cannot decrypt without theirs.

Best for: maximum sovereignty when you can securely store the client share.

### `2of3_multi_hsm` — Shamir 2-of-3

The DEK is split into three Shamir shares distributed across GCP KMS, AWS KMS, and Azure Key Vault. Any two of three are sufficient to reconstruct.

- **Write:** No client share returned — all shares are server-managed.
- **Read:** No `X-Client-Share` header needed. Reconstruction is transparent.
- **Trust model:** No single cloud provider can decrypt. Two providers must cooperate (or be simultaneously compromised).

Best for: high availability with multi-cloud resilience — no client share to manage.

### `2of3_client_custody` — Shamir 2-of-3 with client share

The DEK is split into three Shamir shares: two stored on separate HSMs (GCP + AWS), one returned to **you** as a `client_share`. Any two of three are sufficient to reconstruct, but the server alone holds only two — it can reconstruct without you, yet you gain an additional recovery path.

- **Write:** `PUT` response includes `client_share` (base64).
- **Read:** `GET` requires the `X-Client-Share` header.
- **Trust model:** Hybrid — multi-HSM resilience plus client custody. If one HSM is compromised, the attacker still needs either the other HSM share or your client share.

Best for: defense-in-depth with a client-held recovery share.

## Enabling MPC on a vault

MPC is enabled per-vault via a single API call. The custody mode is **immutable once set** — you cannot change modes after enablement.

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/VAULT_ID/mpc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "custody_mode": "2of3_multi_hsm"
  }'
```

For modes that use specific providers, you can optionally specify them:

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/VAULT_ID/mpc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "custody_mode": "2of3_multi_hsm",
    "providers": ["gcp", "aws", "azure"]
  }'
```

:::caution
The custody mode cannot be changed after it is set on a vault. Choose carefully based on your security requirements and operational capabilities.
:::

## Writing secrets to an MPC vault

Use the standard `PUT /v1/vaults/{id}/secrets/{path}` endpoint. For custody modes that include a client share (`2of2_client_custody` and `2of3_client_custody`), the response includes a `client_share` field:

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/VAULT_ID/secrets/api-keys/stripe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "sk_live_abc123...",
    "type": "api_key"
  }'
```

Response (for client-custody modes):

```json
{
  "path": "api-keys/stripe",
  "version": 1,
  "client_share": "dGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHNoYXJl..."
}
```

:::danger
Store the `client_share` securely — in a password manager, hardware security module, or offline backup. If you lose the client share for a `2of2_client_custody` vault, the secret **cannot be recovered**. For `2of3_client_custody`, the server can still reconstruct with its two HSM shares, but you lose the additional recovery path.
:::

## Reading secrets from an MPC vault

For modes with client custody, include the `X-Client-Share` header:

```bash
curl "https://api.1claw.xyz/v1/vaults/VAULT_ID/secrets/api-keys/stripe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Client-Share: dGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHNoYXJl..."
```

For `2of3_multi_hsm`, no header is needed — reads work like any other vault:

```bash
curl "https://api.1claw.xyz/v1/vaults/VAULT_ID/secrets/api-keys/stripe" \
  -H "Authorization: Bearer $TOKEN"
```

## How it works under the hood

```
             PUT /vaults/{id}/secrets/{path}
                         │
              ┌──────────┴──────────┐
              │  Generate DEK       │
              │  Encrypt secret     │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ GCP KMS  │   │ AWS KMS  │   │ Azure KV │
   │ Share 1  │   │ Share 2  │   │ Share 3  │
   └──────────┘   └──────────┘   └──────────┘
         │               │               │
         └───────┬───────┘               │
                 ▼                       │
          Any 2 of 3 → reconstruct DEK  │
                                (client share
                                 if applicable)
```

1. A fresh DEK is generated for each secret version.
2. The DEK encrypts the secret value (AES-256-GCM).
3. The DEK itself is split according to the custody mode.
4. Each share is encrypted by its respective HSM provider's KEK and stored in the `secret_dek_shares` table.
5. On read, the required number of shares are retrieved, decrypted by each provider, and the DEK is reconstructed.

The Shamir implementation uses **GF(256)** arithmetic with a configurable threshold. The XOR split is a simple two-party split — computationally equivalent to a one-time pad.

## Comparison of modes

| Aspect                  | `2of2_client_custody`         | `2of3_multi_hsm`              | `2of3_client_custody`         |
|-------------------------|-------------------------------|-------------------------------|-------------------------------|
| Client share required   | Yes                           | No                            | Yes                           |
| HSM providers           | GCP only                      | GCP + AWS + Azure             | GCP + AWS (+ client)          |
| Can server decrypt alone| No                            | Yes (any 2 of 3)              | Yes (GCP + AWS shares)        |
| Risk if share lost      | Secret unrecoverable          | N/A                           | Lose recovery path            |
| Operational overhead    | Must manage client share      | None                          | Must manage client share      |
| Best for                | Maximum sovereignty           | Multi-cloud resilience        | Defense-in-depth              |

## MPC in treasury wallets

[Treasury wallets](/docs/treasury/overview) automatically use MPC custody for their `__treasury-keys` vault. The custody mode is determined by your billing tier:

- **Pro / Team** → `2of2_client_custody` (XOR split)
- **Business / Enterprise** → `2of3_multi_hsm` (Shamir across GCP, AWS, Azure)

You don't need to enable MPC manually for treasury wallets — it's configured automatically at vault creation time.

## Use cases

- **Regulatory compliance** — demonstrate that no single entity (including 1claw) can access secrets unilaterally
- **High-security vaults** — signing keys, root credentials, and other crown-jewel secrets
- **Multi-cloud strategy** — eliminate single-provider risk for your most sensitive data
- **Key escrow** — client share acts as an independent recovery mechanism

## See also

- [Customer-Managed Keys (CMEK)](/docs/vaults/cmek) — client-side encryption layer
- [Treasury Wallets](/docs/treasury/overview) — HSM-backed multi-chain wallets with auto-MPC
- [Audit and compliance](/docs/guides/audit-and-compliance) — tamper-evident audit log
