---
title: Treasury & cards
description: Treasury wallets, Safe multisigs, proposals, payment cards, and embedded wallets in the dashboard.
sidebar_position: 3
---

# Treasury & cards in the dashboard

## Treasury page

**Treasury** (`/treasury`) has tabs:

| Tab | Purpose |
|-----|---------|
| **Wallets** | Generate native multi-chain wallets; Send, Swap, Receive per chain |
| **Safes** | List multisig treasuries; deploy smart accounts |
| **Proposals** | Pending/approved/executed Safe proposals |

### Wallet cards

Each chain shows address, balance (30s refresh), **Send** (with gasless option on EVM), **Swap** (0x aggregator), and **Export** (password re-auth).

### Treasury detail

Per-treasury: signers, threshold, access requests, proposals tab, danger zone (delete).

## Payment cards

**Cards** (`/cards`) lists masked card refs (last4, status, balance). **Reveal** requires password re-auth and shows a post-reveal disclaimer.

Agent card ordering guardrails are configured on the agent **Signing** tab.

## Embedded wallets (platform)

Platform developers embed `@1claw/wallet-react` in their apps. End-users see social login, OTP, Send/Swap/Receive. Dashboard **Platform** section manages apps and templates — not the embedded UI itself.

See: [Embedded wallets](/docs/treasury/embedded-wallets), [wallet-react](/docs/treasury/wallet-react).

## Policy & consensus

Advanced authorization for signing and treasury operations:

- [Approvals](/docs/treasury/approvals) — agent-initiated human approval queue
- [Policy engine](/docs/treasury/policy-engine) — Cedar, OPA, shadow mode, consensus triggers, pending approvals

See also: [Treasury overview](/docs/treasury/overview), [Cards overview](/docs/cards/overview).
