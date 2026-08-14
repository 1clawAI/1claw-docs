---
title: Vaults overview
description: Store secrets in HSM-backed vaults with envelope encryption, policies, rotation, CMEK, MPC, and sharing.
sidebar_position: 0
---

# Vaults

The **Vault** is the foundation of 1Claw. Every secret, agent credential, signing key, and treasury private key lives in an org-scoped vault encrypted with keys that never leave the HSM.

## What you can do

| Capability | Description | Learn more |
|------------|-------------|------------|
| **Secrets** | Store API keys, tokens, and credentials at path-based addresses | [Human API → Secrets](/docs/vaults/human-api/secrets/create) |
| **Policies** | Grant agents read/write access to path patterns with conditions | [Golden path](/docs/vaults/golden-path), [Scoped permissions](/docs/vaults/scoped-permissions) |
| **Rotation** | Server-side generate, version history, disable old versions | [Rotating secrets](/docs/vaults/rotating-secrets) |
| **CMEK** | Client-side AES-256-GCM layer; server never sees your key | [CMEK](/docs/vaults/cmek) |
| **MPC** | Split DEKs across HSM providers (2-of-2 or 2-of-3) | [MPC](/docs/vaults/mpc) |
| **Sharing** | Share secrets with people or agents via share links | [Sharing](/docs/sharing/overview) |

## Interfaces

| Interface | When to use |
|-----------|-------------|
| [Dashboard](/docs/dashboard/overview) | Day-to-day vault and secret management in the browser |
| [Human API](/docs/vaults/human-api/overview) | Full REST API for owners (JWT or `1ck_` API key) |
| [Agent API](/docs/agents/api/overview) | Agents fetch secrets at runtime (JWT from `ocv_` key) |
| [MCP Server](/docs/vaults/mcp/overview) | Claude Desktop, Cursor, and MCP-compatible clients |
| [CLI & SDK](/docs/sdks/overview) | CI/CD, `env run`, automation |

## System vaults

Two vaults are auto-managed and hidden from the vault list:

- **`__agent-keys`** — agent SSH/ECDH keys, signing keys, bindings, Bankr leases
- **`__treasury-keys`** — human treasury wallet private keys

Direct secret reads from system vaults return **403**; use the designated export or reveal endpoints instead.

## Next steps

- [Golden path — vault, secret, policy, agent fetch](/docs/vaults/golden-path)
- [5-minute walkthrough](/docs/guides/five-minute-walkthrough)
- [Securing agent access](/docs/vaults/securing-access)
