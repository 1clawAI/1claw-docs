---
title: Ecosystem & Integrations
description: A directory of all integrations, frameworks, and platforms that work with 1Claw — from agent runtimes and LLM providers to payment protocols and infrastructure.
sidebar_position: 20
---

# Ecosystem & Integrations

Everything that connects to 1Claw in one place. Each entry links to a demo repo, guide, or external docs.

---

## Agent Frameworks

### LangChain

Eleven LangChain tools for vault secrets, encrypted memory, signing, and automations. Install `langchain-1claw` on PyPI, pass an `ocv_` agent key, and call `get_all_tools()` in LangGraph or a tool-calling agent.

| | |
|---|---|
| **Website** | [langchain.com](https://www.langchain.com/) |
| **PyPI** | [langchain-1claw](https://pypi.org/project/langchain-1claw/) |
| **Guide** | [LangChain integration](/docs/integrations/langchain) |
| **GitHub** | [1clawAI/langchain-1claw](https://github.com/1clawAI/langchain-1claw) |
| **Demo repo** | [1clawAI/1claw-langchain-demo](https://github.com/1clawAI/1claw-langchain-demo) (Shroud + LangGraph example) |

---

### CrewAI

Eleven CrewAI tools backed by the same agent API: vault CRUD, memory, signing, and automation triggers. One client, one `get_all_tools()` call.

| | |
|---|---|
| **Website** | [crewai.com](https://crewai.com/) |
| **PyPI** | [1claw-crewai-tools](https://pypi.org/project/1claw-crewai-tools/) |
| **Guide** | [CrewAI integration](/docs/integrations/crewai) |
| **GitHub** | [1clawAI/1claw-crewai-tools](https://github.com/1clawAI/1claw-crewai-tools) |

---

### Hermes Agent (Nous Research)

TypeScript integration for Hermes Agent — MCP-based secret fetching, Shroud LLM sidecar, per-subagent scoped identities, and Intents API transaction signing with client-side guardrails.

| | |
|---|---|
| **Website** | [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/) |
| **GitHub** | [1clawAI/1claw-hermes](https://github.com/1clawAI/1claw-hermes) |

---

### ElizaOS (ai16z)

elizaOS plugin giving any character runtime access to a 1Claw vault and multi-chain signing keys. Includes 8 actions (GET_SECRET, LIST_SECRETS, PUT_SECRET, SIGN_MESSAGE, SIGN_TYPED_DATA, SIMULATE_TRANSACTION, SUBMIT_TRANSACTION, LIST_SIGNING_KEYS), a context provider that injects vault paths and daily spend, and optional Shroud routing — all from one `ocv_` key.

| | |
|---|---|
| **Website** | [elizaos.ai](https://elizaos.ai) |
| **npm** | [@1claw/plugin-elizaos](https://www.npmjs.com/package/@1claw/plugin-elizaos) |
| **GitHub** | [1clawAI/1claw-elizaos-plugin](https://github.com/1clawAI/1claw-elizaos-plugin) |
| **Guide** | [elizaOS plugin](/docs/guides/elizaos) |
| **What it shows** | Bootstrap script (human `1ck_` → agent `ocv_`), 8 actions, vault context provider, Intents API signing with guardrails |

---

### NemoClaw (NVIDIA)

Run autonomous AI agents safely with NVIDIA NemoClaw — privacy and security controls over OpenClaw powered by NVIDIA OpenShell. 1Claw provides policy, plugin, and blueprint for secret management inside NemoClaw sandboxes.

| | |
|---|---|
| **Website** | [nvidia.com/en-us/ai/nemoclaw](https://www.nvidia.com/en-us/ai/nemoclaw) |
| **GitHub** | [1clawAI/1claw-nemoclaw](https://github.com/1clawAI/1claw-nemoclaw) |

---

## LLM Providers (Shroud)

These providers are natively supported by the [Shroud TEE proxy](/docs/guides/shroud). Set `X-Shroud-Provider` to route traffic.

### Darkbloom (Eigen Labs)

Decentralized inference on hardware-attested Apple Silicon with end-to-end encryption. The node operator never sees your prompts.

| | |
|---|---|
| **Website** | [darkbloom.dev](https://darkbloom.dev) |
| **Provider header** | `X-Shroud-Provider: darkbloom` |
| **Supported models** | [Reference](/docs/reference/shroud-supported-models#darkbloom-models) |
| **Guide** | [Private AI Agents with Shroud, Darkbloom & Venice](https://1claw.xyz/blog/private-ai-agents-shroud-darkbloom-venice) |

---

### Venice AI

Privacy-first inference with zero data retention, optional TEE and E2EE modes. Supports Claude, GPT, Grok, and TEE-backed open-source models.

| | |
|---|---|
| **Website** | [venice.ai](https://venice.ai) |
| **Provider header** | `X-Shroud-Provider: venice` |
| **Supported models** | [Reference](/docs/reference/shroud-supported-models#venice-models) |
| **Guide** | [Private AI Agents with Shroud, Darkbloom & Venice](https://1claw.xyz/blog/private-ai-agents-shroud-darkbloom-venice) |

---

### Bankr LLM Gateway

Unified LLM interface for crypto agents — Claude, Gemini, GPT, Grok, and more through a single API. Pay with LLM credits, launch fees, or wallet balance on Base and other chains. OpenAI- and Anthropic-compatible endpoints.

| | |
|---|---|
| **Website** | [bankr.bot](https://bankr.bot) |
| **Docs** | [LLM Gateway overview](https://docs.bankr.bot/llm-gateway/overview/) |
| **Provider header** | `X-Shroud-Provider: bankr` |
| **Supported models** | [Reference](/docs/reference/shroud-supported-models#bankr-models) |
| **Skill** | [1claw Bankr Skill](https://skills.bankr.bot/skills/1claw) |

---

## Payments & Commerce

### ampersend (Edge & Node)

The control layer for the agent economy — policies, approvals, and audit trails for every agent transaction. 1Claw manages session keys in the vault while Ampersend handles smart-account x402 payments on Base.

| | |
|---|---|
| **Website** | [ampersend.ai](https://ampersend.ai/) |
| **Example** | [1clawAI/1claw-examples/ampersend-x402](https://github.com/1clawAI/1claw-examples/tree/main/ampersend-x402) |
| **What it shows** | x402 paywall, ERC-6492 smart-account signing, session key in vault, local facilitator settlement |

---

### Arc (Circle)

Stablecoin-native EVM L2 where USDC is the native gas token. Sign and broadcast USDC transfers on Arc using the Intents API — same flow as Ethereum/Base, but fees are paid in USDC (~$0.01/tx).

| | |
|---|---|
| **Website** | [docs.arc.io](https://docs.arc.io) |
| **Example** | [1clawAI/1claw-examples/arc-stablecoin](https://github.com/1clawAI/1claw-examples/tree/main/arc-stablecoin) |
| **Chain ID** | `5042002` (testnet) |
| **What it shows** | Intents API transaction signing on Arc, vault-stored keys, USDC guardrails |

---

## Developer Tools & Platforms

### OpenClaw (OpenAI)

Official gateway plugin for the OpenClaw agent runtime: native 1Claw tools, slash commands, secret redaction, optional Shroud LLM routing, and a bundled skill.

| | |
|---|---|
| **npm** | [@1claw/openclaw-plugin](https://www.npmjs.com/package/@1claw/openclaw-plugin) |
| **GitHub** | [1clawAI/1claw-openclaw-plugin](https://github.com/1clawAI/1claw-openclaw-plugin) |
| **Guide** | [Using 1Claw with OpenClaw](/docs/guides/openclaw) |

---

### Scaffold-Agent

Build onchain AI agents with Scaffold-ETH 2 and 1Claw. A starter kit that wires HSM-backed secrets and Intents API signing into a full-stack dApp scaffold.

| | |
|---|---|
| **Website** | [scaffoldagent.xyz](https://scaffoldagent.xyz) |
| **GitHub** | [1clawAI/scaffoldagent_xyz](https://github.com/1clawAI/scaffoldagent_xyz) |
| **Video** | [YouTube demo](https://www.youtube.com/watch?v=DVzCg-om3p8) |
| **Guide** | [Scaffold-Agent guide](/docs/guides/scaffold-agent) |

---

### Pinata Agents

OpenClaw workspace template for Pinata Agents. Agents self-enroll with 1Claw, fetch secrets at runtime from the vault, and route LLM traffic through Shroud — all from a single `ocv_` key.

| | |
|---|---|
| **Website** | [pinata.cloud](https://pinata.cloud) |
| **GitHub** | [1clawAI/1claw-pinata-template](https://github.com/1clawAI/1claw-pinata-template) |
| **Video** | [YouTube demo](https://www.youtube.com/watch?v=OBCg3nVFNYw) |

---

### Coder

Terraform workspace module that gives every Coder workspace a dedicated 1Claw agent identity with scoped vault access. Per-workspace provisioning, lifecycle cleanup, and MCP config for Cursor and Claude Code.

| | |
|---|---|
| **Website** | [coder.com](https://coder.com/) |
| **GitHub** | [1clawAI/1claw-coder-workspace-module](https://github.com/1clawAI/1claw-coder-workspace-module) |

---

## Infrastructure

### Tenderly

Tenderly powers transaction simulation in the Intents API — simulate before sign, inspect gas and balance changes, and catch reverts with Tenderly's dashboard links from failed runs.

| | |
|---|---|
| **Website** | [tenderly.co](https://tenderly.co/) |
| **Related guide** | [Intents API](/docs/guides/intents-api) |

---

### Google Cloud

1Claw uses Google Cloud for production cryptography: Cloud HSM-backed envelope encryption for secrets, and Confidential Computing (AMD SEV-SNP) for the Shroud TEE proxy.

| | |
|---|---|
| **Cloud KMS / HSM** | [cloud.google.com/security/products/security-key-management](https://cloud.google.com/security/products/security-key-management) |
| **Confidential Computing** | [cloud.google.com/security/products/confidential-computing](https://cloud.google.com/security/products/confidential-computing) |
| **Related guide** | [HSM architecture](/docs/concepts/hsm-architecture) |

---

## Want to add yours?

If you've built something with 1Claw, email [ops@1claw.xyz](mailto:ops@1claw.xyz) and we'll add it here and on [1claw.xyz/ecosystem](https://1claw.xyz/ecosystem).
