---
title: IDE & tool setup (Shroud proxy)
description: Point Cursor, Claude Code, VS Code Copilot, and other OpenAI- or Anthropic-compatible tools at a local 1Claw CLI proxy so traffic goes through Shroud with the right headers.
sidebar_label: IDEs & Shroud (1claw proxy)
sidebar_position: 1
tags: [shroud, cli, cursor, ide]
---

# IDE & tool setup (Shroud proxy)

Most editors speak **OpenAI**-compatible (`/v1/chat/completions`) or **Anthropic**-compatible (`/v1/messages`) APIs. Shroud expects **`X-Shroud-Agent-Key`** and related headers instead. The **1Claw CLI** includes a local **`1claw proxy`** that accepts editor traffic and forwards it to **`https://shroud.1claw.xyz`** with the correct Shroud headers.

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
- The proxy injects `X-Shroud-Agent-Key` and `X-Shroud-Provider` headers, then forwards to `https://shroud.1claw.xyz` — all Shroud inspection, redaction, and policy enforcement applies
- Editor-side `Authorization` / `x-api-key` headers are **not** forwarded to Shroud; use any placeholder API key in the IDE

## Reference

- [CLI → LLM proxy (`1claw proxy`)](/docs/integrations/cli#llm-proxy-1claw-proxy) for all flags  
- [Shroud](/docs/agents/shroud/overview) for headers, providers, and troubleshooting  
