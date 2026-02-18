---
title: JavaScript / TypeScript SDK
description: Use @1claw/sdk to authenticate as an agent and fetch secrets; the SDK handles JWT exchange and optional x402 payment errors.
sidebar_position: 1
---

# JavaScript / TypeScript SDK

The official SDK lives in the monorepo at `packages/sdk` and is published as **@1claw/sdk**. It is aimed at **agent** use: authenticate with agent ID and API key, then fetch secrets.

## Install

```bash
npm install @1claw/sdk
# or
pnpm add @1claw/sdk
```

## Configuration

```ts
import { OneClawClient } from "@1claw/sdk";

const client = new OneClawClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
  maxPaymentPerRequest: 1.0, // optional; for x402 payment safety
});
```

## Authenticate (agent)

```ts
await client.authenticate(process.env.ONECLAW_AGENT_ID!);
// SDK stores the JWT and uses it for subsequent requests
```

This calls `POST /v1/auth/agent-token` and stores the returned `access_token`.

## Fetch a secret

After authentication, use the client to fetch a secret by vault ID and path. The SDK uses the stored JWT and handles 402 (payment required) according to config; wallet-based x402 may not be implemented yet.

```ts
const vaultId = "ae370174-9aee-4b02-ba7c-d1519930c709";
const secret = await client.getSecret(vaultId, "api-keys/openai");
console.log(secret.value); // use securely; don't log
```

## Types

Exported types include `OneClawConfig`, `SecretResponse`, `VaultResponse`, `ShareOptions`, and `PaymentRequired`. See `packages/sdk/src/types.ts` in the repo.

## Human API (dashboard / server)

The dashboard uses **fetch** and **TanStack Query** with the same base URL and JWT from login (email/password or Google). There is no separate “human” SDK package; use fetch or your own client with the [Human API](/docs/human-api/overview) and [Authentication](/docs/human-api/authentication) docs.
