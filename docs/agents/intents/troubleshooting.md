---
title: Troubleshooting the Intents API
description: The 403 that is not a tier problem, the two EIP-712 shape mistakes, and why JSON.stringify throws on your amount. Every cause here has been hit by a real integration.
keywords: [Intents API, 403, intents_api_enabled, EIP-712, EIP712Domain, eip712_domain_allowlist, BigInt, troubleshooting]
sidebar_position: 6
---

# Troubleshooting the Intents API

Four things account for nearly every support thread on this API. All four now
say so in the error itself; they are collected here because the first one is
invisible from the dashboard, and because two separate engineers reached two
different wrong conclusions about it before asking.

## "Intents API is not enabled on this token"

`intents_api_enabled` is stamped into the agent's **JWT when the token is
minted**, not read from the database per request. Switching the toggle on does
not change a token that already exists, so an agent holding one keeps getting
403 until it re-authenticates.

**Fix:** exchange the agent's API key for a fresh token (`POST
/v1/auth/agent-token`) and retry. Restarting a runtime does the same thing.

Two things this is *not*, both of which have been guessed:

- It is **not** a billing tier. The Intents API is available on every plan
  including Free; nothing in the enforcement path reads your tier.
- It is **not** dashboard-only. The toggle is a normal agent field and the
  API honours it as soon as a token carries it.

## "Type 'EIP712Domain' not found in types"

viem and ethers build the `EIP712Domain` entry themselves and leave it out of
`types`. This API hashes exactly what you send, so include it explicitly,
listing only the fields your `domain` actually sets, in the same order:

```json
"EIP712Domain": [
  { "name": "name", "type": "string" },
  { "name": "version", "type": "string" },
  { "name": "chainId", "type": "uint256" },
  { "name": "verifyingContract", "type": "address" }
]
```

## "Verifying contract ... is not in the agent's eip712_domain_allowlist"

`eip712_domain_allowlist` is an array of **objects**, keyed by
`verifying_contract`:

```json
[{ "verifying_contract": "0xabc..." }]
```

An array of bare address strings parses without complaint and then matches
nothing, which looks identical to the contract genuinely not being allowed.

## "Unknown type '...' in typed data"

A type that is neither a Solidity primitive nor defined in `types`. Usually a
struct the caller forgot to define, or a misspelled primitive (`unit256`).

Signing is refused rather than encoding the field as zero bytes. Before
September 2026 it was not: an undefined type fell through to a bytes32
fallback, so you got a real signature over a digest viem and ethers compute
differently, and found out only when verification failed somewhere else.

## Sending integers from JavaScript

`JSON.stringify` throws on `BigInt`. Send `uint256`/`int256` values as decimal
**strings** — `"1000000"` — which this API parses exactly, at any width.
Numbers are accepted too, but JavaScript numbers lose precision above 2^53 and
will sign a different amount than you meant.
