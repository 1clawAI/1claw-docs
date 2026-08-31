---
title: "Account Abstraction (ERC-4337)"
description: Use 1claw signing keys as the owner or signer on ERC-4337 smart accounts via ZeroDev, Alchemy Account Kit, Biconomy, or Pimlico.
sidebar_position: 55
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Account Abstraction (ERC-4337)

ERC-4337 smart accounts let you batch transactions, sponsor gas, enforce session policies, and recover access through modular signers. 1claw fits into this stack as the **signer layer**: the agent's HSM-backed signing key becomes the owner or session key on a smart account, and all signing happens through the Intents API without the agent ever touching raw key material.

This guide covers integration patterns with four major AA providers: ZeroDev, Alchemy Account Kit, Biconomy, and Pimlico. It also covers 1claw's built-in ERC-4337 support (`gasless: true`).

## Where 1claw fits in the AA stack

```
Your agent / backend
        |
        v
  1claw Intents API
  (HSM-backed signer, guardrails)
        |
        v
  AA SDK (ZeroDev / Alchemy / Biconomy)
  (smart account, bundler, paymaster)
        |
        v
  Blockchain (UserOperation)
```

1claw provides the **signer**. The AA SDK provides the **smart account** logic (bundler, paymaster, modules). This separation means:

- The agent never holds a private key
- Transaction guardrails apply before any UserOp is signed
- You can swap AA providers without changing your signing infrastructure
- Audit trail covers every signing request

## Built-in gasless transactions

The simplest path: set `gasless: true` on a transaction and 1claw handles everything. The agent's smart account (Safe 1.4.1 deployed via Pimlico) wraps the transaction as a UserOperation with sponsored gas.

```typescript
const tx = await agentClient.agents.submitTransaction(agentId, {
  chain: "base",
  to: "0xContract...",
  value: "0",
  data: calldata,
  gasless: true, // ERC-4337 UserOperation, gas sponsored by Pimlico paymaster
});

console.log("UserOp hash:", tx.data.user_op_hash);
```

Requirements:

- Agent must have `intents_api_enabled: true`
- Agent must be in `smart_account` mode (a Safe is deployed per chain)
- `PIMLICO_API_KEY` must be configured on the 1claw deployment

This is the zero-config path. For custom smart account setups, read on.

## Pattern 1: 1claw signer with ZeroDev

[ZeroDev](https://zerodev.app) provides Kernel smart accounts with session keys, plugins, and a built-in bundler. You can use 1claw as the primary signer.

```typescript
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createClient as create1clawClient } from "@1claw/sdk";
import { http, createPublicClient } from "viem";
import { base } from "viem/chains";

const oneclaw = create1clawClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// 1claw signs the digest; ZeroDev wraps it in a UserOperation
const oneclawSigner = {
  address: agentEoaAddress, // from GET /v1/agents/{id} -> evm_address
  async signMessage({ message }: { message: string }) {
    const result = await oneclaw.agents.signIntent(agentId, {
      intent_type: "personal_sign",
      chain: "base",
      message: Buffer.from(message).toString("hex"),
    });
    return result.data.signature as `0x${string}`;
  },
  async signTypedData(typedData: any) {
    const result = await oneclaw.agents.signIntent(agentId, {
      intent_type: "typed_data",
      chain: "base",
      typed_data: typedData,
    });
    return result.data.signature as `0x${string}`;
  },
};

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer: oneclawSigner,
});

const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
});

const kernelClient = createKernelAccountClient({
  account,
  chain: base,
  bundlerTransport: http("https://bundler.zerodev.app/..."),
});

// Send a UserOperation signed by 1claw
const hash = await kernelClient.sendUserOperation({
  callData: await account.encodeCalls([
    { to: "0xRecipient...", value: 0n, data: "0x" },
  ]),
});
```

The key insight: ZeroDev calls `signMessage` or `signTypedData` on the signer, which calls 1claw's unified sign endpoint. The private key never leaves 1claw's HSM.

## Pattern 2: 1claw signer with Alchemy Account Kit

[Alchemy Account Kit](https://accountkit.alchemy.com) (formerly aa-sdk) provides modular smart accounts. Here is how to wire a 1claw signer:

```typescript
import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { alchemy, sepolia } from "@account-kit/infra";
import { createClient as create1clawClient } from "@1claw/sdk";

const oneclaw = create1clawClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

const oneclawSigner = {
  getAddress: async () => agentEoaAddress as `0x${string}`,
  signMessage: async ({ message }: { message: string | Uint8Array }) => {
    const hex =
      typeof message === "string"
        ? Buffer.from(message).toString("hex")
        : Buffer.from(message).toString("hex");
    const result = await oneclaw.agents.signIntent(agentId, {
      intent_type: "personal_sign",
      chain: "ethereum",
      message: hex,
    });
    return result.data.signature as `0x${string}`;
  },
  signTypedData: async (typedData: any) => {
    const result = await oneclaw.agents.signIntent(agentId, {
      intent_type: "typed_data",
      chain: "ethereum",
      typed_data: typedData,
    });
    return result.data.signature as `0x${string}`;
  },
};

const client = await createModularAccountAlchemyClient({
  transport: alchemy({ apiKey: process.env.ALCHEMY_API_KEY! }),
  chain: sepolia,
  signer: oneclawSigner,
});

const { hash } = await client.sendUserOperation({
  uo: {
    target: "0xRecipient...",
    data: "0x",
    value: 0n,
  },
});
```

## Pattern 3: 1claw signer with Biconomy

[Biconomy](https://biconomy.io) smart accounts use a similar signer interface:

```typescript
import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createClient as create1clawClient } from "@1claw/sdk";

const oneclaw = create1clawClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Create a Biconomy smart account with 1claw as the signer
const smartAccount = await BiconomySmartAccountV2.create({
  chainId: 8453, // Base
  signer: oneclawSigner, // same signer object as above
  bundlerUrl: "https://bundler.biconomy.io/api/v2/8453/...",
  paymasterUrl: "https://paymaster.biconomy.io/api/v1/8453/...",
});

const client = await createSmartAccountClient({
  account: smartAccount,
});

const { hash } = await client.sendTransaction({
  to: "0xRecipient...",
  value: 0n,
  data: "0x",
});
```

## Pattern 4: Direct Pimlico integration

If you want more control than `gasless: true` but still want to use Pimlico:

```typescript
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createClient as create1clawClient } from "@1claw/sdk";
import { http, createPublicClient } from "viem";
import { base } from "viem/chains";

const oneclaw = create1clawClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const pimlicoClient = createPimlicoClient({
  transport: http(`https://api.pimlico.io/v2/8453/rpc?apikey=${PIMLICO_KEY}`),
});

const safeAccount = await toSafeSmartAccount({
  client: publicClient,
  owners: [oneclawSigner],
  version: "1.4.1",
});

const smartAccountClient = createSmartAccountClient({
  account: safeAccount,
  chain: base,
  bundlerTransport: http(`https://api.pimlico.io/v2/8453/rpc?apikey=${PIMLICO_KEY}`),
  paymaster: pimlicoClient,
});

const hash = await smartAccountClient.sendTransaction({
  to: "0xRecipient...",
  value: 0n,
  data: "0x",
});
```

## Transaction guardrails and AA

1claw's transaction guardrails apply at the signing layer, before the UserOperation reaches the bundler. This means:

- `tx_to_allowlist` restricts which contracts the smart account can call
- `tx_max_value_eth` limits per-transaction value
- `tx_daily_limit_eth` caps rolling 24-hour spend
- `tx_allowed_chains` restricts which chains the smart account operates on

These are enforced server-side in the Intents API. The AA SDK never sees a signature if the guardrails reject the request.

## Choosing an approach

| Approach | When to use |
|----------|------------|
| `gasless: true` (built-in) | Fastest path. 1claw manages the Safe and paymaster. Good for simple agent operations. |
| ZeroDev / Alchemy / Biconomy | You need custom modules (session keys, plugins, specific paymaster logic). 1claw provides the signer; the AA SDK handles everything else. |
| Direct Pimlico | You want full control over the Safe deployment, bundler selection, and paymaster configuration. |

## Further reading

- [Intents API](/docs/agents/intents/overview) for the full signing reference
- [Safe integration](/docs/treasury/safe-multisig) for multisig treasury operations
- [Multi-chain signing](/docs/agents/intents/multi-chain-signing) for non-EVM signing keys
- [Coinbase Smart Wallet](/docs/integrations/coinbase-smart-wallet) for passkey-based smart accounts
