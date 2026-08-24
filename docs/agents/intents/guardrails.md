---
title: Intents API — Guardrails & Security
description: Transaction guardrails, Shroud TEE signing, security model, replay protection, Execution Intents, and best practices.
keywords: [Intents API, guardrails, Execution Intents, TEE]
sidebar_label: Guardrails & security
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Part of the [Intents API](/docs/agents/intents/overview) guide.

## Transaction guardrails

Per-agent controls can be set when registering or updating an agent to limit what transactions the proxy will sign:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `tx_allowed_chains` | `string[]` | Restrict to specific chain names (e.g. `["ethereum", "base"]`). Empty = all chains allowed. |
| `tx_to_allowlist` | `string[]` | Restrict recipient addresses. Empty = any address allowed. |
| `tx_max_value` | `string` | Maximum value per transaction in **native major units** for the chain family (e.g. `"0.01"` = 0.01 BTC on Bitcoin, 0.5 ETH on EVM, 2 SOL on Solana). Null = no per-tx limit. |
| `tx_daily_limit` | `string` | Rolling 24-hour spend cap in native major units, enforced **per chain family** (Bitcoin spend does not count against EVM limit). Null = no daily limit. See [Per-chain spend tracking](#per-chain-spend). |
| `tx_max_value_eth` | `string` | **Deprecated.** Alias for `tx_max_value` (same unit semantics). |
| `tx_daily_limit_eth` | `string` | **Deprecated.** Alias for `tx_daily_limit`. |
| `tx_token_allowlist` | `string[]` | Restrict token contracts/mints the agent can interact with (e.g. `["0xA0b8..."]`). Empty = all tokens. |
| `tx_known_tokens_only` | `boolean` | Restrict to tokens in the [known tokens registry](#token-registry). Default: `false`. |
| `xrpl_allowed_tx_types` | `string[]` | Restrict XRPL transaction types (e.g. `["Payment", "TrustSet"]`). Empty = all **supported** types **except** four dangerous ones (`SetRegularKey`, `SignerListSet`, `AccountSet`, `AccountDelete`), which are always blocked unless explicitly listed. |
| `per_chain_guardrails` | `object` | Chain-specific overrides. See [Per-chain guardrails](#per-chain-guardrails) below. |

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_allowed_chains": ["ethereum", "base"],
    "tx_to_allowlist": ["0xSafeAddress1", "0xSafeAddress2"],
    "tx_max_value": "0.5",
    "tx_daily_limit": "5.0",
    "tx_token_allowlist": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    "tx_known_tokens_only": true
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: agent } = await client.agents.update(agentId, {
  tx_allowed_chains: ["ethereum", "base"],
  tx_to_allowlist: ["0xSafeAddress1", "0xSafeAddress2"],
  tx_max_value: "0.5",
  tx_daily_limit: "5.0",
  tx_token_allowlist: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  tx_known_tokens_only: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.update(
    agent_id,
    tx_allowed_chains=["ethereum", "base"],
    tx_to_allowlist=["0xSafeAddress1", "0xSafeAddress2"],
    tx_max_value="0.5",
    tx_daily_limit="5.0",
)
```

</TabItem>
</Tabs>

| `address_screening_policy` | `object` | Recipient screening at signing: `{ "mode": "off" \| "deny" \| "approve" }`. Env deny list: `ONECLAW_SCREENING_DENY_LIST`. |
| `tx_approval_policy` | `object` | Graduated tx HITL thresholds (v0.54+) — matching txs return **202** `awaiting_approval`. |
| `typed_data_policy` / `simulation_failure_policy` / `raw_signing_policy` | `string` | `"deny"` (default) or `"approve"` for EIP-712, simulation revert, or raw digest HITL. |

When a transaction violates any guardrail, the proxy returns **403 Forbidden** with a descriptive `detail` message.

See [Guardrail governance](/docs/agents/guardrail-governance) for Convention 6 execution shadow mode, widening approvals, revision history, and replay.

### Token guardrails {#token-guardrails}

Two complementary controls restrict which tokens an agent can transfer:

**Token allowlist** (`tx_token_allowlist`): An explicit list of token contract addresses or mints the agent may interact with. Applied to `token_mint` on non-EVM chains and the ERC-20 contract address on EVM token transfers. Case-insensitive. When empty, all tokens are permitted.

**Known tokens only** (`tx_known_tokens_only`): When enabled, the agent can only transact with tokens present in the [known tokens registry](#token-registry). This is useful for restricting agents to verified, well-known tokens without maintaining a per-agent allowlist.

Both guardrails can be used together — the token must pass **both** checks (allowlist AND known registry) when both are set.

### Per-chain guardrails {#per-chain-guardrails}

Override global guardrails on a per-chain basis using `per_chain_guardrails`. This is useful when an agent operates across multiple chains with different risk profiles — for example, a higher spend limit on a testnet than on mainnet.

```json
{
  "per_chain_guardrails": {
    "ethereum": {
      "max_value": "1.0",
      "to_allowlist": ["0xSafeContract"],
      "token_allowlist": ["0xUSDC"]
    },
    "solana": {
      "max_value": "100"
    }
  }
}
```

Supported per-chain fields: `max_value`, `daily_limit`, `to_allowlist`, `token_allowlist`, `max_per_day`, `overhead_budget`, `max_ata_creates_per_day`, `max_fee_per_gas_gwei`, `max_gas_limit`, **`gas_daily_budget_native`** (v0.56.3 — UTC-day cumulative EVM gas budget). Legacy `*_eth` keys accepted. Keys are signing chains: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`. When both global and per-chain values are set, the **strictest** wins.

### XRP transaction type allowlist {#xrpl-tx-types}

1Claw signs **31** XRPL transaction types via `xrpl_tx_json` — a supported subset, not every type the ledger accepts (DID, oracles, Batch, and others are rejected).

When using `xrpl_tx_json`, you can restrict which of those types an agent may submit:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "xrpl_allowed_tx_types": ["Payment", "TrustSet", "OfferCreate"] }'
```

If the agent submits an `xrpl_tx_json` with a `TransactionType` not in the allowlist, the request is rejected with 403.

**Deny-by-default dangerous types.** `SetRegularKey`, `SignerListSet`, `AccountSet`, and `AccountDelete` can transfer account control. They are **always blocked** unless the agent's `xrpl_allowed_tx_types` explicitly includes that type — even when the allowlist is empty (empty otherwise means “all other supported types”).

Submit/sign still require top-level `to` and `value` even when `xrpl_tx_json` is present (use `"0"` for non-Payment types). The signed body is taken from `xrpl_tx_json`. Auto-filled when omitted: `Account`, `Sequence`, `Fee` (`"12"` drops), `LastLedgerSequence` (current ledger + 20), `SigningPubKey`, `Flags` (`0x80000000` / `tfFullyCanonicalSig`), and `SourceTag` `482684816` (caller-supplied value wins; explicit `0` suppresses the default).

### Known tokens registry {#token-registry}

A curated registry of verified token contracts. Use `GET /v1/tokens` (filterable by `?chain=`) or `GET /v1/chains/{chain}/tokens` to query it.

Admins can manage the registry via `POST /v1/admin/tokens` (add) and `DELETE /v1/admin/tokens/{id}` (remove). Each entry includes `chain`, `contract_address`, `symbol`, `name`, `decimals`, and an optional `logo_url`.

### Extended token balance {#token-balance}

The signing key balance endpoint now supports querying specific token balances alongside native balance:

```bash
# Query native + specific ERC-20 token balances
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys/ethereum/balance?tokens=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0xdAC17F958D2ee523a2206206994597C13D831ec7" \
  -H "Authorization: Bearer $TOKEN"
```

The `?tokens=` parameter accepts comma-separated contract addresses or mints. Works across all chains: ERC-20 (EVM), SPL (Solana), TRC-20 (Tron).

### Per-chain daily spend tracking {#per-chain-spend}

`GET /v1/agents/{id}` returns `tx_spent_today_by_chain` (keys: `evm`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`) and `tx_spent_today` (cross-family sum). Daily limits (`tx_daily_limit`) compare against **that chain family's** spend from `tx_spent_today_by_chain`, not the cross-chain total. Legacy `tx_spent_today_eth` is a deprecated alias for `tx_spent_today`.

---

## Shroud TEE signing (optional)

When [Shroud](/docs/agents/shroud/overview) is deployed, transaction signing moves into a Trusted Execution Environment (AMD SEV-SNP on GKE). The `POST /v1/agents/:id/transactions` endpoint on `shroud.1claw.xyz` uses Shroud's own signing engine — private keys are only decrypted inside confidential memory. All other Intents API endpoints (list, get, simulate, simulate-bundle) are proxied to the Vault API.

Both `api.1claw.xyz` and the TEE hosts serve the full Intents API. Choose based on your security requirements:

| Surface | Submit | List/Get/Simulate | Key isolation |
| --- | --- | --- | --- |
| `api.1claw.xyz` | HSM-backed signing (Cloud Run) | Direct | Cloud KMS HSM |
| `shroud.1claw.xyz` | TEE signing (GKE SEV-SNP) | Proxied to Vault API | TEE + KMS |
| `intents.1claw.xyz` | TEE signing (same backend as Shroud) | Proxied to Vault API | TEE + KMS |

`intents.1claw.xyz` is an alias for the same GKE backend as `shroud.1claw.xyz` — use it when you want a dedicated hostname for the Intents API. Shroud also provides LLM proxy capabilities; see the [Shroud guide](/docs/agents/shroud/overview).

## Security model

- **Keys never leave the HSM boundary** — the vault decrypts the key, signs the transaction, and zeroes the memory. The plaintext key is never returned to the caller.
- **Full audit trail** — every transaction is logged with the agent ID, chain, recipient, value, and resulting `tx_hash`.
- **Policy enforcement** — the agent still needs a policy granting access to the vault path that holds the signing key. The proxy doesn't bypass access control.
- **Transaction guardrails** — per-agent chain allowlists, recipient allowlists, per-tx caps, and daily spend limits enforced server-side before signing.
- **Rate limiting** — standard rate limits apply to transaction endpoints.

## Replay protection

### Idempotency-Key header

Submit an `Idempotency-Key` header (e.g. a UUID) with `POST /v1/agents/:id/transactions` to prevent duplicate submissions. If the same key is sent within 24 hours, the server returns the cached transaction response instead of signing and broadcasting again.

The SDK and MCP server auto-generate an idempotency key on every `submitTransaction` call. You can override with your own key for explicit retry control.

| Scenario | Response |
| --- | --- |
| First request with key | `201 Created` (normal flow) |
| Duplicate request (completed) | `200 OK` (cached response) |
| Duplicate request (in progress) | `409 Conflict` (retry later) |
| No header | No idempotency enforcement |

### Server-side nonce management

When the `nonce` field is omitted, the server atomically reserves the next nonce per agent+chain+address combination. This prevents nonce collisions when multiple transactions are submitted concurrently. The server tracks the highest nonce used and takes the maximum of its tracked value and the on-chain pending nonce.

### Response field gating

By default, the `signed_tx` field (raw signed transaction hex) is **omitted** from GET responses to reduce exfiltration risk. Pass `?include_signed_tx=true` to include it:

```bash
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/transactions?include_signed_tx=true" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

The initial POST submission always returns `signed_tx` for the originating caller.

## Best practices

1. **One key per agent** — give each agent its own signing key in its own vault path so you can revoke independently.
2. **Set `expires_at`** — register agents with an expiry so leaked API keys have a bounded blast radius.
3. **Use scoped policies** — grant the agent access only to the specific vault path containing its signing key, not the entire vault.
4. **Monitor transactions** — query `GET /v1/agents/:id/transactions` regularly or set up audit webhooks.
5. **Use testnets first** — use testnets to verify the flow before moving to mainnet. For EVM: Sepolia, Base Sepolia. For non-EVM: Bitcoin Signet, Solana Devnet, XRP Testnet, Cardano Preprod, Tron Shasta. See [Non-EVM networks](/docs/agents/intents/signing#non-evm-networks) for faucet links.

---

## Execution Intents (Pro+) {#execution-intents}

Execution Intents extend the Intents API beyond blockchain transactions. Agents can make **HTTP calls, database queries, and external service interactions** through pre-configured **bindings** — without ever seeing the underlying credentials.

:::info Tier requirements
- **Pro:** HTTP and GraphQL binding types
- **Team+:** All binding types (Postgres, MySQL, Redis, gRPC, SMTP, Cloud SDK, S3, Custom)
- **Business+:** TEE execution mode (requests execute inside Shroud's confidential enclave)
:::

### How it works

1. A **human** creates a binding on the agent — a named credential handle (e.g. `stripe-api`, `analytics-db`) with connection details and authentication.
2. The agent calls `POST /v1/agents/:id/execute` with the binding name and request parameters.
3. The server injects credentials server-side, executes the request, and returns the response — the agent never sees API keys, database passwords, or tokens.

### Enabling Execution Intents

Set `execution_intents_enabled: true` when creating or updating an agent:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "execution_intents_enabled": true }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.update(agentId, {
  execution_intents_enabled: true,
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.update(agent_id, execution_intents_enabled=True)
```

</TabItem>
</Tabs>

### Creating a binding

Bindings are human-only — agents cannot create or modify their own bindings.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe-api",
    "binding_type": "http",
    "credential": "sk_live_...",
    "config": {
      "base_url": "https://api.stripe.com",
      "auth_type": "bearer",
      "allowed_hosts": ["api.stripe.com"],
      "allowed_paths": ["/v1/*"],
      "timeout_ms": 10000
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: binding } = await client.bindings.create(agentId, {
  name: "stripe-api",
  binding_type: "http",
  credential: "sk_live_...",
  config: {
    base_url: "https://api.stripe.com",
    auth_type: "bearer",
    allowed_hosts: ["api.stripe.com"],
    allowed_paths: ["/v1/*"],
    timeout_ms: 10000,
  },
});
// binding.credential_set === true; credential value is never returned
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

### Vault-ref credentials (live pointers)

Instead of copying a credential into the binding, you can **reference an existing vault secret**. The server resolves the secret at execution time — if you rotate the upstream secret, every binding referencing it picks up the new value automatically.

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { CredentialSource } from "@1claw/sdk";

const vaultRef: CredentialSource = {
  type: "vault_ref",
  vault_id: "550e8400-e29b-41d4-a716-446655440000",
  path: "integrations/stripe-key",
};

const { data: binding } = await client.bindings.create(agentId, {
  name: "stripe-api",
  binding_type: "http",
  config: { base_url: "https://api.stripe.com", auth_type: "bearer" },
  credential_source: vaultRef,
});
// binding.credential_source_type === "vault_ref"
// binding.credential_vault_id, binding.credential_path are set
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe-api",
    "binding_type": "http",
    "config": { "base_url": "https://api.stripe.com", "auth_type": "bearer" },
    "credential_source": {
      "type": "vault_ref",
      "vault_id": "550e8400-e29b-41d4-a716-446655440000",
      "path": "integrations/stripe-key"
    }
  }'
```

</TabItem>
</Tabs>

:::tip
Use vault-ref credentials when multiple bindings share the same upstream API key, or when you have an existing secret rotation workflow. Changes to the vault secret are reflected immediately — no manual credential rotation needed.
:::

### Executing a request

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "stripe-api",
    "intent_type": "http",
    "params": {
      "method": "GET",
      "path": "/v1/customers?limit=10"
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data: result } = await client.bindings.execute(agentId, {
  binding: "stripe-api",
  intent_type: "http",
  params: {
    method: "GET",
    path: "/v1/customers?limit=10",
  },
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once
```

</TabItem>
</Tabs>

### Binding types

| Type | Tier | Description |
| --- | --- | --- |
| `http` | Pro | REST API calls with credential injection |
| `graphql` | Pro | GraphQL queries/mutations |
| `postgres` | Team+ | PostgreSQL queries |
| `mysql` | Team+ | MySQL queries |
| `redis` | Team+ | Redis commands |
| `grpc` | Team+ | gRPC calls |
| `smtp` | Team+ | Email sending |
| `cloud_sdk` | Team+ | Cloud provider SDK calls |
| `s3` | Team+ | S3-compatible storage operations |
| `custom` | Team+ | Custom integrations |

### Binding lifecycle

| Operation | Endpoint | SDK |
| --- | --- | --- |
| Create | `POST /v1/agents/{id}/bindings` | `client.bindings.create(agentId, data)` |
| List | `GET /v1/agents/{id}/bindings` | `client.bindings.list(agentId)` |
| Get | `GET /v1/agents/{id}/bindings/{bid}` | `client.bindings.get(agentId, bindingId)` |
| Update | `PATCH /v1/agents/{id}/bindings/{bid}` | `client.bindings.update(agentId, bindingId, data)` |
| Delete | `DELETE /v1/agents/{id}/bindings/{bid}` | `client.bindings.delete(agentId, bindingId)` |
| Test | `POST /v1/agents/{id}/bindings/{bid}/test` | `client.bindings.test(agentId, bindingId)` |
| Rotate credential | `POST /v1/agents/{id}/bindings/{bid}/rotate-credential` | `client.bindings.rotateCredential(agentId, bindingId, { credential })` |
| Execute | `POST /v1/agents/{id}/execute` | `client.bindings.execute(agentId, data)` |
| List executions | `GET /v1/agents/{id}/executions` | `client.bindings.listExecutions(agentId)` |

Binding responses include **`credential_set`** (boolean) so you can confirm a credential is stored without ever exposing the value. Deleting a binding **purges** the stored credential.

### GraphQL example

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "binding": "github-graphql",
    "intent_type": "graphql",
    "params": {
      "query": "query { viewer { login } }"
    }
  }'
```

The GraphQL executor POSTs `{ query, variables, operationName }`, surfaces `errors[]` from the upstream API, and uses introspection for connectivity tests.

### Agent execution guardrails

Set per-agent limits with `execution_guardrails` (JSON) on create/update:

```json
{
  "allowed_hosts": ["api.stripe.com"],
  "allowed_binding_types": ["http", "graphql"],
  "max_duration_ms": 15000,
  "max_requests_per_minute": 30
}
```

At execute time the server enforces the **strictest** of binding-level and agent-level guardrails. Violations are recorded as `denied` in `execution_events`.

### MCP tools

| Tool | Description |
| --- | --- |
| `execute_http` | HTTP request through a binding (`binding`, `method`, `path`, optional `body`/`headers`) |
| `execute_intent` | Generic execute (`binding`, `intent_type`, `params`) — HTTP, GraphQL, etc. |
| `list_bindings` | List bindings for the current agent |
| `create_binding` | Create a binding (human-only; privileged) |
| `test_binding` | Connectivity test (same SSRF/allowlist checks as execute) |
| `list_executions` | Recent execution events for the agent |

### CLI

```bash
1claw agent binding create <agent-id> --name stripe-api --type http \
  --config '{"base_url":"https://api.stripe.com","auth_type":"bearer","allowed_hosts":["api.stripe.com"]}' \
  --credential sk_live_...
1claw agent binding list <agent-id>
1claw agent binding test <agent-id> <binding-id>
1claw agent binding rotate-credential <agent-id> <binding-id> --credential sk_live_new_...
1claw agent binding execute <agent-id> --binding stripe-api --intent-type http \
  --params '{"method":"GET","path":"/v1/customers?limit=5"}'
1claw agent binding executions <agent-id>
```

Enable on the agent: `1claw agent update <id> --execution-intents true --execution-guardrails '{"max_requests_per_minute":30}'`

### Security model

- **Credentials never exposed:** Binding credentials are stored in the `__agent-keys` vault at `agents/{id}/bindings/{name}`. Agents cannot read them directly. Responses use `credential_set`, not the secret value.
- **SSRF protection:** `validate_audience_url` blocks requests to cloud metadata endpoints, private CIDRs, and internal hostnames. Connectivity tests use the same checks as execute.
- **Host and path allowlists:** Each binding defines `allowed_hosts` and optional `allowed_paths` (trailing-`*` wildcard). Agent `execution_guardrails.allowed_hosts` can further restrict destinations.
- **Binding type gating:** Agent `execution_guardrails.allowed_binding_types` is enforced at execute time, not only at create.
- **Audit trail:** Every execution is recorded in `execution_events` with sanitized request/response metadata (`success` / `error` / `denied`). Only successful runs count toward the monthly quota.
- **Execution surface:** Execute responses include `execution_surface`: `vault` (default) or `tee` when a Shroud execution endpoint is configured and `execution_mode: "tee"` is requested.
- **TEE mode (Business+):** Optional TEE execution inside Shroud's confidential enclave. Set `ONECLAW_EXECUTION_TEE_REQUIRE_SHROUD=true` to return 501 when TEE is requested but no enclave endpoint is configured (fail-closed).
- **Convention 6 shadow/enforce (v0.56):** Binding `guardrails.enforcement` and agent `execution_guardrails.enforcement` — `"log"` (audit `guardrail_shadow.would_deny`) or `"enforce"` (403). See [Guardrail governance](/docs/agents/guardrail-governance).
- **Outbound idempotency (v0.56.3):** Binding guardrail `inject_idempotency_key: true` injects deterministic `Idempotency-Key` (SHA-256 of binding id, method, path, body) on HTTP/GraphQL execute when absent.

## Next steps
