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

Every key that existed before 2026-09-18 is `server`. `client_tss` is live for **Solana** (Ed25519, 2-of-2 FROST — Zcash Foundation's audited `frost-ed25519`, run between the vault and `@1claw/tss-wasm` in your browser). For **EVM** the non-custodial answer needs no MPC at all: a **passkey-owned Safe** (below), `custody: passkey_owner`. Bitcoin and Tron keys (secp256k1) stay `server`: two-party ECDSA needs a protocol whose round state can be serialised between requests, and the audited implementations run as in-memory state machines. Nothing moves from `server` until you do it.

| `custody` | Where the private material is | Who can sign alone |
|---|---|---|
| `passkey_owner` (EVM Safes) | Nowhere. The Safe's only owner is Safe's WebAuthn shared signer, configured on-chain with your passkey's P-256 public key. Signing is a WebAuthn assertion whose challenge is the SafeTx hash, verified on-chain through the RIP-7212 precompile (Base, OP, Arbitrum, Polygon) or a Solidity verifier. | **Only your passkey.** 1claw computes the hash, checks the assertion, and relays; the relayer pays gas and is not an owner. |

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

Fund it only after a second wrap exists: synced passkeys survive device loss, but 1Claw holds one share and can never hold two. The wallet card holds the address and **Receive** back until there are two owner wraps — open **Backups** and either **Add a passkey** (a touch from a passkey that already holds the share, then a touch from the new one) or **Create recovery code** (a touch from a holding passkey, then a 32-character code shown once, which 1Claw does not store). **Restore from code** puts the share back under a new passkey if every holding passkey is gone. The list response carries `owner_wraps` so this is a fact from the vault, not a browser guess; runtime holder wraps are not counted.

## Passkey-owned Safes on EVM (available now)

Treasury → **Passkey-owned Safes** → *New passkey Safe*. Pick a chain (Base, Optimism, Arbitrum, Polygon, Ethereum, or the Sepolia testnets) and the passkey that will own it. The Safe (v1.4.1, canonical Safe deployments) is counterfactual — a CREATE2 address you can fund immediately — and is deployed by your first send.

- **Sending**: `POST /v1/treasury/passkey-safes/{id}/prepare` runs the sanctions screen and your spend policies, reads the Safe's nonce, and returns the SafeTx hash. Your browser signs that hash as a WebAuthn challenge with `userVerification: "required"`. `POST …/execute` recomputes the hash, verifies the assertion itself (this passkey, this hash, a 1Claw origin, UV flag), wraps it in Safe's contract-signature format and relays `execTransaction` (and the proxy deployment on the first send) from your Ethereum treasury wallet. That wallet pays gas — keep a little native gas token on each chain you use (the first send also deploys the Safe, ~0.0006 ETH on Base); `execute` checks its balance before signing and names the address if it is short. It is not an owner and cannot move the Safe's funds.
- **What 1claw holds**: your passkey's public key and the Safe address. There is no private key, share, or export.
- **Which passkey**: only the one chosen at creation can ever sign for the Safe, and a WebAuthn credential is bound to the domain it was registered on — a passkey registered on `1claw.xyz` cannot sign on `1claw.co` (the browser shows the cross-device QR and waits). The card names the owning passkey, the create dialog only offers passkeys registered on the current domain, and `create`/`prepare` refuse a passkey from another domain with the reason. `prepare` returns the passkey's `transports` so a Mac passkey gets Touch ID rather than the QR.
- **Recovery** is the passkey's: a synced platform passkey (iCloud Keychain, Google Password Manager) survives device loss; a hardware key does not. Adding a second owner to the Safe is on the roadmap; until then, use a synced passkey.
- **Agent spending (Allowance Module)**: *Agent spending* on the Safe card grants one agent a per-period cap through Safe's Allowance Module v1.0.0. One touch signs a Safe transaction (delegatecall into MultiSendCallOnly — the only delegatecall `execute` accepts, and only for calldata the vault prepared) that enables the module, adds the agent's Ethereum signing key as a delegate and sets the allowance (`POST …/{id}/grants`). The agent then spends with `POST /v1/agents/{agent_id}/passkey-safes/{safe_id}/spend` (SDK `agents.spendFromPasskeySafe`, Python `spend_from_passkey_safe`): its guardrails and the sanctions screen run, the vault reads the module's remaining allowance and nonce, the agent key signs the module's transfer hash, and the owner's Ethereum treasury wallet relays `executeAllowanceTransfer`. The cap is enforced by the module on chain — 1Claw holding the agent's key gives it exactly the allowance and nothing more; revoke with one more touch (`POST …/grants/{grant_id}/revoke` → `removeDelegate`).
- Audit events: `passkey_safe.created`, `passkey_safe.executed` (with the SafeTx hash and both transaction hashes), `passkey_safe.grant_activated`, `passkey_safe.grant_revoked`, `passkey_safe.allowance_spent`.

## Agents signing without a touch (runtime share holder)

An agent cannot touch a passkey. For unattended, below-cap operation the second share of a `client_tss` wallet can live in the **Shroud sidecar inside your hosted runtime**:

1. The sidecar generates a P-256 key at boot and registers it (`POST /v1/runtimes/{id}/tss/holder`).
2. From the wallet card, **Runtime signing** → pick the runtime: one passkey touch unlocks your share, which is re-wrapped to the sidecar's key (ECIES) and stored with the vault as ciphertext only that sidecar can open (`PUT /v1/keys/{id}/client-share/holder`). The wallet must already be delegated to that runtime's agent.
3. The agent sends through the sidecar (`POST /tss/send` on the sidecar's loopback API, or the `/v1/agents/{id}/tss/{prepare,sign/begin,sign/complete,broadcast}` endpoints directly). `prepare` applies the agent's guardrails — chains, allowlists, caps, daily limits, approval policy — and the sanctions screen, and records the exact message; `sign/begin` refuses any message that was not prepared; `broadcast` verifies the signature, re-runs the guardrails and records the transaction so daily limits count it. Above-cap or policy-flagged sends stop at `prepare` with the same `awaiting_approval` / refusal an ordinary submit gets.
4. Revoke by deleting the runtime, deleting the wrap, or removing the delegation. The vault still holds one share only; the sidecar's private key never leaves the container, and your own passkey wraps are untouched.

The sidecar runs the same FROST crate as your browser (compiled to WebAssembly, executed with wazero), so there are not two implementations of the protocol to keep in step.

## Moving an existing wallet to self-custody (re-key)

A server-custody Solana wallet shows **Move to self-custody** on its card. The ceremony is the keygen above with `replace_existing: true`: the new threshold key is generated, the old key signs one last time — a sweep of its balance to the new address — the old wallet is deactivated, and the whole move is audited as `treasury_wallet.rekeyed` (old address, new address, sweep signature). If the old wallet was empty its key is destroyed outright; otherwise it is kept until the sweep confirms.

Two deployment switches exist for the transition, both off until an operator turns them on: `ONECLAW_SERVER_CUSTODY_GENERATION=deny` stops minting new server-custody keys for every org except a named exception list, and `ONECLAW_LAZY_WALLET_PROVISIONING=true` stops signup from creating a treasury wallet on your behalf (wallets are created when you ask for one).

## Passkeys and shares

1. **Register a passkey** under Settings → Security. The browser is asked whether the authenticator supports the PRF extension; the answer is stored as `prf_supported` and shown as **Can hold wallet keys** on the passkey. Most platform passkeys (iCloud Keychain, Google Password Manager, recent Windows Hello) and YubiKey 5 support it.
2. **Store a share.** `PUT /v1/keys/{key_id}/client-share` stores your wrapped share for a key you own — one wrap per passkey (`passkey_prf`) and one recovery-code wrap (`recovery_code`). `GET` returns your wraps, unopened. `POST …/rewrap` adds a wrap for a newly added passkey while the share is in memory. The vault never reads the blob for any other purpose; a build-time guard test holds that line.
3. **Two wraps before funds.** The dashboard does not show a `client_tss` wallet's address until it has two owner wraps (two passkeys, or a passkey plus the recovery code; `GET /v1/treasury/wallets` reports `owner_wraps`). Synced passkeys survive device loss; a second credential survives the first one's loss; the recovery code is yours alone. 1Claw holds one share and can never hold two.

## What happens to existing users and agents

Nothing, until the owner acts. Every existing key stays `server` and signs exactly as before. A user with a PRF passkey can, once threshold signing ships, re-key an empty wallet silently at their next passkey session or move a funded one through a one-time ceremony they start. Agents inside 1Claw runtimes keep their autonomy through a bounded second share in the runtime sidecar; above-cap transactions return `authorization_required` and wait for the owner's touch instead of signing. Unmigrated keys never return it.

## Proof, not promise

`vault/tests/no_server_only_reconstruction.rs` enumerates every place the vault can read signing material and fails the build if any of them is not (a) a server-custody path gated on `custody`, (b) the threshold path, or (c) the passkey-owner path. `client_shares_are_opaque.rs` holds that the vault never reads a customer share except to return it to its owner or its holder. `sanctions_screen_on_every_signing_path.rs` holds that every one of those paths screens. A new signing path that is not listed does not compile past CI.

## Inventory

`scripts/custody-inventory.sh` writes `audits/custody-inventory.md`: every key store by chain and custody label, with counts and who can reconstruct each. It is the baseline against which the move to `client_tss` is measured. As of 2026-09-18: 1,575 agent signing keys and 2,342 treasury wallets, all `server`; 0 `client_tss`; 0 passkey-owned Safes; 11 passkeys registered, none yet re-registered with PRF.
