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
| **Wallets** | Generate native multi-chain wallets; Send, Swap, Receive per chain. Also holds the passkey Safes card and, in beta, the 2-of-3 Safes card |
| **Deposits** | Deposit destinations that route incoming funds |
| **Accounts** | Internal ledger accounts |
| **Safes** | List multisig treasuries; deploy smart accounts |
| **Access Requests** | Agents asking for wallet access |

### Wallet cards

Each chain shows address, balance (30s refresh), **Send** (with gasless option on EVM), **Swap** (0x aggregator), and **Export** (password re-auth).

On chains enabled for your org, a **Self-custody** button creates a 2-of-3 wallet (`custody: "client_tss"`) instead, or moves an existing server wallet to self-custody. A self-custody wallet has no private key to export: its backup dialog offers the recovery kit, **Restore from kit** and **Refresh shares**, and the card asks you to back it up before receiving funds. See [Key custody](/docs/security/custody).

### Treasury detail

Per-treasury: signers, threshold, access requests, proposals tab, danger zone (delete).

## Payment cards

**Cards** (`/cards`) lists masked card refs (last4, status, balance). **Reveal** requires password re-auth and shows a post-reveal disclaimer.

Agent card ordering guardrails are configured on the agent **Wallets** tab.

## Embedded wallets (platform)

Platform developers embed `@1claw/wallet-react` in their apps. End-users see social login, OTP, Send/Swap/Receive. Dashboard **Platform** section manages apps and templates — not the embedded UI itself.

See: [Embedded wallets](/docs/treasury/embedded-wallets), [wallet-react](/docs/treasury/wallet-react).

## Policy & consensus

Advanced authorization for signing and treasury operations:

- [Approvals](/docs/treasury/approvals) — agent-initiated human approval queue
- [Policy engine](/docs/treasury/policy-engine) — Cedar, OPA, shadow mode, consensus triggers, pending approvals

See also: [Treasury overview](/docs/treasury/overview), [Cards overview](/docs/cards/overview).
