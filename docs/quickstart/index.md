---
title: Quickstart
description: Get started with 1Claw in minutes — CLI setup, human and agent flows, and integration paths.
keywords: [1claw quickstart, CLI setup, agent onboarding, vault tutorial]
slug: /quickstart
---

# Quickstart

Get from zero to a working integration in a few minutes. **Start with the CLI** if you want the fastest path — one command provisions a vault, agent, access policy, and wires your AI tools (Cursor, Claude Desktop, VS Code, and more).

:::tip Fastest path — recommended
Run **`npx @1claw/cli setup`** (or install globally: `npm install -g @1claw/cli` / `brew install 1clawAI/tap/1claw`). It logs you in, creates an agent + vault + policy + sample secret, and configures MCP for every AI client it detects.

```bash
npx @1claw/cli setup
# or: 1claw setup --client cursor
```

When setup finishes, ask your assistant: **"List my secrets in 1Claw"** — you should see `examples/hello`. Then store your real API keys via the dashboard or `1claw secret set`.

See the [CLI guide](/docs/integrations/cli) for `--client`, `--project`, `--local`, and existing agent keys.
:::

## How 1Claw works

1Claw has two roles. **Humans** own secrets and decide what agents can access. **Agents** fetch secrets at runtime through scoped, audited policies — they never get blanket vault access.

```mermaid
flowchart LR
  subgraph Human["You (human)"]
    H1[Sign up / login]
    H2[Create vault]
    H3[Store secrets]
    H4[Register agent + policy]
  end
  subgraph Agent["Your agent / AI tool"]
    A1[Agent API key ocv_]
    A2[Exchange for JWT]
    A3[Fetch allowed secrets]
  end
  H1 --> H2 --> H3 --> H4
  H4 --> A1 --> A2 --> A3
  H3 -.->|encrypted in HSM| Vault[(Vault)]
  A3 --> Vault
```

| Role | You are… | You do… | Auth |
| ---- | -------- | ------- | ---- |
| **Human** | Developer, operator, or team owner | Create vaults, store secrets, register agents, write policies | Email/password, Google, passkey, or personal API key (`1ck_`) |
| **Agent** | AI assistant, service, or automation | List and fetch secrets the human allowed; optionally sign txs or route LLM calls through Shroud | Agent API key (`ocv_`) → short-lived JWT |

Same API for both: `https://api.1claw.co`. The dashboard at [1claw.co](https://1claw.co) is a UI on top of the same endpoints.

---

## Pick your path

| Goal | Fastest route | Steps |
| ---- | ------------- | ----- |
| **AI assistant with vault access** (Cursor, Claude, etc.) | [`1claw setup`](#fastest-cli-setup) | 1 command |
| **Store secrets as a human** (scripts, apps, CI) | [Human path](#human-path-store-and-use-secrets) | 3–4 steps |
| **Agent fetching secrets** (service, LangChain, custom code) | [Agent path](#agent-path-fetch-secrets-at-runtime) | 2–4 steps |
| **Human grants agent access end-to-end** | [Golden path](/docs/vaults/golden-path) or `1claw setup` | 4 steps |
| **Agent calls an API without holding the key** | [Execution path](#execution-path-call-an-api-without-holding-the-key) | 3 steps |
| **Agent signs a transaction without holding the key** | [Intents path](#intents-path-sign-without-holding-the-key) | 3 steps |
| **No cloud / offline secrets** | `1claw init --docker --local` or [local vault](/docs/integrations/cli#local-vault-offline-encrypted) | See [CLI](/docs/integrations/cli) |

---

## Fastest: CLI setup

**Best for:** Cursor, Claude Desktop, Claude Code, VS Code, Windsurf, Zed, Continue — any tool that supports MCP.

```bash
brew install 1clawAI/tap/oneclaw
1claw setup
```

What `setup` does in one flow:

1. **Login** — browser device flow at [1claw.co](https://1claw.co) (no password in terminal)
2. **Provision** — agent, vault, sample secret `examples/hello`, and a read/write policy on
   that vault: `**` when the welcome vault is created for you, or `examples/**` when you
   already have one named `default` — so a new agent never starts out holding secrets you
   put there earlier. Widen it in Vault → Policies whenever you want.
3. **Configure** — writes MCP config for each detected AI client

**Already have an agent key?** Skip provisioning:

```bash
1claw setup --agent-key ocv_YOUR_KEY
```

**Import existing `.env` secrets:**

```bash
1claw login
1claw vault create my-vault          # or use default from setup
1claw import .env --vault <vault-id>
```

**Run a command with secrets injected (CI/CD):**

```bash
export ONECLAW_TOKEN="..."           # or ONECLAW_API_KEY + ONECLAW_VAULT_ID
1claw env run -- npm start
```

Full command reference: [CLI guide](/docs/integrations/cli).

---

## Human path: store and use secrets

**You own the vault.** Sign up, create a vault, store a secret, read it back.

### Option A — CLI (fewest steps)

```bash
1claw login
1claw vault create "My Vault"
1claw secret set api-keys/openai --value "sk-proj-..." --type api_key
1claw secret get api-keys/openai
```

### Option B — Dashboard

1. Sign up at [1claw.co](https://1claw.co)
2. **Vaults → Create vault** (or use the [onboarding wizard](https://1claw.co/onboarding))
3. **Secrets → Add secret** at a path like `api-keys/openai`
4. Optional: **Agents → Register agent** and **Policies → Grant access**

### Option C — REST API / SDK

Step-by-step curl, TypeScript, and Python examples: [Quickstart for humans](/docs/quickstart/humans).

---

## Agent path: fetch secrets at runtime

**An agent only sees what a human allowed.** Zero access by default until a policy grants specific paths.

### How an agent gets credentials

| Method | Who initiates | When to use |
| ------ | ------------- | ----------- |
| **Human registers agent** | You in dashboard or `1claw agent create` | You control provisioning; share `ocv_` key once |
| **Self-enrollment** | Agent calls `POST /v1/agents/enroll` | Agent-first flows; human approves via email or link |
| **`1claw setup`** | CLI during setup | Fastest when wiring an AI client |

### Minimal agent flow (already have `ocv_` key)

```bash
# Exchange key for JWT (CLI handles refresh automatically in scripts)
1claw agent token <agent-id>

# Or with curl — see full guide
curl -X POST https://api.1claw.co/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"api_key":"ocv_..."}'
```

Then list and fetch secrets the policy allows (metadata vs decrypted value):

```bash
1claw secret list --vault <vault-id>    # as agent: set ONECLAW_AGENT_API_KEY
```

Full walkthrough (enroll, token, list, fetch, share back): [Quickstart for agents](/docs/quickstart/agents).

:::info Policies are the gate
An agent with an API key but **no policy** gets **zero secrets**. After creating an agent, always add a policy (dashboard, `1claw policy create`, or let `1claw setup` do it). See [Give an agent access](/docs/vaults/golden-path).
:::

---

## Execution path: call an API without holding the key

Fetching a secret still puts it in the agent's process. **Execution bindings** avoid
that: you register the upstream once with a credential, and the agent calls the
binding by name. The credential is loaded server-side at execution time and never
appears in the request, the response, or the agent's context.

**You create the binding; the agent may only run it.** `POST /v1/agents/{id}/bindings`
refuses an agent caller outright — it tells the agent to list existing bindings,
execute one, or ask you for a new one.

### 1. Create the binding (human)

Point the credential at a vault secret rather than pasting it in. `--vault-ref` stores a
live pointer, resolved at execution time, so rotating the secret changes what the binding
uses with no edit here.

```bash
1claw binding create <agent-id> \
  --name stripe \
  --type http \
  --config '{"base_url":"https://api.stripe.com"}' \
  --vault-ref <vault-id>:api-keys/stripe
```

Types: `http`, `graphql`, `postgres`, `mysql`, `redis`, `grpc`, `smtp`, `s3`,
`cloud_sdk`, `custom`.

### 2. Check it before the agent depends on it

```bash
1claw binding test <agent-id> <binding-id>
```

### 3. Execute (agent)

```bash
1claw binding execute <agent-id> \
  --binding stripe \
  --intent-type http \
  --params '{"method":"GET","path":"/v1/charges"}'
```

Or over REST, with the agent's JWT:

```bash
curl -X POST https://api.1claw.co/v1/agents/$AGENT_ID/execute \
  -H "Authorization: Bearer $AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "stripe",
    "intent_type": "http",
    "params": { "method": "GET", "path": "/v1/charges" }
  }'
```

The response carries `execution_id`, `status`, `result`, `duration_ms`,
`redactions_applied`, and `execution_surface` — `"vault"` or `"tee"`, reported
truthfully so you always know where an intent actually ran.

:::tip Dry-run first
Add `"dry_run": true` to run the guardrail checks with **no upstream call and no
credential load**. It answers "would this be allowed?" without spending anything or
touching the secret.
:::

Guardrails are per binding — host and path allowlists, method limits, and for GraphQL
`--allow-mutations`, `--allow-introspection`, `--max-query-depth`, `--max-aliases`. An
agent cannot widen them; `1claw binding update` takes an `approval_id` for a queued
widening. Review runs with `1claw binding executions <agent-id>`.

---

## Intents path: sign without holding the key

Same idea for chains. The private key is generated in an HSM and never leaves it; the
agent submits an intent and the vault signs after checking guardrails.

### 1. Provision a signing key (human)

`POST /v1/agents/{id}/signing-keys/{chain}` — or the dashboard, under the agent's
**Signing keys**. Confirm with:

```bash
1claw agent keys list <agent-id>
```

### 2. Set transaction guardrails (human)

On the agent: `tx_to_allowlist`, `tx_max_value`, `tx_daily_limit`, `tx_allowed_chains`.
These are checked before signing, not after. See [Guardrails](/docs/agents/intents/guardrails).

### 3. Submit (agent)

```bash
1claw agent tx submit <agent-id> \
  --chain base \
  --to 0xRECIPIENT \
  --value 0.01 \
  --simulate
```

`--simulate` runs the transaction without broadcasting, which is the on-chain equivalent
of `dry_run`. Drop it to send. For signing without submitting, `1claw agent sign`.

Details: [Intents overview](/docs/agents/intents/overview),
[Signing](/docs/agents/intents/signing),
[Multi-chain](/docs/agents/intents/multi-chain-signing).

---

## Ways to integrate

Choose the interface that matches where your code runs:

| Integration | Best for | Get started |
| ----------- | -------- | ----------- |
| **[CLI](/docs/integrations/cli)** | Fastest onboarding, CI/CD, `env run`, local daemon | `1claw setup` |
| **[Dashboard](https://1claw.co)** | Visual setup, policies, audit log, billing | Sign up → onboarding wizard |
| **[MCP Server](/docs/vaults/mcp/overview)** | AI assistants (Claude, Cursor, GPT) calling vault tools | `1claw setup` or [MCP setup](/docs/vaults/mcp/setup) |
| **[TypeScript SDK](/docs/sdks/javascript)** | Node.js apps, agents, platform backends | `npm install @1claw/sdk` |
| **[REST API](/docs/reference/api-reference)** | Any language, curl, Postman | [Human](/docs/quickstart/humans) or [Agent](/docs/quickstart/agents) quickstart |
| **[Shroud proxy](/docs/agents/shroud/overview)** | LLM traffic — redaction, injection detection, vault-backed provider keys | `1claw proxy` or agent with Shroud enabled |
| **[Execution bindings](#execution-path-call-an-api-without-holding-the-key)** | Agent calls an API, database or mailbox without the credential entering its process | `1claw binding create` → `1claw binding execute` |
| **[Intents API](/docs/agents/intents/overview)** | On-chain signing without exposing private keys | Enable on agent → `1claw agent tx submit` |
| **Local vault + daemon** | Offline dev, secret never in model context | `1claw local init` → `1claw setup --local` |
| **Docker agent runtime** | Isolated agent in a container, chat UI on :3000 | `1claw init --docker` |

### Common integration patterns

**1. AI coding assistant (recommended)**

```bash
1claw setup --client cursor    # or omit --client for all detected tools
```

Agent uses MCP tools at runtime; you manage secrets in the vault via dashboard or CLI.

**2. Application / backend service**

Use the SDK or REST API with a personal API key (`1ck_`) for human operations, or an agent key (`ocv_`) for automated fetch. See [JavaScript SDK](/docs/sdks/javascript).

**3. CI/CD pipeline**

On **GitHub Actions**, use the official [1Claw Secrets action](https://github.com/1clawAI/1claw-action/releases/tag/v1.0.0) — see [GitHub Action integration](/docs/integrations/github-action):

```yaml
- uses: 1clawAI/1claw-action@v1
  with:
    api-key: ${{ secrets.ONECLAW_AGENT_API_KEY }}
    secrets: DB_URL=prod/config/db-url
```

Elsewhere, use the CLI:

```bash
export ONECLAW_TOKEN="${{ secrets.ONECLAW_TOKEN }}"
1claw env pull -o .env.production
npm run deploy
```

**4. LLM app with guardrails**

Enable Shroud on the agent, store provider keys in the vault, point requests at `https://shroud.1claw.co`. See [Shroud](/docs/agents/shroud/overview) and [IDE setup](/docs/agents/shroud/ide-setup).

**5. Agent that calls a third-party API**

Register the upstream as a binding with `--vault-ref`, then let the agent execute it by
name. The credential is loaded server-side and never reaches the agent. See the
[execution path](#execution-path-call-an-api-without-holding-the-key).

**6. On-chain agent**

Enable Intents API, provision signing keys, set transaction guardrails in the dashboard. See [Intents API](/docs/agents/intents/overview) and the [intents path](#intents-path-sign-without-holding-the-key).

---

## End-to-end in four steps (human + agent)

The shortest manual path if you are not using `1claw setup`:

1. **Sign up** — [1claw.co](https://1claw.co) or `1claw login`
2. **Vault + secret** — `1claw vault create` + `1claw secret set …` (or dashboard)
3. **Agent + policy** — `1claw agent create my-agent` + `1claw policy create …` (or [golden path guide](/docs/vaults/golden-path))
4. **Connect** — MCP via `1claw setup`, SDK in your app, or `1claw agent token` + API calls

---

## Prerequisites

| Requirement | Details |
| ----------- | ------- |
| **Account** | Free tier at [1claw.co](https://1claw.co) — 1,000 requests/month, 3 vaults, 2 agents |
| **CLI** | Node 20+ for `npm install -g @1claw/cli`, or Homebrew tap above |
| **API base URL** | `https://api.1claw.co` |
| **curl / HTTP client** | Only needed if you skip the CLI and follow the REST quickstarts |

---

## Next steps

- [Quickstart for humans](/docs/quickstart/humans) — REST/SDK vault CRUD in detail
- [Quickstart for agents](/docs/quickstart/agents) — enroll, token exchange, fetch secrets
- [Give an agent access](/docs/vaults/golden-path) — golden path with policies
- [Parts of 1Claw](/docs/concepts/parts-of-1claw) — Vault, Shroud, Intents, and all interfaces
- [CLI](/docs/integrations/cli) — full command reference, Docker runtime, local daemon
- [GitHub Action](/docs/integrations/github-action) — CI vault secrets in GitHub Actions (`1clawAI/1claw-action@v1`)
- [MCP overview](/docs/vaults/mcp/overview) — tools your AI assistant can call
- [Intents API](/docs/agents/intents/overview) — signing keys, guardrails, multi-chain
- [Examples repo](https://github.com/1clawAI/1claw-examples) — Basic and LangChain samples
