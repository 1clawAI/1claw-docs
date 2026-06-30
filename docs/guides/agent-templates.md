---
title: Add an agent template
description: Contribute a framework template to the public 1clawAI/agent-templates repository for use with 1claw spawn.
sidebar_position: 12
---

# Add an agent template

`1claw spawn` loads framework-specific agents from the public **[1clawAI/agent-templates](https://github.com/1clawAI/agent-templates)** repository. Anyone can submit a new template or improve an existing one via pull request.

This guide walks through creating a template that passes CI and shows up in `1claw spawn --list`.

## Prerequisites

- A [GitHub](https://github.com) account
- [Docker](https://docs.docker.com/get-docker/) installed locally
- Familiarity with the target framework (LangChain, Mastra, etc.)
- Optional: [`@1claw/cli`](https://docs.1claw.xyz/docs/guides/cli) installed to test `1claw spawn` end-to-end

## How templates are distributed

```text
GitHub (agent-templates)  →  1claw spawn --refresh  →  ~/.config/1claw/templates/
                         ↘  bundled in @1claw/cli npm package (on release)
```

After your PR merges to `main`, users can fetch it with:

```bash
1claw spawn --refresh
1claw spawn your-template --agent-key ocv_YOUR_KEY
```

## Step 1 — Fork and clone

1. Fork [github.com/1clawAI/agent-templates](https://github.com/1clawAI/agent-templates).
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USER/agent-templates.git
cd agent-templates
```

If you work inside the 1Claw monorepo, the same repo lives at `packages/agent-templates` (git submodule). Initialize it with:

```bash
git submodule update --init packages/agent-templates
```

## Step 2 — Pick a starting point

| Language | Copy from |
|----------|-----------|
| Python | `templates/langchain/` or `templates/crewai/` |
| TypeScript | `templates/typescript-sdk/` or `templates/mastra/` |

Create a new directory:

```bash
cp -R templates/langchain templates/my-framework
# edit files — do not leave "langchain" identifiers in template.yaml
```

**Naming rules:**

- Directory name: lowercase, hyphens only (`pydantic-ai`, `my-agent`)
- Must match `name` in `template.yaml` exactly
- Must be unique (not already in `registry.yaml`)

## Step 3 — Required files

Every template directory needs:

| File | Purpose |
|------|---------|
| `template.yaml` | Manifest — name, language, Docker settings |
| `Dockerfile` | Builds the agent image |
| `entrypoint.sh` | Starts MCP + agent; wires Shroud LLM routing |
| Starter code | `agent.py` (Python) or `agent.ts` (Node) |
| `README.md` | Notes for users of this template |
| `requirements.txt` | Python dependencies (Python only) |
| `package.json` | Node dependencies (TypeScript only) |

### `template.yaml` example

```yaml
name: my-framework              # must match directory name
display_name: "My Framework"
version: 1.0.0
description: "Short line shown in 1claw spawn --list"
author: Your Name or Org
language: python                # python | node
homepage: https://example.com

docker:
  base_image: python:3.12-slim
  context_files:
    - Dockerfile
    - requirements.txt
    - agent.py
    - entrypoint.sh
  env:
    ONECLAW_FRAMEWORK: my-framework
  health_endpoint: /health
  health_port: 3000

post_spawn_message: |
  Edit agent.py to customize your agent.
```

## Step 4 — Security requirements

Templates must follow the same model as [`1claw init --docker`](https://docs.1claw.xyz/docs/guides/cli#containerized-agent-runtime-init---docker):

1. **No secrets in the image.** Do not `ENV` API keys or copy credential files.
2. **Daemon socket.** The host mounts `/run/1claw/daemon.sock`; the entrypoint uses `ONECLAW_DAEMON_SOCKET` for MCP and credential injection.
3. **Shroud for LLM.** When `ONECLAW_LLM_VIA_SHROUD=true`, set `OPENAI_BASE_URL` (or equivalent) to `${ONECLAW_SHROUD_URL}/v1` so the container never holds provider keys.
4. **Health check.** Implement `GET /health` returning JSON (see existing templates).

CI rejects files containing patterns like `sk-…`, `ocv_…`, `1ck_…`, or `plt_…`.

## Step 5 — Register in `registry.yaml`

Add an entry at the repo root:

```yaml
  - name: my-framework
    display_name: "My Framework"
    version: 1.0.0
    language: python
    description: "One-line description for the template catalog"
```

The `name` must match your directory under `templates/`. Without this entry, CI fails.

## Step 6 — Test locally

### Docker smoke test

```bash
cd templates/my-framework
docker build -t test-my-framework .
docker run --rm -p 3000:3000 test-my-framework
curl http://localhost:3000/health
```

### CLI integration test (optional)

From a machine with Docker and a 1Claw agent key:

```bash
1claw spawn my-framework --agent-key ocv_YOUR_KEY --llm-api-key sk-...
# open http://localhost:3000
```

When developing in the monorepo, build the CLI so it bundles templates from `packages/agent-templates`:

```bash
cd packages/cli && npm run build
```

## Step 7 — Open a pull request

1. Commit on a feature branch:

```bash
git checkout -b add-my-framework-template
git add templates/my-framework registry.yaml
git commit -m "feat: add my-framework spawn template"
git push origin add-my-framework-template
```

2. Open a PR against `1clawAI/agent-templates` `main`.

3. Wait for CI:
   - Manifest validation (`template.yaml` fields, registry listing, no secrets)
   - Docker build smoke test (currently `langchain`, `crewai`, `openai-agents`; expand matrix in a follow-up PR if needed)

4. A maintainer will review and merge. After merge, the template is available via `1claw spawn --refresh`.

## Entrypoint pattern

Use the same shell pattern as existing templates:

```bash
#!/bin/sh
set -e

DAEMON_SOCKET="${ONECLAW_DAEMON_SOCKET:-/run/1claw/daemon.sock}"

if [ "$ONECLAW_LLM_VIA_SHROUD" = "true" ]; then
    export OPENAI_BASE_URL="${ONECLAW_SHROUD_URL}/v1"
fi

if [ -S "$DAEMON_SOCKET" ] && command -v 1claw-mcp >/dev/null 2>&1; then
    ONECLAW_LOCAL_VAULT=true ONECLAW_DAEMON_SOCKET="$DAEMON_SOCKET" \
        1claw-mcp --local 2>/tmp/mcp.log &
fi

exec python agent.py   # or: npx tsx agent.ts
```

See [CONTRIBUTING.md](https://github.com/1clawAI/agent-templates/blob/main/CONTRIBUTING.md) in the template repo for Dockerfile details and the full manifest schema.

## Templates vs CLI modules

| | **Templates** (`spawn`) | **Modules** (`init --module`) |
|--|-------------------------|-------------------------------|
| **What** | Full project (Dockerfile + starter code) | Extra packages layered on base image |
| **Command** | `1claw spawn langchain` | `1claw init --docker --module=onchain` |
| **Repo** | [agent-templates](https://github.com/1clawAI/agent-templates) | Bundled in `@1claw/cli` |
| **Use when** | Starting a new framework agent | Adding capabilities to an existing agent |

## Related

- [CLI guide — `1claw spawn`](https://docs.1claw.xyz/docs/guides/cli#agent-templates-spawn)
- [Template repository README](https://github.com/1clawAI/agent-templates#contribute-a-template)
- [CONTRIBUTING.md (schema reference)](https://github.com/1clawAI/agent-templates/blob/main/CONTRIBUTING.md)
- [MCP integration](https://docs.1claw.xyz/docs/guides/mcp-integration) — how agents use vault tools
