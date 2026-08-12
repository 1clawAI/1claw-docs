---
title: JavaScript / TypeScript SDK
description: "@1claw/sdk provides full API parity — vaults, secrets, sharing, agents, billing, auth, and MCP tool integration."
sidebar_position: 1
---

# JavaScript / TypeScript SDK

The official TypeScript client for the 1Claw REST API. Use it in Node.js, Next.js, and browser apps when you need programmatic vault access, agent management, treasury operations, or Platform API bootstrap flows.

Types are generated from the OpenAPI spec, so request and response shapes track the API. Agent keys auto-exchange for JWTs and refresh before expiry. x402 micropayment headers are supported for paid routes.

Connecting an IDE agent to secrets? Use [@1claw/mcp](https://www.npmjs.com/package/@1claw/mcp) or `1claw setup` instead. This SDK is for apps and services you own.

**Repository:** [github.com/1clawAI/1claw-sdk](https://github.com/1clawAI/1claw-sdk)

**API contract:** Built against **OpenAPI 3.1**. The spec is [@1claw/openapi-spec](https://www.npmjs.com/package/@1claw/openapi-spec). See [API reference](/docs/reference/api-reference) for the endpoint list.

:::tip Try it out
Try out the examples in this repo: **[Basic](https://github.com/1clawAI/1claw-examples/tree/main/basic)** (vault, secrets, billing, sharing) and **[Next.js Agent Secret](https://github.com/1clawAI/1claw-examples/tree/main/nextjs-agent-secret)** (chat app with server-side vault access).
:::

## Install

```bash
npm install @1claw/sdk
```

## Quick start

```ts
import { createClient } from "@1claw/sdk";

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: process.env.ONECLAW_API_KEY, // personal API key (1ck_...)
});

// Create a vault
const { data: vault } = await client.vault.create({
    name: "my-vault",
    description: "Production secrets",
});

// Store a secret
await client.secrets.set(vault.id, "STRIPE_KEY", "sk_live_...", {
    type: "api_key",
});

// Retrieve a secret
const { data: secret } = await client.secrets.get(vault.id, "STRIPE_KEY");
console.log(secret.value); // use securely, don't log in production
```

## Authentication

The SDK supports three authentication methods:

```ts
// 1. Personal API key (recommended for server-side)
const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "1ck_...",
});

// 2. Agent credentials
const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    agentId: "uuid",
    apiKey: "ocv_...",
});

// 3. Manual auth (signup, email/password)
const client = createClient({ baseUrl: "https://api.1claw.xyz" });
await client.auth.signup({
    email: "me@example.com",
    password: "...",
    display_name: "Me",
});
// or
await client.auth.login({ email: "me@example.com", password: "..." });
```

## Resource modules

All API endpoints are organized into resource modules:

| Module                     | Methods                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `client.auth`              | `login()`, `signup()`, `agentToken()`, `apiKeyToken()`, `google()`, `changePassword()`, `logout()`, `forgotPassword()`, `resetPassword()`, `sendEmailOtp()`, `verifyEmailOtp()`, `socialLogin()`, `exchangeOAuthCode()`, `exchangeFederatedToken()` |
| `client.vault`             | `create()`, `list()`, `get()`, `delete()`                                                          |
| `client.secrets`           | `set()`, `get()`, `list()`, `delete()`, `rotate()`, `listVersions()`, `getVersion()`, `rotateGenerate()`, `disableVersion()` |
| `client.access`            | `grantHuman()`, `grantAgent()`, `update()`, `revoke()`, `listGrants()`                             |
| `client.agents`            | `create()`, `list()`, `get()`, `update()`, `delete()`, `rotateKey()`, `enroll()`, `submitTransaction()`, `signTransaction()`, `listTransactions()`, `getTransaction()`, `simulateTransaction()`, `simulateBundle()`, `sign()`, `leaseBankrKey()`, `listBankrKeys()`, `revokeBankrKey()` |
| `client.signingKeys`       | `create()`, `list()`, `rotate()`, `deactivate()`, `export()`                                       |
| `client.sharing`           | `create()`, `access()`, `revoke()`                                                                 |
| `client.approvals`         | `request()`, `list()`, `get()`, `decide()`                                                         |
| `client.apiKeys`           | `create()`, `list()`, `revoke()`                                                                   |
| `client.billing`           | `usage()`, `history()`, `subscribe()`, `portal()`, `subscription()`, `creditsTopup()`, `creditsBalance()`, `creditsTransactions()`, `llmTokenBilling()`, `subscribeLlmTokenBilling()`, `disableLlmTokenBilling()` |
| `client.audit`             | `query()`                                                                                          |
| `client.org`               | `listMembers()`, `updateMemberRole()`, `removeMember()`, `getBankrConfig()`, `setBankrConfig()`, `deleteBankrConfig()` |
| `client.x402`              | `getPaymentRequirement()`, `pay()`, `verifyReceipt()`, `withPayment()`                             |
| `client.chains`            | `list()`, `get()`                                                                                  |
| `client.treasury`          | `create()`, `list()`, `get()`, `update()`, `delete()`, `addSigner()`, `removeSigner()`, `propose()`, `listProposals()`, `getProposal()`, `signProposal()`, `executeProposal()` |
| `client.treasuryWallets`   | `generate()`, `list()`, `get()`, `balance()`, `send()`, `swap()`, `export()`, `rotate()`, `deactivate()`, `getEffectiveSpendPolicy()` |
| `client.platform`          | `createApp()`, `listApps()`, `getApp()`, `updateApp()`, `deleteApp()`, `createTemplate()`, `listTemplates()`, `upsertUser()`, `bootstrapUser()`, `reissueClaim()`, `listConnectedApps()`, `claimPreview()`, `claimRedeem()`, `createSpendPolicy()`, `listSpendPolicies()`, `setUserSpendPolicy()`, `deleteSpendPolicy()` |
| `client.devices`           | `list()`, `revoke()`                                                                               |
| `client.passkeys`          | `list()`, `register()`, `delete()`                                                                 |
| `client.depositDestinations` | `create()`, `list()`, `get()`, `update()`                                                        |
| `client.internalAccounts`  | `create()`, `list()`, `get()`, `transfer()`, `getLedger()`                                         |
| `client.fiat`              | `createOnrampSession()`, `initiateOfframp()`                                                       |
| `client.risk`              | `listEvents()`, `getVerdict()`, `listVerdicts()`, `createHoneytoken()`, `listHoneytokens()`, `deleteHoneytoken()` |
| `client.memory`            | `put()`, `get()`, `list()`, `delete()`, `search()`, `listNamespaces()`                             |
| `client.automations`       | `create()`, `list()`, `get()`, `update()`, `delete()`, `trigger()`, `rotateWebhookToken()`, `listRuns()`, `getRun()` |
| `client.runtimes`          | `create()`, `list()`, `get()`, `update()`, `delete()`, `start()`, `stop()`, `logs()`, `checkSlug()`, `createShellSession()`, `beginShellPasskey()` |
| `client.discovery`         | `getAgentCard()`, `directory()`, `updateDiscovery()`, `marketplace()`                               |
| `client.chat`              | `sendMessage()`, `sendMessageStream()`, `listConversations()`, `getConversation()`, `deleteConversation()` |
| `client.oauthConnect`      | `listProviders()`, `listConnections()`, `connect()`, `disconnect()`, `saveAppCredentials()`, `listAppCredentials()`, `deleteAppCredentials()` |
| `client.cards`             | `order()`, `list()`, `get()`, `reveal()`, `update()`, `void()`, `refresh()`, `import()`, `searchGiftCards()` |
| `client.bindings`          | `create()`, `list()`, `get()`, `update()`, `delete()`, `test()`, `execute()`, `rotateCredential()`, `listExecutions()` |
| `client.webhooks`          | `create()`, `list()`, `get()`, `update()`, `delete()`                                              |

## Sharing by email

Share a secret with someone who may not have an account yet:

```ts
const { data: share } = await client.sharing.create(secretId, {
    recipient_type: "external_email",
    email: "colleague@example.com",
    expires_at: "2026-04-01T00:00:00Z",
    max_access_count: 3,
});
// Recipient gets an email; the share auto-claims when they sign up/log in
```

## Response envelope

Every method returns `{ data, error, meta }`:

```ts
const res = await client.secrets.get(vaultId, "MY_KEY");
if (res.error) {
    console.error(res.error.message); // typed error
} else {
    console.log(res.data.value);
}
```

## Error types

```ts
import {
    OneclawError,
    AuthError, // 401
    PaymentRequiredError, // 402 (x402)
    ApprovalRequiredError, // 403 (approval pending)
    NotFoundError, // 404
    RateLimitError, // 429
} from "@1claw/sdk";
```

## MCP tool integration

The SDK includes an MCP tool layer for AI agent frameworks:

```ts
import { McpHandler, getMcpToolDefinitions } from "@1claw/sdk/mcp";

// Get tool schemas for registration with an AI framework
const tools = getMcpToolDefinitions();

// Handle tool calls
const handler = new McpHandler(client);
const result = await handler.handle("1claw_get_secret", {
    vault_id: "...",
    key: "STRIPE_KEY",
});
```

Available MCP tools: `1claw_get_secret`, `1claw_set_secret`, `1claw_list_secret_keys`, `1claw_request_approval`, `1claw_check_approval_status`, `1claw_pay_and_fetch`, `1claw_create_vault`, `1claw_list_vaults`, `1claw_share_secret`.

## Examples

See the [examples repository](https://github.com/1clawAI/1claw-examples) (34 runnable demos). Highlights:

| Example | What it demonstrates |
| ------- | -------------------- |
| [basic](https://github.com/1clawAI/1claw-examples/tree/main/basic) | Vault CRUD, secrets, billing, sharing, Intents API |
| [langchain-agent](https://github.com/1clawAI/1claw-examples/tree/main/langchain-agent) | LangChain agent fetches secrets just-in-time |
| [nextjs-agent-secret](https://github.com/1clawAI/1claw-examples/tree/main/nextjs-agent-secret) | Next.js chat app with server-side vault access |
| [fastmcp-tool-server](https://github.com/1clawAI/1claw-examples/tree/main/fastmcp-tool-server) | Custom MCP server with domain tools |
| [shroud-demo](https://github.com/1clawAI/1claw-examples/tree/main/shroud-demo) | Shroud TEE proxy: health, Intents API, LLM routing |
| [shroud-llm](https://github.com/1clawAI/1claw-examples/tree/main/shroud-llm) | LLM Token Billing via Stripe AI Gateway |
| [tx-simulation](https://github.com/1clawAI/1claw-examples/tree/main/tx-simulation) | On-chain signing with guardrails + Tenderly simulation |
| [multi-chain-keys](https://github.com/1clawAI/1claw-examples/tree/main/multi-chain-keys) | HSM signing keys for 6 blockchains |
| [evm-signing](https://github.com/1clawAI/1claw-examples/tree/main/evm-signing) | EIP-191, EIP-712, and EIP-2718 transaction types |
| [agentic-tx](https://github.com/1clawAI/1claw-examples/tree/main/agentic-tx) | End-to-end fund → sign → broadcast with guardrails |
| [platform-connect](https://github.com/1clawAI/1claw-examples/tree/main/platform-connect) | Platform API bootstrap templates + user provisioning |
| [treasury-wallets](https://github.com/1clawAI/1claw-examples/tree/main/treasury-wallets) | Multi-chain treasury wallets, balances, send |
| [x402-payments](https://github.com/1clawAI/1claw-examples/tree/main/x402-payments) | Real x402 micropayments against 1Claw endpoints |
| [ampersend-x402](https://github.com/1clawAI/1claw-examples/tree/main/ampersend-x402) | Ampersend smart-account x402 + MCP/HTTP clients |
| [anthropic-wif](https://github.com/1clawAI/1claw-examples/tree/main/anthropic-wif) | OIDC federation → Anthropic Workload Identity |
| [non-evm-keys](https://github.com/1clawAI/1claw-examples/tree/main/non-evm-keys) | Non-EVM signing + broadcast (Bitcoin, Solana, XRP, Cardano, Tron) |
| [intents-quick](https://github.com/1clawAI/1claw-examples/tree/main/intents-quick) | Quick-start Intents API transaction signing |
| [intents-layers](https://github.com/1clawAI/1claw-examples/tree/main/intents-layers) | Layered Intents with guardrails and simulation |
| [multichain-agent](https://github.com/1clawAI/1claw-examples/tree/main/multichain-agent) | Chat UI: bootstrap + fund testnets + transact via Intents |
| [arc-stablecoin](https://github.com/1clawAI/1claw-examples/tree/main/arc-stablecoin) | USDC transfer on Arc Testnet (stablecoin-native L2) |
| [mpc-vault](https://github.com/1clawAI/1claw-examples/tree/main/mpc-vault) | MPC 2-of-2 and 2-of-3 vault flows |
| [bankr-key-vending](https://github.com/1clawAI/1claw-examples/tree/main/bankr-key-vending) | Dynamic short-lived Bankr key leasing |
| [payment-cards](https://github.com/1clawAI/1claw-examples/tree/main/payment-cards) | Order prepaid/gift cards via x402 |
| [execution-intents](https://github.com/1clawAI/1claw-examples/tree/main/execution-intents) | HTTP/GraphQL bindings with server-side credential injection |
| [automations](https://github.com/1clawAI/1claw-examples/tree/main/automations) | Schedule agents on cron or webhook triggers |
| [agent-memory](https://github.com/1clawAI/1claw-examples/tree/main/agent-memory) | Durable and scratch memory with TTL expiry |
| [cloud-runtime](https://github.com/1clawAI/1claw-examples/tree/main/cloud-runtime) | Deploy agents to managed cloud runtimes |
| [agent-discovery](https://github.com/1clawAI/1claw-examples/tree/main/agent-discovery) | Publish agents to the public directory |
| [google-a2a](https://github.com/1clawAI/1claw-examples/tree/main/google-a2a) | Multi-agent communication with vault credentials |
| [jwt-ttl-defense](https://github.com/1clawAI/1claw-examples/tree/main/jwt-ttl-defense) | Prompt-injection JWT theft contained by 3-second TTL |
| [shroud-security](https://github.com/1clawAI/1claw-examples/tree/main/shroud-security) | Shroud threat detection filters |
| [logos-chat](https://github.com/1clawAI/1claw-examples/tree/main/logos-chat) | E2E encrypted agent-to-agent chat over Logos/Waku |
| [local-inspect](https://github.com/1clawAI/1claw-examples/tree/main/local-inspect) | Detect threats in LLM output locally — no account needed |
| [python-sdk](https://github.com/1clawAI/1claw-examples/tree/main/python-sdk) | Python client: vault, secrets, billing, agent auth |

Full catalog and run instructions: [examples README](https://github.com/1clawAI/1claw-examples#readme). From the monorepo: `./examples/scripts/test-all-examples.sh`.

## OpenAPI types

The SDK’s TypeScript types are generated from the [OpenAPI 3.1 spec](https://www.npmjs.com/package/@1claw/openapi-spec). You can import raw generated types:

```ts
import type { paths, components, operations, ApiSchemas } from "@1claw/sdk";

type Vault = ApiSchemas["VaultResponse"];
type Agent = ApiSchemas["AgentResponse"];
```

To regenerate types after spec changes (when working from the monorepo): `npm run generate` in the SDK package.

## Human API (dashboard / server)

The dashboard uses **fetch** and **TanStack Query** with the same base URL and JWT. There is no separate "human" SDK package; use `@1claw/sdk` or fetch with the [Human API](/docs/human-api/overview) docs.

## Related

- [Python SDK](/docs/sdks/python) — official `oneclaw` package on PyPI
- [Go SDK](/docs/sdks/go)
- [SDKs overview](/docs/sdks/overview)
