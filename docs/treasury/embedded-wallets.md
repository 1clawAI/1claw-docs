---
title: Embedded Wallets — 2-Minute Quickstart
description: Add crypto wallets to your app in under 2 minutes with email login.
sidebar_position: 16
---

# Embedded Wallets — 2-Minute Quickstart

Get your users a wallet with just an email address. No browser extensions, no seed phrases, no passwords.

## Prerequisites

- A 1Claw account with a **Pro+** plan
- A platform app (`plt_` API key) — [create one in the dashboard](https://1claw.co/platform)

## Install

```bash
npm install @1claw/sdk
```

## Email OTP flow

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.xyz" });

// 1. Send a login code
await client.auth.sendEmailOtp({ email: "user@example.com" });

// 2. Verify the code — returns JWT + provisions wallets
const { data } = await client.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
  auto_provision_chains: ["ethereum"],
});

client.http.setToken(data.token);

// 3. Send funds (requires password re-auth)
await client.treasuryWallets.sendFromWallet(
  "ethereum",
  { to: "0x...", amount: "0.01" },
  userPassword,
);
```

:::tip API response fields
Email OTP verify returns `token` (JWT), `is_new_user`, `user_id`, `org_id`, and optional `wallet_address`. Call `client.http.setToken(data.token)` before treasury calls.
:::

## React Widget (Even Simpler)

```bash
npm install @1claw/wallet-react
```

```tsx
import { OneclawWalletProvider, OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawWalletProvider apiKey="plt_..." baseUrl="https://api.1claw.xyz">
      <OneclawEmbeddedWallet
        chains={["ethereum", "base"]}
        features={["send", "swap", "receive", "buy"]}
        socialProviders={["google", "apple", "email"]}
      />
    </OneclawWalletProvider>
  );
}
```

## Spend Policies

Control what your users can do with their wallets:

```typescript
import { createClient } from "@1claw/sdk";

const platform = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.PLATFORM_KEY!, // plt_...
});

// App-wide defaults
await platform.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
  to_allowlist: ["0xYourContract..."],
});

// Per-user override
await platform.platform.setUserSpendPolicy(connectionId, {
  max_value_per_tx_eth: "0.5",
  daily_limit_eth: "5.0",
});
```

## Sign in with 1Claw (OAuth2)

```typescript
import { createClient, generatePKCE, buildAuthorizeUrl } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.xyz" });
const { codeVerifier, codeChallenge } = await generatePKCE();

const url = buildAuthorizeUrl("https://1claw.co", {
  clientId: "your-app-slug",
  redirectUri: "https://yourapp.com/callback",
  scopes: ["openid", "email"],
  codeChallenge,
  codeChallengeMethod: "S256",
  state: crypto.randomUUID(),
});

// After redirect back:
const { data } = await client.auth.exchangeOAuthCode({
  code: callbackCode,
  client_id: "your-app-slug",
  redirect_uri: "https://yourapp.com/callback",
  code_verifier: codeVerifier,
});
```

## What's Included

| Feature | Details |
|---------|---------|
| Email OTP login | Passwordless, 6-digit code, 5-min expiry |
| Social login | Google, Apple, Discord |
| Sign in with 1Claw | Full OAuth2 + PKCE |
| Multi-chain wallets | Ethereum, Bitcoin, Solana, XRP, Cardano, Tron |
| Gasless transactions | ERC-4337 sponsored gas (`gasless: true`) |
| Spend policies | Per-app defaults + per-user overrides |
| Passkey tx auth | WebAuthn for transaction signing |
| Fiat on/off ramps | Buy/sell crypto via partner widgets |

## Next Steps

- **[Embedded Wallets guide series](/docs/guides/embedded-wallets)** — full documentation
- [Platform API guide](/docs/platform-api/overview)
- [@1claw/wallet-react](/docs/treasury/wallet-react)
- [Security and custody](/docs/guides/embedded-wallets/security-and-custody)
- [Testing and production](/docs/guides/embedded-wallets/testing-production)
- [API reference](/docs/reference/api-reference)
