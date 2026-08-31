---
title: React Integration
description: Integrate @1claw/wallet-react OneclawEmbeddedWallet with theming, feature toggles, and headless useOneclawWallet().
sidebar_position: 7
---

# React Integration

[`@1claw/wallet-react`](https://www.npmjs.com/package/@1claw/wallet-react) provides drop-in React components for embedded wallets. Authenticate with your **`plt_`** Platform API key; the widget handles Email OTP, social login, wallet provisioning, Send/Swap/Receive/Buy, spend policy errors, and session refresh.

**Source:** [github.com/1clawAI/wallet-react](https://github.com/1clawAI/wallet-react) (MIT)

For the full prop reference, see also [`@1claw/wallet-react` docs](/docs/treasury/wallet-react).

:::info Requirements
- React 18+
- Pro+ plan and Platform App (`plt_` key)
- Bundler with ESM support (Next.js, Vite, etc.)
:::

## Install

```bash
npm install @1claw/wallet-react
# or
pnpm add @1claw/wallet-react
```

## Full widget

```tsx
import {
  OneclawWalletProvider,
  OneclawEmbeddedWallet,
} from "@1claw/wallet-react";

export default function WalletPage() {
  return (
    <OneclawWalletProvider
      apiKey={process.env.NEXT_PUBLIC_ONECLAW_PLATFORM_KEY!}
      baseUrl="https://api.1claw.co"
    >
      <OneclawEmbeddedWallet
        chains={["ethereum", "base", "solana"]}
        features={["send", "swap", "receive", "buy"]}
        socialProviders={["email", "google", "apple", "discord"]}
        theme="system"
        onLogin={(user) => console.log("Logged in", user.user_id)}
        onError={(err) => console.error(err)}
      />
    </OneclawWalletProvider>
  );
}
```

## Component props

### `OneclawWalletProvider`

| Prop | Required | Description |
| ---- | -------- | ----------- |
| `apiKey` | Yes | Platform API key (`plt_...`) |
| `baseUrl` | No | API base (default `https://api.1claw.co`) |
| `children` | Yes | App tree |

### `OneclawEmbeddedWallet`

| Prop | Default | Description |
| ---- | ------- | ----------- |
| `features` | `["send","swap","receive","buy"]` | Visible views |
| `socialProviders` | `["email"]` | `"email"`, `"google"`, `"apple"`, `"discord"` |
| `chains` | `["ethereum"]` | Chains to auto-provision on first login |
| `theme` | `"system"` | `"light"`, `"dark"`, `"system"`, or CSS custom properties object |
| `onLinkRequired` | Auto-redirect | Custom handler when existing 1Claw user must link orgs (409) |
| `onLogin` | — | Callback after successful auth |
| `onError` | — | Error callback |

### `OneclawTreasuryWidget`

Compact balance + quick actions UI. Accepts the same props as `OneclawEmbeddedWallet`.

## Feature toggles

| Feature | User experience |
| ------- | ---------------- |
| `send` | Native + token transfers with step-up auth |
| `swap` | 0x DEX swap UI |
| `receive` | Address + QR per chain |
| `buy` | Fiat on-ramp partner widgets |

```tsx
<OneclawEmbeddedWallet features={["send", "receive"]} />
```

Omit `swap` and `buy` for send-only apps.

## Theming

Built-in modes:

```tsx
<OneclawEmbeddedWallet theme="dark" />
```

Custom CSS properties (v0.5.0+):

```tsx
<OneclawEmbeddedWallet
  theme={{
    "--wallet-bg": "#0f0f12",
    "--wallet-text": "#fafafa",
    "--wallet-primary": "#6366f1",
    "--wallet-border-radius": "12px",
    "--wallet-font-family": "'Inter', sans-serif",
  }}
/>
```

Properties apply to the widget root element.

## Headless: `useOneclawWallet()`

Build your own UI while reusing auth and treasury calls:

```tsx
import { useOneclawWallet } from "@1claw/wallet-react";

function CustomWallet() {
  const {
    wallets,
    balances,
    send,
    swap,
    sendWithPasskey,
    refresh,
    sendEmailOtp,
    verifyEmailOtp,
    socialLogin,
    createOnrampSession,
  } = useOneclawWallet();

  return (
    <div>
      {wallets.map((w) => (
        <p key={w.chain}>
          {w.chain}: {w.address} — {balances[w.chain]?.native ?? "…"}
        </p>
      ))}
      <button onClick={() => refresh()}>Refresh</button>
    </div>
  );
}
```

Must render inside `OneclawWalletProvider`.

## Sign in with 1Claw button

OAuth without the full wallet chrome:

```tsx
import { SignInWith1Claw, handleSignInCallback } from "@1claw/wallet-react";

// Login page
<SignInWith1Claw
  clientId="my-wallet-app"
  redirectUri="https://yourapp.com/callback"
  scopes={["openid", "profile", "email"]}
/>

// Callback route
const tokens = await handleSignInCallback({
  code: searchParams.get("code")!,
  state: searchParams.get("state")!,
  clientId: "my-wallet-app",
  redirectUri: "https://yourapp.com/callback",
});
```

Example app: [sign-in-with-1claw](https://github.com/1clawAI/1claw/tree/main/examples/sign-in-with-1claw).

## Cross-org linking

When `verifyEmailOtp` or social login returns 409, pass `onLinkRequired`:

```tsx
<OneclawEmbeddedWallet
  onLinkRequired={(authorizeUrl, appSlug) => {
    // Custom modal, or:
    window.location.href = authorizeUrl;
  }}
/>
```

## UX built-ins (v0.5.0+)

- **Toast notifications** — submit, confirm, fail, policy violation
- **Skeleton loading** — wallets and balances while provisioning
- **Session expiry** — redirects to login instead of blank state

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_ONECLAW_API_KEY` | `plt_` key (naming varies by app) |
| `NEXT_PUBLIC_ONECLAW_BASE_URL` | API URL override |

Never expose human `1ck_` keys in frontend bundles — use **`plt_`** only.

## Next.js notes

- Mark wallet pages `"use client"`
- Load widget only on client if using SSR (dynamic import with `ssr: false` if needed)
- OAuth callback routes should run `handleSignInCallback` server-side or client-side with PKCE verifier from secure storage

## Related

- [Authentication](/docs/guides/embedded-wallets/authentication) — OTP, social, passkeys
- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — programmatic sends
- [Getting started](/docs/guides/embedded-wallets/getting-started) — platform setup
- [2-minute quickstart](/docs/treasury/embedded-wallets) — minimal SDK sample
