# Migrate From Turnkey to 1Claw

## Why Whole-Agent Governance Matters

Turnkey governs signing. 1Claw governs the whole agent.

If your agents access secrets, call LLMs, run automations, communicate through channels, and sign transactions — governing only the signing step leaves every other surface ungoverned. An attacker who compromises an agent's LLM context, exfiltrates credentials through tool calls, or manipulates automations bypasses signing controls entirely.

1Claw places secrets, LLM traffic (Shroud), runtimes, memory, channels, automations, and signing under one policy engine and one hash-chained audit log. Migrating from Turnkey gives you:

- **Unified policy evaluation** across all agent actions, not just signing
- **LLM security** (prompt injection detection, secret redaction, semantic policies)
- **Control-plane governance** (policy changes, key exports, member mutations require approval)
- **Agent memory and automations** under the same audit trail
- **Deep transaction inspection** (`deep_inspect` for multicall, Safe, ERC-4337)
- **Cedar/OPA** formal policy backends for enterprise compliance

## Migration Checklist

### 1. Map Your Turnkey Wallets to 1Claw Signing Keys

| Turnkey Concept | 1Claw Equivalent |
|----------------|-----------------|
| Wallet | Agent signing key (`POST /v1/agents/{id}/signing-keys`) |
| Private key (HD) | Per-chain signing key stored in `__agent-keys` vault |
| Sub-organization | Sub-org (`POST /v1/org/sub-orgs`) or platform app |
| User | Human user or platform-provisioned connected user |
| API key | `ocv_` agent API key or `plt_` platform key |

### 2. Translate Turnkey Policies to 1Claw

#### Activity Types → `action_in` / `action_kind_in`

| Turnkey Activity Type | 1Claw `action_in` | 1Claw `action_kind` |
|----------------------|-------------------|-------------------|
| `ACTIVITY_TYPE_SIGN_TRANSACTION` | (data-plane: `tx_conditions`) | — |
| `ACTIVITY_TYPE_CREATE_POLICY` | `policy.create` | `policy` |
| `ACTIVITY_TYPE_UPDATE_POLICY` | `policy.update` | `policy` |
| `ACTIVITY_TYPE_DELETE_POLICY` | `policy.delete` | `policy` |
| `ACTIVITY_TYPE_CREATE_WALLET` | `signing_key.create` | `signing_key` |
| `ACTIVITY_TYPE_EXPORT_WALLET` | `signing_key.export` | `signing_key` |
| `ACTIVITY_TYPE_CREATE_USER` | `member.invite` | `member` |
| `ACTIVITY_TYPE_DELETE_USER` | `member.remove` | `member` |
| `ACTIVITY_TYPE_CREATE_API_KEY` | `credential.create` | `credential` |
| `ACTIVITY_TYPE_DELETE_API_KEY` | `credential.delete` | `credential` |
| `ACTIVITY_TYPE_UPDATE_USER` | `member.role_change` | `member` |

Use `action_kind_in` to match all actions in a category:
```json
{
  "consensus_trigger": {
    "action_in": [],
    "conditions": [{ "action_kind_in": { "kinds": ["signing_key", "member"] } }],
    "min_approvals": 2
  }
}
```

#### Transaction Policies → `tx_conditions`

**Turnkey DSL:**
```
policy.filter(Activity.type == "ACTIVITY_TYPE_SIGN_TRANSACTION")
  .filter(Transaction.chain == "ethereum")
  .filter(Transaction.to in ["0xabc...", "0xdef..."])
  .filter(Transaction.value <= 1000000000000000000)
  .all()
```

**1Claw `tx_conditions` (v1 — all tiers):**
```json
{
  "chain_in": ["ethereum"],
  "to_address_in": ["0xabc...", "0xdef..."],
  "value_above": "1000000000000000000"
}
```

**1Claw expression engine (v2 — all tiers):**
```
chain == "ethereum" && to in ["0xabc...", "0xdef..."] && value_wei <= "1000000000000000000"
```

**1Claw Cedar (Team+ tier):**
```cedar
permit(
  principal == Agent::"agent-uuid",
  action == Action::"sign",
  resource
)
when {
  resource.chain == "ethereum" &&
  resource.to in ["0xabc...", "0xdef..."] &&
  resource.value_gwei <= 1000000000
};
```

#### Consensus Policies

**Turnkey:** n-of-m quorum **transaction signing** via QuorumOS (MPC threshold signatures).

**1Claw:** `consensus_trigger` gates **who may authorize** signing, exports, and policy changes — human approvals before the single HSM-protected signing key is used. This is governance consensus, not Turnkey-style MPC co-signing.

**1Claw Shamir/MPC (encryption, not signing):** Optional vault-level `2of3_multi_hsm` splits each secret's **DEK** across GCP/AWS/Azure HSMs. Org-level Shamir KEK (Team+) splits the **KEK** across HSMs (+ optional client share). These protect ciphertext at rest; they do not split secp256k1/Ed25519 signing keys for on-chain threshold signatures.

```json
{
  "consensus_trigger": {
    "conditions": [
      { "value_above": { "threshold_wei": "5000000000000000000" } },
      { "chain_in": ["ethereum", "bitcoin"] }
    ],
    "min_approvals": 2,
    "required_roles": ["admin"],
    "require_credential_types": ["passkey", "totp"],
    "skip_when": [{ "value_above": "100000000000000000", "to_address_in": ["0xsafe..."] }],
    "require_when": [{ "always": true }]
  }
}
```

### 3. Per-Chain Struct Depth Comparison

| Chain | Turnkey Fields | 1Claw `TransactionContext` Fields |
|-------|---------------|----------------------------------|
| **Ethereum** | to, value, data, gasLimit | to, from, value_wei, function_selector, function_name, decoded_args, erc20_*, erc721_*, eip712_*, tx_type, deep_inspect inner_calls |
| **Bitcoin** | inputs, outputs, fee | btc_outputs, btc_inputs, btc_fee, btc_total_output_sat, btc_is_segwit, btc_version, btc_locktime |
| **Solana** | instructions, programId | program_ids, sol_account_keys, sol_instructions (with decoded_args), sol_transfers, spl_transfers, sol_num_signers |
| **Tron** | contractType, to, amount | tron_contract_type, tron_to_address, tron_amount, tron_owner_address, tron_contract_address, tron_function_selector, tron_resource_type, tron_permissions |
| **XRP** | — | xrp_tx_type, xrp_destination, xrp_amount, xrp_destination_tag (30+ XRPL tx types) |
| **Cardano** | — | ada_outputs, ada_native_assets |

### 4. What You Gain by Migrating

| Capability | On Turnkey | On 1Claw |
|-----------|-----------|---------|
| Agent memory (encrypted, semantic search) | Build yourself | Built-in (`PUT /v1/agents/{id}/memory/{ns}/{key}`) |
| Cron/webhook automations | Build yourself | Built-in (14 step types, approval gates) |
| LLM proxy with secret redaction | Not available | Shroud (AMD SEV-SNP TEE) |
| Messaging channels (Telegram, WhatsApp, Discord) | Build yourself | Built-in with auto-respond |
| Agent-to-agent delegation | Build yourself | Built-in with human-controlled authorization |
| Cloud runtimes (managed containers) | Build yourself | Built-in with idle auto-stop |
| OIDC federation (Anthropic WIF) | — | `POST /v1/auth/federated-token` |
| Execution intents (HTTP/GraphQL/DB bindings) | — | Built-in with SSRF protection |
| Hash-chained audit with verify API | — | `GET /v1/audit/verify` |
| Mobile companion (approval inbox, step-up) | — | Built-in (Expo, passkey + biometric) |
| MCP server for AI tools | — | `@1claw/mcp` with 141 tools |

### 5. API Mapping

| Turnkey API | 1Claw Equivalent |
|------------|-----------------|
| `POST /api/v1/sign` | `POST /v1/agents/{id}/sign` (unified intent-based) |
| `POST /api/v1/submit` | `POST /v1/agents/{id}/transactions` |
| Create wallet | `POST /v1/agents/{id}/signing-keys` |
| Export wallet | `POST /v1/agents/{id}/signing-keys/{chain}/export` |
| Create policy | `POST /v1/vaults/{id}/policies` |
| Create sub-org | `POST /v1/org/sub-orgs` |
| Create user | `POST /v1/platform/users/upsert` |

### 6. SDK Migration

**Turnkey SDK:**
```typescript
import { Turnkey } from "@turnkey/sdk-server";
const turnkey = new Turnkey({ apiBaseUrl, apiPublicKey, apiPrivateKey });
const result = await turnkey.apiClient().signTransaction({ ... });
```

**1Claw SDK:**
```typescript
import { OneclawClient } from "@1claw/sdk";
const client = new OneclawClient({ baseUrl, apiKey });
const result = await client.agents.signIntent(agentId, {
  intent_type: "transaction",
  chain: "ethereum",
  to: "0x...",
  value: "1000000000000000000",
});
```

## Migration Support

Contact ops@1claw.xyz for assisted migration, including:

- Policy translation review
- Signing key import (`POST /v1/agents/{id}/signing-keys/{chain}/import`)
- Parallel-run validation (sign on both platforms, compare outputs)
- Custom Cedar/OPA policy authoring for complex Turnkey DSL translations
