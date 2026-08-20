---
title: Policy language
description: Reference for 1claw policies — four layers, evaluation order, TransactionContext fields, Cedar resource attributes, OPA input.transaction, consensus JSON, time_window, and deep calldata inspection.
keywords: [policy language, Cedar, OPA, tx_conditions, TransactionContext, consensus, deep_inspect, match_mode, time_window]
---

# Policy language

Signing policies are a **typed TransactionContext** evaluated by four layers. The same payload is available as Cedar **resource attributes**, OPA `input.transaction` / `input.tx`, built-in **`tx_conditions`**, and **consensus triggers**.

See [cookbooks](/docs/treasury/policy-examples) for copy-paste rules. Getting started: [Policy Engine](/docs/treasury/policy-engine).

## Four layers

| Layer | Who | When |
| ----- | --- | ---- |
| **Agent guardrails** | Per-agent knobs (`tx_max_value_eth`, allowlists, …) | Every Intents sign/submit |
| **Built-in `tx_conditions`** | `access_policies.tx_conditions` JSON (all tiers) | After calldata is known |
| **Cedar / OPA** | Org backend `builtin+cedar` / `builtin+opa` | Shadow or enforce; payload-aware second eval |
| **Consensus** | `consensus_trigger` on an access policy | Match → **202** pending approval |

Human **`X-Auth-Confirm`** on export/import is **AND** with activity policies (`export` / `import` / `raw_sign`). Agents cannot export keys.

## Evaluation order

```
sign or submit
  → build TransactionContext (ABI / IDL / request construction)
  → agent guardrails
  → built-in path + tx_conditions
  → Cedar or OPA with tx (action sign / submit / raw_sign)
  → consensus (202) or sign
```

Key-path Cedar/OPA still runs at key lookup (`tx: None`). A **second** evaluation runs once the payload is decoded — evaluating the transaction content, not only the key access.

## TransactionContext fields

Serialized as `context.tx` (alias `transaction` for OPA). Optional fields require Cedar `has` guards.

| Field | Type | Notes |
| ----- | ---- | ----- |
| `chain` | string | `ethereum`, `solana`, … |
| `chain_family` | string | `evm` / `solana` / `bitcoin` / `xrp` / `cardano` / `tron` |
| `intent_type` | string | `transaction`, `typed_data`, `personal_sign`, `eip712_digest`, `treasury_send` |
| `sign_only` | bool | true on `/sign` |
| `to` / `from` | string? | |
| `value_gwei` | long? | Overflow → `value_overflow` |
| `function_name` | string? | ABI name or ERC-20/System/SPL hardcoded |
| `function_selector` | string? | `0x` + 4 bytes |
| `function_signature` | string? | alias of selector |
| `function_args` | map of strings | Named decoded args lifted as `arg_amount`, `arg_to`, etc. |
| `arg_amount` / `arg_to` / `arg_from` / `arg_spender` | string? | Lifted named args |
| `decode_failed` | bool | Calldata present but ABI decode failed — **fail-closed** |
| `erc20_*` | string? | Normalized transfer/approve |
| `eip712_primary_type` | string? | typed_data |
| `eip712_domain` | object? | `{ name, version, chain_id, verifying_contract }` |
| `eip712_message` | object? | Full typed data message JSON |
| `eip7702_authorized_addresses` | string[]? | EIP-7702 delegation targets |
| `program_ids` | string[] | Solana |
| `btc_outputs` | `{address, value_sat}[]` | Bitcoin |
| `xrp_tx_type` | string? | default `Payment` |
| `tron_contract_type` | string? | Transfer vs TriggerSmartContract |

**Outermost calldata by default.** Set `deep_inspect: true` on `tx_conditions` or `consensus_trigger` to also evaluate inner calls from multicall, Safe `execTransaction`, and ERC-4337 `handleOps`. Treat `decode_failed` as deny.

## Cedar (resource attributes)

`entity Transaction` carries the fields above. Qualify actions as `OneClaw::Action::"sign"` so they match the schema. Documented form:

```cedar
permit(principal, action, resource);
forbid(principal, action == OneClaw::Action::"sign", resource)
when {
  resource has function_name && resource.function_name == "transfer" &&
  resource has value_gwei && resource.value_gwei > 1000000000
};
```

Actions: `read`, `write`, `rotate`, `sign`, `submit`, `export`, `import`, `raw_sign`.

Nested `context.tx` is also present (primitives only). Prefer `resource.*` for grammar that matches the schema.

Org backend `scope` defaults to `["sign"]`. Add `export` / `raw_sign` to enforce activity policies.

## OPA

`input.tx` and `input.transaction` are the same object (Rust serializes `tx`; both keys are hoisted).

```rego
deny[msg] {
  input.transaction.function_name == "transfer"
  msg := "transfer denied"
}
```

## Built-in `tx_conditions` (all tiers)

Fields are combined according to `match_mode`. `effect` on the policy is allow or deny.

| Field | Match |
| ----- | ----- |
| `match_mode` | `"all"` (default, AND) or `"any"` (OR) |
| `function_name_in` | case-insensitive |
| `function_selector_in` | case-insensitive |
| `erc20_amount_above` | raw token units |
| `value_above` | gwei |
| `to_address_in` | |
| `chain_in` | |
| `intent_type_in` | |
| `decode_failed` | bool |
| `program_id_in` | any listed program in `program_ids` |
| `deep_inspect` | bool — also evaluate against inner calls |
| `eip712_primary_type_in` | typed_data primaryType allowlist |
| `eip712_verifying_contract_in` | typed_data domain.verifyingContract allowlist (case-insensitive) |
| `eip712_domain_name_in` | typed_data domain.name allowlist |
| `eip712_domain_chain_id_in` | typed_data domain.chainId allowlist (integers) |
| `eip7702_authorized_addresses_in` | EIP-7702 authorized delegate addresses (case-insensitive) |

Ignored on secret read (no TransactionContext). Agent guardrails stay the simple knobs; `tx_conditions` is the free expression layer.

### OR logic with `match_mode`

By default, all present fields must match (AND). Set `match_mode: "any"` so at least one field match is sufficient (OR). This is useful for deny policies that block a transaction matching **any** of several criteria:

```json
{
  "tx_conditions": {
    "match_mode": "any",
    "function_name_in": ["approve", "setApprovalForAll"],
    "to_address_in": ["0xSuspiciousContract"]
  }
}
```

The above policy fires when the function is `approve` **OR** `setApprovalForAll` **OR** the `to` address is the listed contract. With `"all"` (default), all three would need to match simultaneously.

### Deep calldata inspection

When `deep_inspect: true`, conditions are also evaluated against **inner calls** extracted from wrapper transactions:

- **Multicall** (`multicall(bytes[])`) — each encoded sub-call
- **Safe `execTransaction`** — the inner call target + data
- **ERC-4337 `handleOps`** — each UserOperation's `callData`

A match on **any** inner call counts as an overall match. This catches transfers hidden inside batched operations:

```json
{
  "tx_conditions": {
    "function_name_in": ["transfer"],
    "to_address_in": ["0xBlockedRecipient"],
    "deep_inspect": true
  }
}
```

Without `deep_inspect`, the outer function name is `multicall` or `execTransaction` and would not match `transfer`.

### EIP-712 per-field conditions

Use `eip712_*` fields to write policies over typed data signing (Permit2, order signing, etc.):

```json
{
  "tx_conditions": {
    "intent_type_in": ["typed_data"],
    "eip712_primary_type_in": ["Permit", "Permit2", "PermitSingle"],
    "eip712_verifying_contract_in": ["0x000000000022D473030F116dDEE9F6B43aC78BA3"]
  }
}
```

Match is case-insensitive on addresses. Combine with `effect: "deny"` to block dangerous typed-data signatures, or `effect: "allow"` to whitelist known verifiers.

### EIP-7702 authorization list conditions

EIP-7702 "set code" transactions delegate execution to another contract. Use `eip7702_authorized_addresses_in` to restrict which contracts an agent may delegate to:

```json
{
  "tx_conditions": {
    "eip7702_authorized_addresses_in": ["0xKnownSafeImplementation"],
    "chain_in": ["ethereum"]
  }
}
```

To deny all EIP-7702 transactions that delegate to unknown contracts, pair with `effect: "deny"` and set the list to known-bad addresses, or create an allow-only policy with your approved implementation addresses.

## Consensus JSON

`approvers.count() >= N` maps to `consensus_trigger.approval.min_approvals`. Conditions AND together (`value_above`, `chain_in`, `to_address_in`, `function_selector_in`, `erc20_amount_above`, `intent_type_in`, `always`). Match → **202**.

### Consensus composability (`skip_when` / `require_when`)

Two optional arrays on `consensus_trigger` give you fine-grained control over when consensus fires:

- **`require_when`** — consensus is ONLY required when at least one entry matches. If set and none match, the transaction signs immediately (no 202). Use this to limit consensus to high-value or high-risk transactions.
- **`skip_when`** — when ALL conditions in ANY entry match, consensus is bypassed even though `conditions` matched. Use this to exempt known-safe addresses or low-value transfers.

Each entry is a `FlatConditionSet` with the same vocabulary as `ConsensusCondition`: `value_above`, `chain_in`, `to_address_in`, `function_selector_in`, `erc20_amount_above`, `intent_type_in`, `always`. Fields within one entry are AND-combined; entries within the array are OR-combined.

**Evaluation order:** `require_when` is checked first, then `skip_when`.

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "always" }],
    "approval": { "min_approvals": 2 },
    "expiry_secs": 3600,
    "require_when": [
      { "value_above": "1000000000" }
    ],
    "skip_when": [
      { "to_address_in": ["0xTreasuryMultisig"], "chain_in": ["ethereum"] }
    ]
  }
}
```

In this example, consensus only triggers for transactions above 1 ETH (via `require_when`), but even those are exempted when sending to the known treasury multisig on Ethereum (via `skip_when`).

### Consensus value precision

`ConsensusCondition::ValueAbove` supports `threshold_wei` (string, arbitrary precision) alongside the deprecated `threshold_gwei` (i64). Prefer `threshold_wei` for all new policies:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "value_above", "threshold_wei": "1000000000000000000" }],
    "approval": { "min_approvals": 2 }
  }
}
```

When both are present, `threshold_wei` takes precedence. `threshold_gwei` is retained for backward compatibility only.

### Consensus approver roles and credential types

Fine-grained control over who can approve and with what authentication method:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "value_above", "threshold_wei": "5000000000000000000" }],
    "approval": {
      "min_approvals": 2,
      "required_roles": ["owner", "admin"],
      "per_role_minimums": { "owner": 1 },
      "require_credential_types": ["passkey"]
    },
    "expiry_secs": 3600
  }
}
```

| Field | Effect |
| ----- | ------ |
| `required_roles` | Only signatures from users with a listed org role (`owner`, `admin`, `member`) count toward `min_approvals` |
| `per_role_minimums` | Enforce minimum counts per role — e.g. at least 1 owner must approve |
| `require_credential_types` | At least one approval must use a listed credential type (`passkey`, `totp`, `biometric`, `password`, `api_key`) |

The signature's `credential_type` is recorded at vote time from the step-up authentication method used (`X-Auth-Confirm` header).

### Control-plane governance

Administrative actions (policy CRUD, key export, member management) can be governed by the same consensus engine. Set an org-level `control_plane_consensus_policy_id` referencing a policy with `consensus_trigger`:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "action_in", "actions": ["policy.create", "policy.update", "policy.delete", "signing_key.export", "member.role_change", "member.remove"] }],
    "approval": { "min_approvals": 2, "required_roles": ["owner"] },
    "expiry_secs": 3600
  }
}
```

When configured, matching control-plane mutations return **202** with a `pending_approval_id`, just like transaction consensus. The `action_payload` contains the full request body (hash-bound) so approvers see exactly what is being authorized.

Governed actions: `policy.create`, `policy.update`, `policy.delete`, `signing_key.export`, `signing_key.import`, `member.role_change`, `member.remove`, `agent.create`, `agent.delete`.

### Consensus deep inspection

Set `deep_inspect: true` on the consensus trigger to also evaluate conditions against inner calls from multicall, Safe, and ERC-4337 wrappers. A match on any inner call triggers the consensus requirement:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "value_above", "threshold_wei": "5000000000000000000" }],
    "approval": { "min_approvals": 2 },
    "deep_inspect": true
  }
}
```

## Expression engine (schema v2)

Set `policy_schema_version: 2` on access policies to enable the mini DSL in `tx_conditions.expression`. The evaluator runs at **signing time** (wired in `policy_engine.rs` via `evaluate_expression_fail_closed`) and is **AND-combined** with v1 field-matching when both are present.

```json
{
  "policy_schema_version": 2,
  "tx_conditions": {
    "chain_in": ["ethereum"],
    "expression": "value_gwei > 1000000000 && function_name != 'approve'"
  }
}
```

**Security properties (fail-closed):**

| Property | Limit |
| -------- | ----- |
| Step budget | 1000 evaluation steps |
| AST depth | 16 levels |
| Expression length | 1024 characters |
| On parse/eval error | Deny for allow-policies; effect-aware for deny-policies |

Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`, `&&`, `||`, `!`, `in`, `contains`. Context fields include `chain`, `chain_family`, `intent_type`, `to`, `value_wei`, `value_gwei`, `function_name`, `function_selector`, `decode_failed`, and ERC-20 lift fields. Set `policy_schema_version: 2` on the policy to enable the expression engine (see above).

## Attribute conditions

`attribute_conditions` JSON on access policies (Policy Engine v2) gates access by caller metadata — evaluated alongside glob path match, IP/time conditions, and `effect`/`priority`.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `required_tags` | string[] | Caller must have all listed secret/principal tags |
| `principal_role` | string[] | Required org role (`owner`, `admin`, `member`) |
| `auth_method` | string[] | Required auth method (`api_key`, `mtls`, `oidc_client_credentials`) |
| `risk_verdict_max` | string | Max acceptable risk verdict (`low`, `medium`, `high`, `critical`) — fail-closed when no risk context |
| `device_known` | boolean | When `true`, require a known/registered mobile device |

```json
{
  "effect": "deny",
  "priority": 10,
  "attribute_conditions": {
    "risk_verdict_max": "medium",
    "auth_method": ["api_key"],
    "device_known": true
  }
}
```

Also supported in `conditions.environment_in` (string array) for agent environment scoping on secret reads.

## Confidence builders

| Feature | Status |
| ------- | ------ |
| **Hash-chained audit logs** | Every `audit_events` row includes `prev_event_id` and `integrity_hash` (SHA-256 chain). Enables cryptographic tamper detection across the full event log. |
| **Calldata-bound approvals** | `pending_approvals.payload_hash` is validated at vote time — the approved payload cannot be swapped before execution. |
| **Policy simulator** | `POST /v1/org/cedar-policies/test` and `POST /v1/org/opa-policies/test` (dry-run). Shadow mode available via org settings. |
| **Deep calldata inspection** | Multicall, Safe `execTransaction`, ERC-4337 `handleOps` inner calls unwrapped and evaluated. Fail-closed `decode_failed` flag. |
| **HSM/TEE attestation** | GCP KMS FIPS 140-2 Level 3 for key operations. Shroud runs on AMD SEV-SNP confidential compute. |

## Time window

`conditions.time_window` restricts when a policy is active.

| Field | Type | Notes |
| ----- | ---- | ----- |
| `start_hour` | int (0–23) | Inclusive start |
| `end_hour` | int (0–24) | Exclusive end |
| `days_of_week` | int[] | 0=Sun, 6=Sat |
| `timezone` | string | IANA timezone (e.g. `"America/New_York"`). Defaults to UTC. |
| `cron_expr` | string | 6-field cron (with seconds). When set, policy is only active at times matching the cron schedule in the given timezone. |

### Timezone-aware scheduling

By default, `start_hour` and `end_hour` are evaluated in UTC. Set `timezone` to evaluate in a local timezone instead:

```json
{
  "conditions": {
    "time_window": {
      "start_hour": 9,
      "end_hour": 17,
      "days_of_week": [1, 2, 3, 4, 5],
      "timezone": "America/New_York"
    }
  }
}
```

This restricts the policy to US Eastern business hours (9 AM – 5 PM, Monday–Friday).

### Cron expressions

For more complex schedules, use `cron_expr` (6-field: `sec min hour day month weekday`):

```json
{
  "conditions": {
    "time_window": {
      "cron_expr": "0 0 9-17 * * 1-5",
      "timezone": "Europe/London"
    }
  }
}
```

This restricts the policy to weekdays 9 AM–5 PM London time. The cron expression is validated on policy creation — invalid expressions are rejected with a 400 error.

## Solana interfaces

`POST /v1/org/contract-abis` with `interface_kind: "solana_idl"` (address = program id). System/SPL `transfer` / `transferChecked` names work without an IDL.
