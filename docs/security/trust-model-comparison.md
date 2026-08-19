# Trust Model Comparison: 1Claw vs Signing-Only Infrastructure

## The Governance Difference

Turnkey-style platforms govern **signing** — they protect private keys and gate transaction authorization. 1Claw governs the **whole agent** — secrets, LLM traffic, runtimes, memory, channels, automations, and signing under a single policy and audit plane.

This is a structural difference, not a feature delta. An agent that can exfiltrate secrets through its LLM context, leak credentials via a webhook automation, or bypass spend policies through an unmonitored channel is not secured by signing-only controls — regardless of how hardened the signer is.

## What "Don't Trust Us, Verify Us" Means at 1Claw

### TEE Attestation (Live)

```bash
curl https://shroud.1claw.xyz/v1/shroud/attestation
```

Returns a GCE identity token signed by Google's Confidential Computing attestation service. Verify the JWT against Google's well-known JWKS to confirm:

- The Shroud enclave is running on AMD SEV-SNP hardware
- The measured image hash matches the published build
- The signing key never leaves the attested boundary

### Audit Hash Chain (Live)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.1claw.xyz/v1/audit/verify
```

Every audit event is hash-chained via `prev_event_id` and HMAC-SHA256 `integrity_hash`. The verify endpoint walks the chain and reports linkage within your org. See [Audit verification](/docs/security/audit-verification) for algorithm details and limitations.

### OIDC Federation (Live)

```bash
curl https://api.1claw.xyz/.well-known/openid-configuration
curl https://api.1claw.xyz/.well-known/jwks.json
```

1Claw-issued agent JWTs are verifiable by any OIDC relying party (Anthropic WIF, GCP/AWS STS). Public JWKS with EdDSA + RS256 keys, 5-minute cache.

## MPC vs Shamir key custody

Turnkey's MPC-CMP splits **signing private keys** so multiple parties co-sign transactions (QuorumOS). 1Claw's Shamir modes split **encryption keys** (org KEK and optional vault DEK shares) across HSM providers so no single cloud KMS holds the full key wrapping material. Transaction signatures still come from a single HSM-protected signing key after policy evaluation — 1Claw does not offer Turnkey-equivalent threshold ECDSA/EdDSA signing today.

| | Turnkey | 1Claw |
|---|---------|-------|
| **Primary Shamir/MPC use** | Threshold **transaction signing** | Threshold **envelope encryption** (KEK/DEK custody) |
| **Where full key material exists** | Never assembled outside QuorumOS enclave | DEK reconstructed briefly in Vault memory on authorized read; org KEK reconstruction targeted to Shroud TEE |
| **Governance quorum** | On-chain signature quorum | Control-plane `consensus_trigger` (approvals before sign/export/policy change) |

---

| Dimension | Signing-Only (Turnkey) | Whole-Agent (1Claw) |
|-----------|----------------------|-------------------|
| **What is governed** | Private keys + transaction signing | Keys + secrets + LLM traffic + runtimes + memory + channels + automations |
| **Policy scope** | Transaction parameters | Transaction parameters + secret access + LLM content + execution intents + control-plane actions |
| **TEE boundary** | Signs inside enclave | Signs inside enclave AND inspects LLM traffic inside enclave (Shroud) |
| **Attestation** | Remote attestation (QuorumOS) | Remote attestation (GCE identity token, AMD SEV-SNP) |
| **Audit integrity** | Event log | Hash-chained event log with independent verification API |
| **Multi-chain signing** | 6+ chains | 6 chains (Ethereum, Bitcoin, Solana, XRP, Cardano, Tron) + non-EVM deep decode |
| **Policy language** | Proprietary DSL (`.all()`, `.filter()`) | `tx_conditions` (**Live**) + expression engine (**schema-only**) + Cedar (Team+, **Live**) + OPA (Business+, **Live**) |
| **Deep inspection** | Per-chain struct depth | `deep_inspect` unwraps multicall, Safe execTransaction, ERC-4337 handleOps |
| **Consensus** | Quorum signing (n-of-m) | `consensus_trigger` for **authorization** (who may sign/export/change policy) — not MPC threshold signatures on-chain |
| **Control-plane governance** | — | `action_in` / `action_kind_in` gates policy CRUD, key export, member mutations |
| **LLM security** | Not applicable | Shroud: PII redaction, injection scoring, secret redaction, tool call inspection, semantic policy |
| **Agent memory** | Not applicable | Encrypted scratch/durable/semantic memory with namespace isolation |
| **Automations** | Not applicable | Cron/webhook/event-driven workflows with approval gates |
| **OIDC federation** | — | First-class IdP with published JWKS for WIF |

## What Each Approach Cannot Do

**Signing-only platforms cannot:**

- Prevent an agent from leaking secrets through its LLM conversation
- Detect prompt injection attacks before they reach the model
- Gate control-plane operations (policy changes, key exports) behind consensus
- Enforce spend policies on token transfers across wallet sends
- Audit what an agent's LLM traffic contains or where it routes

**1Claw cannot (yet):**

- Provide reproducible builds from source (planned — currently attested image hash)
- Open-source the TEE enclave code (Shroud is proprietary)

## Policy Expressiveness Comparison

### Turnkey DSL

```
policy.filter(Activity.type == "ACTIVITY_TYPE_SIGN_TRANSACTION")
  .filter(Transaction.chain == "ethereum")
  .filter(Transaction.value <= 1000000000000000000)
  .all()
```

### 1Claw tx_conditions (built-in, all tiers)

```json
{
  "chain_in": ["ethereum"],
  "value_above": "1000000000000000000",
  "to_address_in": ["0x..."],
  "function_selector_in": ["0xa9059cbb"],
  "deep_inspect": true
}
```

### 1Claw Expression Engine (v2 policies — schema-only today)

:::caution Status — stored, not enforced at signing time
Expressions in `tx_conditions.expression` are persisted when `policy_schema_version: 2`, but signing-time evaluation is **not wired yet**. Use v1 field-matching for live enforcement until expression wiring ships.
:::

```
chain == "ethereum" && value_wei > "500000000000000000" && to in ["0xabc...", "0xdef..."]
```

### 1Claw Cedar (Team+ tier)

```cedar
permit(
  principal == Agent::"agent-uuid",
  action == Action::"sign",
  resource
)
when {
  resource.chain == "ethereum" &&
  resource.value_gwei < 1000000000 &&
  resource has erc20_transfer_to &&
  resource.erc20_transfer_to in ["0x..."]
};
```

## Verification Steps

1. **Verify TEE attestation**: `GET /v1/shroud/attestation` → validate GCE identity token JWT
2. **Verify audit integrity**: `GET /v1/audit/verify` → confirm unbroken hash chain
3. **Verify OIDC keys**: `GET /.well-known/jwks.json` → validate against published key IDs
4. **Verify policy enforcement**: Create a policy with `tx_conditions`, attempt a violating transaction → confirm 403
5. **Verify consensus**: Set `consensus_trigger` on a policy, attempt a control-plane action → confirm 202 pending approval

## SOC 2 Status

Contact ops@1claw.xyz for current compliance attestation status.
