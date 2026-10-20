---
title: "@1claw/wallet-react"
description: Embeddable React treasury wallet components for third-party apps. Social login, Send, Swap, Receive, and Buy — all with spend policy enforcement.
sidebar_position: 15
---

# @1claw/wallet-react

Drop-in React components that give your users a full crypto wallet experience — email login, social login, Send, Swap, Receive, and Buy — identified by your platform app ID. The widget handles authentication, key management, and transaction signing; you handle the UI placement.

**Current version:** v0.7.1

**Source:** [github.com/1clawAI/wallet-react](https://github.com/1clawAI/wallet-react) (MIT)

---

## Install

```bash
npm install @1claw/wallet-react
# or
pnpm add @1claw/wallet-react
# or
yarn add @1claw/wallet-react
```

---

## Quick start

```tsx
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawEmbeddedWallet
      appId="your-platform-app-id"
      baseUrl="https://api.1claw.co"
      features={{ send: true, swap: true, receive: true, buy: true }}
      socialProviders={["google", "apple"]}
      socialProviderConfig={{ google: { clientId: "your-google-client-id" } }}
      chains={["ethereum", "base", "solana"]}
    />
  );
}
```

That's it. Users sign in via email OTP or social login, and get auto-provisioned multi-chain wallets. `OneclawEmbeddedWallet` renders its own `OneclawWalletProvider`, so it needs no wrapper. A social button only appears when `socialProviderConfig` carries that provider's client ID.

---

## Components

### `<OneclawWalletProvider>`

Context provider for the `useOneclawWallet()` hook. `OneclawEmbeddedWallet` and `OneclawTreasuryWidget` create their own.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | A user session token, or `""` to use the session the provider stores after `loginWithEmailOtp` / `loginWithSocial`. A `plt_` key is sent as the bearer token; never ship one in a browser bundle. |
| `appId` | `string` | No | Platform app UUID, sent as `platform_app_id` on Email OTP |
| `baseUrl` | `string` | No | API base URL (defaults to `https://api.1claw.co`) |
| `persistSession` | `"session" \| "local" \| false` | No | Where the session token is kept (default `"session"`) |
| `children` | `ReactNode` | Yes | Your app content |

### `<OneclawEmbeddedWallet>`

Full wallet UI with login, dashboard, and transaction views.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `appId` | `string` | Required | Platform app UUID |
| `baseUrl` | `string` | `https://api.1claw.co` | API base URL |
| `features` | `{ send?, swap?, buy?, receive? }` | all `true` | Which views to show |
| `socialProviders` | `("google" \| "apple" \| "discord")[]` | `["google", "apple"]` | Social logins to offer. Email OTP is always available and is **not** a member of this union. |
| `socialProviderConfig` | `{ google?, apple?, discord? }` | — | Client IDs (and redirect URIs for Apple and Discord); a provider without one is not shown |
| `chains` | `string[]` | `["ethereum"]` | Chains to provision wallets for |
| `theme` | `"light" \| "dark" \| "auto" \| ThemeConfig` | `"auto"` | Color scheme, or a `ThemeConfig` object for full theming (see [CSS theming](#css-theming)) |
| `persistSession` | `"session" \| "local" \| false` | `"session"` | Where the session token is kept |
| `onLinkRequired` | `(url, slug) => void` | Auto-redirect | Custom handler for cross-org users (v0.4.1+) |
| `onLogin` | `(user) => void` | — | Callback after successful login, with `{ userId, email, walletAddress?, isNewUser, isPasswordless }` |
| `onTransactionSent` / `onSwapCompleted` | `(result) => void` | — | Callbacks after a send or swap |
| `onError` | `(error) => void` | — | Callback on errors |

### `<OneclawTreasuryWidget>`

Compact widget showing wallet balances and quick actions. Takes `apiKey`, `baseUrl`, `chains`, `theme`, `brandColor`, `className` and the `onError` / `onTransactionSent` / `onSwapCompleted` callbacks.

---

## Hook: `useOneclawWallet()`

For programmatic access without the full widget UI. Render it inside `<OneclawWalletProvider apiKey="" appId={APP_ID}>`.

```tsx
import { useOneclawWallet } from "@1claw/wallet-react";

function MyComponent() {
  const { wallets, balances, send, refreshWallets } = useOneclawWallet();

  const handleSend = async () => {
    await send({
      chain: "ethereum",
      to: "0x...",
      valueWei: "10000000000000000", // 0.01 ETH
    });
  };

  return (
    <div>
      {wallets.map((w) => (
        <div key={w.chain}>
          {w.chain}: {w.address} — {balances[w.chain]?.native.balanceDisplay ?? "loading..."}
        </div>
      ))}
      <button onClick={handleSend}>Send 0.01 ETH</button>
      <button onClick={() => refreshWallets()}>Refresh</button>
    </div>
  );
}
```

### Return value

| Field | Type | Description |
| --- | --- | --- |
| `wallets` | `WalletInfo[]` | Provisioned wallets with `id`, `chain`, `address`, `publicKeyHex`, `isActive`, `createdAt`, `custody` |
| `balances` | `Record<string, WalletBalance>` | Per-chain `native` (`symbol`, `balanceWei`, `balanceDisplay`) and `tokens` |
| `send(params)` | `(SendTransactionParams) => Promise<SendTransactionResult>` | Send a native or contract call (`chain`, `to`, `valueWei`, optional `data`, `password`, `passkeyToken`, `gasless`) |
| `swap(params)` | `(SwapParams) => Promise<SwapResult>` | Swap tokens via 0x DEX aggregator |
| `refreshWallets()` / `refreshBalance(chain)` | `() => Promise<…>` | Reload wallets, or one chain's balance |
| `generateWallets(chains?)` | `(string[]?) => Promise<WalletInfo[]>` | Create wallets for more chains |
| `loginWithEmailOtp` / `loginWithSocial` / `logout` | | Sign the user in or out |
| `currentUser` / `getCurrentUser()` | | Who is signed in |
| `getEffectiveSpendPolicy()` / `getEffectiveAuthPolicy()` | | Limits and step-up rules in force |
| `client` | `OneclawWalletClient` | Lower-level client (`sendEmailOtp`, `sendWithPasskey`, `createOnrampSession`, …) |

---

## Authentication flows

The widget handles login automatically. Supported methods:

| Method | How it works |
| --- | --- |
| **Email OTP** | 6-digit code sent to the user's email. No password. |
| **Google** | Google ID token verified server-side. |
| **Apple** | Apple ID token verified server-side. |
| **Discord** | OAuth authorization code exchanged server-side. |

On first login, wallets are auto-provisioned for the specified `chains`. Subsequent logins re-use existing wallets.

### Programmatic auth

```tsx
import { useOneclawWallet } from "@1claw/wallet-react";

const { client, loginWithEmailOtp, loginWithSocial } = useOneclawWallet();

// Email OTP
await client.sendEmailOtp("user@example.com");
await loginWithEmailOtp("user@example.com", "123456", ["ethereum", "solana"]);

// Social login
await loginWithSocial("google", googleIdToken, ["ethereum"]);
```

---

## Handling existing 1Claw users (cross-org linking)

When a user who already has a 1Claw account (in a different organization) tries to sign in through your app, the API returns a `409` response with a consent URL. The widget handles this automatically as of `v0.4.1` — the user is redirected to a consent page where they approve the connection, then redirected back to your app.

### Default behavior

No code needed. The widget detects the 409, extracts the `authorize_url`, and redirects. After the user approves on the 1Claw consent page, they're sent back to your `redirect_uri`.

### Custom handling

If you want to show a custom UI instead of a raw redirect (e.g., an in-app modal), use the `onLinkRequired` prop:

```tsx
<OneclawEmbeddedWallet
  appId={APP_ID}
  onLinkRequired={(authorizeUrl, appSlug) => {
    // Custom modal, or:
    window.location.href = authorizeUrl;
  }}
/>
```

### Using the client directly

If you're building a custom UI with `OneclawWalletClient`, catch the `LinkRequiredError`:

```typescript
import { OneclawWalletClient, LinkRequiredError } from "@1claw/wallet-react";

try {
  await client.verifyEmailOtp(email, code, ["ethereum"]);
} catch (err) {
  if (err instanceof LinkRequiredError) {
    // err.authorizeUrl — the consent page URL
    // err.appSlug — your app's slug
    window.location.href = err.authorizeUrl;
    return;
  }
  throw err;
}
```

### What the user sees

The consent page shows your app name, the permissions requested, and Approve/Deny buttons. After approval, the user's existing 1Claw wallet is connected to your app — no new wallet is created.

---

## Spend policies

Platform developers control what users can do with their wallets via spend policies. Policies are enforced server-side before signing.

```typescript
// Set app-wide defaults (server-side, with @1claw/sdk and your plt_ key)
const platformClient = createClient({ baseUrl: "https://api.1claw.co", token: process.env.PLATFORM_KEY! });
await platformClient.platform.createSpendPolicy(appId, {
  max_value_per_tx_eth: "0.1",
  daily_limit_eth: "1.0",
  allowed_chains: ["ethereum", "base"],
  max_transactions_per_day: 50,
});
```

Users see a clear error if a transaction violates a policy — the widget never attempts to sign a blocked transaction.

---

## Passkey transaction authorization

For high-value sends, require WebAuthn passkey confirmation instead of (or in addition to) a password:

```tsx
const { send } = useOneclawWallet();

// With no password, send() reads the user's auth policy. When it requires a
// passkey, it runs the challenge, the WebAuthn assertion and the send for you.
await send({
  chain: "ethereum",
  to: "0x...",
  valueWei: "1000000000000000000", // 1 ETH
});
```

To drive the steps yourself, use `client.treasurySendTxDigest`, `client.beginPasskeyTxAuth`, `client.completePasskeyTxAuth`, then `client.sendWithPasskey({ ..., passkeyToken })`.

The passkey proof binds to the specific transaction parameters (chain, to, value) — it cannot be replayed for a different transaction.

---

## Gasless transactions

When connected to an EVM chain with Pimlico configured, pass `gasless: true` to wrap the send as an ERC-4337 UserOperation with sponsored gas:

```tsx
await send({
  chain: "ethereum",
  to: "0x...",
  valueWei: "10000000000000000",
  gasless: true,
});
```

The user pays no gas; the paymaster covers it.

---

## Fiat on-ramps

The `"buy"` feature integrates partner widgets (Coinbase Onramp, MoonPay) so users can purchase crypto directly into their wallet:

```tsx
<OneclawEmbeddedWallet appId={APP_ID} features={{ send: true, receive: true, buy: true }} />
```

No additional configuration needed — the widget handles widget URLs and callbacks.

---

## Configuration

| Environment variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ONECLAW_APP_ID` | Your platform app UUID (the widget's `appId`) |
| `NEXT_PUBLIC_ONECLAW_BASE_URL` | API base URL (default: `https://api.1claw.co`) |

---

## Prerequisites

- A 1Claw account with a **Pro or higher** plan
- A Platform App (its UUID is the widget's `appId`) — [create one in the dashboard](/docs/platform-api/overview)
- React 18+ and a bundler (Next.js, Vite, etc.)

---

## "Sign in with 1Claw" (OAuth)

The package also exports a `<SignInWith1Claw>` button component and a `handleSignInCallback()` helper for implementing OAuth 2.0 + PKCE sign-in flows:

```tsx
import { SignInWith1Claw, handleSignInCallback } from "@1claw/wallet-react";

// Login page
<SignInWith1Claw
  clientId="your-app-slug"
  redirectUri="http://localhost:3000/callback"
  scopes={["openid", "profile", "email"]}
  theme="dark"
/>

// Callback page
const params = new URLSearchParams(window.location.search);
const tokens = await handleSignInCallback({
  code: params.get("code")!,
  state: params.get("state")!,
  clientId: "your-app-slug",
  redirectUri: "http://localhost:3000/callback",
});
// tokens.id_token contains sub, email, name, wallet_address
```

See the [sign-in-with-1claw example](https://github.com/1clawAI/1claw/tree/main/examples/sign-in-with-1claw) for a complete working demo (plain HTML, no build step).

---

## CSS Theming

The `theme` prop accepts either the string union or a `ThemeConfig` object.
Raw CSS variables go inside `cssVars`, and the prefix is `--ocw-`:

```tsx
<OneclawEmbeddedWallet
  appId={APP_ID}
  theme={{
    mode: "dark",
    brandColor: "#e94560",
    borderRadius: "12px",
    fontFamily: "'Inter', sans-serif",
    cssVars: {
      "--ocw-bg": "#1a1a2e",
      "--ocw-text": "#eaeaea",
    },
  }}
/>
```

String values `"light"`, `"dark"` and `"auto"` still work. (`"system"` is not
a member of the union — use `"auto"`.) When an object is passed, its values
are applied to the widget root element, overriding the built-in theme.

---

## Toast Notifications

The widget includes a built-in toast notification system (v0.5.0+) that surfaces transaction status updates:

- **Transaction submitted** — shown when a send or swap is broadcast
- **Transaction confirmed** — shown on confirmation
- **Transaction failed** — shown with an error summary on failure
- **Policy violation** — shown when a spend policy blocks a transaction

Toasts appear inside the widget container and auto-dismiss after 5 seconds. No configuration is required.

---

## Skeleton Loading States

Wallet and balance components render skeleton placeholders (v0.5.0+) while data is loading, replacing the previous spinner. This provides a smoother perceived loading experience, especially on initial login when wallets are being provisioned.

---

## Auth Bug Fixes (v0.5.0)

This release includes 8 authentication and session management fixes:

1. **Token refresh race** — concurrent requests no longer trigger duplicate refresh calls
2. **Social login popup handling** — improved popup lifecycle for Google/Apple/Discord
3. **Cross-origin message validation** — stricter `postMessage` origin checks
4. **Email OTP retry logic** — resend button respects server-side cooldown
5. **Passkey credential caching** — credentials are cached per-session to avoid redundant assertions
6. **Session expiry redirect** — expired sessions redirect to login instead of showing a blank state
7. **PKCE state cleanup** — stale PKCE state is cleared after completion or timeout
8. **Consent page deep-link** — OAuth consent redirects preserve the original app context

---

## Further reading

- [Embedded Wallets Quickstart](/docs/treasury/embedded-wallets) — the 2-minute version
- [Embedded Wallets guide](/docs/guides/embedded-wallets) — full integrator series
- [Platform API](/docs/platform-api/overview) — full platform developer documentation
- [Treasury Wallets](/docs/treasury/overview) — the underlying treasury wallet system
- [GitHub: @1claw/wallet-react](https://github.com/1clawAI/wallet-react) — source code and README
