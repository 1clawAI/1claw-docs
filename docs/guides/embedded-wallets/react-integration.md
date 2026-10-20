---
title: React Integration
description: Integrate @1claw/wallet-react OneclawEmbeddedWallet with theming, feature toggles, and headless useOneclawWallet().
sidebar_position: 7
---

# React Integration

[`@1claw/wallet-react`](https://www.npmjs.com/package/@1claw/wallet-react) provides drop-in React components for embedded wallets. Identify your app with its **platform app ID** (`appId`); end users sign in with Email OTP or social login and the widget holds their session. It handles Email OTP, social login, wallet provisioning, Send/Swap/Receive/Buy, spend policy errors, and session refresh.

**Source:** [github.com/1clawAI/wallet-react](https://github.com/1clawAI/wallet-react) (MIT)

For the full prop reference, see also [`@1claw/wallet-react` docs](/docs/treasury/wallet-react).

:::info Requirements
- React 18+
- Pro+ plan and a Platform App (its UUID is the widget's `appId`)
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
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";

export default function WalletPage() {
  return (
    <OneclawEmbeddedWallet
      appId={process.env.NEXT_PUBLIC_ONECLAW_APP_ID!}
      baseUrl="https://api.1claw.co"
      chains={["ethereum", "base", "solana"]}
      features={{ send: true, swap: true, receive: true, buy: true }}
      socialProviders={["google", "apple"]}
      socialProviderConfig={{ google: { clientId: GOOGLE_CLIENT_ID } }}
      theme="auto"
      onLogin={(user) => console.log("Logged in", user.userId)}
      onError={(err) => console.error(err)}
    />
  );
}
```

`OneclawEmbeddedWallet` renders its own `OneclawWalletProvider`, so it needs no wrapper. A social button only appears when `socialProviderConfig` carries that provider's client ID.

## Component props

### `OneclawWalletProvider`

Only needed for the headless hook; `OneclawEmbeddedWallet` creates its own.

| Prop | Required | Description |
| ---- | -------- | ----------- |
| `apiKey` | Yes | A user session token, or `""` to use the session the provider stores after `loginWithEmailOtp` / `loginWithSocial`. A `plt_` key is sent as the bearer token; never ship one in a browser bundle. |
| `appId` | No | Platform app UUID, sent as `platform_app_id` on Email OTP |
| `baseUrl` | No | API base (default `https://api.1claw.co`) |
| `persistSession` | No | `"session"` (default), `"local"`, or `false` |
| `children` | Yes | App tree |

### `OneclawEmbeddedWallet`

| Prop | Default | Description |
| ---- | ------- | ----------- |
| `appId` | Required | Platform app UUID |
| `baseUrl` | `https://api.1claw.co` | API base |
| `features` | `{ send: true, swap: true, buy: true, receive: true }` | Visible views |
| `socialProviders` | `["google", "apple"]` | `"google"`, `"apple"`, `"discord"`. Email OTP is always available and is **not** a member of this union; listing `"email"` is a type error. |
| `socialProviderConfig` | — | Client IDs (and redirect URIs for Apple/Discord); a provider without one is not shown |
| `chains` | `["ethereum"]` | Chains to auto-provision on first login |
| `theme` | `"auto"` | `"light"`, `"dark"`, `"auto"`, or a `ThemeConfig` object |
| `persistSession` | `"session"` | `"session"`, `"local"`, or `false` |
| `onLinkRequired` | Auto-redirect | Custom handler when existing 1Claw user must link orgs (409) |
| `onLogin` | — | Callback after successful auth, with `{ userId, email, walletAddress?, isNewUser, isPasswordless }` |
| `onTransactionSent` / `onSwapCompleted` | — | Callbacks after a send or swap |
| `onError` | — | Error callback |

### `OneclawTreasuryWidget`

Compact balance UI. Takes `apiKey`, `baseUrl`, `chains`, `theme`, `brandColor`, `className` and the `onError` / `onTransactionSent` / `onSwapCompleted` callbacks.

## Feature toggles

| Feature | User experience |
| ------- | ---------------- |
| `send` | Native + token transfers with step-up auth |
| `swap` | 0x DEX swap UI |
| `receive` | Address + QR per chain |
| `buy` | Fiat on-ramp partner widgets |

```tsx
<OneclawEmbeddedWallet appId={APP_ID} features={{ send: true, receive: true }} />
```

Omit `swap` and `buy` for send-only apps.

## Theming

Built-in modes:

```tsx
<OneclawEmbeddedWallet appId={APP_ID} theme="dark" />
```

Or a `ThemeConfig` object for brand colour, radius, font and raw CSS variables. Note the prefix is `--ocw-`, and raw variables go inside `cssVars`:

```tsx
<OneclawEmbeddedWallet
  appId={APP_ID}
  theme={{
    mode: "dark",
    brandColor: "#6366f1",
    borderRadius: "12px",
    fontFamily: "'Inter', sans-serif",
    cssVars: {
      "--ocw-bg": "#0f0f12",
      "--ocw-text": "#fafafa",
    },
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
    refreshWallets,
    refreshBalance,
    loginWithEmailOtp,
    loginWithSocial,
    client, // OneclawWalletClient: sendEmailOtp, sendWithPasskey, createOnrampSession, ...
  } = useOneclawWallet();

  return (
    <div>
      {wallets.map((w) => (
        <p key={w.chain}>
          {w.chain}: {w.address} — {balances[w.chain]?.native.balanceDisplay ?? "…"}
        </p>
      ))}
      <button onClick={() => refreshWallets()}>Refresh</button>
    </div>
  );
}
```

Must render inside `OneclawWalletProvider` (for example `<OneclawWalletProvider apiKey="" appId={APP_ID}>`). Sign in with `client.sendEmailOtp(email)` then `loginWithEmailOtp(email, code, chains)`.

### Who is signed in

`currentUser` is populated on login and rehydrated from the server when the
provider mounts, so it survives a reload and a change of page. You do not
need to cache the `onLogin` payload yourself.

```tsx
const { currentUser, getCurrentUser } = useOneclawWallet();

// currentUser: { userId, email, walletAddress?, isNewUser, isPasswordless } | null
if (!currentUser) return <SignIn />;
return <p>Signed in as {currentUser.email}</p>;
```

`getCurrentUser()` re-asks the server and returns `null` once the session is
no longer valid — useful before a sensitive action, where a cached copy
would happily report someone who has since been signed out.

### Showing spend limits before a send

```tsx
const { getEffectiveSpendPolicy } = useOneclawWallet();
const policy = await getEffectiveSpendPolicy();
// Response body: { policy: { max_value_per_tx_eth, daily_limit_eth, allowed_chains, ... } | null }
```

This is the same data as `client.treasuryWallets.getEffectiveSpendPolicy()`
in `@1claw/sdk`; it is on the hook too, because the widget flow does not
otherwise hold a raw SDK client.

### Calling a contract

`send` takes an optional `data` field — hex calldata, sent as the
transaction's input. That covers arbitrary contract calls without needing a
Safe:

```tsx
await send({
  chain: "ethereum",
  to: "0xContractAddress",
  valueWei: "0",
  data: "0xa9059cbb...", // e.g. an ERC-20 transfer, ABI-encoded by you
});
```

Encode the calldata yourself (viem's `encodeFunctionData`, ethers'
`Interface`). The same guardrails apply as to a plain send: recipient
allowlists, per-transaction and daily caps, and sanctions screening, which
decodes ERC-20 transfer recipients out of `data` rather than only reading
`to`.

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

When Email OTP verify or social login returns 409, pass `onLinkRequired`:

```tsx
<OneclawEmbeddedWallet
  appId={APP_ID}
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
| `NEXT_PUBLIC_ONECLAW_APP_ID` | Platform app UUID (naming varies by app) |
| `NEXT_PUBLIC_ONECLAW_BASE_URL` | API URL override |

Never expose human `1ck_`, agent `ocv_` or platform `plt_` keys in frontend bundles. The provider logs a security error for `1ck_` and `ocv_` keys.

## Next.js notes

- Mark wallet pages `"use client"`
- Load widget only on client if using SSR (dynamic import with `ssr: false` if needed)
- OAuth callback routes should run `handleSignInCallback` server-side or client-side with PKCE verifier from secure storage

## Related

- [Authentication](/docs/guides/embedded-wallets/authentication) — OTP, social, passkeys
- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — programmatic sends
- [Getting started](/docs/guides/embedded-wallets/getting-started) — platform setup
- [2-minute quickstart](/docs/treasury/embedded-wallets) — minimal SDK sample
