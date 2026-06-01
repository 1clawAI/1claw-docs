---
title: "Building 1Claw on Midnight: Private AI Agents Meet the Public Ledger"
slug: building-1claw-on-midnight
authors: [1claw]
tags: [midnight, privacy, tee, intents-api, zk-proofs]
date: 2026-06-01
---

The problem we have been chewing on for the last year is small to describe and huge to fix: there is no clean way for an AI agent to transact on a public blockchain without leaking something it shouldn't.

The leaks come from three directions. The signing key ends up in an environment variable, then a debug log, then a stack trace. The model context window absorbs whatever data the agent was looking at when it decided to sign—and that context window gets shipped to OpenAI or Anthropic or Google and stored in ways the user never consented to. And the transaction itself lands on a public ledger where any observer with a mempool subscription can see exactly what the agent did, who it dealt with, and how often.

Each leak is solvable in isolation. The hard part is solving all three without giving up the thing that makes agents useful in the first place: they operate without a human in the loop.

1Claw was built for the first two problems. Midnight was built for the third. This post is about what happens when you put them together, what we already ship, and what we are adding next.

<!-- truncate -->

## What 1Claw runs today

1Claw is three services, all running inside attested confidential compute on AMD SEV-SNP nodes on GKE. The boundary that matters is the enclave measurement: every piece of code that touches a customer secret or a signing key has its hash baked into a SEV-SNP attestation report, which we sign and ship to the audit log on every operation. If the code changes, the measurement changes, and the customer's compliance team sees exactly when and what.

**Vault** is the secret store. Standard envelope encryption: every secret gets its own data encryption key (DEK), and the DEK is wrapped by a key encryption key (KEK) that lives in Cloud KMS. The KEK never leaves the HSM. We ask KMS to unwrap the DEK inside the enclave, decrypt the secret, use it, and zero the memory before exit. For Business tier customers the KEK runs as a 2-of-3 Shamir split across GCP, AWS, and Azure KMS—a single cloud provider compromise surfaces nothing useful. The policy layer on top is what gives an agent a short-lived JWT scoped to a specific secret path, with a specific TTL and a specific action set.

**Shroud** is the LLM proxy. It sits between the agent and any frontier model, inspecting traffic in both directions. Inbound, it runs vault-aware secret matching with Aho-Corasick against the live secret set—if an agent ever pastes a real API key or connection string into a prompt, Shroud catches it before it crosses the network boundary. Outbound, it runs injection detection, encoded-payload detection (base64, hex, ROT, homoglyphs), markdown-image exfil detection, and twenty other semantic policy layers. Everything executes inside the same SEV-SNP enclave. There is no point at which a prompt or completion lives in plain memory outside attested compute.

**Intents API** is the signing surface for autonomous on-chain action. The model is simple: the agent never holds a private key. It submits an intent—"send X tokens to Y on chain Z"—and the intent gets validated against the agent's policy (chain allowlist, contract allowlist, daily value cap, destination allowlist, idempotency check, replay protection). Only after all checks pass does the enclave pull the signing key from Vault, decrypt it, sign the transaction, wipe the key from memory, and broadcast. The agent gets back a transaction hash. It never sees, touches, or has the ability to exfiltrate the key.

Today the Intents API speaks EIP-1559 and legacy EVM across Ethereum, Base, Arbitrum, Optimism, Polygon, and 100+ other chains. We support Tenderly simulation pre-broadcast so the agent can dry-run transactions before any key gets touched, and per-agent guardrails at fine grain: allowed chains, allowed contracts, value caps, rate limits.

If you have used 1Claw in production, you have probably used some combination of these three. What we are doing now is extending the same model to a chain that fundamentally changes what "private" means.

## What Midnight provides

Midnight is a privacy-first Layer 1 built by IOG inside the Cardano ecosystem. The design choice that matters here is the dual-state model: every Midnight smart contract has a public state on chain and a private state off chain, in the hands of the user who computed against it.

A Midnight transaction does not publish its inputs. It publishes a zero-knowledge proof that the inputs satisfied the contract's constraints, plus whatever public outputs the contract chose to disclose. The validators verify the proof. They do not see the inputs. If two parties both submit transactions to a private lending contract, the validators confirm both were eligible without learning anything about income, employment, or credit history.

The smart contract language is **Compact**, which compiles to ZK circuits. A Compact contract looks recognizably like TypeScript: you declare ledger state (public), witness functions (private inputs), and circuit bodies (the computation). At compile time, Compact emits a proving key and a verifying key. At runtime, the wallet feeds the witness into the proving key and produces a SNARK that gets attached to the transaction.

Three kinds of Midnight transactions:

**Unshielded transfers.** Transparent like Cardano. Fees, amounts, and parties are all on chain. Used when you don't need privacy and want minimal overhead. Address format is bech32m, prefix `mn_addr1...`.

**Shielded transfers.** Tokens move privately. Amounts and parties are encrypted; only ownership proofs are public. Built on Zswap, Midnight's adaptation of Zcash's shielded pool model.

**Contract calls.** These invoke a Compact circuit with witness data. The witness stays local; the proof goes on chain. This is where Midnight's design earns its complexity, and where the institutional use cases live.

The native token is NIGHT. Fees are paid in DUST, which is auto-generated from NIGHT holdings over time. An address with no NIGHT cannot generate DUST and cannot pay fees. Practical consequence: every signing agent on Midnight needs both NIGHT and an active DUST balance. This is materially different from "have ETH for gas."

Midnight ships a headless wallet SDK as scoped npm packages. The relevant ones for what we are building:

- `@midnight-ntwrk/wallet-sdk` — barrel package that re-exports everything.
- `@midnight-ntwrk/wallet-sdk-hd` — HD derivation. Path is a hybrid of BIP-32, BIP-44, and CIP-1852: `m / purpose' / coin_type' / account' / role / index`, with a `Roles` enum that includes Zswap.
- `@midnight-ntwrk/wallet` and `@midnight-ntwrk/wallet-api` — wallet implementation and interface.
- `@midnight-ntwrk/wallet-sdk-capabilities` — transaction balancing (change outputs, fee accounting).
- `@midnight-ntwrk/wallet-sdk-indexer-client` — GraphQL client for the Midnight indexer, with subscriptions for shielded, unshielded, Zswap, and Dust ledger events.
- `@midnight-ntwrk/midnight-js-http-client-proof-provider` — talks to the proof server Docker image (`midnightntwrk/proof-server`) for ZK proof generation.
- `@midnight-ntwrk/dapp-connector-api` — wallet-to-dApp interface. The v4 beta added proving delegation: a dApp hands the wallet a `KeyMaterialProvider` and receives a `ProvingProvider` back, and the wallet can prove "local, remote, or hardware-accelerated." That third option is the architectural seam our integration drops into.

The proof server runs as a separate process from the wallet. It needs the circuit proving key, the witness, and the public inputs. It produces a SNARK. The fact that it is a separate process matters—we are going to run it inside a TEE.

## The integration thesis

Midnight has one fundamental assumption that breaks down for agents: that "local" is trustworthy.

The model assumes a user holding their own witness data on their own laptop, running their own wallet against their own proof server. The only thing that leaves the user's machine is a proof and whatever public outputs the contract disclosed. The privacy guarantee holds.

For an AI agent in cloud infrastructure, "local" is hostile. The agent's process memory is shared with logging infrastructure. Its filesystem is shared with backup systems. Its network has egress to model providers that absorb context windows. Its LLM pulls data into prompts that travel to third parties. By the time the witness has been used, it has potentially leaked through five surfaces, and the chain-level privacy guarantee is gone.

The fix is to give the agent a trustworthy local. That is the 1Claw thesis: an attested enclave that serves as the agent's "local" for any operation that requires it. Inside that enclave the witness lives, the signing key lives, the proof server lives. Nothing from any of them crosses the boundary into the agent's untrusted process memory.

Phrased differently: Midnight gives users selective disclosure. 1Claw gives agents the same.

## v0: Unshielded Midnight transfers through the existing TEE

We are shipping in two phases. v0 is smaller, goes out first, earns no new infrastructure, and unblocks a real customer segment.

v0 supports unshielded Midnight transfers on Preprod through the existing Intents API. No proof server, no witness storage, no Compact circuits. NIGHT moving from one bech32m address to another, signed inside the Shroud enclave, broadcast through the Midnight indexer.

The agent-facing surface is one field added to the existing intent submission:

```ts
await client.agents.submitTransaction(agentId, {
  chain: "midnight",
  network: "preprod",
  kind: "unshielded_transfer",
  to: "mn_addr1asujt0dayj4pelgq97wv75hjhscqv9epmzzpapkf8sy8c87jhh9s6e0fs3",
  token: "native",
  value: "1000000",
  idempotency_key: "9f3b...",
});
```

Inside the enclave, the flow:

```ts
async function signMidnightIntent(intent, agent) {
  // Guardrails (fail closed)
  assertEnabled(agent);
  assertNetwork(intent.network, agent.allowedNetworks);
  assertValueWithinCap(intent.value, agent.midnightMaxValueAtomic);
  assertDestinationAllowlisted(intent.to, agent.midnightAddressAllowlist);
  assertNoIdempotencyCollision(intent.idempotency_key);
  assertValidBech32m(intent.to);

  // Dry-run to catch obvious failures before touching keys
  await dryRunUnshieldedTransfer(intent);

  // Pull seed from Vault, reconstruct MPC shares if enabled
  const seedBlob = await vault.fetch(`midnight/seeds/${agent.id}`);
  const seed = await mpcReconstructAndDecrypt(seedBlob);

  // HD derivation
  const hd = HDWallet.fromSeed(seed);
  const key = hd.hdWallet
    .selectAccount(0)
    .selectRole(Roles.Unshielded)
    .deriveKeyAt(0);

  // Build, sign, broadcast
  const indexer = createIndexerClient(MIDNIGHT_PREPROD_INDEXER_URL);
  const tx = await buildUnshieldedTransfer(key, indexer, {
    to: intent.to,
    token: intent.token === "native" ? nativeToken().raw : intent.token,
    value: BigInt(intent.value),
  });
  const signed = await signTransaction(key, tx);

  // Attestation report covering the operation
  const attest = generateSEVSNPAttestation({
    agent_id: agent.id,
    intent_hash: hashIntent(intent),
    enclave_measurement: currentMeasurement(),
    chain: "midnight",
    network: intent.network,
  });

  // Broadcast and wipe
  const result = await indexer.submitTransaction(signed);
  secureZero(seed);
  secureZero(key);

  await auditLog.write({
    agent_id: agent.id,
    operation: "midnight_sign",
    intent_hash: hashIntent(intent),
    tx_hash: result.txHash,
    attestation: attest,
  });

  return { tx_hash: result.txHash, status: "submitted" };
}
```

The audit log entry includes the SEV-SNP attestation report. The customer's compliance team can verify that signing happened inside an enclave whose code measurement matches a published value. Not "trust us." A cryptographic record.

What v0 does not do: generate ZK proofs, hold witness data, or invoke Compact contracts. Those are v1.

The split is practical. First, unshielded transfers are useful on their own—treasury operations between known parties, internal settlement, fee payment, anything where the privacy you need is "who can read the chain after the fact" rather than "what does the proof reveal." Second, v0 runs in the existing Shroud enclave alongside the EVM signer. No new pod, no new node pool, no new compliance review.

For customers: any agent issued a Midnight seed, funded with NIGHT, and carrying a DUST balance can start signing through the same Intents API it already uses for EVM. One extra field on the request body.

## v1: TEE-resident witness storage and proof generation

The full thesis lives here. This is where the integration becomes structurally novel.

The architecture splits into two enclave-resident services. The signer (extending v0 to cover shielded and contract paths) and a dedicated proof server pod running inside Confidential Containers (Kata) on the same SEV-SNP node pool. The two communicate over the cluster-internal network only; the proof server has a network policy that blocks ingress from everything except the signer.

```
Agent submits intent
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Intents API (untrusted)                                  │
│  - Validate policy                                       │
│  - Check guardrails                                      │
│  - Build request payload                                 │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Shroud enclave (SEV-SNP)                                 │
│  - Fetch seed from Vault                                 │
│  - Fetch witness from Vault                              │
│  - Reconstruct via MPC if enabled                        │
│  - Derive keys                                           │
│  - Build unsigned transaction                            │
│  - Call proof server with witness + circuit params        │
└──────────────────────────────────────────────────────────┘
       │ (encrypted, cluster-internal only)
       ▼
┌──────────────────────────────────────────────────────────┐
│ Proof server pod (SEV-SNP, Kata-isolated)                │
│  - Receive witness + circuit                             │
│  - Generate SNARK                                        │
│  - Return proof                                          │
│  - Wipe witness                                          │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Shroud enclave (continued)                               │
│  - Attach proof to transaction                           │
│  - Sign                                                  │
│  - Broadcast through indexer                             │
│  - Wipe seed, keys, witness, proof artifacts             │
│  - Emit attestation (covers both enclaves)               │
└──────────────────────────────────────────────────────────┘
       │
       ▼
   Tx hash returned to agent
```

The witness blob moves from Vault to signer to proof server to broadcast, all within attested compute. It never crosses an untrusted boundary. The signing key follows the same path. The agent receives a transaction hash. It cannot enumerate the witness, the key, or the proof artifacts, because none of them ever lived in its memory.

Two things worth dwelling on.

**Separate attestation for the proof server.** We do not run it inside the signer's enclave because the two have different scaling shapes. The signer is fast and stateless; the proof server is slow (one to fifteen seconds per circuit) and memory-heavy. Co-locating them forces signer pods to be sized for the prover's worst case. The separation also lets us upgrade the proof server independently—it is an upstream image IOG ships, and rolling it forward should not invalidate the signer's attestation.

**Witness as a first-class Vault resource.** We are adding a path namespace `midnight/witnesses/{circuit_id}/{agent_id}` with the same envelope encryption, MPC option, and scoped policy as existing secrets. A witness for a healthcare circuit is treated like a credential: same access control, same audit, same revocation.

Vault schema additions for v1:

```
midnight/seeds/{agent_id}                          encrypted BIP-39 seed
midnight/mnemonics/{agent_id}                      BIP-39 mnemonic (separate policy)
midnight/witnesses/{circuit_id}/{agent_id}         encrypted witness blobs
```

Agent record additions:

```
midnight_enabled                 bool
midnight_network                 enum('preprod', 'mainnet')
midnight_max_value_atomic        bigint (daily cap)
midnight_address_allowlist       text[]
midnight_allowed_circuits        text[]
midnight_witness_namespaces      text[]
```

The `midnight_allowed_circuits` field is key. An agent can be authorized to invoke specific Compact circuits and no others—the same way an EVM agent today is allowed to call specific contracts and no others.

## Compact-aware Shroud

One more piece that doesn't show up in the data flow but matters more than it looks.

Consider an agent reading from a Compact contract called `PrivateLending`. The contract has public inputs (loan amount, duration) and private witnesses (borrower KYC, credit score, income). The agent consults an LLM: "Given these borrower characteristics, should I approve?"

Without Compact-aware Shroud, the agent puts the witness fields into the prompt. The LLM provider receives the borrower's KYC data. The on-chain privacy guarantee is preserved—the proof reveals nothing—but it is broken at the LLM boundary, because the model context already saw everything.

Compact-aware Shroud adds a parser for Compact contract ABIs. When an agent registers a contract, Shroud parses it and tags each field as `public_input`, `private_witness`, or `ledger_state`. When the agent then sends a prompt containing a value that matches a private witness field for a contract it has recently touched, Shroud blocks the send. The same redaction layer that catches API keys catches witness fields.

In practice:

```yaml
shroud:
  policies:
    compact_aware:
      enabled: true
      contracts:
        - PrivateLending@mn_contract_0xabc...
        - PrivateMedicalReferral@mn_contract_0xdef...
      action_on_witness_leak: block  # or "redact" or "warn"
```

Per-agent, opt-in. Meaningful only for agents operating against Compact contracts, but for those agents it closes the most subtle leak surface in the stack: the LLM accidentally publishing what the chain was designed to keep private.

## Why institutions care

The customer profiles here are not typical web3 profiles. They are regulated finance, healthcare, and treasury operations—companies whose agents are blocked from on-chain use today because every interesting use case requires putting customer data near a prompt or a transaction, and the compliance team will not sign off.

**A fund** that wants autonomous trading strategies on a public ledger without broadcasting its book to every mempool observer.

**A hospital network** that wants to coordinate referrals across institutions that legally cannot share patient data, using ZK proofs to demonstrate eligibility without revealing the patient.

**A treasury team** that wants automated supplier payments without exposing the counterparty graph, pricing, or volume to competitors watching the chain.

**A clinical trial coordinator** that wants to verify participant eligibility against multiple private credentials without co-locating the credentials in one place.

These are not speculative. They are conversations we have been having for months. The blocker has always been the same: no agent infrastructure that preserves privacy end-to-end, and no privacy infrastructure that supports agent autonomy. The bet is that 1Claw + Midnight is the first stack where neither tradeoff is forced.

## What you can use today, and what comes next

**v0** ships first. Unshielded Midnight transfers through the existing Intents API. If you already use 1Claw for EVM signing, adding Midnight is one field. Rollout is Preprod first, mainnet once both sides are stable.

**v1** is the deeper work. Shielded transfers, contract calls, witness storage in Vault, a dedicated proof server in Confidential Containers, and Compact-aware Shroud. This is where the integration earns its rent.

After v1, the natural extensions: exposing 1Claw as a Midnight wallet through `dapp-connector-api` so dApps can elect "1Claw" as a proving provider with remote attested proof generation; ZK-proven agent identity using Midnight's selective disclosure for the auth flow itself; and Treasury Wallets for Midnight—institutional multi-sig with policy-bound management on a privacy chain.

We are co-publishing the reference architecture with the Midnight Foundation. If you are building an agent-driven product on Midnight and wondering how to handle keys and witnesses without compromising the privacy story, this is the answer. We want to talk.

The longer arc is simpler than the architecture suggests. Midnight is going to be where serious institutions transact when they cannot afford transparency. 1Claw is going to be the runtime that makes those transactions possible at machine speed.

We are building that together.

---

*1Claw is the agent runtime for AI: HSM-backed Vault, TEE LLM proxy Shroud, and the Intents API for signing without holding keys. Get in touch at ops@1claw.xyz or book a call at [calendly.com/buidl/intro-call](https://calendly.com/buidl/intro-call).*
