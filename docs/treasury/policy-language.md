---
title: Policy language
description: Turnkey-style reference for 1claw policies — four layers, evaluation order, TransactionContext fields, Cedar resource attributes, OPA input.transaction, consensus JSON, and time_window.
keywords: [policy language, Cedar, OPA, tx_conditions, TransactionContext, consensus]
---

# Policy language

1claw does not ship a CEL clone (`eth.tx.*`). Signing policies are a **typed TransactionContext** evaluated by four layers. The same payload is available as Cedar **resource attributes**, OPA `input.transaction` / `input.tx`, built-in **`tx_conditions`**, and **consensus triggers**.

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

Key-path Cedar/OPA still runs at key lookup (`tx: None`). A **second** evaluation runs once the payload is decoded — Turnkey evaluates the transaction, not only the key.

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
| `function_args` | map of strings | Turnkey `contract_call_args['amount']` → `arg_amount` |
| `arg_amount` / `arg_to` / `arg_from` / `arg_spender` | string? | Lifted named args |
| `decode_failed` | bool | Calldata present but ABI decode failed — **fail-closed** |
| `erc20_*` | string? | Normalized transfer/approve |
| `eip712_primary_type` | string? | typed_data |
| `program_ids` | string[] | Solana |
| `btc_outputs` | `{address, value_sat}[]` | Bitcoin |
| `xrp_tx_type` | string? | default `Payment` |
| `tron_contract_type` | string? | Transfer vs TriggerSmartContract |

**Outermost calldata only.** Multicall, Safe `execTransaction`, and ERC-4337 `handleOps` are not unwrapped. Treat `decode_failed` as deny.

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

AND of present fields. `effect` on the policy is allow or deny.

| Field | Match |
| ----- | ----- |
| `function_name_in` | case-insensitive |
| `function_selector_in` | case-insensitive |
| `erc20_amount_above` | raw token units |
| `value_above` | gwei |
| `to_address_in` | |
| `chain_in` | |
| `intent_type_in` | |
| `decode_failed` | bool |
| `program_id_in` | any listed program in `program_ids` |

Ignored on secret read (no TransactionContext). Agent guardrails stay the simple knobs; `tx_conditions` is the free expression layer.

## Consensus JSON

`approvers.count() >= N` maps to `consensus_trigger.approval.min_approvals`. Conditions AND together (`value_above`, `chain_in`, `to_address_in`, `function_selector_in`, `erc20_amount_above`, `intent_type_in`, `always`). Match → **202**.

## Time window

`conditions.time_window`: `start_hour`, `end_hour`, `days_of_week` (0=Sun). UTC. CronSpan-style expressions are not implemented.

## Solana interfaces

`POST /v1/org/contract-abis` with `interface_kind: "solana_idl"` (address = program id). Equivalent to Turnkey Smart Contract Interfaces. System/SPL `transfer` / `transferChecked` names work without an IDL.
