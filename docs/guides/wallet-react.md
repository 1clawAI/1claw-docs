---
title: "@1claw/wallet-react"
description: Embeddable React treasury wallet components for third-party apps. Social login, Send, Swap, Receive, and Buy — all with spend policy enforcement.
sidebar_position: 15
---

# @1claw/wallet-react

Drop-in React components that give your users a full crypto wallet experience — email login, social login, Send, Swap, Receive, and Buy — authenticated via your Platform API key. The widget handles authentication, key management, and transaction signing; you handle the UI placement.

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
import { OneclawWalletProvider, OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawWalletProvider apiKey="plt_..." baseUrl="https://api.1claw.xyz">
      <OneclawEmbeddedWallet
        features={["send", "swap", "receive", "buy"]}
        socialProviders={["google", "apple", "email"]}
        chains={["ethereum", "base", "solana"]}
      />
    </OneclawWalletProvider>
  );
}
```

That's it. Users sign in via email OTP or social login, and get auto-provisioned multi-chain wallets.

---

## Components

### `<OneclawWalletProvider>`

Context provider that wraps your app. Must be an ancestor of any wallet component or hook.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | Your Platform API key (`plt_...`) |
| `baseUrl` | `string` | No | API base URL (defaults to `https://api.1claw.xyz`) |
| `children` | `ReactNode` | Yes | Your app content |

### `<OneclawEmbeddedWallet>`

Full wallet UI with login, dashboard, and transaction views.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `features` | `string[]` | `["send", "swap", "receive", "buy"]` | Which views to show |
| `socialProviders` | `string[]` | `["email"]` | Login methods: `"email"`, `"google"`, `"apple"`, `"discord"` |
| `chains` | `string[]` | `["ethereum"]` | Chains to provision wallets for |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Color scheme |

### `<OneclawTreasuryWidget>`

Compact widget showing wallet balances and quick actions. Same props as `OneclawEmbeddedWallet`.

---

## Hook: `useOneclawWallet()`

For programmatic access without the full widget UI.

```tsx
import { useOneclawWallet } from "@1claw/wallet-react";

function MyComponent() {
  const { wallets, balances, send, swap, refresh } = useOneclawWallet();

  const handleSend = async () => {
    await send({
      chain: "ethereum",
      to: "0x...",
      amount: "0.01",
    });
  };

  return (
    <div>
      {wallets.map((w) => (
        <div key={w.chain}>
          {w.chain}: {w.address} — {balances[w.chain]?.native ?? "loading..."}
        </div>
      ))}
      <button onClick={handleSend}>Send 0.01 ETH</button>
    </div>
  );
}
```

### Return value

| Field | Type | Description |
| --- | --- | --- |
| `wallets` | `Wallet[]` | Array of provisioned wallets with `chain`, `address`, `publicKey` |
| `balances` | `Record<string, Balance>` | Per-chain native + token balances (auto-refreshes every 30s) |
| `send(params)` | `(SendParams) => Promise<SendResult>` | Send native or token transfer |
| `swap(params)` | `(SwapParams) => Promise<SwapResult>` | Swap tokens via 0x DEX aggregator |
| `refresh()` | `() => Promise<void>` | Force-refresh balances |

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

const { socialLogin, sendEmailOtp, verifyEmailOtp } = useOneclawWallet();

// Email OTP
await sendEmailOtp("user@example.com");
await verifyEmailOtp("user@example.com", "123456", ["ethereum", "solana"]);

// Social login
await socialLogin({ provider: "google", id_token: googleIdToken });
```

---

## Spend policies

Platform developers control what users can do with their wallets via spend policies. Policies are enforced server-side before signing.

```typescript
// Set app-wide defaults (server-side, using your plt_ key)
await platformClient.createSpendPolicy(appId, {
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
const { beginPasskeyTxAuth, completePasskeyTxAuth, sendWithPasskey } = useOneclawWallet();

// Full flow: passkey challenge → sign → send
await sendWithPasskey({
  chain: "ethereum",
  to: "0x...",
  amount: "1.0",
});
```

The passkey proof binds to the specific transaction parameters (chain, to, value) — it cannot be replayed for a different transaction.

---

## Gasless transactions

When connected to an EVM chain with Pimlico configured, pass `gasless: true` to wrap the send as an ERC-4337 UserOperation with sponsored gas:

```tsx
await send({
  chain: "ethereum",
  to: "0x...",
  amount: "0.01",
  gasless: true,
});
```

The user pays no gas; the paymaster covers it.

---

## Fiat on-ramps

The `"buy"` feature integrates partner widgets (Coinbase Onramp, MoonPay) so users can purchase crypto directly into their wallet:

```tsx
<OneclawEmbeddedWallet features={["send", "receive", "buy"]} />
```

No additional configuration needed — the widget handles widget URLs and callbacks.

---

## Configuration

| Environment variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ONECLAW_API_KEY` | Your `plt_` Platform API key |
| `NEXT_PUBLIC_ONECLAW_BASE_URL` | API base URL (default: `https://api.1claw.xyz`) |

---

## Prerequisites

- A 1Claw account with a **Pro or higher** plan
- A Platform App (`plt_` API key) — [create one in the dashboard](/docs/guides/platform-api)
- React 18+ and a bundler (Next.js, Vite, etc.)

---

## Further reading

- [Embedded Wallets Quickstart](/docs/guides/embedded-wallets-quickstart) — the 2-minute version
- [Platform API](/docs/guides/platform-api) — full platform developer documentation
- [Treasury Wallets](/docs/guides/treasury) — the underlying treasury wallet system
- [GitHub: @1claw/wallet-react](https://github.com/1clawAI/wallet-react) — source code and README
