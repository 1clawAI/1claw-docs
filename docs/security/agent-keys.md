---
title: Agent keys
description: Every agent gets identity keys at creation, plus optional multi-chain blockchain signing keys. Learn how they're created, stored, and accessed.
sidebar_position: 2
---

# Agent keys

When you [register an agent](/docs/human-api/agents/register-agent) via `POST /v1/agents`, 1Claw automatically generates three types of cryptographic material:

| Key | Algorithm | Purpose | Storage |
|-----|-----------|---------|---------|
| **API key** | `ocv_...` (random, argon2-hashed) | Authentication — token exchange via `POST /v1/auth/agent-token` | Hash in DB; plaintext returned once at creation |
| **Signing key** | Ed25519 | Message signing, identity verification | Private key in `__agent-keys` vault; public key on agent record (`ssh_public_key`) |
| **ECDH key** | P-256 (secp256r1) | Key agreement — derive shared secrets for encrypted agent-to-agent messaging | Private key in `__agent-keys` vault; public key on agent record (`ecdh_public_key`) |

Additionally, humans can provision **multi-chain blockchain signing keys** for agents via the [Intents API](/docs/guides/intents-api#signing-keys).

## How keys are created

All three keys are generated server-side during `POST /v1/agents`:

1. **API key** — 32 random bytes, base64url-encoded with `ocv_` prefix. The plaintext is returned in the response and never stored; only the argon2 hash is persisted.

2. **Ed25519 signing keypair** — Generated via `ed25519-dalek`. The 32-byte private key (base64) is stored as an encrypted secret in the org's `__agent-keys` vault at `agents/{agent_id}/ssh/private_key`. The 32-byte public key (base64) is stored on the agent record.

3. **P-256 ECDH keypair** — Generated via the `p256` crate. The 32-byte private scalar (base64) is stored in `__agent-keys` at `agents/{agent_id}/ecdh/private_key`. The 65-byte uncompressed SEC1 public point (base64) is stored on the agent record.

The `__agent-keys` vault is auto-created per organization on first agent creation. All secrets in it are HSM-encrypted with the same envelope encryption used for regular vaults.

## Accessing keys via the API

### Public keys (no special access needed)

Public keys are returned on the agent record:

```bash
# Human (list/get agents)
curl -H "Authorization: Bearer <token>" \
  https://api.1claw.xyz/v1/agents/<agent_id>

# Agent (get own profile)
curl -H "Authorization: Bearer <agent-jwt>" \
  https://api.1claw.xyz/v1/agents/me
```

Response includes:

```json
{
  "id": "ec7e0226-...",
  "name": "Alice",
  "ssh_public_key": "m+Z6jV5W86WMTV27cpk9QGXIo+fP1OX88dHxdj6DHUI=",
  "ecdh_public_key": "BDq8k3Lw...base64...65bytes..."
}
```

### Private keys (requires access policy)

Private keys are stored as secrets in the `__agent-keys` vault. To let an agent read its own keys, grant it a policy:

```bash
# Grant agent read access to its own keys in __agent-keys
curl -X POST "https://api.1claw.xyz/v1/vaults/<agent-keys-vault-id>/policies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "principal_type": "agent",
    "principal_id": "<agent_id>",
    "permissions": ["read"],
    "secret_path_pattern": "agents/<agent_id>/**"
  }'
```

Then the agent can read its private keys:

```bash
# Ed25519 signing key
GET /v1/vaults/<agent-keys-vault-id>/secrets/agents/<agent_id>/ssh/private_key

# P-256 ECDH key
GET /v1/vaults/<agent-keys-vault-id>/secrets/agents/<agent_id>/ecdh/private_key
```

:::tip
The `ecdh:setup-agents` script in the [Google A2A example](/docs/guides/give-agent-access) automates this: it creates agents and grants each one read access to its own keys.
:::

## Key formats

| Key | Format | Size |
|-----|--------|------|
| Ed25519 private | Raw 32-byte seed, base64 | 44 chars |
| Ed25519 public | Raw 32-byte verifying key, base64 | 44 chars |
| P-256 ECDH private | Raw 32-byte scalar, base64 | 44 chars |
| P-256 ECDH public | Uncompressed SEC1 point (`04 \|\| x \|\| y`), base64 | 88 chars |

## Design rationale

- **Ed25519 for signing** — Deterministic nonces (no catastrophic nonce-reuse bugs), fast, compact signatures. Widely used in SSH, TLS, and JWT.
- **P-256 ECDH for key agreement** — Standard curve for Diffie-Hellman key exchange (TLS, ECIES, A2A messaging). Distinct from the signing key because signing and key agreement are separate cryptographic operations.
- **Separate keys for separate purposes** — Signing keys prove identity; ECDH keys establish shared secrets. Using the same key for both is a known anti-pattern that can leak information about the private key.

## Multi-chain blockchain signing keys

Beyond the identity keys above, agents can be provisioned with per-chain signing keys for blockchain transactions. These are stored in the same `__agent-keys` vault and follow the same HSM envelope encryption.

| Chain | Curve | Address format |
|-------|-------|----------------|
| Ethereum | secp256k1 | 0x EIP-55 checksum |
| Bitcoin | secp256k1 | P2WPKH native SegWit (bc1q…) |
| Solana | Ed25519 | Base58 |
| XRP | Ed25519 | Base58Check (r…) |
| Cardano | Ed25519 | Bech32 enterprise (addr1…) |
| Tron | secp256k1 | Base58Check (T…) |

Multi-chain signing keys are:

- **Provisioned by humans only** — `POST /v1/agents/{id}/signing-keys` requires a human user token. Agents get 403.
- **Rotatable** — `POST /v1/agents/{id}/signing-keys/{chain}/rotate` creates a new key version and deactivates the old one.
- **Displayed in the dashboard** — The agent detail page shows a "Signing Keys" card with public keys, addresses, and key version.
- **Used by the unified sign endpoint** — `POST /v1/agents/{id}/sign` signs EIP-191 messages, EIP-712 typed data, and EIP-2718 transactions using the agent's provisioned key for the specified chain.

See the [Intents API guide](/docs/guides/intents-api#signing-keys) for full provisioning and signing documentation.
