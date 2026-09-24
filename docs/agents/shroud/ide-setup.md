---
title: IDE & tool setup (Shroud proxy)
description: Point Cursor, Claude Code, Codex, OpenCode, OpenClaude, Goose, Gemini CLI, VS Code Copilot, and other OpenAI-, Anthropic-, or Google-compatible tools at a local 1Claw CLI proxy so traffic goes through Shroud with the right headers.
sidebar_label: IDEs & Shroud (1claw proxy)
sidebar_position: 1
tags: [shroud, cli, cursor, ide]
---

# IDE & tool setup (Shroud proxy)

Most editors speak **OpenAI**-compatible (`/v1/chat/completions`) or **Anthropic**-compatible (`/v1/messages`) APIs. Shroud accepts the editor's `Authorization: Bearer` directly when it carries an **`sk-shroud-v1` router key** (mint one with `1claw agent create-router-key <agent-id>`; set the editor's base URL to `https://shroud.1claw.co/v1` and add an `X-Shroud-Provider` header where the editor allows custom headers) — no local proxy needed. Where an editor cannot send custom headers, the **1Claw CLI** includes a local **`1claw proxy`** that accepts editor traffic and forwards it to **`https://shroud.1claw.co`** with the correct Shroud headers (`X-Shroud-Agent-Key`, `X-Shroud-Provider`).

**Parent doc:** [Shroud → IDE Integration](/docs/agents/shroud/overview#ide-integration-1claw-proxy)

## Prerequisites

- An **agent** with **`shroud_enabled: true`** (Dashboard or API) and its **`ocv_` API key**  
- **`@1claw/cli`** (via `npx` or global install)

## 1. Start the proxy

```bash
export ONECLAW_AGENT_API_KEY="ocv_..."   # optional if you pass --agent-key
npx @1claw/cli@latest proxy
# or: 1claw proxy --agent-key "AGENT_UUID:ocv_..."
```

The CLI prints a **local base URL** (default port **11434**, or another free port if that one is busy) and **copy-paste snippets** for common tools.

## 2. Point your IDE at the proxy

- **Base URL:** use the URL the proxy printed (e.g. `http://127.0.0.1:11434/v1`).  
- **API key field:** many UIs want *some* key; the proxy **does not** use your provider key for Shroud auth—it injects **`X-Shroud-Agent-Key`**. You can often put a placeholder in the UI if required; the proxy strips or ignores editor `Authorization` / `x-api-key` for upstream Shroud auth as described in [Shroud](/docs/agents/shroud/overview#what-the-proxy-does).

Configure **OpenAI-compatible** tools with the proxy **`/v1`** endpoint; **Anthropic**-style tools (e.g. Claude Code) should target the proxy’s **`/v1/messages`** path as in the printed snippet.

### Which clients we actually test

Seven clients are covered by an automated compatibility suite — we keep a real wire fixture for each (`shroud/tests/fixtures/clients/`) and/or a routing assertion in Shroud's own client-and-model matrix. For three of them the fixture is a **live capture** taken off a real run through the proxy, not an approximation:

| Client | Coverage |
| --- | --- |
| Claude Code | fixture + routing matrix |
| Codex | **live capture** (Responses API) + fixture + routing matrix |
| OpenCode | 5 fixtures (incl. regression repros) + routing matrix |
| OpenClaude | **live capture** + routing matrix |
| Goose | **live capture** + routing matrix |
| Cursor | fixture (approximated — Cursor is closed source) + routing matrix |
| Gemini CLI | routing matrix (native Google shape, so no OpenAI-style fixture) |

Everything else on this page — VS Code + Copilot, Continue, Windsurf, Cline, Kilo Code, Zed — is expected to work because it speaks a standard OpenAI-compatible base URL, but **is not exercised by that suite**. `1claw proxy` prints the same split at startup.

### Codex

Codex's CLI always sends OpenAI's **Responses API** shape (no chat/completions fallback), which Shroud reshapes to Anthropic's Messages API when the target model is a Claude model. In `~/.codex/config.toml` — note `model_provider` must come **before** the `[model_providers.oneclaw]` table, since TOML would otherwise parse it as a key on that table instead of the top-level key Codex reads:

```toml
model_provider = "oneclaw"

[model_providers.oneclaw]
name = "1claw"
base_url = "http://127.0.0.1:11434/v1"
env_key = "ONECLAW_PROXY_KEY"
```

Any value works for `ONECLAW_PROXY_KEY` — the proxy handles real auth via `--agent-key` / `ONECLAW_AGENT_API_KEY`.

### OpenCode

OpenCode sends genuine OpenAI-shaped requests (chat/completions body, OpenAI function-calling tool schema) regardless of the target model — Shroud converts these automatically when the model is a Claude model, so no special OpenCode-side handling is needed beyond pointing it at the proxy. Look for a custom OpenAI-compatible provider / base URL setting (e.g. `opencode.json`'s `provider` config or an `OPENAI_BASE_URL`-style override) and set it to the proxy's base URL (`http://127.0.0.1:11434/v1`) with any placeholder API key.

### OpenClaude

[OpenClaude](https://www.npmjs.com/package/@gitlawb/openclaude) (`npm install -g @gitlawb/openclaude`) sends the same chat/completions-shaped requests as OpenCode — no special handling needed. Point it at the proxy the same way you would OpenCode or any other OpenAI-compatible client (`OPENAI_BASE_URL=http://127.0.0.1:11434/v1`, any placeholder `OPENAI_API_KEY`, `--provider openai`).

### Goose

[Goose](https://block.github.io/goose/) (Block's AI agent — install via the [official release script](https://github.com/block/goose/releases/download/stable/download_cli.sh), not the unrelated Homebrew `goose` database-migration formula of the same name) also sends chat/completions-shaped requests. Point its OpenAI provider at the proxy:

```bash
export GOOSE_PROVIDER=openai
export GOOSE_MODEL=claude-sonnet-5   # or any model the proxy should route
export OPENAI_HOST="http://127.0.0.1:11434"
export OPENAI_API_KEY="1claw"        # placeholder — the proxy handles real auth
goose run -t "your prompt"
```

### Gemini CLI

[Gemini CLI](https://github.com/google-gemini/gemini-cli) (`npm install -g @google/gemini-cli`) is the one client here that does **not** speak OpenAI's format — it sends Google's own native `contents`/`systemInstruction` body to `/v1beta/models/{model}:generateContent`. The proxy (`@1claw/cli` **0.61.21+**) recognizes this path shape and forwards it correctly as `provider: google`:

```bash
export GOOGLE_GEMINI_BASE_URL="http://127.0.0.1:11434"
export GEMINI_API_KEY="1claw"        # placeholder — the proxy handles real auth
gemini --skip-trust -p "your prompt" # headless runs also need
                                      # security.auth.selectedType: "gemini-api-key"
                                      # in ~/.gemini/settings.json
```

On an older proxy version, this path was misdetected as `openai` and could false-positive-block on ordinary shell syntax in Gemini CLI's own system instructions — update `@1claw/cli` if you see that.

## 3. Provider and billing

- Set **`X-Shroud-Provider`** implicitly via model/path (see [Shroud](/docs/agents/shroud/overview)) or follow your generated snippet.  
- With **[LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on)** enabled on your org, Shroud can bill tokens without a provider API key in the client.

---

## Shroud Bridge (Desktop App)

**Shroud Bridge** is an experimental desktop application that provides a GUI alternative to the CLI proxy. Built with Tauri, it runs a local OpenAI-compatible proxy to Shroud — no Node.js or CLI required.

### Download

Available for **macOS**, **Windows**, and **Linux** at:

**[1claw.co/download/shroud-bridge](https://1claw.co/download/shroud-bridge)** *(experimental)*

### Setup

There are two ways to authenticate:

1. **Deep link from Dashboard** — In the 1Claw dashboard, navigate to your agent and click **Open in Shroud Bridge**. This opens the app and pre-fills your agent credentials via a `shroudbridge://import#…` deep link.
2. **Manual entry** — Open Shroud Bridge, paste your agent credentials (`uuid:ocv_…` or key-only `ocv_…`) into the Credentials field, and click **Save to keychain**. Credentials are stored in the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).

Click **Test Vault exchange** to verify the credentials work before starting the proxy.

### Starting the proxy

1. Click **Start proxy** — the app binds to a local port (default **11434**, or the next free port)
2. The status bar shows the local **Base URL** (e.g. `http://127.0.0.1:11434/v1`)
3. Use this URL as the OpenAI base URL in your editor

### IDE launchers

Shroud Bridge includes buttons to launch popular LLM IDEs directly:

- **Open Cursor** — launches Cursor (macOS/Windows)
- **Open VS Code** — launches VS Code (macOS/Windows)

The app also displays a copyable **env block** with `OPENAI_API_BASE` and `OPENAI_BASE_URL` set to the local proxy, ready to paste into Cursor, Windsurf, Continue, Cline, Claude Desktop, or any OpenAI-compatible client.

### System tray

Closing the Shroud Bridge window **does not stop the proxy**. The app minimizes to the system tray and continues running in the background. Use the tray menu:

- **Show Shroud Bridge** — reopen the window
- **Quit Shroud Bridge** — stop the proxy and exit

### Security notes

- The local proxy runs **in-process** (Rust, no Node.js subprocess) and only listens on `127.0.0.1`
- Agent credentials are stored in the **OS keychain**, not on disk or in localStorage
- The proxy injects `X-Shroud-Agent-Key` and `X-Shroud-Provider` headers, then forwards to `https://shroud.1claw.co` — all Shroud inspection, redaction, and policy enforcement applies
- Editor-side `Authorization` / `x-api-key` headers are **not** forwarded to Shroud; use any placeholder API key in the IDE

## Reference

- [CLI → LLM proxy (`1claw proxy`)](/docs/integrations/cli#llm-proxy-1claw-proxy) for all flags  
- [Shroud](/docs/agents/shroud/overview) for headers, providers, and troubleshooting  
