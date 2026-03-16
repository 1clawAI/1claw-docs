---
title: Licensing
description: What parts of 1claw are open source (MIT) and what is proprietary.
sidebar_position: 6
---

# Licensing

1claw uses a split licensing model. Client-side packages are fully open source under the MIT license. Server-side infrastructure is proprietary and accessed via 1claw.xyz.

## MIT (free to use commercially)

| Package | npm | License |
|---------|-----|---------|
| `@1claw/sdk` | [npm](https://www.npmjs.com/package/@1claw/sdk) | MIT |
| `@1claw/mcp` | [npm](https://www.npmjs.com/package/@1claw/mcp) | MIT |
| `@1claw/cli` | [npm](https://www.npmjs.com/package/@1claw/cli) | MIT |
| `@1claw/openapi-spec` | [npm](https://www.npmjs.com/package/@1claw/openapi-spec) | MIT |

You can use, modify, and redistribute these packages in commercial projects without restriction. The full MIT license text is in each package's `LICENSE` file.

## Proprietary (access via 1claw.xyz)

| Component | Description |
|-----------|-------------|
| **Vault API** | HSM-backed secrets engine, policy engine, billing, auth |
| **Dashboard** | Next.js web UI at 1claw.xyz |
| **Shroud** | TEE LLM proxy running on GKE Confidential Nodes (AMD SEV-SNP) |
| **Intents signing backend** | Transaction signing inside the TEE |

These run as managed services. You interact with them through the MIT-licensed SDK, CLI, and MCP server.

## Why this split?

The packages you install and run locally should be MIT so you can vendor, fork, or extend them without legal friction. The infrastructure that holds your keys and runs inside hardware security modules is proprietary because it requires managed HSM/TEE infrastructure that can't be self-hosted trivially.

## Self-hosting

The Vault API source code is in the [1claw monorepo](https://github.com/1clawAI/1claw) under a proprietary license. If you need a self-hosted deployment (e.g., for air-gapped environments or regulatory requirements), contact [ops@1claw.xyz](mailto:ops@1claw.xyz) to discuss Enterprise licensing.
