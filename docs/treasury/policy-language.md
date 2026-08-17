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

### Consensus deep inspection

Set `deep_inspect: true` on the consensus trigger to also evaluate conditions against inner calls from multicall, Safe, and ERC-4337 wrappers. A match on any inner call triggers the consensus requirement:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "value_above", "threshold_gwei": 5000000000 }],
    "approval": { "min_approvals": 2 },
    "deep_inspect": true
  }
}
```

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
