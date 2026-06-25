---
title: CLI
description: Use the 1Claw CLI for CI/CD, DevOps, and servers. Browser-based login, env pull/push/run, and full API coverage.
sidebar_position: 11
---

# 1Claw CLI

The `@1claw/cli` package provides a full-featured command-line interface for 1Claw. It is designed for CI/CD pipelines, DevOps workflows, local development, and server environments.

## Installation

### Homebrew (macOS / Linux)

```bash
brew install 1clawAI/tap/oneclaw
```

### npm

```bash
npm install -g @1claw/cli
```

Or run with npx:

```bash
npx @1claw/cli login
```

## Quick start

**Configure your existing AI clients** (Claude Desktop, Cursor, VS Code, …):

```bash
1claw setup    # Login, create agent + vault + policy, configure AI clients
```

That single command provisions everything: an agent (with Shroud + Intents API enabled), a vault, an access policy, and MCP config for all detected AI clients (Claude Desktop, Claude Code, Cursor, Windsurf, VS Code, Continue.dev, Zed).

**Or spin up a self-contained agent in Docker** — one command gives you a running, vault-connected agent with a chat UI, where the container never sees your API key:

```bash
1claw init --docker --local    # Fully offline; no cloud account needed
```

Open **http://localhost:3000** and you have a live agent. See [Containerized agent runtime](#containerized-agent-runtime-init---docker) below for the full walkthrough.

## Authentication

### Browser-based login (recommended)

```bash
1claw login
```

This opens your browser to 1claw.xyz where you approve the login. The CLI polls until you confirm. Your token is stored in `~/.config/1claw/`.

### Email/password

```bash
1claw login --email
```

Supports MFA if enabled on your account.

### CI/CD (non-interactive)

Set environment variables — no login needed:

```bash
export ONECLAW_TOKEN="your-jwt"
# or
export ONECLAW_API_KEY="1ck_..."
export ONECLAW_VAULT_ID="your-vault-uuid"   # optional; required for vault-scoped commands
```

### Password management

```bash
1claw forgot-password              # Request password reset email
1claw reset-password               # Set new password from email token
1claw set-password                 # Set a password (platform OIDC users)
1claw change-email                 # Change email (sends verification code)
```

## Main commands

| Area | Commands |
| ---- | -------- |
| **Setup** | `setup` — auto-configure AI clients with agent, vault, and policy provisioning |
| **Containers** | `init --docker`, `containers list/info/stop/rm/logs`, `publish`, `eject`, `deploy --google-cloud` |
| **Auth** | `login`, `logout`, `whoami`, `forgot-password`, `reset-password`, `set-password`, `change-email` |
| **Vaults** | `vault list`, `vault create`, `vault get`, `vault link`, `vault unlink`, `vault delete` |
| **Secrets** | `secret list`, `secret get`, `secret set`, `secret delete`, `secret rotate`, `secret describe`, `secret versions` |
| **Import** | `import .env` — import secrets from .env files into a vault |
| **CI/CD** | `env pull`, `env push`, `env run`, `env cache`, `env cache-status`, `env cache-clear` |
| **Agents** | `agent list`, `agent create`, `agent get`, `agent update`, `agent delete`, `agent token`, `agent enroll` |
| **Signing keys** | `agent keys list`, `agent keys create`, `agent keys rotate`, `agent keys delete`, `agent export-signing-key` |
| **Unified signing** | `agent sign` — EIP-191, EIP-712, or raw transaction signing |
| **Transactions** | `agent tx submit`, `agent tx sign`, `agent tx list`, `agent tx get` |
| **Bankr keys** | `agent bankr-key lease`, `agent bankr-key list`, `agent bankr-key revoke` |
| **Treasury** | `treasury generate`, `treasury list`, `treasury get`, `treasury balance`, `treasury send`, `treasury swap`, `treasury export`, `treasury rotate`, `treasury deactivate` |
| **Proposals** | `treasury proposal create`, `treasury proposal list`, `treasury proposal get`, `treasury proposal sign`, `treasury proposal execute`, `treasury proposal cancel` |
| **Policies** | `policy list`, `policy create`, `policy delete` |
| **Sharing** | `share create`, `share list`, `share accept`, `share decline`, `share revoke` |
| **Webhooks** | `webhook create`, `webhook list`, `webhook get`, `webhook update`, `webhook delete` |
| **Platform** | `platform create`, `platform list`, `platform get`, `platform update`, `platform delete`, `platform rotate-key`, `platform templates`, `platform users`, `platform connected-apps`, `platform reissue-claim` |
| **Approvals** | `approval list`, `approval get`, `approval decide` |
| **Billing** | `billing status`, `billing credits`, `billing usage`, `billing ledger` |
| **Audit** | `audit list` |
| **MFA** | `mfa status`, `mfa enable`, `mfa disable` |
| **Devices** | `device list`, `device revoke` |
| **Config** | `config list`, `config set`, `config get` |
| **Proxy** | `proxy` — local OpenAI-compatible proxy that routes through [Shroud](/docs/guides/shroud) |
| **Local vault** | `local init`, `local add`, `local list`, `local get`, `local rm`, `local import`, `local export`, `local sync`, `local status`, `local destroy` |
| **Local daemon** | `daemon start`, `daemon stop`, `daemon status`, `daemon policy add/list/remove` |
| **OIDC** | `auth federated-token` — mint short-lived RS256 JWT for external relying parties |

## Setup (AI client auto-configuration)

Auto-detect and configure AI clients to use the 1Claw MCP server for runtime secret access.

```bash
1claw setup                            # Interactive: login, create agent + vault + policy, configure clients
1claw setup --client cursor            # Configure only Cursor
1claw setup --agent-key ocv_...        # Use a specific agent API key (skips provisioning)
1claw setup --local                    # Configure for local daemon mode (no cloud)
```

When you choose "Create a new agent", `setup` provisions everything end-to-end:

1. Creates an agent with **Shroud LLM proxy** and **Intents API** enabled
2. Lists your existing vaults or auto-creates a "default" vault
3. Creates a read + write access policy on `secrets/*` for the agent
4. Binds the agent to the vault
5. Configures each selected AI client's MCP config

## Import (.env files)

```bash
1claw import .env                      # Import all keys from .env
1claw import .env.production --prefix prod/    # Add a path prefix
1claw import .env --dry-run            # Preview what would be imported
1claw import .env --force              # Overwrite existing secrets
1claw import .env --vault <id>         # Import to a specific vault
```

## Agents

```bash
1claw agent list
1claw agent create my-agent
1claw agent create my-agent \
  --shroud \                           # Enable Shroud LLM proxy
  --tx-to-allowlist 0x... \            # Transaction guardrails
  --tx-max-value 0.1 \
  --tx-daily-limit 1.0 \
  --tx-allowed-chains sepolia,base
1claw agent get <id>
1claw agent update <id> --shroud true --intents-api true
1claw agent delete <id>
1claw agent token <id>                 # Generate agent JWT
1claw agent enroll my-agent --email human@example.com   # Self-enroll (no auth)
```

## Transactions (Intents API)

Submit, sign, and inspect on-chain transactions for agents with Intents API enabled.

```bash
1claw agent tx submit <agent-id> \
  --to 0xRecipient --value 0.01 --chain sepolia
1claw agent tx submit <agent-id> \
  --to 0xRecipient --value 0.01 --chain sepolia --simulate
1claw agent tx sign <agent-id> \
  --to 0xRecipient --value 0.01 --chain sepolia   # Sign only (no broadcast)
1claw agent tx list <agent-id>
1claw agent tx get <agent-id> <tx-id>
```

## Signing keys (multi-chain)

Manage per-agent signing keys. Keys are generated server-side and stored in the vault.

```bash
1claw agent keys list <agent-id>
1claw agent keys create <agent-id> --chain ethereum
1claw agent keys create <agent-id> --chain solana
1claw agent keys rotate <agent-id> --chain ethereum
1claw agent keys delete <agent-id> --chain ethereum
1claw agent export-signing-key <agent-id> --chain ethereum   # Requires password
```

Supported chains: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`.

## Unified signing (`agent sign`)

Sign messages, typed data, or raw transactions.

```bash
# EIP-191 personal_sign
1claw agent sign <agent-id> \
  --intent-type personal_sign --message 0x48656c6c6f

# EIP-712 typed data
1claw agent sign <agent-id> \
  --intent-type typed_data --typed-data ./permit.json

# Transaction (all EIP-2718 types: legacy, EIP-1559, EIP-4844, EIP-7702)
1claw agent sign <agent-id> \
  --intent-type transaction --to 0xRecipient --value 0.01 --chain base --tx-type 2
```

## Treasury wallets

Multi-chain wallet generation for human users.

```bash
1claw treasury generate                         # Generate wallets for all chains
1claw treasury generate --chains ethereum,solana
1claw treasury list
1claw treasury get <chain>
1claw treasury balance <chain>
1claw treasury balance ethereum --tokens 0xA0b8...eB48
1claw treasury send <chain> --to 0xRecipient --amount 0.01
1claw treasury swap <chain> \
  --sell-token native --buy-token 0xA0b8... --amount 0.1 --slippage 1
1claw treasury export <chain> --password <pw>    # Audit-logged
1claw treasury rotate <chain>
1claw treasury deactivate <chain>
```

Supported chains: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`. Requires Pro or higher billing tier.

## Treasury proposals (multisig)

```bash
1claw treasury proposal create <treasury-id> \
  --to 0xRecipient --value 1000000000000000 --chain ethereum
1claw treasury proposal list <treasury-id>
1claw treasury proposal get <treasury-id> <id>
1claw treasury proposal sign <treasury-id> <id> --signature 0x... --decision approve
1claw treasury proposal execute <treasury-id> <id>
1claw treasury proposal cancel <treasury-id> <id>
```

## Webhooks

```bash
1claw webhook create --url https://example.com/hook \
  --events wallet.transfer.sent,proposal.created
1claw webhook create --url https://example.com/hook \
  --events agent.transaction.broadcast --secret my-hmac-secret
1claw webhook list
1claw webhook get <id>
1claw webhook update <id> --active false
1claw webhook delete <id>
```

Supported events: `wallet.transfer.sent`, `wallet.transfer.received`, `proposal.created`, `proposal.signed`, `proposal.executed`, `proposal.cancelled`, `agent.transaction.broadcast`, `agent.transaction.signed`, `signing_key.rotated`, `policy.created`, `policy.updated`, `policy.deleted`.

## Platform API

Manage platform apps for developers building multi-tenant applications on top of 1Claw.

```bash
1claw platform create my-app my-slug
1claw platform list
1claw platform get <app-id>
1claw platform update <app-id> --name new-name
1claw platform delete <app-id>
1claw platform rotate-key <app-id>
1claw platform reissue-claim <connection-id>

# Templates
1claw platform templates list <app-id>
1claw platform templates create <app-id> <name> --spec ./template.json

# Connected users
1claw platform users list <app-id>
1claw platform connected-apps
```

## Approvals

Human-in-the-loop approval workflow for agent actions.

```bash
1claw approval list
1claw approval list --status approved
1claw approval get <id>
1claw approval decide <id> approve
1claw approval decide <id> reject --reason "Not needed"
```

## Bankr dynamic key vending

Lease short-lived Bankr wallet API keys. Agents need explicit policy on `agents/{id}/bankr/*` in `__agent-keys`.

```bash
1claw agent bankr-key lease <agent-id>
1claw agent bankr-key lease <agent-id> --ttl 600 --wallet wlt_abc123
1claw agent bankr-key list <agent-id>
1claw agent bankr-key revoke <agent-id> <lease-id>
```

## OIDC federation

Mint short-lived RS256 JWTs for external relying parties (Anthropic WIF, GCP/AWS STS).

```bash
1claw auth federated-token --audience https://api.anthropic.com
1claw auth federated-token -a https://api.anthropic.com --raw   # Raw token for pipes
```

The agent must have `federation_enabled = true` and the audience on its allowlist.

## Environment (CI/CD)

```bash
1claw env pull                         # Pull secrets as .env format
1claw env pull --format json           # As JSON
1claw env pull -o .env.local           # Write to file
1claw env push .env                    # Push .env file to vault
1claw env run -- npm start             # Run with secrets injected
1claw env run --prefix config/ -- ./deploy.sh
```

### Environment cache (offline mode)

Cache secrets locally in an AES-256-GCM encrypted file for offline `env run`.

```bash
1claw env cache                        # Download and cache secrets locally
1claw env cache --ttl 3600             # Cache with 1-hour TTL (default: 300s)
1claw env cache-status                 # Show cache age, vault ID, secret count
1claw env cache-clear                  # Delete the local cache
```

When a valid cache exists, `env run` uses it automatically. Use `--no-cache` to bypass.

## Local vault (offline, encrypted)

Store secrets locally in an encrypted vault — no cloud required. AES-256-GCM with PBKDF2 (100k iterations).

```bash
1claw local init                       # Create local vault with passphrase
1claw local add STRIPE_KEY             # Add secret (prompted, masked)
1claw local list                       # List secret names (never values)
1claw local get STRIPE_KEY             # Retrieve a value
1claw local rm STRIPE_KEY              # Remove a secret
1claw local import .env                # Import .env file into local vault
1claw local export -o .env             # Export as .env format
1claw local sync -v <vault-id>         # Push local secrets to cloud vault
1claw local sync --pull -v <id>        # Pull cloud secrets into local vault
1claw local status                     # Show vault info (count, sync status)
1claw local destroy                    # Permanently delete local vault
```

Vault file: `~/.config/1claw/local-vault.enc` (0600 permissions, safe to back up).

## Local daemon (secret proxy)

The daemon serves secrets over a Unix socket and injects them into HTTP requests without exposing values to the AI model. The model knows *which* secret to use and *where* to send it, but never sees the raw value.

```bash
1claw daemon start                     # Unlock vault, listen on socket

1claw daemon policy add STRIPE_KEY --hosts api.stripe.com
1claw daemon policy add OPENAI_KEY --hosts api.openai.com,*.openai.com
1claw daemon policy list
1claw daemon policy remove STRIPE_KEY

1claw daemon status
1claw daemon stop
```

### Setup for local mode

```bash
1claw setup --local
```

This sets `ONECLAW_LOCAL_VAULT=true` and `ONECLAW_DAEMON_SOCKET` in the MCP config, so the MCP server connects to the local daemon instead of `api.1claw.xyz`. The model uses `proxy_request` to make API calls with secrets injected — the secret value never enters the context window.

### Architecture

```
AI Client (Claude, Cursor, etc.)
    └─ MCP Server (@1claw/mcp, local mode)
         └─ Unix Socket (~/.config/1claw/daemon.sock)
              └─ 1claw Daemon (holds decrypted vault in memory)
                   ├─ Policy Engine (per-secret host allowlist, fail-closed)
                   └─ Secret Proxy (injects credentials into HTTP requests)
```

## LLM Proxy (`1claw proxy`)

Start a local OpenAI-compatible server that forwards all requests through Shroud. Use this to route LLM traffic from **Cursor**, **VS Code + Continue**, **Zed**, or any tool that supports a custom OpenAI base URL — with full Shroud inspection, secret redaction, and optional [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on).

### Quick start

```bash
export ONECLAW_AGENT_API_KEY="ocv_..."   # same env as MCP — no flag needed
1claw proxy
```

Or pass the key explicitly:

```bash
1claw proxy --agent-key "AGENT_ID:ocv_YOUR_KEY"
# or key-only (Vault resolves agent by prefix):
1claw proxy --agent-key "ocv_YOUR_KEY"
```

The proxy listens on `http://127.0.0.1:11434` (or the next free port) and prints **Cursor, Claude Code, Copilot, and extension** snippets on startup. Key-only / env mode calls `POST /v1/auth/agent-token` once at startup (uses `ONECLAW_API_URL`, default `https://api.1claw.xyz`).

**Full IDE walkthrough:** [IDE & tool setup (Shroud proxy)](/docs/guides/ide-shroud-setup).

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--agent-key <id:key>` or `ocv_...` | env fallback | If omitted, uses `ONECLAW_AGENT_API_KEY` (+ optional `ONECLAW_AGENT_ID`) |
| `--port <n>` | `11434` | Local port; if busy, tries up to 32 higher ports; `0` = OS-assigned |
| `--provider <name>` | auto-detect | Force a provider instead of detecting from model name |
| `--shroud-url <url>` | `https://shroud.1claw.xyz` | Override Shroud endpoint |
| `--verbose` | off | Log each request with timestamp, method, provider, and status |

### Auto-detection

The proxy detects the provider from the `model` field in the request body:

| Model prefix | Provider |
|-------------|----------|
| `gpt-*`, `o1*`, `o3*`, `o4*`, `chatgpt-*` | `openai` |
| `claude-*` | `anthropic` |
| `gemini-*` | `google` |
| `mistral-*` | `mistral` |
| `command-*` | `cohere` |

Override with `--provider` if needed.

### Editor setup

#### Cursor

1. Run the proxy:
   ```bash
   1claw proxy --agent-key "AGENT_ID:ocv_..."
   ```
2. In Cursor **Settings → Models → OpenAI**:
   - **Base URL**: `http://127.0.0.1:11434/v1`
   - **API Key**: `1claw` (any value — the proxy ignores it)

#### VS Code + Continue

Add to `~/.continue/config.json`:

```json
{
  "models": [{
    "title": "1Claw Shroud",
    "provider": "openai",
    "model": "gpt-4o",
    "apiBase": "http://127.0.0.1:11434/v1",
    "apiKey": "1claw"
  }]
}
```

#### Any OpenAI-compatible client

Point the base URL to `http://127.0.0.1:11434/v1`. The proxy accepts any `Authorization` header (or none) and replaces it with the Shroud agent credentials.

### LLM Token Billing

When your org has **LLM Token Billing** enabled (Settings → Billing), the proxy works without any provider API keys. Shroud routes through Stripe AI Gateway and bills token usage to your org automatically. See [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on).

## Containerized agent runtime (`init --docker`)

`1claw init --docker` provisions a secure agent runtime inside a Docker container in one command. The container ships with the 1Claw MCP server and a lightweight chat UI on port 3000. The container **never receives the agent API key** — the host [daemon](#local-daemon-secret-proxy) injects credentials over a read-only Unix-socket bind mount, preserving the same trust boundary as local daemon mode.

**Prerequisites:** Docker installed and running, and Node 20+. That's it — `--local` needs no cloud account.

### Quickstart

**1. Launch an agent (offline, no cloud account):**

```bash
1claw init --docker --local
```

You'll see the runtime come up:

```text
  1Claw — Secure Agent Runtime

ℹ Local mode — no cloud account or provisioning.
✔ Image ready: 1claw/agent:stable
✔ Daemon running on ~/.config/1claw/daemon.sock
✔ Container started (6debaf863c02)
✔ Agent is healthy.

✓ Agent runtime is up.
Chat UI        http://localhost:3000
Container      docker-agent-a3f2
Modules        none
Key injection  daemon (container never sees the key)
```

The first run builds the base image from bundled assets (pulls `node:20-alpine` and installs the MCP server), so it takes a minute or two. Subsequent runs reuse the cached image and start in seconds.

:::note Streaming logs vs. detaching
Without `--detach`, `init` tails the container logs and stays in the foreground (you'll see _"Streaming container logs (Ctrl+C to detach; container keeps running)"_). Press **Ctrl+C** to return to your shell — the container keeps running. Use `--detach` to start in the background immediately.
:::

**2. Open the chat UI** at [http://localhost:3000](http://localhost:3000). The header confirms the security model: _"credentials stay in the host daemon — this container never sees secret values."_

:::tip Conversational replies need a model module
The base image has the MCP server and chat UI but **no LLM**. To get model-backed chat, add a runtime module (e.g. `--module=langchain`). Without one, the chat UI still works for `/help`, `/secrets`, `/info`, and `/proxy`.
:::

**3. Manage it:**

```bash
1claw containers list                  # See it running
1claw containers logs docker-agent-a3f2 --no-follow
1claw containers stop docker-agent-a3f2
```

### Provisioning modes

```bash
1claw init --docker                          # Cloud: provisions agent + vault + read policy
1claw init --docker --local                  # Offline: no cloud account, local vault + daemon only
1claw init --docker --agent-key ocv_...      # Use an existing agent key (skip provisioning)
1claw init --docker --module=onchain         # Add a module (builds a custom image)
1claw init --docker --port 8080 --name my-agent --detach
1claw init --docker --list-modules           # List available modules and exit
```

When the cloud is reachable, `init` provisions an agent (Shroud + Intents API enabled) plus a vault and read policy, then stores the agent key in your **local vault** — the daemon injects it toward `*.1claw.xyz`, never into the container. With `--local`, nothing touches the cloud.

### Modules

Composable container extensions defined by `module.yaml` manifests bundled with the CLI. Dependencies are auto-resolved, conflicts detected, and layers topologically sorted.

| Module | Description |
| ------ | ----------- |
| `ampersend` | x402 payment control layer (session keys, Base USDC) |
| `onchain` | Multi-chain signing + Intents API tools |
| `langchain` | LangChain / LangGraph agent runtime (Shroud-routed) |
| `elizaos` | ElizaOS character runtime with vault-backed secrets |
| `scaffold-agent` | Scaffold-ETH 2 dApp agent (depends on `onchain`) |

When modules are present, the CLI builds a custom image (`FROM 1claw/agent:stable` + module layers) instead of pulling the base image:

```bash
1claw init --docker --module=onchain --local --detach --name onchain-agent
```

```text
ℹ Modules: onchain
✔ Base image ready.
✔ Built 1claw-custom-4b5d27ae:latest
✔ Container started — modules: onchain  (ONCHAIN_SIGNING_ENABLED=true)
```

### Managing containers

```bash
1claw containers list                  # List managed agent containers
1claw containers info <name>           # Show details
1claw containers logs <name>           # Tail logs (--no-follow to print and exit)
1claw containers stop <name>           # Stop a container
1claw containers rm <name> [--force]   # Remove container + local state
```

Container state lives in `~/.config/1claw/containers/{name}.json` and is the source of truth for `publish`, `eject`, and `deploy`.

### Publish & eject

Package your customized agent into a portable image:

```bash
1claw publish --name my-agent --tag <user>/my-agent:v1   # Rebuild from base + modules, then push
1claw publish --tag <user>/custom:latest                 # Build from ./Dockerfile in cwd
1claw publish --name my-agent --commit --tag <user>/m:c  # Snapshot a running container (docker commit)
1claw eject --name my-agent --output ./out               # Export Dockerfile + compose + module configs
```

`publish` rebuilds reproducibly from the base image plus your modules, tags it, and pushes to the registry (run `docker login` first for Docker Hub). `eject` writes the generated `Dockerfile`, module configs, and a `docker-compose.yaml` (pre-wired with the daemon socket mount) so you can build and run manually.

### Cloud deploy (Google Cloud Run)

```bash
1claw publish --name my-agent --tag <user>/my-agent:v1   # Image must be in a registry first
1claw deploy --google-cloud --name my-agent              # Generate Terraform (main.tf, variables.tf, outputs.tf, terraform.tfvars)
1claw deploy --google-cloud --name my-agent --apply      # Generate + terraform apply (needs TF_VAR_agent_api_key)
```

In cloud mode the container uses the agent key directly — injected from Secret Manager via the Cloud Run secret mount — instead of the host daemon. The entrypoint detects the mode from `ONECLAW_LOCAL_VAULT` and switches automatically. Review the generated Terraform before applying; `terraform validate` passes out of the box.

## DPoP (Proof-of-Possession)

Enable [DPoP (RFC 9449)](https://datatracker.ietf.org/doc/html/rfc9449) to bind agent tokens to a persistent P-256 keypair. Stolen tokens are unusable without the matching private key.

```bash
export ONECLAW_DPOP=true
1claw agent token <id>     # Token exchange includes DPoP proof + public JWK
```

The CLI generates a P-256 ECDSA keypair on first use and persists it at `~/.config/1claw/dpop-key.json`. Delete the file to rotate the keypair.

## CI/CD examples

### GitHub Actions

```yaml
- name: Deploy with secrets
  env:
      ONECLAW_TOKEN: ${{ secrets.ONECLAW_TOKEN }}
      ONECLAW_VAULT_ID: ${{ secrets.ONECLAW_VAULT_ID }}
  run: |
      npx @1claw/cli env pull -o .env.production
      npm run deploy
```

### Docker

```dockerfile
RUN npm install -g @1claw/cli
CMD ["1claw", "env", "run", "--", "node", "server.js"]
```

### Shell script

```bash
#!/bin/bash
eval $(1claw env pull --format shell)
./my-app
```

## Configuration

Config file: `~/.config/1claw/config.json`.

- `api-url` — API base URL (default: `https://api.1claw.xyz`)
- `output-format` — `table`, `json`, or `plain`
- `default-vault` — Default vault ID for commands that need one

Use `1claw config list` and `1claw config set <key> <value>` to view and update.

## Device authorization flow

When you run `1claw login` (without `--email`), the CLI:

1. Calls `POST /v1/auth/device/code` to get a device code and user code.
2. Opens the dashboard at `https://1claw.xyz/cli/verify?code=<user_code>`.
3. You approve the request in the browser (while logged in to 1Claw).
4. The CLI polls `POST /v1/auth/device/token` until the backend marks the code approved, then receives a JWT and stores it.

This flow does not require typing your password in the terminal.

## See also

- [JavaScript SDK](/docs/sdks/javascript) — Programmatic access from Node.js or browsers
- [MCP Server](/docs/mcp/overview) — AI agents accessing secrets via tools
- [Two-factor authentication](/docs/security/two-factor-auth) — Optional 2FA for human logins
