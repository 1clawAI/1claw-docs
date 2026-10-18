---
title: Key custody
description: Who can sign with a 1Claw wallet key, what "custodial" means here, the sanctions screen every custody model sits behind, and 2-of-3 self-custody wallets you can recover without 1Claw.
sidebar_label: Key custody
---

# Key custody

This page answers one question plainly: **who can produce a signature with a key 1Claw manages?** Every wallet and signing key carries a `custody` label that answers it, and the answer is enforced by code, not by terms of service.

## The two labels

| `custody` | Where the private material is | Who can sign alone |
|---|---|---|
| `server` | 1Claw generates the key and stores it as an envelope-encrypted secret (AES-256-GCM per-key DEK, wrapped by your org's KEK in Cloud KMS, HSM on paid tiers). Signing unwraps it in vault memory — or in [Shroud's TEE](/docs/security/trust-model-comparison#tee-attestation-live) when `intents_require_tee` is set — signs, and drops it. | **1Claw.** After policy, guardrails, approvals and the sanctions screen, the vault can sign on your behalf without a second party. That is what makes it custodial. |
| `client_tss` | A 2-of-3 threshold key. 1Claw holds share 1, KMS-wrapped. Share 2 is wrapped in your browser under a secret only your passkey can re-derive (WebAuthn PRF) and stored with us as ciphertext we cannot open (`client_key_shares`). Share 3 exists only in your offline recovery kit. | **Not 1Claw.** The server signing path refuses a `client_tss` key outright; 1Claw holds one share of three. Any two shares sign: 1Claw + your passkey (everyday), or your kit + recovery code with no 1Claw involvement at all. |

Every key that existed before 2026-09-18 is `server`. `client_tss` keys are Ed25519 FROST (the Zcash Foundation's audited `frost-ed25519`, run between the vault and `@1claw/tss-wasm` in your browser): **Solana** for everyone, **XRP** and **Cardano** (enterprise addresses) in beta (`GET /v1/keys/tss/chains` lists what your organization can create). Self-custody wallets are available on every plan, Free included. For **EVM** the non-custodial answer needs no MPC at all: a **passkey-owned Safe** (below), `custody: passkey_owner`. Bitcoin and Tron keys (secp256k1) stay `server`: two-party ECDSA needs a protocol whose round state can be serialised between requests, and the audited implementations run as in-memory state machines. Nothing moves from `server` until you do it.

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

Those are exfiltration controls. They constrain *who else* can use the key; they do not change *whether 1Claw can*. If your product claims to be non-custodial, `server` keys do not support that claim; `client_tss` keys do.

## Every custody model sits behind the same screens

**Sanctions.** Every path that can put a 1Claw signature on a transfer — agent submit/sign, the unified `/sign`, automations, the TEE-forwarded path, human treasury sends, and Safe proposals at creation and execution — checks the destination and, for token transfers, the recipient inside the calldata against the OFAC SDN digital-currency list. A hit is refused with **403** naming OFAC and written to the audit log as `sanctions.blocked`; no allowlist, cap or policy can admit it. The list is refreshed daily from Treasury's SDN publication and the screen **fails closed**: if the loaded list is older than seven days, transfers are paused with **503** until it is refreshed. Nothing about your keys or policies turns this off.

**Geofence.** Until threshold keys ship, creating a `server`-custody wallet (treasury generate/import, agent signing key create/import) is refused from New York (`403`, audit `custody.geofenced`). Signup from New York proceeds without the automatically provisioned treasury wallet. Existing wallets are untouched; the fence is on creating custody, not on using what you already have.

## Self-custody wallets: 2-of-3, recoverable without 1Claw

Treasury → **Self-custody Solana / XRP / Cardano wallet**. What happens:

1. **Recovery code.** You create your account's recovery code (generated in your browser, never chosen; 150 random bits plus a typo check, shown once, typed back to confirm) or enter the one you already have. It never reaches 1Claw.
2. **Key generation.** A three-party distributed key generation runs between the vault (participant 1) and your browser, which runs participants 2 and 3 (`POST /v1/keys/tss/keygen/begin` → `round2` → `complete`). No dealer: the full private key never exists anywhere, and the vault never learns share 2 or 3. The group public key is the wallet address.
3. **Recovery kit, before the wallet exists.** Your browser seals shares 2 and 3 into a kit file under your recovery code (Argon2id, then a separate AES-256-GCM key per share) and you download it and confirm the address, which the page derives itself. Only then does the vault commit the key, and only if the kit was sealed for that key (`kit_group_public_key`). A wallet never exists without its kit.
4. **Passkey wrap.** One passkey touch completes the ceremony and wraps share 2 under your passkey (WebAuthn PRF over your account's salt, a separate key per wallet) for everyday signing.

**Your recovery code is a full secret, like a seed phrase: kit + recovery code = anyone can spend, with no passkey and no 1Claw involvement.** We hold one share plus a ciphertext only your passkey can open; your recovery code and your kit never reach us. Keep the code on paper, apart from the kit.

**Sending**: `POST /v1/treasury/wallets/{chain}/tss/prepare` builds the unsigned transfer after wallet-access, sanctions and spend-policy checks and records it. Your browser checks the transaction itself (it must pay exactly the destination and amount you asked, and be a plain transfer) and derives the bytes to sign itself (the Solana message, XRPL signing data, or the Cardano body hash) before asking for your touch. The vault screens every destination again, refuses any transaction it did not prepare, and refuses shapes it does not sign: on Solana anything but System transfers and a memo; on XRPL anything but a native-XRP Payment (no `SetRegularKey`, no partial payments, no issued currencies, capped fee); on Cardano anything but lovelace transfers (no certificates, withdrawals or minting, capped fee, network pinned). Both halves sign, the vault verifies the signature under the wallet key, and `…/tss/broadcast` submits it. The vault's signing nonces are single use.

**Backed up** means a passkey holds share 2 **and** you have confirmed a recovery kit for the wallet's current shares (`backup` on `GET /v1/treasury/wallets`). The wallet card holds the address back until then. Runtimes and agents refuse a wallet that is not backed up; you can always move funds out of your own wallet.

### Recovery

| What you lost | What you do | 1Claw needed? |
|---|---|---|
| Nothing | Vault share + your passkey sign | Yes |
| One passkey | Another passkey that holds the share signs (**Backups → Add a passkey** beforehand) | Yes |
| Every passkey | **Backups → Restore from kit**: the kit and code are opened in your browser, share 2 goes under a new passkey, only that wrap is uploaded (re-authentication required, audited `tss_key.recovered_via_code` and sent as a webhook of that name, you are emailed) | Yes |
| 1Claw | Kit + code in the offline tool: shares 2 and 3 sign | **No** |
| 1Claw and every passkey | Kit + code in the offline tool | **No** |

The only total loss is losing the kit **and** the code **and** every passkey **and** 1Claw.

**Offline recovery tool.** [`oneclaw-recover`](https://github.com/1clawAI/1claw/tree/main/packages/tss-recovery) signs with shares 2 and 3 on your machine, for XRP, Cardano and Solana, using only public network endpoints. `addresses` (no code, no network) re-derives every wallet in your kit; `prepare` builds a transfer from public chain data; `sign` asks for your code, runs offline, shows what it will sign and verifies the signature; `broadcast` submits. It sees your recovery code, so **verify a release before you run it**: `gh attestation verify oneclaw-recover-<target> --repo 1clawAI/1claw`, and compare its SHA-256 with the release's `SHA256SUMS` (or build it from source). Transfers made with your kit outside 1Claw skip 1Claw's screens and guardrails: every 1Claw-mediated signing path is screened; a key you hold two shares of is yours to use.

### If a share leaks

- **A passkey or device was compromised** (one share): **Backups → Refresh shares**. The same three participants mint new shares of the same key (same address, same funds) and the old shares stop working with the new ones. It needs your kit and code (share 3 lives only there) and gives you a new kit. It is two-phase: nothing changes until the new passkey wrap and the new kit are in place, then one step switches over; an interrupted refresh can be finished or abandoned, never left half-applied (`/v1/keys/{id}/tss/refresh/*`, audited `tss_key.resharded`).
- **Your kit or recovery code leaked**: that is two shares, a full key. Refresh cannot help. Move the funds to a new wallet immediately.

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

The sidecar derives the bytes it signs itself (XRPL signing data, the Cardano body hash) with the same encoder as your browser, and refuses if the vault would aggregate over anything else. It runs the same FROST crate as your browser (compiled to WebAssembly, executed with wazero), so there are not two implementations of the protocol to keep in step.

## Self-custody agent signing keys

On an agent's page, **Self-custody {chain} key** creates a 2-of-3 signing key for that agent with the same ceremony as a wallet (`key_kind: agent_signing_key` on `POST /v1/keys/tss/keygen/begin`). You are its owner: your passkey holds share 2 and your recovery kit shares 2 and 3. The agent can sign only through a runtime you give its share to (**Runtime signing** on the key's row), within its guardrails; nobody else in your organization, and never the agent or its sidecar, can add a wrap, confirm a kit, restore the key, or provision a runtime for it. Restoring an agent key from its kit is your out-of-band recovery and leaves the agent's guardrails, so it is audited as `signing_key.recovered` and sent as a webhook of the same name for integrators to alarm on.

## Moving an existing wallet to self-custody (re-key)

A server-custody Solana, XRP or Cardano wallet shows **Move to self-custody** on its card (XRP and Cardano where your organization has them enabled). The ceremony is the keygen above with `replace_existing: true`: the new threshold key is generated, the old key signs one last time to sweep its balance to the new address, the old wallet is deactivated, and the move is audited as `treasury_wallet.rekeyed` (old address, new address, sweep transactions).

- **Native coin only, so nothing is stranded.** The re-key is refused, before the ceremony and again before the sweep, while the old wallet holds anything a native sweep would leave behind: SPL token accounts on Solana, trust lines, offers, escrows or NFTs on XRPL, token-carrying UTXOs on Cardano. Move those first.
- **XRP reserve.** A Payment moves everything above the old account's 1 XRP reserve and funds the new account; then, if the old account is old enough (its sequence 256 ledgers back), an `AccountDelete` releases the reserve to the new address (minus the 0.2 XRP deletion fee). If it is too new, the reserve stays and the old key is kept so it can still be recovered.
- **Cardano** sweeps every lovelace UTXO into one output at the new address, fee taken from the total.
- **The old key is destroyed only when the old balance was exactly zero.** Otherwise it is kept (the wallet is deactivated) until the sweep is confirmed, so nothing is ever left at an address no one can sign for. Finality per chain: Solana finalized commitment; XRPL a validated ledger; Cardano block inclusion, about 15 blocks to settle.

**Export.** A self-custody wallet or signing key has no private key anywhere, so the export endpoints refuse it (409) and the dashboard hides the button. Your route out is the recovery kit and code with `oneclaw-recover`.

Two deployment switches exist for the transition, both off until an operator turns them on: `ONECLAW_SERVER_CUSTODY_GENERATION=deny` stops minting new server-custody keys for every org except a named exception list, and `ONECLAW_LAZY_WALLET_PROVISIONING=true` stops signup from creating a treasury wallet on your behalf (wallets are created when you ask for one).

## Passkeys and shares

1. **Register a passkey** under Settings → Security. The browser is asked whether the authenticator supports the PRF extension; the answer is stored as `prf_supported` and shown as **Can hold wallet keys** on the passkey. Most platform passkeys (iCloud Keychain, Google Password Manager, recent Windows Hello) and YubiKey 5 support it.
2. **Master wrap.** Your account has one PRF salt (`GET /v1/keys/tss/prf-salt`), so one touch derives the wrap key for any of your wallets; each wallet's share is wrapped under a separate key bound to that wallet, so a wrap cannot be moved onto another. The PRF output is zeroed as soon as it is used.
3. **Store a share.** `PUT /v1/keys/{key_id}/client-share` stores a passkey wrap of share 2 (`passkey_prf`, `wrap_version: 2`) for a key you own; every passkey wrap of one key uses the same salt and version. `POST …/rewrap` adds one for another passkey. 1Claw never stores anything your recovery code can open: `recovery_code` wraps are refused. The vault never reads a wrap for any other purpose; a build-time guard test holds that line.

## What happens to existing users and agents

Nothing, until the owner acts. Every existing key stays `server` and signs exactly as before. A user with a PRF passkey can, once threshold signing ships, re-key an empty wallet silently at their next passkey session or move a funded one through a one-time ceremony they start. Agents inside 1Claw runtimes keep their autonomy through a bounded second share in the runtime sidecar; above-cap transactions return `authorization_required` and wait for the owner's touch instead of signing. Unmigrated keys never return it.

## Proof, not promise

`vault/tests/no_server_only_reconstruction.rs` enumerates every place the vault can read signing material and fails the build if any of them is not (a) a server-custody path gated on `custody`, (b) the threshold path, or (c) the passkey-owner path. `client_shares_are_opaque.rs` holds that the vault never reads a customer share except to return it to its owner or its holder. `sanctions_screen_on_every_signing_path.rs` holds that every one of those paths screens. The same proof test holds that a `client_tss` key is 2-of-3 with the vault as participant 1, that no request body carries the recovery code or a plaintext share, that vault signing nonces are single use, and that a key is one wallet on one chain. A new signing path that is not listed does not compile past CI.

## Inventory

`scripts/custody-inventory.sh` writes `audits/custody-inventory.md`: every key store by chain and custody label, with counts and who can reconstruct each. It is the baseline against which the move to `client_tss` is measured. As of 2026-09-18: 1,575 agent signing keys and 2,342 treasury wallets, all `server`; 0 `client_tss`; 0 passkey-owned Safes; 11 passkeys registered, none yet re-registered with PRF.
