---
title: Building an Onchain AI Agent with Scaffold-Agent
description: Scaffold a full-stack monorepo (contracts, frontend, agent) with optional 1Claw vault, Shroud LLM proxy, and Intents-ready setup using the open-source scaffold-agent CLI.
sidebar_label: Onchain agent monorepo (Scaffold-Agent)
sidebar_position: 50
tags: [agents, scaffold, foundry, hardhat, nextjs]
---

# Building an Onchain AI Agent with Scaffold-Agent

Use **[scaffold-agent](https://github.com/1clawAI/scaffold-agent)** when you want a **batteries-included monorepo** for onchain AI agents: smart contracts (Foundry or Hardhat), a frontend (Next.js, Vite, or Python A2A), wallet connectivity, and optional **1Claw** integration for secrets, Shroud, and agent identity—without wiring everything by hand.

**Official site:** [scaffoldagent.xyz](https://scaffoldagent.xyz/)  
**Source & full README:** [github.com/1clawAI/scaffold-agent](https://github.com/1clawAI/scaffold-agent#readme)

## When to use this

- You are starting a **new** agent + dApp project and want **one command** to lay out folders, scripts, and env patterns.
- You want **1Claw** as the secrets backend (HSM-backed vault, optional Shroud LLM proxy, deployer/agent keys in the vault) alongside chain tooling.
- You prefer **`just`**-driven workflows (`just chain`, `just deploy`, `just start`) and generated ABI typing similar to Scaffold-ETH 2.

## Quick start

From the [project README](https://github.com/1clawAI/scaffold-agent#readme):

```bash
npx scaffold-agent@latest
# or create a directory directly:
npx scaffold-agent@latest my-agent
cd my-agent
```

Typical local flow (when you included a chain): start the node in one terminal (`just chain`), then fund, deploy, and run the app as described in the generated **`README.md`**.

## How 1Claw fits in

The wizard can configure **secrets management** as **1Claw** (vault), an encrypted secrets file, or plain `.env`. With **1Claw**, the CLI can create a project vault, store deployer (and optional agent) private keys **in the vault** instead of on disk, register an agent, and wire env vars for the app and Shroud. See the README section **“1Claw integration”** for `ONECLAW_VAULT_ID`, `ONECLAW_AGENT_ID`, Shroud billing modes, and LLM key paths.

For day-to-day 1Claw concepts after scaffolding, continue with:

- [Give an agent access](/docs/guides/give-agent-access) — policies and fetching secrets  
- [Shroud](/docs/guides/shroud) — LLM proxy and threat detection  
- [Intents API](/docs/guides/intents-api) — signing transactions without exposing keys  

## Learn more

- [scaffoldagent.xyz](https://scaffoldagent.xyz/) — overview and positioning  
- [github.com/1clawAI/scaffold-agent](https://github.com/1clawAI/scaffold-agent#readme) — prerequisites (`just`, Node), CLI flags, directory layout, and `just` commands  
