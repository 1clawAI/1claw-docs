---
title: Shroud
description: TEE LLM proxy with 20 inspection layers. Redacts secrets, blocks prompt injection, and enforces per-agent policies before forwarding to LLM providers.
keywords: [Shroud, LLM proxy, prompt injection, TEE, secret redaction, threat detection]
sidebar_label: Shroud
sidebar_position: 0
tags: [shroud, security, threat-detection, tee, pipeline]
---

# Shroud

Shroud is 1claw’s **LLM proxy**: your agent sends requests to Shroud instead of directly to the provider. Shroud authenticates the agent, (optionally) resolves the provider API key from the vault, runs threat detection and secret redaction, then forwards the request to the upstream LLM. Use it to block prompt injection, redact secrets from prompts, centralize provider keys, and sign transactions inside the TEE.

## On this page

- [Per-Agent Configuration](#per-agent-configuration-shroud_config)
- [Security Features](#security-features)
- [Using the LLM Proxy](#using-the-llm-proxy)
- [IDE Integration](#ide-integration-1claw-proxy)
- [Defense in Depth](#defense-in-depth)
- [Split guides](#split-guides)
- [Next steps](#next-steps)

:::tip Try it out
Try out the examples in this repo: **[Shroud Demo](https://github.com/1clawAI/1claw-examples/tree/main/shroud/01-basic-demo)** (health, Intents API, LLM proxy), **[Shroud LLM Billing](https://github.com/1clawAI/1claw-examples/tree/main/shroud/02-llm-billing)** (LLM Token Billing + Stripe AI Gateway), **[Shroud Router Key](https://github.com/1clawAI/1claw-examples/tree/main/shroud/03-router-key)** (static router-key auth, unmodified OpenAI SDK), **[Shroud Security](https://github.com/1clawAI/1claw-examples/tree/main/shroud/04-security-offline)** (threat detection with MCP), and **[Local Inspect](https://github.com/1clawAI/1claw-examples/tree/main/local-inspect)** (same detections offline, no account).
:::

---

## Per-Agent Configuration (shroud_config)

Each agent with `shroud_enabled: true` can have a `shroud_config` JSON object. Configure via Dashboard (Agents → Shroud LLM Proxy), API (`PATCH /v1/agents/:id`), SDK, or CLI.

### Basic settings

| Field | Type | Description |
|-------|------|-------------|
| `pii_policy` | `block` \| `redact` \| `warn` \| `allow` | How PII in LLM traffic is handled |
| `injection_threshold` | number (0.0–1.0) | Prompt injection detection sensitivity |
| `context_injection_threshold` | number (0.0–1.0) | Context injection detection sensitivity |
| `allowed_providers` | string[] | LLM providers the agent may use (empty = all) |
| `allowed_models` | string[] | Models the agent may use (empty = all) |
| `denied_models` | string[] | Models explicitly blocked |
| `max_tokens_per_request` | number | Token cap per LLM request |
| `max_requests_per_minute` | number | Per-minute rate limit |
| `max_requests_per_day` | number | Per-day rate limit |
| `daily_budget_usd` | number | Daily LLM spend cap in USD |
| `enable_secret_redaction` | boolean | Redact vault secrets from LLM context |
| `enable_response_filtering` | boolean | Filter sensitive data from LLM responses |

### Threat detection (per detector)

Nested objects (e.g. `social_engineering_detection`, `network_detection`, `encoding_detection`, `command_injection_detection`, `filesystem_detection`, `unicode_normalization`) include `enabled` and an **`action`** where applicable: **`block`** (HTTP 403 when the pipeline detected a match), **`warn`** / **`log`** (allow through but log), or encoder-specific values like **`decode`** for `encoding_detection`.

### How settings are enforced (pipeline + JWT)

1. **Inspection pipeline** — Shroud applies server-wide filters (secret redaction, PII, injection scoring, threat pattern matching). Many filters default to **record + warn** so the request body can still be analyzed.
2. **PolicyEngine** — Runs **after** the pipeline on each LLM request. It reads per-agent rules from the **agent JWT**: when the agent has Shroud enabled, Vault includes a **`shroud_config`** claim (same JSON as `GET /v1/agents/{id}`). That drives injection/context thresholds, provider/model allowlists, rate limits, budget caps, and **block** vs **warn** for threat categories.
3. **Refresh JWT** — After you change `shroud_config` in the dashboard or API, have the client **re-exchange** the agent API key for a new JWT (or restart Shroud Bridge) so Shroud sees the update.

User (human) JWTs do not carry `shroud_config`.

### Operational limits

- **Request body size:** 5MB maximum. Requests exceeding this return **413 Payload Too Large**.
- **Header filtering:** Shroud strips sensitive headers (authorization, `X-Shroud-Agent-Key`, `X-Shroud-Api-Key`, cookies, IP headers) before forwarding to upstream LLM providers. This prevents credential leakage through proxied requests.

## Security Features

Shroud includes **20 inspection layers** covering threat detection, secret protection, input sanitization, response filtering, and policy enforcement. All features are configurable on a per-agent basis via the Dashboard, SDK, or API. The layers span both request and response pipelines, with the policy engine acting as the final gate.

## Using the LLM Proxy

Shroud exposes an LLM proxy so your agent sends requests to Shroud instead of directly to the provider. Shroud authenticates the agent, (optionally) resolves the provider API key from the vault, runs threat detection, then forwards the request to the upstream LLM. The proxy uses **OpenAI-compatible** paths where applicable; some providers (e.g. Google) use their native path internally.

Shroud also serves the **Intents API** (transaction signing). Both `api.1claw.co` and `shroud.1claw.co` expose the full Intents API; when you route to Shroud, signing happens inside the TEE — private keys never leave confidential memory. An agent with `intents_require_tee` set gets TEE signing on either host: the vault forwards its submit/sign to Shroud server-side, so MCP, SDK and CLI clients need no special routing.

### Endpoint

| Method | Path | Notes |
|--------|------|--------|
| POST   | `https://shroud.1claw.co/v1/chat/completions` | OpenAI-style; Shroud maps to provider-specific paths (e.g. Google uses `generateContent`) |

Other paths (e.g. `/v1/messages` for Anthropic) are supported; the proxy routes by provider.

### Required headers

| Header | Description |
|--------|-------------|
| `X-Shroud-Agent-Key` | **Required.** Agent credentials in the form `agent_id:api_key` (e.g. `550e8400-e29b-41d4-a716-446655440000:ocv_...`). The API key is the agent’s `ocv_` key from 1Claw. |
| `X-Shroud-Provider` | **Required.** Provider identifier. Must match a [supported provider](#supported-providers) name (e.g. `openai`, `anthropic`, `google`, `gemini`). |
| `Content-Type` | `application/json` for request body. |

### Optional headers

| Header | Description |
|--------|-------------|
| `X-Shroud-Api-Key` | Provider API key. If omitted, Shroud tries to resolve the key from the vault (see [Vault key resolution](#vault-key-resolution)). |
| `X-Shroud-Model` | Model name (e.g. `gpt-4o-mini`, `gemini-2.5-flash`). Can also be set in the request body for some providers. See [Shroud supported models](/docs/reference/shroud-supported-models). |

### Auth: static Bearer or `X-Shroud-Agent-Key` {#auth}

The gateway takes the credential from `X-Shroud-Agent-Key` or, failing that, `Authorization: Bearer …`. Any of these forms work in either header:

| Form | Example | Who uses it |
|------|---------|-------------|
| **Router key** | `sk-shroud-v1-Q2c5o0yQ3bHkT9m1vXz8Lw7nRp4aEf6u` | Stock OpenAI / Anthropic / LangChain SDKs: set `api_key` to the router key and `base_url` to `https://shroud.1claw.co/v1`. The `sk-` prefix satisfies SDK validation; the gateway exchanges it for the agent's token itself. |
| **Agent key** | `ocv_abc123…` | 1Claw-native agents. Exchanged key-only, no agent id needed. |
| **`agent_id:api_key`** | `550e8400-…:ocv_abc123…` | The original form; still accepted. |
| **Agent JWT** | `eyJ…` | Pre-minted tokens (runtimes, automations). Verified locally. |
| **`x402`** | `Authorization: Bearer x402` | The payment rail: answered with a **402** challenge (`x402Version`, `accepts[]`) rather than a 401, so a paying client can settle and retry. |

**Router keys** are minted per agent by a human — `POST /v1/agents/{agent_id}/router-keys` (`name`, optional `max_concurrent_streams`, `spend_cap_usd`) returns the plaintext **once** plus `base_url`; `GET` lists keys (prefix only); `DELETE …/{key_id}` revokes. The agent must have `shroud_enabled: true`; up to 20 live keys per agent. A router-key token lives at most **60 s** and the gateway re-exchanges on expiry, so a revoke takes effect within a minute. The token carries a `router_key` claim (`id`, `max_concurrent_streams`, `spend_cap_micro_usd`); the gateway counts open streams per router key, so one key's fleet cannot exhaust another's.

```python
from openai import OpenAI
client = OpenAI(api_key="sk-shroud-v1-…", base_url="https://shroud.1claw.co/v1",
                default_headers={"X-Shroud-Provider": "openai"})
```

### Placeholders and rehydration {#placeholders}

When the gateway holds its enclave key (released by the vault only after attestation), a vault secret found in a prompt is replaced by a **placeholder** the model can place but never read:

```text
⟦sk:pg-dsn:7f3a9c2e3bq4⟧      ⟦sk:bearer:k2m9x1p0c7hz⟧
```

The tag is deterministic per (org, secret) — the same token every turn and every conversation, so long system prompts stay in the provider's prompt cache — and changes when the secret rotates. The type hint (`pg-dsn`, `bearer`, `pem`, `opaque`, …) tells the model where the value belongs; the last two characters are a checksum. Cross-org, placeholders are minted from separate indexes; cross-agent, seeing a placeholder authorises nothing. Without the enclave key the older opaque `[REDACTED:#…]` tag is used and nothing can be rehydrated.

**Rehydration happens only inside the enclave, only inside an authorised tool-call argument.** A **tool binding** (`POST /v1/agents/{agent_id}/tool-bindings`) says: the secret at `secret_path` may be substituted for agent X into tool `tool_name` at `arg_path` (a JSON pointer such as `/headers/Authorization`, `/connection_string`, `/body/*`, or `*`), and only when the call's destination host is one of `destination_hosts` (`api.stripe.com`, `*.googleapis.com`). When the agent runs the tool through the TEE executor (`POST /v1/agents/{id}/execute` with `execution_mode: "tee"`), the enclave substitutes within strings (`Bearer ⟦sk:…⟧`, `postgresql://⟦sk:…⟧`), performs the call, and reports which secret paths it used — never the values. A placeholder in an unbound argument, toward another host, with a bad checksum, an unknown tag, or repeated more than four times in one call is a **403** and nothing is sent. Cluster-local services, the vault and the gateway are on a deny-list no allowlist can open. The model, the client and every log see placeholders only.

This is a confidentiality claim — *the model never holds the credential* — not a misuse claim: an authorised tool with an authorised argument still runs whatever the model asked (argument constraints are policy work, not redaction).

### Paying for inspection (router rail) {#inspection-fee}

Router-key traffic is paid from request one: every inspected request debits the org's prepaid ledger **$0.005** (5,000 micro-USD) at accept — before the stream opens — so a stream in flight is never cut off for billing; it is the *next* request that gets **402 `insufficient_credits`** when the ledger cannot cover the fee. Router-rail bodies are capped at **1 MB** (413). 1Claw-native agents using `ocv_` keys or agent JWTs are not charged here; they stay on their plan's request quotas.

The ledger stores **micro-USD** (`balance_micro_usd` on `GET /v1/billing/credits/balance`; `balance_cents` is derived and rounds down). Three ways to fund it:

- **Card** — `POST /v1/billing/credits/topup` (`amount_usd`, $5 minimum) returns a Stripe Checkout URL; $5 buys exactly 1,000 inspected requests.
- **Wallet (x402)** — send `Authorization: Bearer x402` to the gateway. Without `X-PAYMENT` you get a **402 quote** (`accepts[]` for $1 of USDC on Base; `X-Shroud-Topup-Usd` picks a larger chunk, up to $100). Sign the EIP-3009 authorization, retry with `X-PAYMENT`, and the request is served: the vault verifies with the facilitator, credits the payer wallet's org and settles. An unknown wallet's first settled payment **provisions the account** — a shadow org, one Shroud-enabled agent and one router key returned once in the `x-shroud-router-key` response header (switch to it to stop paying per call) — after the wallet is screened against the OFAC SDN list and the caller's region against the geofence. Same wallet = same org, always. Every response on this rail carries `x-shroud-balance-micro-usd`.
- **BYOK** — your provider key (`X-Shroud-Api-Key` or a vault-stored key) pays for tokens; the ledger still pays the inspection fee, so pair it with a top-up.

Per router key you can set `spend_cap_usd` (the key stops at the cap; other keys keep working) and `max_concurrent_streams`.

### Vault key resolution

If you do **not** send `X-Shroud-Api-Key`, Shroud looks up the provider key in the vault:

- **Default path:** `providers/{provider}/api-key` in a vault the agent can read (e.g. grant the agent read access to `providers/openai/*` or `providers/google/*`).
- **Override via header:** You can pass a vault reference so Shroud fetches the key from a specific path:
  - `X-Shroud-Api-Key: vault://{vault_id}/{secret_path}`
  - Example: `X-Shroud-Api-Key: vault://a1b2c3d4-e5f6-7890-abcd-ef1234567890/gemini/api-key`

The agent must have read access to that vault path.

### Supported providers

Shroud supports the following LLM providers. Set `X-Shroud-Provider` to one of the values below (lowercase).

| Provider value | LLM / API |
|----------------|-----------|
| `openai`       | OpenAI (GPT-4o, o-series, etc.) — [allowed model IDs](/docs/reference/shroud-supported-models#openai-models) |
| `anthropic`    | Anthropic (Claude) — [allowed model IDs](/docs/reference/shroud-supported-models#anthropic-models) |
| `google`       | Google Gemini (Generative Language API) — [allowed model IDs](/docs/reference/shroud-supported-models#google-gemini-models) |
| `gemini`       | Alias for `google` — same as above |
| `mistral`      | Mistral — [allowed model IDs](/docs/reference/shroud-supported-models#mistral-models) |
| `cohere`       | Cohere — [allowed model IDs](/docs/reference/shroud-supported-models#cohere-models) |
| `openrouter`   | OpenRouter (aggregates many models; single API key) — [notes](/docs/reference/shroud-supported-models#openrouter-models) |
| `darkbloom`    | Darkbloom (hardware-attested Apple Silicon, E2E encrypted) — [notes](/docs/reference/shroud-supported-models#darkbloom-models) |
| `venice`       | Venice AI (privacy-focused, no data retention) — [notes](/docs/reference/shroud-supported-models#venice-models) |
| `bankr`        | Bankr LLM Gateway (multi-provider, cost tracking, wallet-funded) — [notes](/docs/reference/shroud-supported-models#bankr-models) |

- **Gemini:** Use `X-Shroud-Provider: google` or `gemini`. Store the API key at `providers/google/api-key` (or use `X-Shroud-Api-Key`). Shroud maps `/v1/chat/completions` to Google’s `generateContent` endpoint.
- **OpenRouter:** Use `X-Shroud-Provider: openrouter`. One API key gives access to many models; set `model` in the request body to the OpenRouter model ID (e.g. `anthropic/claude-3.5-sonnet`).
- **Darkbloom:** Use `X-Shroud-Provider: darkbloom`. Inference is routed to hardware-attested Apple Silicon with E2E encryption. Store API key at `providers/darkbloom/api-key`. Model availability is dynamic; check Darkbloom's `/v1/models`.
- **Venice:** Use `X-Shroud-Provider: venice`. Privacy-first inference with no data retention. Store API key at `providers/venice/api-key`. Supports Claude, GPT, Grok, and TEE-backed models.
- **Bankr:** Use `X-Shroud-Provider: bankr`. Routes to [Bankr LLM Gateway](https://docs.bankr.bot/llm-gateway/overview/) at `https://llm.bankr.bot`. Store your `bk_` key at `providers/bankr/api-key` (LLM Gateway permission required). OpenAI-compatible `model` IDs (e.g. `claude-opus-4.6`, `gemini-2.5-flash`).
- **Full allowlist:** [Shroud supported models](/docs/reference/shroud-supported-models) (kept in sync with `shroud/config/providers/*.toml`).

### Request and response format

- **OpenAI-style (OpenAI, Mistral, Cohere, OpenRouter, Darkbloom, Venice, Bankr):** Request body is the standard [OpenAI chat completions](https://platform.openai.com/docs/api-reference/chat/create) shape: `{ "model", "messages", "max_tokens", "stream", ... }`. Response shape is the same. For OpenRouter, set `model` to the OpenRouter model ID (e.g. `anthropic/claude-3.5-sonnet`). For Bankr, use Bankr model slugs (e.g. `claude-opus-4.6`).
- **Google (Gemini):** Shroud accepts an OpenAI-compatible request and maps it to the Google `generateContent` API; use `model` values such as `gemini-2.5-flash`, `gemini-2.5-pro` ([full list](/docs/reference/shroud-supported-models#google-gemini-models)).
- **Anthropic:** Uses `/v1/messages`; request/response follow Anthropic’s API.

### Tool calling (`tools`, `tool_choice`, `tool_calls`)

Tool calling works through the proxy exactly as it does against the provider — send `tools` and `tool_choice` in the body, get `tool_calls` back, post the `role: "tool"` result on the next turn. Shroud does not rewrite the body; it inspects it. That applies to the funded path (no `X-Shroud-Api-Key`, billed to your 1Claw account), to BYO keys, and to `stream: true` (tool-call deltas are held until the call is complete, checked against the agent's tool policy, then forwarded in the original frames and order — see [Streaming](#streaming)).

```bash
curl -X POST https://shroud.1claw.co/v1/chat/completions \
  -H "X-Shroud-Agent-Key: $AGENT_ID:$AGENT_API_KEY" -H "X-Shroud-Provider: openai" \
  -H "Content-Type: application/json" -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Weather in Paris? Use the tool."}],
    "tools": [{"type":"function","function":{"name":"get_weather",
      "parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}],
    "tool_choice": "auto"
  }'
# → "finish_reason": "tool_calls", "message": { "tool_calls": [{ "function": { "name": "get_weather", "arguments": "{\"city\":\"Paris\"}" } }] }
```

What Shroud adds on top of passthrough, per agent (`shroud_config.tool_call_inspection`, see [Tool call inspection](/docs/agents/shroud/threat-detection#tool-call-inspection)): an `allowed_tool_names` / `denied_tool_names` list, argument scanning for credentials and exfiltration URLs, and `action: block | redact | log`. A blocked tool call returns the same error shape as any other detection. Anthropic `tool_use` / `tool_result` blocks on `/v1/messages` are handled the same way.

Rehydrating vault secrets *into* tool arguments (so the model never holds the credential) is a separate, planned capability — today a tool argument contains exactly what the model wrote.

### Streaming {#streaming}

`stream: true` works on the OpenAI-style and Anthropic paths and is inspected **per frame inside the proxy** — never forwarded raw and checked at the end. Two modes, set per agent in `shroud_config.streaming_inspection_mode`:

- **`rolling`** (default): text deltas are released behind a tail buffer at least as long as the longest secret in your vault (capped at 256 bytes; longer values such as PEM keys are matched by their first 256 bytes and the rest is swallowed as it arrives). A secret split across two chunks is redacted to its `[REDACTED:#…]` tag before any byte of it reaches the client. The heuristic injection scanner is warn-only in this mode; the stream is aborted only on high-confidence signals (a vault secret literal, a denied tool, a secret in tool arguments, an exfil URL next to a redaction).
- **`holdback`**: `streaming_holdback_chars` (default 512) are buffered before release, and the injection scanner blocks as it does on the buffered path. Slower first token, full parity — for regulated agents.

In both modes tool-call deltas are assembled until `finish_reason` / `content_block_stop`, policy-checked, then released in order. A block mid-stream sends one error frame (`{"error":{"type":"shroud_blocked",…}}` then `[DONE]`, or an Anthropic `event: error`) and closes cleanly. OpenAI-format requests get `stream_options.include_usage` added so token counts still land on the last chunk; Shroud Activity rows are finalised when the stream ends. Gemini streams stay on the buffered path. Each agent key may hold **20 open streams** (`max_concurrent_streams`); beyond that the request gets `429` with `Retry-After: 1`. Responses carry `x-shroud-stream-inspection: per-frame`.

### Configuring the LLM Model

You can specify which model to use in two ways:

#### 1. Per-Request Model Selection

**Option A: Header** (recommended for some providers)
```bash
X-Shroud-Model: gpt-4o-mini
```

**Option B: Request Body** (for OpenAI-style providers)
```json
{
  "model": "gpt-4o-mini",
  "messages": [...]
}
```

**Example:**
```typescript
const res = await fetch("https://shroud.1claw.co/v1/chat/completions", {
  method: "POST",
  headers: {
    "X-Shroud-Agent-Key": `${agentId}:${agentApiKey}`,
    "X-Shroud-Provider": "openai",
    "X-Shroud-Model": "gpt-4o-mini",  // ← Model in header
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello" }],
  }),
});
```

Or specify in the body:
```typescript
body: JSON.stringify({
  model: "gpt-4o-mini",  // ← Model in body
  messages: [{ role: "user", content: "Hello" }],
})
```

#### 2. Per-Agent Model Restrictions

Configure which models an agent is allowed (or denied) to use via the agent's `shroud_config`:

**Via Dashboard:**
- Navigate to **Agents → [Agent Name] → Shroud LLM Proxy** card
- Set `allowed_models` (whitelist) or `denied_models` (blacklist)

**Via API:**
```bash
PATCH /v1/agents/{id}
{
  "shroud_config": {
    "allowed_models": ["gpt-4o-mini", "claude-sonnet-5"],
    "denied_models": ["gpt-4.1-nano"]
  }
}
```

**Via SDK:**
```typescript
await client.agents.update(agentId, {
  shroud_config: {
    allowed_models: ["gpt-4o-mini", "claude-sonnet-5"],
    denied_models: ["gpt-4.1-nano"],
  },
});
```

**How it works:**
1. User specifies the model in the request (via header or body)
2. Shroud checks the agent's `shroud_config`:
   - If `allowed_models` is set and the model is **not** in the list → **403 Forbidden**
   - If the model is in `denied_models` → **403 Forbidden**
   - Otherwise → request proceeds

**Example: Restrict agent to only use cost-effective models**
```typescript
await client.agents.update(agentId, {
  shroud_config: {
    allowed_models: ["gpt-4o-mini", "gemini-2.5-flash"],  // Only allow cheaper models
  },
});
```

**Note:** When using Stripe AI Gateway (LLM Token Billing), model names are automatically prefixed with the provider (e.g., `gpt-4o-mini` → `openai/gpt-4o-mini`). See [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on) for details.

### Example: cURL

```bash
# Using agent key and vault-resolved provider key (no X-Shroud-Api-Key)
curl -X POST "https://shroud.1claw.co/v1/chat/completions" \
  -H "X-Shroud-Agent-Key: YOUR_AGENT_ID:YOUR_AGENT_API_KEY" \
  -H "X-Shroud-Provider: google" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello"}]}'

# With explicit vault key path
curl -X POST "https://shroud.1claw.co/v1/chat/completions" \
  -H "X-Shroud-Agent-Key: YOUR_AGENT_ID:YOUR_AGENT_API_KEY" \
  -H "X-Shroud-Provider: anthropic" \
  -H "X-Shroud-Api-Key: vault://VAULT_ID/api-keys/anthropic" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-5","messages":[{"role":"user","content":"Hello"}]}'
```

### Example: TypeScript (fetch)

```typescript
const SHROUD_URL = "https://shroud.1claw.co";
const agentId = process.env.ONECLAW_AGENT_ID!;
const agentApiKey = process.env.ONECLAW_AGENT_API_KEY!;

const res = await fetch(`${SHROUD_URL}/v1/chat/completions`, {
  method: "POST",
  headers: {
    "X-Shroud-Agent-Key": `${agentId}:${agentApiKey}`,
    "X-Shroud-Provider": "google",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 1024,
  }),
});

const data = await res.json();
// OpenAI-style response: data.choices[0].message.content
```

### Errors you may see

| HTTP | Message | Meaning |
|------|---------|--------|
| 400 | `missing X-Shroud-Provider header` | Send `X-Shroud-Provider` with a supported provider name. |
| 401 | `missing X-Shroud-Agent-Key header` | Send `X-Shroud-Agent-Key` with `agent_id:api_key`. |
| 401 | `invalid agent key format: expected 'agent_id:api_key'` | Use exactly one colon; left side = agent UUID, right side = API key. |
| 401 | `no API key: vault lookup failed and no X-Shroud-Api-Key header` | Provide `X-Shroud-Api-Key` or store the key in the vault at `providers/{provider}/api-key` and grant the agent read access. |
| 502 | `provider X has no client pool` | Provider name is not supported or is misspelled. Use a value from the [supported providers](#supported-providers) table (e.g. `google` or `gemini` for Gemini). |

---

## IDE Integration (`1claw proxy`)

Shroud uses custom headers (`X-Shroud-Agent-Key`, `X-Shroud-Provider`) that most editors don't support natively. The **1Claw CLI** includes a built-in local proxy that bridges this gap — it accepts **OpenAI** (`/v1/chat/completions`), OpenAI's **Responses API** (`/v1/responses`, used by Codex), and **Anthropic** (`/v1/messages`) traffic and injects Shroud headers before forwarding.

An OpenAI-compatible client pointed at a Claude model (OpenCode, Codex) sends genuine OpenAI-shaped requests regardless of the target model name — Shroud normalizes these automatically before they reach Anthropic: `max_tokens` is defaulted when missing, OpenAI's function-calling tool schema is converted to Anthropic's, OpenAI-only fields (`reasoning_effort`, `frequency_penalty`, …) are stripped, and Codex's Responses API body/stream shape is reshaped to and from Anthropic's Messages API. Claude Code, which already sends native Anthropic-shaped requests, passes through unchanged. See the [2026-09-23 changelog entry](/docs/reference/changelog-2026#2026-09-23) for the specifics.

**→ Step-by-step for Cursor, Claude Code, Codex, OpenCode, VS Code Copilot, and more:** [IDE & tool setup (Shroud proxy)](/docs/agents/shroud/ide-setup).

### Quick start

```bash
export ONECLAW_AGENT_API_KEY="ocv_..."   # same as MCP / examples
npx @1claw/cli@latest proxy
# or: 1claw proxy --agent-key "AGENT_ID:ocv_..." 
```

The proxy prints **copy-paste** snippets for Cursor, Claude Code, Copilot, and OpenAI-compatible extensions. It picks a **free port** if `11434` is busy (e.g. Ollama).

### What the proxy does

1. Accepts `POST /v1/chat/completions` (OpenCode and most OpenAI-compatible clients), **`/v1/messages`** (Claude Code), and **`/v1/responses`** (Codex's OpenAI Responses API format)
2. Ignores editor `Authorization` / `x-api-key` for upstream auth — uses your agent key on the Shroud side
3. Injects `X-Shroud-Agent-Key` from `--agent-key` or **`ONECLAW_AGENT_API_KEY`**
4. Sets `X-Shroud-Provider` from the request path (`/v1/messages` → `anthropic`) or from the `model` field for OpenAI-style bodies (so an OpenAI-compatible client targeting a Claude model is still routed to Anthropic)
5. Forwards to `https://shroud.1claw.co` with inspection, redaction, and policy enforcement
6. Streams the response back

### LLM Token Billing

When your org has [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on) enabled, the proxy works **without any provider API keys**. Shroud routes through Stripe AI Gateway and bills token usage to your org.

See the [CLI docs](/docs/integrations/cli#llm-proxy-1claw-proxy) for all proxy flags.

---

## Why This Matters

AI agents face unique security challenges that traditional security tools don't address:

- **LLMs are susceptible to social engineering** — They're trained on human text where authority and urgency are legitimate signals
- **Prompt injection bypasses application logic** — Attackers can manipulate the model to ignore its instructions
- **Agents have real capabilities** — File access, code execution, API calls, and transactions can be weaponized
- **Obfuscation defeats naive filters** — Unicode tricks and encoding bypass keyword-based detection

Shroud's threat detection filters run **before** content reaches the LLM, blocking attacks at the perimeter.

## Defense in Depth

The filters work together as **20 layers of defense**. Shroud runs two pipelines: one on the **request** (before the LLM sees the prompt) and one on the **response** (before the agent sees the completion). After both pipelines, the **policy engine** acts as a final gate, enforcing rate limits, budgets, provider restrictions, and per-category blocking rules.

### Request pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  Incoming Request                                            │
├──────────────────────────────────────────────────────────────┤
│   1. Hidden Content Stripping  ← Remove markdown/HTML tricks │
│   2. Secret Redaction          ← Mask vault secrets          │
│   3. Secret Injection Detect.  ← Catch non-vault credentials │
│   4. PII Detection             ← Emails, SSNs, cards         │
│   5. Context Injection Defense ← Detect injected sys prompts │
│   6. Prompt Injection Scoring  ← Weighted heuristic scoring            │
│   7. Token Counting            ← Enforce per-request limits  │
│   8. Unicode Normalization     ← Decode obfuscation          │
│   9. Command Injection         ← Block shell attacks         │
│  10. Encoding Detection        ← Catch Base64/hex payloads   │
│  11. Social Engineering        ← Detect manipulation         │
│  12. Network Detection         ← Block data exfiltration     │
│  13. Filesystem Detection      ← Protect sensitive files     │
│  14. Tool Call Inspection      ← Inspect function arguments  │
│  15. Semantic Policy           ← Topic/task guardrails       │
├──────────────────────────────────────────────────────────────┤
│  Clean request → LLM Provider                                │
└──────────────────────────────────────────────────────────────┘
```

### Response pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  LLM Response                                                │
├──────────────────────────────────────────────────────────────┤
│   1. Token Counting             ← Track response token usage │
│   2. Tool Call Inspection       ← Scan tool call results     │
│   3. Output Policy              ← Block harmful/banned text  │
│   4. Response Injection         ← Echoed injection, MD-image │
│                                   exfil, data-URI, code-fence│
│   5. Prompt Injection (resp)    ← Role/override echoed back  │
│   6. Context Injection (resp)   ← Fake system prompts echoed │
│   7. Network Detection (resp)   ← Exfil URLs in responses    │
│   8. Response Filter            ← Hallucinated credentials   │
│   9. Secret Redaction           ← Mask any leaked secrets    │
│  10. Semantic Policy            ← Enforce topic constraints  │
├──────────────────────────────────────────────────────────────┤
│  Clean response → Agent                                      │
└──────────────────────────────────────────────────────────────┘
```

The order matters: hidden content stripping and Unicode normalization run early in the request pipeline so subsequent filters see the "true" content, not obfuscated versions. Secret redaction runs on both sides to catch leaks in either direction. **Response-side inspection** (steps 4–7) was added in Shroud v0.5.0 — see [Response-Side Inspection](/docs/agents/shroud/threat-detection#response-side-inspection) in the threat detection guide. After both pipelines, the **[Policy Engine](/docs/agents/shroud/threat-detection#policy-engine-final-gate)** aggregates all filter results and enforces rate limits, budget caps, provider/model restrictions, and per-category blocking rules from the agent's JWT.

---

## Split guides

This page covers overview and core usage. Deep dives live in dedicated pages:

- **[Threat Detection Filters](/docs/agents/shroud/threat-detection)** — all 20 inspection layers, request/response pipelines, Policy Engine gate
- **[Configuration & Operations](/docs/agents/shroud/configuration)** — global settings, examples, use-case tuning, Shroud Activity, monitoring, best practices


## Next steps

- [IDE Shroud setup](/docs/agents/shroud/ide-setup) — route Cursor, Copilot, and Claude Code through Shroud
- [Intents API](/docs/agents/intents/overview) — sign transactions inside the TEE
- [Billing & Usage](/docs/guides/billing-and-usage) — LLM token billing add-on via Stripe AI Gateway
- [Shroud supported models](/docs/reference/shroud-supported-models) — provider and model reference
- [Security — Zero trust](/docs/security/zero-trust) — defense-in-depth model
