---
title: JavaScript / TypeScript SDK
description: "@1claw/sdk provides full API parity — vaults, secrets, sharing, agents, billing, auth, and MCP tool integration."
sidebar_position: 1
---

# JavaScript / TypeScript SDK

The official TypeScript SDK provides full API parity with the 1Claw REST API. It supports both human and agent workflows, x402 auto-payment, and an MCP tool layer for AI agents.

**Repository:** [github.com/1clawAI/1claw-sdk](https://github.com/1clawAI/1claw-sdk)

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

| Module             | Methods                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `client.auth`      | `login()`, `signup()`, `agentToken()`, `apiKeyToken()`, `google()`, `changePassword()`, `logout()` |
| `client.vault`     | `create()`, `list()`, `get()`, `delete()`                                                          |
| `client.secrets`   | `set()`, `get()`, `list()`, `delete()`, `rotate()`                                                 |
| `client.access`    | `grantHuman()`, `grantAgent()`, `update()`, `revoke()`, `listGrants()`                             |
| `client.agents`    | `create()`, `list()`, `get()`, `update()`, `delete()`, `rotateKey()`                               |
| `client.sharing`   | `create()`, `access()`, `revoke()`                                                                 |
| `client.approvals` | `request()`, `list()`, `approve()`, `deny()`, `check()`                                            |
| `client.apiKeys`   | `create()`, `list()`, `revoke()`                                                                   |
| `client.billing`   | `usage()`, `history()`                                                                             |
| `client.audit`     | `query()`                                                                                          |
| `client.org`       | `listMembers()`, `updateMemberRole()`, `removeMember()`                                            |
| `client.x402`      | `getPaymentRequirement()`, `pay()`, `verifyReceipt()`, `withPayment()`                             |

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

See the [examples repository](https://github.com/1clawAI/1claw-examples) for runnable demos:

- **basic/** — Vault CRUD, secrets, billing, signup, email-based sharing
- **nextjs-agent-secret/** — AI agent with Claude accessing vault secrets via MCP tools

## Human API (dashboard / server)

The dashboard uses **fetch** and **TanStack Query** with the same base URL and JWT. There is no separate "human" SDK package; use `@1claw/sdk` or fetch with the [Human API](/docs/human-api/overview) docs.
