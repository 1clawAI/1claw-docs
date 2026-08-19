---
title: Fiat On and Off Ramps
description: Coinbase Onramp and MoonPay widget integration for embedded wallet buy and sell flows.
sidebar_position: 9
---

# Fiat On and Off Ramps

Embedded wallet users can buy crypto with fiat (on-ramp) or sell to fiat (off-ramp) through partner widgets. KYC and payment processing are delegated to the partner — 1Claw returns widget URLs that pre-fill the user's treasury wallet as the destination.

:::info Configuration
Operators configure partner credentials on Vault:
- `COINBASE_ONRAMP_APP_ID` — Coinbase Onramp
- `MOONPAY_API_KEY` — MoonPay widget
- `MOONPAY_SECRET_KEY` — MoonPay webhook signature verification (required in production)
:::

## On-ramp session

Creates a partner widget URL targeting the user's treasury wallet address.

```typescript
const { data } = await client.fiat.createOnrampSession({
  chain: "ethereum",
  asset: "USDC", // optional
  amount_usd: "100.00", // optional
  destination_address: "0x...", // optional; defaults to user's treasury wallet
});

window.open(data.session_url, "_blank");
// data.provider — coinbase | moonpay
// data.destination_address, data.chain, data.asset
```

```bash
curl -X POST "https://api.1claw.xyz/v1/fiat/onramp/session" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "asset": "USDC",
    "amount_usd": "50.00"
  }'
```

Human-only endpoint — agents receive **403**.

## Off-ramp

Initiate a sell flow widget:

```typescript
const { data } = await client.fiat.initiateOfframp({
  chain: "ethereum",
  asset: "ETH",
  amount: "0.5",
  source_address: "0x...", // optional; defaults to treasury wallet
});

window.location.href = data.widget_url;
// data.id, data.provider, data.status
```

```bash
curl -X POST "https://api.1claw.xyz/v1/fiat/offramp/initiate" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "asset": "ETH",
    "amount": "0.25"
  }'
```

## React widget

Enable the **Buy** feature — no extra partner config in your frontend:

```tsx
<OneclawEmbeddedWallet features={["send", "receive", "buy"]} />
```

Programmatic:

```typescript
const { createOnrampSession } = useOneclawWallet();
const session = await createOnrampSession({ chain: "ethereum", amount_usd: "100" });
```

## Webhooks

Partner completion events hit the public webhook receiver:

`POST /v1/fiat/webhooks`

- MoonPay: `Moonpay-Signature-V2` header verified when secret configured
- **Production:** unsigned JSON rejected when `hsm_provider=gcp`

Use webhooks to update your app UI when a purchase completes; on-chain arrival may also fire `wallet.transfer.received` if deposit monitoring is enabled.

## Spend policies

On-ramp purchases credit the user's wallet; subsequent **sends** still obey [spend policies](/docs/guides/embedded-wallets/spend-policies). On-ramp itself is not gated by spend policy — configure partner limits in Coinbase/MoonPay dashboards.

## Supported assets and chains

Partner support varies by region and asset. Typical embedded-wallet flows target:

- **EVM:** ETH, USDC on Ethereum, Base, and other configured L2s
- Session API accepts `chain` by registry name (`ethereum`, `base`, …)

Check partner docs for geographic availability.

## Related

- [Multi-chain wallets](/docs/guides/embedded-wallets/multi-chain-wallets) — receive addresses
- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — after on-ramp
- [React integration](/docs/guides/embedded-wallets/react-integration) — `buy` feature toggle
- [Treasury overview](/docs/treasury/overview) — wallet generation
