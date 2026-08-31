---
title: Multi-Chain Embedded Wallets
description: Supported chains, HSM key generation, address formats, balances, and wallet quotas for embedded treasury wallets.
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Multi-Chain Embedded Wallets

Each embedded-wallet user gets **native treasury wallets** — one keypair per chain family, stored in the org's `__treasury-keys` vault. Keys are generated inside HSM-backed infrastructure; private material is never returned except through explicit export with re-authentication.

:::info Human-only
Treasury wallet APIs enforce `require_human()`. Agents always receive **403**. Autonomous signing uses [agent signing keys](/docs/agents/intents/multi-chain-signing), not treasury wallets.
:::

## Supported chains

| Chain | Curve | Address example | Notes |
| ----- | ----- | --------------- | ----- |
| **Ethereum** | secp256k1 | `0x4e83…` (EIP-55) | EIP-1559, ERC-20, ERC-4337 gasless |
| **Bitcoin** | secp256k1 | `bc1q…` (bech32) | UTXO model, fee rate in sat/vB |
| **Solana** | Ed25519 | `7xKX…` (base58) | SPL tokens, memo program |
| **XRP** | Ed25519 | `rN7d…` | 31 supported types via `xrpl_tx_json` (agent Intents API; four dangerous types deny-by-default) |
| **Cardano** | Ed25519 | `addr1…` | Native multi-asset, min-ADA |
| **Tron** | secp256k1 | `T9yD…` | TRC-20, energy limits |

EVM network names in API requests (e.g. `base`, `optimism`, `polygon`) map to the canonical **`ethereum`** signing key chain for address derivation where applicable. Configure RPC URLs in the [chain registry](/docs/reference/api-reference) for broadcast and balance queries.

## Key storage

Private keys live at:

```
__treasury-keys/users/{user_id}/chains/{chain}/private_key
```

The `__treasury-keys` vault:

- Does **not** count toward vault/secret quotas
- Is **hidden** from `GET /v1/vaults` and Shroud's secrets manifest
- **Blocks** direct secret reads — use export endpoint or signing APIs only

[MPC custody](/docs/vaults/mpc) is auto-configured by billing tier when the vault is created:

| Tier | Mode | Meaning |
| ---- | ---- | ------- |
| Pro / Team | XOR 2-of-2 client custody | Server share + optional client share on read |
| Business / Enterprise | Shamir 2-of-3 multi-HSM | GCP + AWS + Azure KMS shares |

See [Advanced — custody tiers](/docs/guides/embedded-wallets/advanced#cmek-and-mpc-custody).

## Wallet quota

Treasury wallets count toward org **wallet quota**:

| Tier | Wallets |
| ---- | ------- |
| Free | 10 |
| Pro | 10,000 |
| Team | 250,000 |
| Business | 1,000,000 |
| Enterprise | Unlimited |

Platform org admins bypass limits via `effective_billing_tier_for_limits`.

## Provisioning wallets

### On first login (embedded flows)

Pass `auto_provision_chains` to Email OTP verify or social login:

```typescript
await client.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
  auto_provision_chains: ["ethereum", "solana", "bitcoin"],
});
```

The React widget provisions chains from its `chains` prop on first successful login.

### Explicit generation (authenticated user)

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.treasuryWallets.generateWallets({
  chains: ["ethereum", "solana"], // omit for all six
});

for (const w of data.wallets) {
  console.log(w.chain, w.address, w.curve);
}
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.co/v1/treasury/wallets/generate" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"chains":["ethereum","solana","bitcoin"]}'
```

</TabItem>
</Tabs>

Chains where the user already has an active wallet are skipped silently.

## Listing wallets

```typescript
const { data } = await client.treasuryWallets.listWallets();
// data.wallets[] — id, chain, address, curve, is_active
```

```bash
curl "https://api.1claw.co/v1/treasury/wallets" \
  -H "Authorization: Bearer $USER_JWT"
```

## Balances

Query native + optional ERC-20/SPL/TRC-20 token balances:

```typescript
const { data } = await client.treasuryWallets.getWalletBalance("ethereum", [
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
]);

console.log(data.native_balance, data.native_symbol);
console.log(data.tokens);
```

```bash
curl "https://api.1claw.co/v1/treasury/wallets/ethereum/balance?tokens=0x833589..." \
  -H "Authorization: Bearer $USER_JWT"
```

The React widget refreshes balances every 30 seconds.

## Import, export, rotate

| Operation | Endpoint | Re-auth |
| --------- | -------- | ------- |
| Import (BYOK) | `POST .../import` | `X-Auth-Confirm` (password) |
| Export private key | `POST .../export` | `X-Auth-Confirm` (password) |
| Rotate keypair | `POST .../rotate` | Session JWT |
| Deactivate | `DELETE .../{chain}` | Session JWT |

```typescript
await client.treasuryWallets.exportWallet("ethereum", userPassword);
```

Export and failed re-auth attempts are audit-logged (`treasury_wallet.export`). Failed password attempts count toward account lockout.

:::warning Export policy
Exporting keys to end-user devices increases custody risk. Prefer keeping signing server-side and using [spend policies](/docs/guides/embedded-wallets/spend-policies) instead of raw key export for most embedded apps.
:::

## Embedded wallets vs EVM L2s

Marketing and product copy often list "Ethereum + L2s" (Base, Optimism, Arbitrum, Polygon). On-chain sends specify the target chain by name in the send request; the underlying treasury key for EVM chains is the user's **ethereum** chain wallet unless you import chain-specific keys.

Configure L2 RPC URLs in the chain registry so broadcasts and balance checks resolve correctly.

## Related

- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — moving funds
- [Treasury wallets reference](/docs/treasury/overview) — full API table
- [Trust model](/docs/security/trust-model-comparison) — HSM vs MPC vs TEE signing
