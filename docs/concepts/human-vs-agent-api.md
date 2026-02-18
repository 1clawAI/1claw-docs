---
title: Human vs Agent API
description: The same REST API serves humans and agents; auth and typical operations differ by persona — humans manage vaults and grants, agents fetch secrets.
sidebar_position: 3
---

# Human vs Agent API

1claw exposes **one REST API** at a single base URL. Whether you’re a **human** (developer, team) or an **AI agent**, you use the same base URL and the same endpoint paths. What changes is **how you authenticate** and **which operations** you typically perform.

## Human API (secret owner)

**Who:** A person or team that owns the vault and secrets.

**Auth:**

- **Email + password** — `POST /v1/auth/token` with `{ "email": "...", "password": "..." }` → JWT.
- **Google OAuth** — `POST /v1/auth/google` with `{ "id_token": "..." }` → JWT.
- **Personal API key** — `POST /v1/auth/api-key-token` with `{ "api_key": "1ck_..." }` → JWT.

**Typical operations:**

- Create/list/get/delete **vaults**.
- Create/read/update/delete **secrets** (PUT/GET/DELETE by path).
- List secrets (metadata only).
- Create/list/update/delete **policies** (grants) for a vault.
- **Register** agents, list agents, rotate agent keys, deactivate agents.
- Create/revoke **share** links.
- View **audit** events, **billing/usage**, **org members**, and **API keys**.

All of these require a **Bearer JWT** in the `Authorization` header (from one of the auth methods above).

## Agent API (consumer)

**Who:** An AI agent (Claude, GPT, MCP server, custom bot) that has been registered and granted access via policies.

**Auth:**

- **Agent API key** — When you register an agent you receive an API key (`ocv_...`). The agent (or its runtime) calls `POST /v1/auth/agent-token` with `{ "agent_id": "<uuid>", "api_key": "ocv_..." }` and receives a short-lived JWT.

**Typical operations:**

- **List** secrets in a vault (metadata only) — `GET /v1/vaults/:vault_id/secrets`.
- **Get** a secret’s value by path — `GET /v1/vaults/:vault_id/secrets/:path`.
- Optionally **create/update** secrets if the policy grants `write`.

The agent does **not** create vaults, register other agents, or manage policies. It only accesses secrets it’s allowed to by policy. Same endpoints, same JWT format; the `sub` claim is `agent:<uuid>` so the backend applies agent-scoped policies.

## Why separate auth?

Humans need long-lived sessions or API keys for dashboards and automation; agents need short-lived tokens so a leaked token has limited use. Both end up with a JWT; the **subject** (`user:<id>` vs `agent:<id>`) and **org** determine which policies apply. One API, one policy engine, two personas.

## Next

- [Quickstart for humans](/docs/quickstart/humans) — Get a JWT and create a vault and secret.
- [Quickstart for agents](/docs/quickstart/agents) — Get an agent token and fetch a secret.
- [Give an agent access](/docs/guides/give-agent-access) — End-to-end: secret → agent → policy → fetch.
