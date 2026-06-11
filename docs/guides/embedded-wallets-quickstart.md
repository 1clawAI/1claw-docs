---
title: Embedded Wallets — 2-Minute Quickstart
description: Add crypto wallets to your app in under 2 minutes with email login.
---

# Embedded Wallets — 2-Minute Quickstart

Get your users a wallet with just an email address. No browser extensions, no seed phrases, no passwords.

## Prerequisites

- A 1Claw account with a Pro+ plan
- A platform app (`plt_` API key) — [create one in the dashboard](https://app.1claw.xyz/platform)

## Install

```bash
npm install @1claw/sdk
```

## 5 Lines to a Wallet

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.xyz", apiKey: "plt_..." });

// 1. Send a login code to the user's email
await client.auth.sendEmailOtp({ email: "user@example.com" });

// 2. User enters the 6-digit code they received
const { token, wallet_address } = await client.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
  auto_provision_chains: ["ethereum"],
});

// 3. That's it — they have a wallet. Send funds:
await client.treasuryWallets.sendFromWallet("ethereum", {
  to: "0x...",
  amount: "0.01",
}, password);
```

## React Widget (Even Simpler)

```bash
npm install @1claw/wallet-react
```

```tsx
import { OneclawWalletProvider, OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawWalletProvider apiKey="plt_..." chains={["ethereum", "base"]}>
      <OneclawEmbeddedWallet
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
// Set app-wide defaults
await client.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
  to_allowlist: ["0xYourContract..."],
});

// Override for a specific user
await client.platform.setUserSpendPolicy(connectionId, {
  max_value_per_tx_eth: "0.5",
  daily_limit_eth: "5.0",
});
```

## Sign in with 1Claw (OAuth2)

Let users sign in with their existing 1Claw account:

```typescript
// Redirect user to 1Claw login
const authorizeUrl = "https://1claw.xyz/oauth/authorize?" + new URLSearchParams({
  client_id: "your-app-slug",
  redirect_uri: "https://yourapp.com/callback",
  response_type: "code",
  scope: "openid email wallet",
  code_challenge: challenge,
  code_challenge_method: "S256",
});
window.location.href = authorizeUrl;

// In your callback handler:
const { access_token, id_token } = await client.auth.exchangeOAuthCode({
  code: searchParams.get("code"),
  client_id: "your-app-slug",
  redirect_uri: "https://yourapp.com/callback",
  code_verifier: storedVerifier,
});
```

## What's Included

| Feature | Details |
|---------|---------|
| Email OTP login | Passwordless, 6-digit code, 5-min expiry |
| Social login | Google, Apple, Discord |
| Sign in with 1Claw | Full OAuth2 + PKCE |
| Multi-chain wallets | Ethereum, Bitcoin, Solana, XRP, Cardano, Tron |
| Gasless transactions | ERC-4337 sponsored gas |
| Spend policies | Per-app defaults + per-user overrides |
| Passkey tx auth | WebAuthn for transaction signing |
| Fiat on/off ramps | Buy/sell crypto via partner widgets |

## Next Steps

- [Platform API docs](/docs/reference/api-reference) — full API reference
- [OpenAPI spec](https://github.com/1clawAI/1claw/tree/main/packages/openapi-spec) — OpenAPI 3.1 specification
- [wallet-react README](https://github.com/1clawAI/wallet-react) — React component docs
