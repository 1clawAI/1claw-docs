---
title: Policy cookbooks
description: Ready-to-paste Cedar, tx_conditions, and consensus examples for USDC caps, selector allowlists, EIP-712 Permit deny, decode_failed fail-closed, business hours, N-of-M, Solana, and Bitcoin.
keywords: [policy examples, Cedar, tx_conditions, consensus, USDC, Permit, Solana]
---

# Policy cookbooks

All examples assume payload-aware evaluation (TransactionContext on sign/submit). Field table: [policy language](/docs/treasury/policy-language).

## Deny USDC `transfer` over a raw amount

Built-in (all tiers):

```json
{
  "effect": "deny",
  "secret_path_pattern": "agents/**/chains/**",
  "permissions": ["read", "write"],
  "tx_conditions": {
    "function_name_in": ["transfer"],
    "to_address_in": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    "erc20_amount_above": "1000000000"
  }
}
```

Cedar:

```cedar
permit(principal, action, resource);
forbid(principal, action == OneClaw::Action::"sign", resource)
when {
  resource has function_name && resource.function_name == "transfer"
};
```

## Allowlist selectors on a known contract

```json
{
  "effect": "allow",
  "tx_conditions": {
    "to_address_in": ["0xKnownContract"],
    "function_selector_in": ["0xa9059cbb", "0x095ea7b3"]
  }
}
```

## EIP-712 Permit deny

```cedar
permit(principal, action, resource);
forbid(principal, action == OneClaw::Action::"sign", resource)
when {
  resource has eip712_primary_type &&
  resource.eip712_primary_type == "Permit"
};
```

Consensus 202 on typed data:

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "intent_type_in", "values": ["typed_data"] }],
    "approval": { "min_approvals": 1 }
  }
}
```

## `decode_failed` fail-closed

```json
{
  "effect": "deny",
  "tx_conditions": { "decode_failed": true }
}
```

Outer calldata only — multicall/Safe/4337 inner transfers are not decoded.

## Business hours

```json
{
  "conditions": {
    "time_window": { "start_hour": 9, "end_hour": 17, "days_of_week": [1, 2, 3, 4, 5] }
  }
}
```

## N-of-M over value

```json
{
  "consensus_trigger": {
    "conditions": [{ "type": "value_above", "threshold_gwei": 1000000000 }],
    "approval": { "min_approvals": 2 },
    "expiry_secs": 3600
  }
}
```

## Solana program allowlist

```json
{
  "effect": "allow",
  "tx_conditions": {
    "chain_in": ["solana"],
    "program_id_in": ["11111111111111111111111111111111"]
  }
}
```

System/SPL transfers set `function_name` to `transfer` / `transferChecked` without an IDL. Register Anchor IDLs with `interface_kind: "solana_idl"`.

## Bitcoin output allowlist

Use built-in `to_address_in` (populated from the constructed output address):

```json
{
  "effect": "allow",
  "tx_conditions": {
    "chain_in": ["bitcoin"],
    "to_address_in": ["bc1qallowed..."]
  }
}
```
