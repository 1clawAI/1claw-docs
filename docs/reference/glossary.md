---
title: Glossary
description: Definitions of terms used in 1claw — vaults, secrets, policies, agents, and billing.
sidebar_position: 4
---

# Glossary

Terms you’ll see in the API, dashboard, SDK, and CLI.

**Agent** — A registered identity (e.g. a bot or MCP server) that authenticates with an agent API key (`ocv_...`). Agents get a short-lived JWT and call the same REST API as humans, but access is limited by policies. See [Register an agent](/docs/human-api/agents/register-agent) and [Agent API overview](/docs/agent-api/overview).

**API key (personal)** — A `1ck_` key that represents a user. Used as a Bearer token for all API endpoints. Created in the dashboard under API Keys or via the API. Used for CLI, CI/CD, or scripting. See [Authentication](/docs/human-api/authentication).

**API key (agent)** — A one-time `ocv_` key returned when you register an agent. The agent exchanges it for a JWT via `POST /v1/auth/agent-token`. Store it securely; it cannot be retrieved again. Rotate via the dashboard or `POST /v1/agents/:id/rotate-key`.

**DEK (Data Encryption Key)** — A random key generated per secret (or per write). Used with AES-256-GCM to encrypt the secret value. The DEK is then wrapped by the vault’s KEK and stored with the ciphertext. See [Key hierarchy](/docs/security/key-hierarchy).

**Envelope encryption** — The pattern 1claw uses: encrypt the secret with a DEK, then encrypt (wrap) the DEK with a KEK that lives in the HSM. The database only stores ciphertext and the wrapped DEK, so a DB compromise does not expose secrets without HSM access.

**Grant** — See **Policy**. In the API and docs, “grant” and “policy” are used interchangeably for the rule that grants a principal access to secret paths.

**HSM (Hardware Security Module)** — A secure vault for keys. In 1claw, production uses Google Cloud KMS; keys never leave the HSM. Used for KEKs and JWT signing. See [HSM architecture](/docs/concepts/hsm-architecture).

**KEK (Key Encryption Key)** — One per vault, stored in the HSM. Used only to wrap and unwrap DEKs when storing or reading secrets. See [Key hierarchy](/docs/security/key-hierarchy).

**JWT (JSON Web Token)** — The short-lived token returned after login or agent-token exchange. Sent as `Authorization: Bearer <token>`. Contains claims such as user/agent id, org id, and (for agents) scopes.

**MCP (Model Context Protocol)** — A protocol that lets AI tools (e.g. Claude, Cursor) call 1claw tools (list secrets, get secret, etc.) over stdio or HTTP. The 1claw MCP server is available at mcp.1claw.xyz or as a local process. See [MCP Server](/docs/mcp/overview).

**Path** — A slash-separated identifier for a secret inside a vault (e.g. `api-keys/stripe`, `config/prod/db`). Used in policies as glob patterns (e.g. `**`, `prod/*`). See [Secrets model](/docs/concepts/secrets-model).

**Policy** — A rule that grants a **principal** (user or agent) permission to read and/or write secrets in a vault that match a **secret path pattern**. Policies can have conditions (IP, time window) and an expiry. Created and managed per vault. See [Create a policy](/docs/human-api/grants/create-grant) and [Scoped permissions](/docs/guides/scoped-permissions).

**Principal** — The identity that a policy applies to: a **user** (by user ID) or an **agent** (by agent ID). The principal must match the caller for the policy to apply.

**Resource limit** — A cap on how many vaults, secrets, or agents your organization can have, based on your subscription tier. When you hit the limit, the API returns 403 with `type: "resource_limit_exceeded"`. Upgrade your plan or delete unused resources. See [Billing & Usage](/docs/guides/billing-and-usage).

**Scope** — For agents, the set of path patterns the agent is allowed to access. When the agent has no explicit scopes on its record, scopes are derived from its policies (the policies’ `secret_path_pattern` values). If there are no policies, the default is `["*"]`. Scopes are embedded in the agent’s JWT.

**Secret** — A named value (e.g. API key, password) stored in a vault at a **path**. Has a type, optional metadata, optional expiry, and versioning. Values are encrypted at rest; list responses never include values. See [Secrets model](/docs/concepts/secrets-model).

**Share** — A time-limited, optionally passphrase- and IP-restricted link or grant that lets someone (user, agent, or anyone with the link) access a secret. Created via `POST /v1/secrets/:id/share`. See [Sharing secrets](/docs/guides/sharing-secrets).

**Vault** — A named container for secrets (e.g. "Production", "CI"). Each vault has its own KEK in the HSM. You create vaults, then store secrets at paths inside them. Access is controlled by policies on the vault. See [What is 1claw?](/docs/concepts/what-is-1claw).

**x402** — A protocol for per-request payment. When your tier’s request quota is exceeded and you’ve chosen x402 as your overage method, the API can return 402 Payment Required with payment details; after payment, you retry the request. See [Billing & Usage](/docs/guides/billing-and-usage).

**Intents API** — A feature that lets agents sign and broadcast on-chain transactions without ever reading the private key. When enabled for an agent, the agent is blocked from reading `private_key` and `ssh_key` secrets; it must use the transaction endpoints. Supports EIP-191 message signing, EIP-712 typed data signing, and all EIP-2718 transaction types (0–4). See [Intents API](/docs/guides/intents-api).

**Signing key (multi-chain)** — A per-agent, per-chain cryptographic keypair provisioned via `POST /v1/agents/{id}/signing-keys`. The private key is stored in the HSM-backed `__agent-keys` vault; the public key and derived address are returned to the caller. Supported chains: Ethereum, Bitcoin, Solana, XRP, Cardano, Tron. See [Agent keys](/docs/security/agent-keys) and [Intents API — Signing Keys](/docs/guides/intents-api#signing-keys).

**EIP-191 (personal_sign)** — A standard for signing human-readable messages on Ethereum. Used for identity verification, login challenges, and off-chain attestations. Requires `message_signing_enabled: true` on the agent. See [Intents API — EIP-191](/docs/guides/intents-api#eip191).

**EIP-712 (typed data)** — A standard for signing structured typed data on Ethereum (e.g. ERC-20 Permit, gasless approvals). Subject to the agent's `eip712_domain_allowlist` and `eip712_default_policy` guardrails. See [Intents API — EIP-712](/docs/guides/intents-api#eip712).

**EIP-2718 (typed transactions)** — The Ethereum envelope standard that defines transaction types: legacy (type 0), EIP-2930 access list (type 1), EIP-1559 (type 2), EIP-4844 blob (type 3), and EIP-7702 (type 4). All types are supported by the unified sign endpoint. See [Intents API — Transaction types](/docs/guides/intents-api#tx-types).
