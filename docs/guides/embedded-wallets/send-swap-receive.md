---
title: Send, Swap, and Receive
description: Native and token transfers, 0x DEX swaps, gasless ERC-4337 sends, and passkey transaction authorization for embedded wallets.
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Send, Swap, and Receive

Embedded wallet users move funds through treasury wallet endpoints. Every send and swap runs **`validate_wallet_send()`** against effective [spend policies](/docs/guides/embedded-wallets/spend-policies) before signing. Step-up authentication is required: account password (`X-Auth-Confirm`) or [passkey tx token](/docs/guides/embedded-wallets/authentication#passkey-transaction-authorization).

:::info Human-only
These endpoints reject agent JWTs with **403**. Your backend should call them with the **end-user's** JWT, or use the React widget which holds the user session.
:::

## Send native currency

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.treasuryWallets.sendFromWallet(
  "ethereum",
  {
    to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    amount: "0.01", // major units (ETH, SOL, BTC, …)
  },
  userPassword, // X-Auth-Confirm
);

console.log(data.tx_hash, data.status);
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/treasury/wallets/ethereum/send" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Confirm: $USER_PASSWORD" \
  -d '{
    "to": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "value_wei": "0.01"
  }'
```

:::note HTTP vs SDK field names
The REST API uses `value_wei` (major-unit decimal string for non-EVM chains per OpenAPI). The `@1claw/sdk` `sendFromWallet()` helper accepts `amount` and maps it for you.
:::

</TabItem>
</Tabs>

### EVM token transfers

Pass `token_contract` (ERC-20) or use `token_mint` on non-EVM chains:

```typescript
await client.treasuryWallets.sendFromWallet(
  "ethereum",
  {
    to: "0xRecipient...",
    amount: "100.0",
    token_contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  userPassword,
);
```

### Chain-specific fields

| Chain | Extra fields |
| ----- | ------------ |
| Bitcoin | `fee_rate_sat_per_vbyte` |
| Solana | `token_mint`, `memo` |
| XRP | `destination_tag`, `xrpl_tx_json` |
| Cardano | `token_mint` (`policy.asset`), `ttl` |
| Tron | `token_mint`, `fee_limit_sun` |

Amounts are **major-unit decimal strings** (e.g. `"0.001"` BTC, `"10.5"` SOL).

## Gasless sends (ERC-4337)

On EVM chains with Pimlico configured, wrap the send as a sponsored UserOperation:

```typescript
await client.treasuryWallets.sendFromWallet(
  "ethereum",
  {
    to: "0x...",
    amount: "0.01",
    gasless: true,
  },
  userPassword,
);
```

Response may include `user_op_hash`. Users do not need native ETH for gas; the paymaster sponsors fees. Supported on Ethereum, Base, Optimism, Arbitrum, and Polygon when RPC + paymaster are configured.

```tsx
// wallet-react
await send({ chain: "ethereum", to: "0x...", amount: "0.01", gasless: true });
```

## Passkey transaction authorization

Alternative to password re-auth — bind WebAuthn to the transaction digest:

```typescript
// wallet-react — full flow
await sendWithPasskey({
  chain: "ethereum",
  to: "0x...",
  amount: "1.0",
});
```

Under the hood:

1. Client computes `tx_digest = SHA256(chain|to|value_wei|data)`
2. Passkey ceremony via `/v1/auth/passkeys/tx-assert/begin` + `.../complete`
3. Send with `X-Passkey-Token` header instead of `X-Auth-Confirm`

Manual API usage mirrors the widget; see [Authentication](/docs/guides/embedded-wallets/authentication#passkey-transaction-authorization).

## Swap via 0x

Swaps fetch quotes from the 0x aggregator, sign, and broadcast server-side. Requires `ZERO_X_API_KEY` on Vault.

```typescript
const { data } = await client.treasuryWallets.swapFromWallet(
  "ethereum",
  {
    sell_token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
    buy_token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    sell_amount: "0.1",
    slippage_percentage: "0.5",
  },
  userPassword,
);

console.log(data.tx_hash, data.buy_amount);
```

Spend policies apply to swaps the same as sends (`allowed_tokens`, daily limits, etc.).

## Receive

Receiving is address-based — no dedicated API call:

1. List wallets: `GET /v1/treasury/wallets` or widget **Receive** view
2. Display `address` (and chain-specific memo/tag for XRP)
3. Optionally create [deposit destinations](/docs/guides/embedded-wallets/advanced#deposit-destinations) for tracked inbound payments + webhooks

The widget's **Receive** feature shows QR codes and copyable addresses per chain.

## Policy violations

When a send or swap violates spend policy, the API returns **403** with a descriptive error (e.g. destination not in allowlist, daily limit exceeded). The React widget surfaces this as a toast — it never attempts to sign blocked transactions.

Users can inspect effective policy:

```typescript
const { data } = await client.treasuryWallets.getEffectiveSpendPolicy();
console.log(data.source); // e.g. app default vs user override when present
```

## Audit & webhooks

Successful sends emit audit events (`treasury_wallet.send`) and webhooks when configured:

- `wallet.transfer.sent`
- `wallet.transfer.received` (deposit monitoring)

See [Platform webhooks](/docs/platform-api/webhooks).

## Related

- [Spend policies](/docs/guides/embedded-wallets/spend-policies) — guardrail fields
- [Multi-chain wallets](/docs/guides/embedded-wallets/multi-chain-wallets) — balances
- [Fiat ramps](/docs/guides/embedded-wallets/fiat-ramps) — on-ramp into receive address
- [Account abstraction](/docs/treasury/account-abstraction) — ERC-4337 details
