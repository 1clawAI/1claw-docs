# Policy Schema Versioning

## Overview

1Claw uses versioned policy schemas to ensure backward compatibility as the policy engine evolves. Every policy carries a `policy_schema_version` field that determines which evaluation features are available.

## Schema Versions

### Version 1 (Legacy)

The original field-matching schema. All policies created before the expression engine was introduced default to version 1.

**Features:**
- `tx_conditions` JSON with field-level matching (`function_name_in`, `chain_in`, `to_address_in`, etc.)
- `match_mode` (`all` / `any`)
- `consensus_trigger` with `action_in` conditions
- `skip_when` / `require_when` composability

**Evaluation:** Each field in `tx_conditions` is matched independently against the `TransactionContext`. All fields combined per `match_mode`.

### Version 2 (Current)

Adds the expression engine and `action_kind` matching. Backward compatible — all v1 fields continue to work unchanged.

**New features:**
- `tx_conditions.expression` — mini-DSL for predicate logic (see below)
- `action_kind_in` on consensus triggers — version-agnostic action matching (e.g. `signing_key` matches `signing_key.export`, `.import`, `.rotate`, `.deactivate`)
- Expanded `CONTROL_PLANE_ACTIONS` taxonomy (29 actions across 15 kinds)

**Evaluation:** When `expression` is present in `tx_conditions`, it is evaluated alongside field-matching. Both must pass (AND logic). The expression engine has security hardening: step budget (1000), AST depth cap (16), string length cap (1024), fail-closed on errors.

## Migration Guide

### Existing policies (no action required)

All existing policies automatically operate at version 1. No migration is needed — they continue to work exactly as before.

### Upgrading to version 2

When creating new policies, set `policy_schema_version: 2` to unlock expression support. Existing v1 policies can remain unchanged indefinitely.

**Example — v1 field-matching:**
```json
{
  "tx_conditions": {
    "chain_in": ["ethereum", "base"],
    "to_address_in": ["0x1234..."]
  }
}
```

**Equivalent v2 with expression:**
```json
{
  "policy_schema_version": 2,
  "tx_conditions": {
    "expression": "(chain == 'ethereum' || chain == 'base') && to == '0x1234...'"
  }
}
```

### Combining field-matching and expressions

When both are present, they are AND-combined — the transaction must satisfy both the field-level conditions and the expression:

```json
{
  "policy_schema_version": 2,
  "tx_conditions": {
    "chain_in": ["ethereum"],
    "expression": "value_gwei > 1000000000 && function_name != 'approve'"
  }
}
```

### `action_kind` for consensus triggers

Use `action_kind_in` for forward-compatible governance policies that automatically cover new actions added to a kind:

```json
{
  "consensus_trigger": {
    "conditions": [
      { "type": "action_kind_in", "kinds": ["signing_key", "credential"] }
    ],
    "approval": { "min_approvals": 2 }
  }
}
```

This matches `signing_key.export`, `signing_key.import`, `signing_key.rotate`, `signing_key.deactivate`, `credential.create`, and `credential.delete` — including any future actions added to these kinds.

## Expression Engine Reference

### Supported operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equality (case-insensitive for strings) | `chain == 'ethereum'` |
| `!=` | Inequality | `intent_type != 'personal_sign'` |
| `>`, `>=`, `<`, `<=` | Numeric comparison | `value_gwei > 1000000000` |
| `&&` | Logical AND | `chain == 'ethereum' && to == '0x...'` |
| `\|\|` | Logical OR | `chain == 'ethereum' \|\| chain == 'base'` |
| `!` | Logical NOT | `!decode_failed` |
| `in` | Membership test | `chain in ['ethereum', 'base']` |
| `contains` | Substring (case-insensitive) | `function_name contains 'transfer'` |

### Available context fields

| Field | Type | Description |
|-------|------|-------------|
| `chain` | string | Chain name (e.g. "ethereum") |
| `chain_family` | string | Chain family (e.g. "evm") |
| `chain_id` | number | Numeric chain ID |
| `intent_type` | string | Sign intent type |
| `to` | string | Destination address |
| `value_wei` | string | Transaction value in wei |
| `value_gwei` | number | Transaction value in gwei |
| `function_name` | string | Decoded function name |
| `function_selector` | string | 4-byte function selector |
| `erc20_transfer_to` | string | ERC-20 transfer recipient |
| `erc20_transfer_amount_raw` | string | ERC-20 transfer amount (raw) |
| `decode_failed` | boolean | Whether calldata decode failed |
| `program_id` | string | Solana program ID |
| `token_mint` | string | Token contract/mint address |

### Security properties

- **Fail-closed:** Parse or evaluation errors return `false` (deny access for allow-policies)
- **Step budget:** Max 1000 evaluation steps prevents DoS
- **Depth cap:** Max 16 levels of AST nesting
- **Length cap:** Max 1024 characters per expression
- **Field allowlist:** Only the listed context fields are accessible
- **No side effects:** Pure boolean evaluation over read-only context

## Deprecation Policy

- Fields deprecated in a schema version remain functional indefinitely
- Deprecated fields generate dashboard warnings but do not break evaluation
- New schema versions are always additive — they never remove or change existing behavior
- The `policy_schema_version` on existing policies is never auto-upgraded
