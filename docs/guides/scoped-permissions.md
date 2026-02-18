---
title: Scoped permissions
description: Use path patterns and principal_type in policies to grant minimal read or write access to specific secrets.
sidebar_position: 2
---

# Scoped permissions

Policies tie a **principal** (user or agent) to **path patterns** and **permissions**. Use narrow patterns and only the permissions needed.

## Path patterns

- `**` — All paths in the vault (read or write depending on permissions).
- `api-keys/*` — Only paths under `api-keys/` (e.g. `api-keys/openai`, `api-keys/stripe`).
- `prod/db` — Exact path `prod/db` only.

Patterns use glob rules: `*` matches one segment, `**` matches zero or more segments. Give agents the smallest set of paths they need.

## Permissions

- **read** — Can GET secret value and list (metadata).
- **write** — Can PUT (create/update) and DELETE secrets at matching paths.

Grant only `read` unless the agent must create or update secrets.

## Example: agent for one key

Policy: principal_type `agent`, principal_id `<agent_uuid>`, secret_path_pattern `api-keys/openai`, permissions `["read"]`. The agent can only read that one path.

## Example: agent for all keys, read-only

secret_path_pattern `api-keys/*`, permissions `["read"]`. The agent cannot write or delete.
