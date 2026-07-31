---
title: Customer-Managed Encryption Keys (CMEK)
description: Add a client-side AES-256-GCM encryption layer on top of HSM envelope encryption. Your key never touches the server.
sidebar_position: 5
---

# Customer-Managed Encryption Keys (CMEK)

CMEK adds a **client-side encryption layer** on top of 1claw's HSM-backed envelope encryption. Your key never touches 1claw servers — only its SHA-256 fingerprint is stored so the vault can track which key was used.

## Who this is for

CMEK is designed for organizations that require **cryptographic proof that 1claw cannot access their secrets unilaterally**. If you don't have this requirement, the default HSM encryption is already strong — every vault gets its own KEK in the HSM, every secret version gets a fresh DEK, and plaintext keys exist only in memory during crypto operations.

CMEK is available on **Business** and **Enterprise** plans.

## How it works

When CMEK is enabled on a vault, secrets are double-encrypted:

1. **Client-side**: You encrypt the secret value with your CMEK key (AES-256-GCM) before it reaches the server.
2. **Server-side**: 1claw applies its standard HSM envelope encryption on top.

At rest, each secret is wrapped in two independent encryption layers. A full server compromise yields only doubly-encrypted blobs — useless without your CMEK key.

### Wire format

```
[1 byte version = 0x01][12 bytes IV][N bytes ciphertext][16 bytes GCM auth tag]
```

The version byte allows future algorithm changes without breaking existing secrets.

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/v1/vaults/:vault_id/cmek` | Enable CMEK (send fingerprint only) |
| DELETE | `/v1/vaults/:vault_id/cmek` | Disable CMEK |
| POST | `/v1/vaults/:vault_id/cmek-rotate` | Start key rotation (old+new keys in headers) |
| GET | `/v1/vaults/:vault_id/cmek-rotate/:job_id` | Poll rotation job status |

## Enabling CMEK

### Dashboard

1. Navigate to your vault → **Settings** tab
2. Click **Enable CMEK** in the Customer-Managed Key card
3. A 256-bit AES key is generated **in your browser** via WebCrypto
4. Download the `.key` file and store it safely (password manager, hardware key, etc.)
5. Confirm you've saved the key, then click **Enable CMEK**

Only the key's SHA-256 fingerprint is sent to the server.

### SDK

```typescript
import {
  generateCmekKey,
  cmekFingerprint,
  toBase64,
} from "@1claw/sdk";

// Generate a key (runs in browser or Node.js 18+)
const key = await generateCmekKey();
const fingerprint = await cmekFingerprint(key);

// Store the key safely — you'll need it for every read/write
console.log("Key (base64):", toBase64(key));
console.log("Fingerprint:", fingerprint);

// Enable CMEK on the vault
await client.vault.enableCmek(vaultId, { fingerprint });
```

### CLI

```bash
# The CLI does not generate keys — use the dashboard or SDK.
# You can check CMEK status via the vault detail:
1claw vault get <vault-id>
```

## Reading and writing secrets

When a vault has CMEK enabled, you must encrypt values before writing and decrypt after reading.

### SDK

```typescript
import {
  cmekEncrypt,
  cmekDecrypt,
  toBase64,
  fromBase64,
} from "@1claw/sdk";

// Write: encrypt before sending
const plaintext = new TextEncoder().encode("my-secret-value");
const encrypted = await cmekEncrypt(plaintext, cmekKey);
await client.secrets.set(vaultId, "api-keys/stripe", toBase64(encrypted), {
  type: "api_key",
});

// Read: decrypt after receiving
const { data } = await client.secrets.get(vaultId, "api-keys/stripe");
if (data?.cmek_encrypted) {
  const blob = fromBase64(data.value);
  const decrypted = await cmekDecrypt(blob, cmekKey);
  const value = new TextDecoder().decode(decrypted);
  console.log(value); // "my-secret-value"
}
```

The `cmek_encrypted` flag on the response tells you whether the value needs client-side decryption.

## Key rotation

Over time, you may need to rotate your CMEK key (policy requirements, suspected compromise, etc.). 1claw supports **server-assisted rotation** that handles large vaults efficiently.

### How server-assisted rotation works

1. You provide the old key and the new key via HTTP headers (TLS-protected)
2. The server processes secrets in batches of 100, atomically per batch
3. Each secret is: HSM-decrypted → CMEK-decrypted with old key → CMEK-encrypted with new key → HSM-encrypted
4. Progress is tracked in a rotation job — you can poll for status
5. If interrupted, the rotation can be resumed (each secret tracks its CMEK fingerprint)

Both keys exist in server memory **only during the rotation operation** and are discarded immediately after.

### SDK

```typescript
const { data: job } = await client.vault.rotateCmek(
  vaultId,
  toBase64(oldKey),
  toBase64(newKey),
  newFingerprint,
);

// Poll for completion
let status = job;
while (status?.status === "running") {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await client.vault.getRotationJobStatus(vaultId, job!.id);
  status = res.data;
  console.log(`Progress: ${status?.processed}/${status?.total_secrets}`);
}
```

### Trade-off

During rotation, both keys are in server memory for the duration of the operation. If your threat model excludes **any** server-side key presence, perform rotation client-side via the SDK by reading each secret, decrypting with the old key, re-encrypting with the new key, and writing back.

## Agent considerations

For agents, CMEK means storing the key in the agent's environment (e.g., `ONECLAW_CMEK_KEY` env var). This is appropriate when the agent operator has secure infrastructure for managing that key.

**For most agent use cases, vault binding and short-lived tokens (Phase 1) provide sufficient security without key management overhead.** See the [Securing Agent Access](./securing-agent-access) guide.

If you do use CMEK with agents:

- Store the CMEK key in a secure secret manager or hardware-bound store
- Use the SDK's `cmekEncrypt` / `cmekDecrypt` functions in your agent code
- Consider Phase 3 (KMS-delegated team keys) when available — it eliminates raw key material from agent environments entirely

## What CMEK protects against

| Threat | Protected? |
|--------|-----------|
| 1claw server compromise | Yes — attacker gets doubly-encrypted blobs |
| 1claw operator reading secrets | Yes — operator cannot decrypt without your key |
| Database backup theft | Yes — backups contain only encrypted data |
| Your CMEK key leaked | No — attacker with key + API access can read secrets |
| Compromised agent environment | Partially — depends on how the key is stored |

## Disabling CMEK

You can disable CMEK on a vault at any time. New secrets will use HSM-only encryption. Existing CMEK-encrypted secrets **still require the key to decrypt** — disabling only affects new writes.
