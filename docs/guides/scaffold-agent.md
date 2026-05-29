---
title: Scaffold-Agent
description: Build onchain AI agents with Scaffold-ETH 2 and 1Claw — HSM-backed secrets, Intents API signing, and a full-stack dApp scaffold.
sidebar_position: 8
---

# Scaffold-Agent

[Scaffold-Agent](https://scaffoldagent.xyz) is a starter kit that combines [Scaffold-ETH 2](https://scaffoldeth.io/) with 1Claw so you can build onchain AI agents with HSM-backed secrets and Intents API signing from day one.

---

## What you get

- Full-stack Next.js dApp wired to Hardhat / Foundry
- Agent identity provisioned with a 1Claw vault and scoped policies
- Intents API signing — agents sign transactions without raw private keys
- Shroud LLM routing — optional TEE proxy for all agent-to-LLM traffic
- Scaffold-ETH 2 hooks (`useScaffoldReadContract`, `useScaffoldWriteContract`) for frontend contract interaction

## Quick start

```bash
git clone https://github.com/1clawAI/scaffoldagent_xyz
cd scaffoldagent_xyz
yarn install
yarn chain       # Local Hardhat network
yarn deploy      # Deploy contracts
yarn start       # Start the frontend
```

Configure your agent credentials in `.env.local`:

```env
ONECLAW_AGENT_ID=your-agent-uuid
ONECLAW_AGENT_API_KEY=ocv_...
ONECLAW_VAULT_ID=your-vault-uuid
```

## Architecture

```
┌──────────────────────────────────────────────┐
│  Next.js Frontend (Scaffold-ETH 2)           │
│  - RainbowKit wallet connection              │
│  - useScaffoldReadContract / WriteContract    │
│  - Agent status dashboard                    │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  Agent Backend                                │
│  - 1Claw SDK for vault secret fetch          │
│  - Intents API for tx signing                │
│  - Shroud proxy for LLM calls (optional)     │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  Smart Contracts (Hardhat / Foundry)          │
│  - Your custom contracts                     │
│  - Deployed via yarn deploy                  │
└──────────────────────────────────────────────┘
```

## Resources

| | |
|---|---|
| **Website** | [scaffoldagent.xyz](https://scaffoldagent.xyz) |
| **GitHub** | [1clawAI/scaffoldagent_xyz](https://github.com/1clawAI/scaffoldagent_xyz) |
| **Video walkthrough** | [YouTube](https://www.youtube.com/watch?v=DVzCg-om3p8) |
| **Scaffold-ETH 2 docs** | [docs.scaffoldeth.io](https://docs.scaffoldeth.io/) |

## Related

- [Intents API](/docs/guides/intents-api) — how agents sign transactions
- [Shroud](/docs/guides/shroud) — TEE LLM proxy
- [Ecosystem](/docs/guides/ecosystem) — all integrations
