---
title: What is 1claw?
description: 1claw is a cloud HSM-backed secrets manager for humans and AI agents with vaults, path-based secrets, and policy-based access.
sidebar_position: 0
---

# What is 1claw?

1claw is a **cloud-hosted secrets manager** built for both **humans** (developers, teams) and **AI agents** (Claude, GPT, MCP servers, custom bots). Secrets are stored in **vaults** and encrypted with keys held in a **Hardware Security Module (HSM)** — in production, Google Cloud KMS. Access is controlled by **policies** that tie a principal (user or agent) to path patterns and permissions, with optional expiry and conditions.

## Core ideas

- **Vaults** — A vault is a named container (e.g. "Production", "CI"). Each vault has its own KEK in the HSM. You create vaults, then store secrets inside them at paths like `api-keys/stripe` or `passwords/db`.
- **Secrets** — Stored by path within a vault. Each secret has a type (e.g. `password`, `api_key`), optional metadata, optional expiry, and versioning. The secret value is encrypted with a DEK that is wrapped by the vault’s KEK.
- **Agents** — Registered identities that get an API key (`ocv_...`). They exchange the key for a JWT and then call the same REST API to list and fetch secrets they’re allowed to see.
- **Policies (grants)** — Define who can do what: e.g. agent `X` can `read` secrets under `**` in vault `V`, or user `Y` can `read,write` paths matching `prod/*`. Policies can have conditions (IP, time window) and expiry.

## Why two personas?

Humans need to **create** vaults, **store** and **rotate** secrets, **register** agents, and **grant** or **revoke** access. Agents only need to **authenticate** and **fetch** the secrets they’re allowed to use. Same API, same base URL; the JWT identifies whether the caller is a user or an agent and which org they belong to. Policies are evaluated on every request so access is always up to date and auditable.

## Next

- [HSM architecture](/docs/concepts/hsm-architecture) — How keys and encryption work.
- [Secrets model](/docs/concepts/secrets-model) — Paths, types, versioning.
- [Human vs Agent API](/docs/concepts/human-vs-agent-api) — When to use which and how auth differs.
