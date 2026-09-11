---
title: Agent keys
description: Every agent gets identity keys at creation, plus optional multi-chain blockchain signing keys. Learn how they're created, stored, and accessed.
sidebar_position: 2
---

# Agent keys

When you [register an agent](/docs/vaults/human-api/agents/register-agent) via `POST /v1/agents`, 1Claw automatically generates three types of cryptographic material:

| Key | Algorithm | Purpose | Storage |
|-----|-----------|---------|---------|
| **API key** | `ocv_...` (random, argon2-hashed) | Authentication — token exchange via `POST /v1/auth/agent-token` | Hash in DB; plaintext returned once at creation |
| **SSH identity key** | Ed25519 | Message signing, identity verification | Private key in `__agent-keys` vault; public key on agent record (`ssh_public_key`) |
| **ECDH key** | P-256 (secp256r1) | Key agreement — derive shared secrets for encrypted agent-to-agent messaging | Private key in `__agent-keys` vault; public key on agent record (`ecdh_public_key`) |

Additionally, humans can provision **multi-chain blockchain signing keys** for agents via the [Intents API](/docs/agents/intents/signing#signing-keys).

## Authenticating without a stored key

`auth_method` on the agent record decides what the agent presents at
`POST /v1/auth/agent-token`. The default is `api_key`, which means a long-lived
`ocv_` key lives wherever the agent runs. Two alternatives avoid that.

### OIDC (`oidc_client_credentials`)

For agents that run somewhere with its own identity, such as CI. The job
presents the token its platform mints for that run, and nothing long-lived is
stored in the runner.

```bash
1claw agent create ci-deployer \
  --auth-method oidc_client_credentials \
  --oidc-issuer https://token.actions.githubusercontent.com \
  --oidc-client-id https://github.com/acme/checkout
```

Exchange the platform token for an agent token:

```bash
curl -X POST https://api.1claw.co/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<uuid>","oidc_token":"<token from your CI platform>"}'
```

`oidc_issuer` and `oidc_client_id` are read from the agent record, never from
the presented token. The discovery document at
`{issuer}/.well-known/openid-configuration` must name itself as the issuer and
advertise an `https` `jwks_uri`. A token signed by a different issuer, or minted
for a different audience, is refused even when its signature is valid.

Only RS256 is verified today. A token signed with EdDSA or ES256 is refused with
a message naming the key type rather than failing as a bad token.

### mTLS (`mtls`)

This service does not terminate TLS, so it cannot see the handshake. What it
does is bind the certificate your terminator already verified to the agent that
registered it, by comparing against `client_cert_fingerprint`.

```bash
1claw agent create edge-worker \
  --auth-method mtls \
  --client-cert-fingerprint <sha256 of the client certificate>
```

The fingerprint is read from `X-Forwarded-Client-Cert` (Envoy and Istio) or
`X-Client-Cert-Sha256`.

:::warning Requires a terminator that rewrites the header
Both headers are ordinary request headers. Anything that can reach the API can
set them, and a fingerprint is a certificate hash rather than a secret. They are
believed only when the deployment sets `ONECLAW_TRUST_CLIENT_CERT_HEADERS=1`,
which asserts that a TLS terminator in front discards whatever the client sent
and rewrites it from the real handshake.

Without that, mTLS authentication refuses and says so. On Cloud Run,
`X-Forwarded-Client-Cert` is stripped by the frontend, so a deployment there
needs a terminator that both performs mTLS and sets the header.
:::

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
  https://api.1claw.co/v1/agents/<agent_id>

# Agent (get own profile)
curl -H "Authorization: Bearer <agent-jwt>" \
  https://api.1claw.co/v1/agents/me
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
curl -X POST "https://api.1claw.co/v1/vaults/<agent-keys-vault-id>/policies" \
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
# Ed25519 SSH identity key
GET /v1/vaults/<agent-keys-vault-id>/secrets/agents/<agent_id>/ssh/private_key

# P-256 ECDH key
GET /v1/vaults/<agent-keys-vault-id>/secrets/agents/<agent_id>/ecdh/private_key
```

:::warning Intents API blocks raw key reads
When `intents_api_enabled` is true on the agent, `get_secret` returns **403** for `private_key` and `ssh_key` type secrets even with a read policy. Agents must use the transaction/sign proxy instead of exfiltrating raw keys.
:::

Humans can resolve the `__agent-keys` vault id via `GET /v1/org/agent-keys-vault` and reveal keys in the dashboard Agent Identity card.

:::tip
The `ecdh:setup-agents` script in the [Google A2A example](/docs/vaults/golden-path) automates this: it creates agents and grants each one read access to its own keys.
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

See the [Intents API guide](/docs/agents/intents/signing#signing-keys) for full provisioning and signing documentation.
