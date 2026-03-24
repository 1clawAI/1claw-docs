---
title: IDE & tool setup (Shroud proxy)
description: Point Cursor, Claude Code, VS Code Copilot, and other OpenAI- or Anthropic-compatible tools at a local 1Claw CLI proxy so traffic goes through Shroud with the right headers.
sidebar_label: IDEs & Shroud (1claw proxy)
sidebar_position: 1
tags: [shroud, cli, cursor, ide]
---

# IDE & tool setup (Shroud proxy)

Most editors speak **OpenAI**-compatible (`/v1/chat/completions`) or **Anthropic**-compatible (`/v1/messages`) APIs. Shroud expects **`X-Shroud-Agent-Key`** and related headers instead. The **1Claw CLI** includes a local **`1claw proxy`** that accepts editor traffic and forwards it to **`https://shroud.1claw.xyz`** with the correct Shroud headers.

**Parent doc:** [Shroud → IDE Integration](/docs/guides/shroud#ide-integration-1claw-proxy)

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
- **API key field:** many UIs want *some* key; the proxy **does not** use your provider key for Shroud auth—it injects **`X-Shroud-Agent-Key`**. You can often put a placeholder in the UI if required; the proxy strips or ignores editor `Authorization` / `x-api-key` for upstream Shroud auth as described in [Shroud](/docs/guides/shroud#what-the-proxy-does).

Configure **OpenAI-compatible** tools with the proxy **`/v1`** endpoint; **Anthropic**-style tools (e.g. Claude Code) should target the proxy’s **`/v1/messages`** path as in the printed snippet.

## 3. Provider and billing

- Set **`X-Shroud-Provider`** implicitly via model/path (see [Shroud](/docs/guides/shroud)) or follow your generated snippet.  
- With **[LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on)** enabled on your org, Shroud can bill tokens without a provider API key in the client.

## Reference

- [CLI → LLM proxy (`1claw proxy`)](/docs/guides/cli#llm-proxy-1claw-proxy) for all flags  
- [Shroud](/docs/guides/shroud) for headers, providers, and troubleshooting  
