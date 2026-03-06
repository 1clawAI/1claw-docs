---
title: Shroud — TEE LLM Proxy
description: TEE-protected LLM proxy and transaction signing for AI agents. Secret redaction, prompt injection defense, and key isolation inside AMD SEV-SNP confidential memory.
sidebar_position: 12
---

# Shroud — TEE LLM Proxy & Transaction Signing

Shroud is a Rust service running inside Google Cloud Confidential GKE (AMD SEV-SNP). It sits between AI agents and LLM providers, performing real-time security inspection of all traffic while also handling on-chain transaction signing with keys that never leave the TEE.

## Architecture

```
Agent
  │
  ├── LLM requests ──► shroud.1claw.xyz (GKE TEE) ──► LLM Providers
  │                         │
  │                         ├── Secret redaction
  │                         ├── PII scrubbing
  │                         ├── Prompt injection detection
  │                         ├── Policy enforcement
  │                         └── Audit logging
  │
  └── Transaction requests ──► shroud.1claw.xyz
                                   │
                                   ├── POST /v1/agents/:id/transactions → TEE signing
                                   └── GET/simulate/bundle → Proxied to api.1claw.xyz
```

## Endpoints

**Shroud-hosted (TEE signing):**

| Method | Path                          | Description                                     |
| ------ | ----------------------------- | ----------------------------------------------- |
| POST   | `/v1/agents/:id/transactions` | Sign and broadcast a transaction inside the TEE |

**Proxied to Vault API:**

| Method | Path                                          | Description                       |
| ------ | --------------------------------------------- | --------------------------------- |
| GET    | `/v1/agents/:id/transactions`                 | List agent transactions           |
| GET    | `/v1/agents/:id/transactions/:tx_id`          | Get a specific transaction        |
| POST   | `/v1/agents/:id/transactions/simulate`        | Simulate a transaction (Tenderly) |
| POST   | `/v1/agents/:id/transactions/simulate-bundle` | Simulate a bundle                 |

**Health/ops (port 8080):**

| Method | Path       | Description        |
| ------ | ---------- | ------------------ |
| GET    | `/healthz` | Liveness probe     |
| GET    | `/readyz`  | Readiness probe    |
| GET    | `/livez`   | Deadlock detection |

**Metrics (port 9090):**

| Method | Path       | Description        |
| ------ | ---------- | ------------------ |
| GET    | `/metrics` | Prometheus metrics |

## LLM Proxy

Agents send LLM requests directly to `shroud.1claw.xyz` with two required headers:

```bash
curl -X POST https://shroud.1claw.xyz/v1/chat/completions \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "X-Shroud-Provider: openai" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

| Header              | Required | Description                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `Authorization`     | Yes      | Agent JWT (from `POST /v1/auth/agent-token`)                       |
| `X-Shroud-Provider` | Yes      | LLM provider: `openai`, `anthropic`, `google`, `mistral`, `cohere` |
| `X-Shroud-Api-Key`  | Optional | Fallback LLM API key (used if vault lookup fails)                  |

### LLM provider API keys (bring your own)

1Claw does **not** provide LLM API keys. You must supply your own keys for OpenAI, Anthropic, Google, Mistral, or Cohere. Shroud uses them only to forward requests to the provider after inspection; the key never leaves the TEE in plaintext to the agent.

You can provide the key in either of these ways:

1. **Store in the vault (recommended)** — Store each provider’s API key in a vault the agent can read, at the path **`providers/{provider}/api-key`**. For example:
    - `providers/openai/api-key` for OpenAI
    - `providers/anthropic/api-key` for Anthropic  
      Shroud looks up the key using the agent’s JWT and caches it briefly. The agent never sees the key; Shroud fetches it when proxying.

2. **Pass per request via header** — Send the key in the **`X-Shroud-Api-Key`** header. This is used when the vault has no key at `providers/{provider}/api-key` or the agent has no read access. Useful for quick testing or when you don’t want to store the key in the vault.

If neither a vault key nor the header is present (or the vault lookup fails and the header is missing), Shroud returns **401** with a message that no API key was provided.

Example: store the OpenAI key in the vault, then grant the agent read access to that path (e.g. policy with `secret_path_pattern`: `providers/openai/api-key` and `read` permission).

### Inspection pipeline

Every request passes through Shroud's inspection pipeline before reaching the LLM:

1. **Hidden content stripping** — Removes invisible Unicode, zero-width characters, and encoded payloads that could hide instructions
2. **Secret redaction** — Fetches a manifest of all vault secrets and uses Aho-Corasick O(n) multi-pattern matching to detect and replace leaked secret values with `[REDACTED:<path>]`. The manifest is refreshed on a configurable interval
3. **PII detection** — Regex-based detection of keys, tokens, passwords, and long credential-like strings. Per-agent policy: `block` (reject), `redact` (mask), `warn` (flag in audit), or `allow`
4. **Context injection defense** — Detects delimiter injection and base64-encoded instructions in system/assistant context; scores 0.0–1.0
5. **Prompt injection detection** — Scores each request 0.0–1.0 for direct and indirect injection patterns. Requests scoring above the agent's `injection_threshold` are blocked
6. **Token counting** — Counts input tokens for budget and per-request limit enforcement
7. **Policy enforcement** — Checks the agent's allowed providers/models, rate limits, token caps, and daily budget

### Response inspection

LLM responses also pass through inspection before reaching the agent:

- **Secret redaction** — Same Aho-Corasick scan on response bodies
- **Credential scanning** — Detects leaked credentials in LLM output: AWS access/secret keys, GitHub tokens, Slack tokens, Stripe keys, private key headers (`-----BEGIN PRIVATE KEY-----`), Ethereum private keys (64-char hex), and generic Bearer tokens. Detected credentials are flagged in audit logs

## Per-agent Shroud configuration

Each agent has a `shroud_enabled` toggle and an optional `shroud_config` JSON object that controls inspection behavior. Configure these in the dashboard (Agent detail → Shroud LLM Proxy card), via the API, SDK, or CLI.

### Understanding the dashboard settings

In the dashboard, the **Shroud LLM Proxy** card on an agent’s detail page shows:

- **Enable Shroud** — When on, this agent’s LLM traffic is sent through `shroud.1claw.xyz` for secret redaction, PII scrubbing, prompt-injection defense, and policy enforcement inside the TEE. When off, the agent talks to LLM providers directly.

- **PII Policy** — How Shroud handles detected PII (emails, phones, tokens, etc.) in prompts and responses. Options: **block** (reject the request), **redact** (mask PII so the model or agent doesn’t see raw values), **warn** (allow but log), **allow** (no action). Default: redact.

- **Injection Threshold (0.0–1.0)** — Each request gets a prompt-injection risk score. Requests scoring **above** this value are **blocked**. Lower = stricter (more requests blocked); higher = looser. Default: 0.7.

- **Allowed Providers** — Only these LLM providers are allowed (e.g. `openai`, `anthropic`). Empty = all supported providers allowed.

- **Allowed Models** — Only these model names are allowed (e.g. `gpt-4`, `claude-3-opus`). Empty = all models (within allowed providers).

- **Max Tokens / Request** — Hard cap on tokens per request. Empty = use Shroud’s default.

- **Daily Budget (USD)** — Maximum daily spend for this agent’s LLM usage through Shroud. 0 = unlimited.

- **Secret Redaction** — When on, Shroud redacts vault secrets from prompts (and responses) so the model never sees raw secret values.

- **Response Credential Filtering** — When on, Shroud scans LLM responses for leaked credentials (API keys, tokens, private keys, etc.) and redacts or flags them before the agent sees the response.

### Enable Shroud for an agent

```bash
# API
curl -X PUT https://api.1claw.xyz/v1/agents/$AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shroud_enabled": true}'

# CLI
1claw agent update $AGENT_ID --shroud true

# SDK
await client.agents.update(agentId, { shroud_enabled: true });
```

### Shroud config fields

| Field                         | Type                                             | Default         | Description                                                       |
| ----------------------------- | ------------------------------------------------ | --------------- | ----------------------------------------------------------------- |
| `pii_policy`                  | `"block"` \| `"redact"` \| `"warn"` \| `"allow"` | `"redact"`      | How PII detections are handled                                    |
| `injection_threshold`         | `number` (0.0–1.0)                               | `0.7`           | Requests scoring above this are blocked. Lower = stricter         |
| `context_injection_threshold` | `number` (0.0–1.0)                               | `0.7`           | Context injection score threshold                                 |
| `allowed_providers`           | `string[]`                                       | `[]` (all)      | LLM providers this agent may use (e.g. `["openai", "anthropic"]`) |
| `allowed_models`              | `string[]`                                       | `[]` (all)      | Specific models allowed (e.g. `["gpt-4", "claude-3-opus"]`)       |
| `denied_models`               | `string[]`                                       | `[]`            | Models explicitly blocked                                         |
| `max_tokens_per_request`      | `number`                                         | `8192`          | Maximum input tokens per request                                  |
| `max_requests_per_minute`     | `number`                                         | `60`            | Rate limit (requests/minute)                                      |
| `max_requests_per_day`        | `number`                                         | `10000`         | Rate limit (requests/day)                                         |
| `daily_budget_usd`            | `number`                                         | `0` (unlimited) | Daily LLM spend cap in USD                                        |
| `enable_secret_redaction`     | `boolean`                                        | `true`          | Whether vault secrets are redacted from prompts/responses         |
| `enable_response_filtering`   | `boolean`                                        | `true`          | Whether response credential scanning is active                    |

### Example: strict config

```bash
curl -X PUT https://api.1claw.xyz/v1/agents/$AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shroud_config": {
      "pii_policy": "block",
      "injection_threshold": 0.5,
      "allowed_providers": ["openai"],
      "allowed_models": ["gpt-4"],
      "max_tokens_per_request": 4096,
      "daily_budget_usd": 10
    }
  }'
```

## Transaction signing

See the [Intents API guide](/docs/guides/intents-api#shroud-tee-signing) for details on TEE-based transaction signing.

Key differences from Vault API signing:

- Private keys are decrypted inside AMD SEV-SNP confidential memory
- Intent validation uses LLM conversation context (velocity, drainer patterns, origin analysis)
- In-memory nonce management per agent session

## Authentication

Shroud authenticates agents using the same JWT as the Vault API. Obtain a token via:

```bash
TOKEN=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AGENT_ID\",\"api_key\":\"$API_KEY\"}" | jq -r .access_token)
```

Use this token as `Authorization: Bearer $TOKEN` for all Shroud requests.

## Deployment

Shroud runs on a dedicated GKE cluster with:

- **DNS**: `shroud.1claw.xyz` → A record to GKE static IP
- **TLS**: Google-managed certificate via ManagedCertificate resource
- **Health checks**: HTTP on port 8080 (`/healthz`)
- **Proxy**: Port 8443
- **Metrics**: Port 9090 (Prometheus)

## API parity

Both `api.1claw.xyz` and `shroud.1claw.xyz` serve the complete Intents API. When the dashboard middleware has `SHROUD_URL` configured, all transaction routes are automatically routed through Shroud. Agents can also call Shroud directly for both LLM and transaction operations.
