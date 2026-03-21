---
title: IDE & tool setup (Shroud proxy)
description: One flow for Cursor, Claude Code, VS Code Copilot, and OpenAI-compatible extensions using 1claw proxy.
sidebar_label: IDE setup (proxy)
sidebar_position: 1
---

# IDE & tool setup with `1claw proxy`

Shroud expects **`X-Shroud-Agent-Key`** and **`X-Shroud-Provider`**. Most editors only speak **OpenAI** or **Anthropic** URLs and simple API keys. The **`1claw proxy`** CLI binds on `127.0.0.1`, adds those headers, and forwards to **`https://shroud.1claw.xyz`**.

## Easiest path (recommended)

1. **Create a Shroud-enabled agent** in the dashboard (or `1claw agent create my-ide --shroud`).
2. **Put credentials in your shell** (same variables as our MCP / examples):

```bash
export ONECLAW_AGENT_API_KEY="ocv_..."   # or set ONECLAW_AGENT_ID + key
# optional: export ONECLAW_API_URL="https://api.1claw.xyz"
```

3. **Start the proxy** (no flags needed if the env var is set):

```bash
npx @1claw/cli@latest proxy
# or: 1claw proxy
```

4. Use the **printed port** (defaults to `11434`, or the next free port if something like Ollama is using it).

5. **Paste the snippet** for your tool below (the proxy also prints Cursor + Claude Code + Copilot hints on startup).

---

## Cursor

1. **Cursor** → **Settings** → **Models** → **OpenAI API** (or “Override OpenAI Base URL”, depending on build).
2. **Base URL:** `http://127.0.0.1:<port>/v1` (include `/v1`).
3. **API key:** any placeholder, e.g. `1claw` (the proxy ignores it and uses your agent key).

Choose a model id that matches what you request (e.g. `gpt-4o-mini`); Shroud infers the provider from the model name when using OpenAI-style chat.

---

## Claude Code

[Claude Code](https://code.claude.com/) uses the Anthropic HTTP API. Shroud supports **`/v1/messages`**; the proxy forwards that path and sets **`X-Shroud-Provider: anthropic`** automatically.

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:<port>"
export ANTHROPIC_API_KEY="1claw"
# Optional: Claude Code disables MCP tool search for non-Anthropic hosts unless:
# export ENABLE_TOOL_SEARCH=true
claude
```

Use **`ANTHROPIC_BASE_URL` without `/v1`** — the client appends `/v1/messages`. See [Claude Code environment variables](https://code.claude.com/docs/en/env-vars).

---

## VS Code + GitHub Copilot

Copilot does **not** use a single global “OpenAI URL” for all features. For **chat** with a **custom OpenAI-compatible** endpoint:

1. Open **Chat** → **model picker** → **Manage models** (or run **Chat: Manage language models**).
2. **Add** an **OpenAI-compatible** provider.
3. **Base URL:** `http://127.0.0.1:<port>/v1`
4. **API key:** `1claw` (or any value).

:::note Platform & plan limits

Microsoft documents that **OpenAI-compatible BYOK** rolled out on **VS Code Insiders** first; **stable** may lag. **Copilot Business / Enterprise** may restrict bring-your-own-key — check current [AI language models in VS Code](https://code.visualstudio.com/docs/copilot/customization/language-models) and [Copilot settings](https://code.visualstudio.com/docs/copilot/copilot-settings) (`github.copilot.chat.customOAIModels`).

:::

Inline **completions** (ghost text) use a **separate** model configuration; this proxy is aimed at **chat**-style OpenAI/Anthropic traffic.

---

## Continue, Cline, Roo, etc.

Any extension that supports an **OpenAI-compatible** base URL:

```json
{
  "apiBase": "http://127.0.0.1:<port>/v1",
  "apiKey": "1claw"
}
```

---

## CLI flags reference

| Input | Behavior |
|--------|----------|
| `--agent-key 'uuid:ocv_...'` | Explicit pair |
| `--agent-key 'ocv_...'` | Key-only; Vault resolves agent via prefix |
| *(omit flag)* | Uses `ONECLAW_AGENT_API_KEY` and optional `ONECLAW_AGENT_ID` |
| `--port 0` | Let the OS choose a free port |

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| **Port in use** | Proxy scans **32 ports** upward from the default; read the printed URL. |
| **401 from Shroud** | Agent missing / wrong key; agent must have **Shroud enabled** and policies as needed. |
| **Claude Code errors** | Confirm `ANTHROPIC_BASE_URL` has **no** trailing `/v1`. |
| **Copilot: no custom provider** | Try **VS Code Insiders**; confirm plan allows BYOK. |

---

## Related

- [Shroud guide](/docs/guides/shroud) — headers, providers, token billing  
- [CLI](/docs/guides/cli#llm-proxy-1claw-proxy) — all `proxy` options  
