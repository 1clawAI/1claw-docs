---
title: Key custody
description: Who can sign with a 1Claw wallet key today, what "custodial" means here, the sanctions screen every custody model sits behind, and the passkey-held (threshold) keys that are on the way.
sidebar_label: Key custody
---

# Key custody

This page answers one question plainly: **who can produce a signature with a key 1Claw manages?** Every wallet and signing key carries a `custody` label that answers it, and the answer is enforced by code, not by terms of service.

## The two labels

| `custody` | Where the private material is | Who can sign alone |
|---|---|---|
| `server` | 1Claw generates the key and stores it as an envelope-encrypted secret (AES-256-GCM per-key DEK, wrapped by your org's KEK in Cloud KMS, HSM on paid tiers). Signing unwraps it in vault memory — or in [Shroud's TEE](/docs/security/trust-model-comparison#tee-attestation-live) when `intents_require_tee` is set — signs, and drops it. | **1Claw.** After policy, guardrails, approvals and the sanctions screen, the vault can sign on your behalf without a second party. That is what makes it custodial. |
| `client_tss` | A 2-party threshold key. 1Claw holds one share, KMS-wrapped. Your share is wrapped in your browser under a secret only your passkey can re-derive (WebAuthn PRF) or under a recovery code, and stored with us as ciphertext we cannot open (`client_key_shares`). | **Nobody.** The server signing path refuses a `client_tss` key outright; the only way to sign is the threshold protocol, which needs your passkey touch. |

Every key that existed before 2026-09-18 is `server`. `client_tss` is live for **Solana** (Ed25519, 2-of-2 FROST — Zcash Foundation's audited `frost-ed25519`, run between the vault and `@1claw/tss-wasm` in your browser). EVM, Bitcoin and Tron keys (secp256k1) stay `server` for now: two-party ECDSA needs a protocol whose round state can be serialised between requests, and the audited implementations run as in-memory state machines; the EVM answer that needs no MPC at all — a Safe whose owner is your passkey (RIP-7212) — is the next phase. Nothing moves from `server` to `client_tss` until you do it.

Read the label on any key: `custody` is on `GET /v1/treasury/wallets` and `GET /v1/agents/{id}/signing-keys` responses, and the dashboard shows a **Custodial** or **Self-custody** badge on each wallet.

## What "custodial" does and does not mean here

It means a sufficiently privileged 1Claw operator, with database access *and* KMS decrypt permission on your org's KEK, could reconstruct a `server` key. It does not mean anyone can casually read it:

- `__agent-keys` and `__treasury-keys` return **403** on the general secrets API — even to the org owner.
- Agents never see private keys; they receive signatures. An agent with `intents_api_enabled` cannot read `private_key`-type secrets anywhere.
- Export is human-only, behind password or passkey re-authentication, account lockout and an audit event (`signing_key.export`, `treasury_wallet.export`). A control-plane consensus policy on `signing_key.export` can require multiple approvers.
- With `intents_require_tee`, the key is delivered to Shroud as a KMS transit blob the vault itself cannot decrypt (vault has encrypt-only on that key; Shroud decrypt-only) and is only ever plaintext inside the Confidential VM.

Those are exfiltration controls. They constrain *who else* can use the key; they do not change *whether 1Claw can*. If your product claims to be non-custodial, `server` keys do not support that claim; `client_tss` keys will.

## Every custody model sits behind the same screens

**Sanctions.** Every path that can put a 1Claw signature on a transfer — agent submit/sign, the unified `/sign`, automations, the TEE-forwarded path, human treasury sends, and Safe proposals at creation and execution — checks the destination and, for token transfers, the recipient inside the calldata against the OFAC SDN digital-currency list. A hit is refused with **403** naming OFAC and written to the audit log as `sanctions.blocked`; no allowlist, cap or policy can admit it. The list is refreshed daily from Treasury's SDN publication and the screen **fails closed**: if the loaded list is older than seven days, transfers are paused with **503** until it is refreshed. Nothing about your keys or policies turns this off.

**Geofence.** Until threshold keys ship, creating a `server`-custody wallet (treasury generate/import, agent signing key create/import) is refused from New York (`403`, audit `custody.geofenced`). Signup from New York proceeds without the automatically provisioned treasury wallet. Existing wallets are untouched; the fence is on creating custody, not on using what you already have.

## Self-custody Solana wallets (available now)

Treasury → **Self-custody Solana wallet**. What happens:

1. A distributed key generation runs between the vault and your browser (`POST /v1/keys/tss/keygen/begin` → `round2` → `complete`). Neither side ever sees the other's share; the group public key is the wallet address.
2. One passkey touch (a tx-assert bound to `tss_keygen` + the session id) completes the ceremony and, in the same WebAuthn assertion, evaluates the passkey's PRF over a random per-key salt. That output — which never leaves your browser — wraps your share (AES-GCM), and the wrapped blob is stored with the vault (`PUT /v1/keys/{id}/client-share`).
3. **Sending**: `POST /v1/treasury/wallets/solana/tss/prepare` builds the unsigned message after wallet-access, sanctions and spend-policy checks. Your touch (bound to `tss_sign` + the SHA-256 of the message) unwraps your share; the vault decodes the message and screens every transfer destination again, then both halves sign (`/v1/keys/{id}/tss/sign/begin` → `complete`). The vault verifies the aggregate under the group key before returning it, and `…/tss/broadcast` submits only a message whose signature verifies and whose `to` is inside it. The vault's signing nonces are deleted before they are used, so a retried request can never reuse them.
4. The server signing path refuses the key: there is no `private_key` secret for it to unwrap — only a `tss_share`, which is one Shamir share of a 2-of-2 key.

Fund it only after a second wrap exists (a second passkey via **rewrap**, or a recovery code): synced passkeys survive device loss, but 1Claw holds one share and can never hold two.

## Passkeys and shares

1. **Register a passkey** under Settings → Security. The browser is asked whether the authenticator supports the PRF extension; the answer is stored as `prf_supported` and shown as **Can hold wallet keys** on the passkey. Most platform passkeys (iCloud Keychain, Google Password Manager, recent Windows Hello) and YubiKey 5 support it.
2. **Store a share.** `PUT /v1/keys/{key_id}/client-share` stores your wrapped share for a key you own — one wrap per passkey (`passkey_prf`) and one recovery-code wrap (`recovery_code`). `GET` returns your wraps, unopened. `POST …/rewrap` adds a wrap for a newly added passkey while the share is in memory. The vault never reads the blob for any other purpose; a build-time guard test holds that line.
3. **Two wraps before funds.** A `client_tss` wallet cannot receive value until it has two wraps (two passkeys, or a passkey plus the recovery code). Synced passkeys survive device loss; a second credential survives the first one's loss; the recovery code is yours alone. 1Claw holds one share and can never hold two.

## What happens to existing users and agents

Nothing, until the owner acts. Every existing key stays `server` and signs exactly as before. A user with a PRF passkey can, once threshold signing ships, re-key an empty wallet silently at their next passkey session or move a funded one through a one-time ceremony they start. Agents inside 1Claw runtimes keep their autonomy through a bounded second share in the runtime sidecar; above-cap transactions return `authorization_required` and wait for the owner's touch instead of signing. Unmigrated keys never return it.

## Inventory

`scripts/custody-inventory.sh` writes `audits/custody-inventory.md`: every key store by chain and custody label, with counts and who can reconstruct each. It is the baseline against which the move to `client_tss` is measured.
