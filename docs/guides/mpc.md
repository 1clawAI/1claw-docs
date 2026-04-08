---
title: MPC Secret Storage
description: Split secret encryption keys across multiple HSM providers so no single provider holds the complete key. Supports client custody and multi-HSM modes.
sidebar_position: 6
tags: [mpc, security, encryption, hsm]
---

# MPC Secret Storage

MPC (Multi-Party Computation) secret storage splits the **data encryption key (DEK)** for each secret across multiple HSM providers. No single provider — including 1claw — holds the complete key needed to decrypt a secret. This eliminates single points of compromise at the cryptographic layer.

## Who this is for

MPC is designed for organizations that need **key-splitting guarantees**: even if one HSM provider is fully compromised, the attacker cannot reconstruct the DEK without shares from the other providers (or the client).

If you don't have this requirement, the default HSM envelope encryption is already strong — every vault gets its own KEK, every secret version gets a fresh DEK, and plaintext keys exist only in memory during crypto operations. For an additional client-side layer without key splitting, see [CMEK](./customer-managed-keys).

MPC is available on **Business** and **Enterprise** plans.

## Custody modes

MPC supports three modes, each with different trust assumptions and operational requirements:

### 2-of-2 Client Custody

```
┌─────────────┐     ┌─────────────┐
│  GCP KMS    │     │  Client     │
│  (Share 1)  │     │  (Share 2)  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               ▼
         DEK reconstructed
         (in memory only)
```

- **Split method:** XOR — the DEK is split into two shares via bitwise XOR.
- **Share 1:** Stored on the server, encrypted by GCP KMS.
- **Share 2:** Returned to the client as `client_share` in the API response. **You must store this securely — it is only returned once.**
- **On read:** You send the client share via the `X-Client-Share` header. The server reconstructs the DEK in memory, decrypts, and discards.
- **Trust model:** Neither 1claw nor GCP alone can decrypt. The client must be online and provide their share for every read.

### 2-of-3 Multi-HSM

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  GCP KMS    │  │  AWS KMS    │  │ Azure Key   │
│  (Share 1)  │  │  (Share 2)  │  │ Vault (3)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────┬───────┘                │
                ▼                        │
          DEK reconstructed              │
          (any 2 of 3 shares)    (redundant)
```

- **Split method:** Shamir secret sharing over GF(256) with threshold 2, total shares 3.
- **Providers:** GCP KMS (primary), AWS KMS, Azure Key Vault. Each provider encrypts its share with its own KEK.
- **No client share needed.** The server reconstructs the DEK from any 2 of 3 provider shares.
- **Trust model:** Any single cloud provider compromise is insufficient. Two providers must be simultaneously compromised to reconstruct a DEK. The client does not need to store or present any material.

### 2-of-3 Client Custody

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  GCP KMS    │  │  AWS KMS    │  │  Client     │
│  (Share 1)  │  │  (Share 2)  │  │  (Share 3)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────┬───────┴────────────────┘
                ▼
          DEK reconstructed
          (any 2 of 3 shares)
```

- **Split method:** Shamir 2-of-3 — same as multi-HSM, but the third share goes to the client instead of Azure.
- **Share 3:** Returned to the client as `client_share`. Required via `X-Client-Share` header on read.
- **Trust model:** Any single party (including 1claw with both server shares) can be compromised without exposing the DEK — but two of the three parties must collude or be compromised simultaneously.

## Enabling MPC on a vault

MPC is enabled at the vault level. All secrets in an MPC vault use key splitting.

### API

```bash
POST /v1/vaults/{vault_id}/mpc
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "custody_mode": "2of2_client_custody"
}
```

For multi-HSM modes, you can optionally specify providers:

```bash
{
  "custody_mode": "2of3_multi_hsm",
  "providers": ["gcp", "aws", "azure"]
}
```

### SDK

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  apiKey: "1ck_...",
  baseUrl: "https://api.1claw.xyz",
});

// Create a vault with MPC enabled
const { data: vault } = await client.vault.create({
  name: "mpc-vault",
  description: "Vault with 2-of-2 client custody",
});

// Enable MPC on the vault
await client.vault.enableMpc(vault!.id, {
  custody_mode: "2of2_client_custody",
});
```

### Dashboard

1. Navigate to your vault → **Settings** tab
2. Find the **MPC Secret Storage** card
3. Select a custody mode from the dropdown
4. Click **Enable MPC**

For client custody modes, the dashboard will show a reminder that you must securely store the `client_share` returned with each secret.

## Storing secrets (client custody modes)

When you write a secret to an MPC vault with a client custody mode, the response includes a `client_share` field. **This share is returned exactly once — store it securely.**

### SDK

```typescript
// Write a secret — response includes client_share for client custody modes
const { data: created } = await client.secrets.put(vault.id, "api-keys/stripe", {
  type: "api_key",
  value: "sk_live_abc123...",
});

if (created?.client_share) {
  // CRITICAL: Store this securely. It is only returned once.
  console.log("Client share (store this):", created.client_share);
  // Example: save to a hardware security key, password manager, or secure env
}
```

### API

```bash
PUT /v1/vaults/{vault_id}/secrets/api-keys/stripe
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "type": "api_key",
  "value": "sk_live_abc123..."
}
```

Response (client custody modes):

```json
{
  "path": "api-keys/stripe",
  "version": 1,
  "client_share": "base64-encoded-share..."
}
```

## Reading secrets (client custody modes)

For 2-of-2 and 2-of-3 client custody modes, you must present the `client_share` via the `X-Client-Share` header when reading a secret.

### SDK

```typescript
// Read a secret — provide client_share for client custody modes
const { data: secret } = await client.secrets.get(vault.id, "api-keys/stripe", {
  headers: {
    "X-Client-Share": clientShare, // The base64 share from secret creation
  },
});

console.log(secret?.value); // "sk_live_abc123..."
```

### API

```bash
GET /v1/vaults/{vault_id}/secrets/api-keys/stripe
Authorization: Bearer <jwt>
X-Client-Share: base64-encoded-share...
```

### Multi-HSM (no client share needed)

For 2-of-3 multi-HSM mode, no client share is required. The server reconstructs the DEK from any 2 of the 3 provider shares:

```typescript
// Multi-HSM: no client share needed
const { data: secret } = await client.secrets.get(vault.id, "api-keys/stripe");
console.log(secret?.value);
```

## Choosing a custody mode

| | 2-of-2 Client | 2-of-3 Multi-HSM | 2-of-3 Client |
|---|---|---|---|
| **Client share required** | Yes | No | Yes |
| **Providers** | GCP KMS | GCP + AWS + Azure | GCP + AWS + Client |
| **Single-provider compromise safe** | Yes | Yes | Yes |
| **1claw compromise safe** | Yes | Yes (needs 2 providers) | Yes (needs provider + client) |
| **Operational overhead** | Medium — store 1 share per secret | Low — fully server-side | Medium — store 1 share per secret |
| **Offline read** | No (server + client needed) | No (server needed) | No (server + client needed) |
| **Best for** | Maximum human control | Hands-off multi-cloud security | Balanced: multi-cloud + human custody |

## Security model

### What MPC protects against

| Threat | 2-of-2 Client | 2-of-3 Multi-HSM | 2-of-3 Client |
|--------|--------------|-------------------|----------------|
| Single cloud provider compromise | **Protected** | **Protected** | **Protected** |
| 1claw server compromise | **Protected** | **Protected** (needs 2nd provider) | **Protected** |
| Two cloud providers compromised | N/A (only 1 provider) | **Exposed** | **Protected** (client share needed) |
| Client share leaked | **Exposed** (with server share) | N/A | Partial (still need 1 server share) |
| Database backup theft | **Protected** | **Protected** | **Protected** |

### How it integrates with existing encryption

MPC operates at the **DEK layer** of 1claw's envelope encryption:

```
Secret value
  → Encrypted with DEK (AES-256-GCM)
    → DEK split into shares (XOR or Shamir)
      → Each share encrypted by its provider's KEK
        → Shares stored separately in the database
```

MPC is compatible with [CMEK](./customer-managed-keys) — you can use both for triple-layered protection (client-side CMEK + MPC key splitting + per-provider KEK wrapping), though this is rarely necessary.

## Agent considerations

For agents accessing secrets in an MPC vault:

- **Multi-HSM mode:** No changes needed. Agents read secrets normally; the server handles share reconstruction transparently.
- **Client custody modes:** The agent must have the `client_share` and include it in every read request via `X-Client-Share`. Store the share in the agent's secure environment (e.g., `ONECLAW_CLIENT_SHARE` env var).

```typescript
// Agent code for client custody MPC vault
import { createClient } from "@1claw/sdk";

const client = createClient({
  agentId: process.env.ONECLAW_AGENT_ID,
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});

const { data: secret } = await client.secrets.get(vaultId, "api-keys/stripe", {
  headers: {
    "X-Client-Share": process.env.ONECLAW_CLIENT_SHARE!,
  },
});
```

:::warning Client share management
The `client_share` is returned **once** when a secret is created. If you lose it, the secret **cannot be decrypted** — 1claw cannot recover it. Treat client shares with the same care as private keys.
:::

## Database schema

MPC adds these tables (migration `063_add_mpc_support.sql`):

| Table | Purpose |
|-------|---------|
| `vault_mpc_keks` | Per-provider KEK references for each MPC vault |
| `secret_dek_shares` | Per-secret DEK shares keyed by vault + provider |

Vault-level columns: `mpc_custody` (TEXT), `mpc_threshold` (INTEGER), `mpc_providers` (TEXT[]).

## Comparison with CMEK

| Feature | CMEK | MPC |
|---------|------|-----|
| **Encryption layer** | Client-side (on top of HSM) | DEK splitting (within HSM layer) |
| **Key location** | Client holds entire key | Key split across providers |
| **Single point of failure** | Client key loss = data loss | Provider compromise = safe (threshold) |
| **Operational model** | Encrypt/decrypt every read/write | Transparent (multi-HSM) or share per read (client custody) |
| **Use together?** | Yes — CMEK wraps the value before MPC splits the DEK | |
