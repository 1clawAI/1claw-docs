---
title: GitHub Action
description: Fetch policy-gated vault secrets in GitHub Actions at CI runtime — one agent key, masked env vars, deny-by-default.
sidebar_position: 3
---

# GitHub Action (1Claw Secrets)

The official [**1Claw Secrets**](https://github.com/1clawAI/1claw-action) GitHub Action loads secrets from your vault **at workflow runtime** and exposes them as masked environment variables and step outputs. Pin [`1clawAI/1claw-action@v1`](https://github.com/1clawAI/1claw-action/releases/tag/v1.0.0) (also available as `@v1.0.0`).

Instead of copying dozens of long-lived keys into GitHub repo settings, store **one** agent API key (`ocv_...`) in GitHub Secrets. The action exchanges it for a short-TTL JWT on each run, fetches only the refs you name, registers values with `::add-mask::` before export, and fails closed when policy denies access.

The action is a thin wrapper over [`@1claw/sdk`](https://www.npmjs.com/package/@1claw/sdk) — same agent-key auth and Vault HTTP API as the CLI and MCP server.

## When to use it

| Approach | Best for |
| -------- | -------- |
| **GitHub Action** | GitHub Actions workflows — native step outputs, automatic log masking, no `npm install` on the runner |
| **[CLI](/docs/integrations/cli)** `env pull` / `env run` | Other CI systems, local scripts, or when you need full CLI surface area |
| **[MCP](/docs/vaults/mcp/overview)** | IDE agents (Cursor, Claude Desktop) at development time |

## Quick start

1. **Create a CI agent** in the [dashboard](https://1claw.co/agents/new) (or via `1claw agent create`). Scope a read policy to the secret paths your pipeline needs — see [golden path](/docs/vaults/golden-path).
2. **Add the agent key** to GitHub: repository **Settings → Secrets and variables → Actions**, e.g. `ONECLAW_AGENT_API_KEY` = `ocv_...`.
3. **Reference secrets** in your workflow:

```yaml
name: deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load secrets from 1Claw
        id: vault
        uses: 1clawAI/1claw-action@v1
        with:
          api-key: ${{ secrets.ONECLAW_AGENT_API_KEY }}
          secrets: |
            STRIPE_KEY=prod/api-keys/stripe
            DB_URL=prod/config/db-url
            NPM_TOKEN=ci/tokens/npm

      - name: Deploy
        run: ./deploy.sh
        # STRIPE_KEY, DB_URL, NPM_TOKEN are job env vars (masked in logs)

      - name: Publish (step output)
        run: ./publish.sh
        env:
          NODE_AUTH_TOKEN: ${{ steps.vault.outputs.NPM_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
| ----- | -------- | ------- | ----------- |
| `api-key` | Yes | — | Agent API key (`ocv_...`). Pass `${{ secrets.ONECLAW_AGENT_API_KEY }}`. Exchanged for a short-lived JWT at runtime. |
| `secrets` | Yes | — | Newline- or comma-separated `ENV_NAME=vault/ref` mappings (see below). |
| `mask` | No | `true` | Register each value with `::add-mask::` before export. Leave on. |
| `api-base` | No | `https://api.1claw.xyz` | Vault API base URL (use for staging/self-hosted). |

### Secret mapping format

Each entry is `ENV_NAME=vault/ref`:

- `ENV_NAME` — environment variable and step output name (`[A-Za-z_][A-Za-z0-9_]*`).
- `vault` — vault **ID or name** the agent can access.
- `ref` — secret path inside that vault. Split on the **first** `/`, so paths may contain slashes (e.g. `prod/api-keys/stripe` → vault `prod`, path `api-keys/stripe`).

```yaml
secrets: STRIPE_KEY=prod/api-keys/stripe, DB_URL=prod/config/db-url
```

## Outputs

For each mapping, the action sets:

- A **step output** under `steps.<id>.outputs.ENV_NAME` (masked).
- A **job environment variable** via `$GITHUB_ENV` so later steps read `$ENV_NAME`.

## Security

- **Deny-by-default** — only listed refs are fetched; policy denial fails the step without leaking values.
- **Masking first** — `::add-mask::` runs before export; keep `mask: true`.
- **Short TTL** — per-run JWT from the agent key; scope the agent policy to minimum CI paths.
- **Audited** — every read appears in the 1Claw audit trail.

Review downstream steps that consume these env vars — masking reduces accidental log leakage but does not stop deliberate exfiltration in the same workflow.

## Agent setup tips

- Use a **dedicated CI agent** per repo or environment; set `token_ttl_seconds` low (e.g. `300`) for pipeline-only identity — see [securing access](/docs/vaults/securing-access).
- Prefer **named vaults** in mappings (`prod/...`, `staging/...`) so the same workflow shape works across branches with different policies.
- For Vercel-style scoped env vars instead of path-based secrets, see [environment variables](/docs/guides/environment-variables) and use `env pull` via CLI if you need resolve/precedence semantics.

## Releases

- **Repository:** [github.com/1clawAI/1claw-action](https://github.com/1clawAI/1claw-action)
- **Latest stable:** [v1.0.0](https://github.com/1clawAI/1claw-action/releases/tag/v1.0.0) — pin `uses: 1clawAI/1claw-action@v1` or `@v1.0.0`

## See also

- [CLI](/docs/integrations/cli) — `env pull`, `env run`, and non-GitHub CI
- [Quickstart — CI/CD](/docs/quickstart#common-integration-patterns)
- [Scoped permissions](/docs/vaults/scoped-permissions)
- [1claw.co/for-ai](https://1claw.co/for-ai) — MCP config, discovery endpoints, and package links
