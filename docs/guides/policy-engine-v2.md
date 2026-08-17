---
title: Policy Engine v2
description: Cedar, OPA, tx_conditions, consensus triggers, and pending approvals for agent signing — overview and links to the full policy docs.
keywords: [policy engine v2, Cedar, OPA, tx_conditions, consensus, pending approvals]
---

# Policy Engine v2

**Policy Engine v2** is 1claw's signing-time authorization stack: built-in glob policies with **`tx_conditions`**, optional **Cedar** (Team+) and **OPA** (Business+) backends, **contract ABI / Solana IDL** decoding, and **consensus triggers** that return **202** pending approval instead of signing immediately.

:::tip Canonical docs
This page is a guide entry point. Full reference lives under **Treasury → Policy Engine** in the sidebar.
:::

## What's included

| Feature | Tier | Doc |
| ------- | ---- | --- |
| Built-in policies + **`tx_conditions`** | All | [Policy language — tx_conditions](/docs/treasury/policy-language#built-in-tx_conditions-all-tiers) |
| Cedar backend (shadow / enforce) | Team+ | [Policy Engine — Cedar](/docs/treasury/policy-engine#cedar-policies) |
| OPA (Rego/WASM) backend | Business+ | [Policy Engine — OPA](/docs/treasury/policy-engine#opa-policies) |
| Contract ABIs + **`interface_kind`** (`evm_abi` / `solana_idl`) | All (registry) | [Contract ABI registry](/docs/treasury/policy-engine#contract-abi-registry) |
| **Consensus triggers** + pending approvals | All | [Consensus & pending approvals](/docs/treasury/policy-engine#consensus--pending-approvals) |
| Copy-paste cookbooks (USDC caps, Permit deny, Solana, …) | All | [Policy cookbooks](/docs/treasury/policy-examples) |

## Quick start

1. Read [Policy Engine — Cedar, OPA & Consensus](/docs/treasury/policy-engine) for org backend settings (`shadow` vs `enforce`), circuit breaker, and the approval workflow.
2. Register ABIs at `POST /v1/org/contract-abis` with `interface_kind: "evm_abi"` or `"solana_idl"`.
3. Attach **`tx_conditions`** or **`consensus_trigger`** JSON to access policies on signing key paths.
4. When consensus matches, the API returns **202** with `pending_approval_id`. After human approval, execute with `POST /v1/pending-approvals/{id}/execute` — the **`approval_id` token is single-use** and **submitter-bound**.

```bash
curl -s https://api.1claw.xyz/v1/org/settings/policy-backend \
  -H "Authorization: Bearer $ONECLAW_TOKEN" | jq
```

## Related

- [Intents API guardrails](/docs/agents/intents/guardrails) — per-agent tx caps and allowlists (evaluated before policies)
- [Treasury delegation](/docs/agents/delegation) — inter-agent chat; treasury-mode signing applies **delegation guardrails at signing time**
- [Webhooks](/docs/platform-api/webhooks) — `pending_approval.*`, `policy_backend.circuit_breaker_*`
- [Changelog 2026 — v0.48.x](/docs/reference/changelog-2026#v0482--tx_conditions-consensus-tokens--security-hardening-2026-08-17)
