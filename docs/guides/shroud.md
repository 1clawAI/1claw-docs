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

| Method | Path | Description |
| --- | --- | --- |
| POST | `/v1/agents/:id/transactions` | Sign and broadcast a transaction inside the TEE |

**Proxied to Vault API:**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/agents/:id/transactions` | List agent transactions |
| GET | `/v1/agents/:id/transactions/:tx_id` | Get a specific transaction |
| POST | `/v1/agents/:id/transactions/simulate` | Simulate a transaction (Tenderly) |
| POST | `/v1/agents/:id/transactions/simulate-bundle` | Simulate a bundle |

**Health/ops (port 8080):**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/healthz` | Liveness probe |
| GET | `/readyz` | Readiness probe |
| GET | `/livez` | Deadlock detection |

**Metrics (port 9090):**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/metrics` | Prometheus metrics |

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

| Header | Required | Description |
| --- | --- | --- |
| `Authorization` | Yes | Agent JWT (from `POST /v1/auth/agent-token`) |
| `X-Shroud-Provider` | Yes | LLM provider: `openai`, `anthropic`, `google`, `mistral`, `cohere` |
| `X-Shroud-Api-Key` | Optional | Fallback LLM API key (used if vault lookup fails) |

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

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `pii_policy` | `"block"` \| `"redact"` \| `"warn"` \| `"allow"` | `"redact"` | How PII detections are handled |
| `injection_threshold` | `number` (0.0–1.0) | `0.7` | Requests scoring above this are blocked. Lower = stricter |
| `context_injection_threshold` | `number` (0.0–1.0) | `0.7` | Context injection score threshold |
| `allowed_providers` | `string[]` | `[]` (all) | LLM providers this agent may use (e.g. `["openai", "anthropic"]`) |
| `allowed_models` | `string[]` | `[]` (all) | Specific models allowed (e.g. `["gpt-4", "claude-3-opus"]`) |
| `denied_models` | `string[]` | `[]` | Models explicitly blocked |
| `max_tokens_per_request` | `number` | `8192` | Maximum input tokens per request |
| `max_requests_per_minute` | `number` | `60` | Rate limit (requests/minute) |
| `max_requests_per_day` | `number` | `10000` | Rate limit (requests/day) |
| `daily_budget_usd` | `number` | `0` (unlimited) | Daily LLM spend cap in USD |
| `enable_secret_redaction` | `boolean` | `true` | Whether vault secrets are redacted from prompts/responses |
| `enable_response_filtering` | `boolean` | `true` | Whether response credential scanning is active |

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
