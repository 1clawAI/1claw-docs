---
title: "wagmi + RainbowKit integration"
description: Integrate 1claw into a standard wagmi and RainbowKit dapp for agent-side operations, secret management, and backend signing.
sidebar_position: 57
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# wagmi + RainbowKit Integration

[wagmi](https://wagmi.sh) and [RainbowKit](https://rainbowkit.com) are the standard stack for connecting wallets and interacting with contracts in React-based dapps. This guide shows how 1claw fits into a wagmi + RainbowKit project for backend operations that run alongside the user's connected wallet.

## Where 1claw fits

In a typical wagmi dapp:

- **Frontend**: wagmi hooks + RainbowKit handle wallet connection, reads, and user-signed writes
- **Backend**: Your API server or agent handles automated operations, monitoring, and background tasks

1claw handles the backend side. The frontend wallet connection stays exactly as it is.

```
Browser (wagmi + RainbowKit)           Your backend             Blockchain
        |                                  |                        |
        |  useReadContract()               |                        |
        |  useWriteContract()              |                        |
        |  (user signs in wallet) -------->|                        |
        |                                  |                        |
        |                              1claw agent                  |
        |                              - Background txs             |
        |                              - Monitoring                 |
        |                              - Bot operations             |
        |                                  |                        |
        |                              Intents API  --------------> |
```

## Step 1: Set up the frontend (unchanged)

Your wagmi + RainbowKit setup stays the same. Nothing changes on the frontend.

```typescript
// app/providers.tsx (standard wagmi + RainbowKit setup)
"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "My Dapp",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, base],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

Users connect their wallet, sign transactions in the browser. That flow is untouched.

## Step 2: Add 1claw to your backend

Install the SDK in your backend or API routes:

```bash
npm install @1claw/sdk
```

Create a server-side client:

```typescript
// lib/oneclaw.ts (server-side only)
import { createClient } from "@1claw/sdk";

export const oneclaw = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_AGENT_KEY!, // ocv_ key, never expose to frontend
});
```

:::warning
The agent API key (`ocv_`) must stay server-side. Never import it in client components or expose it in `NEXT_PUBLIC_` environment variables.
:::

## Step 3: Use 1claw for backend operations

### Example: Server-side transaction in a Next.js API route

```typescript
// app/api/harvest/route.ts
import { NextResponse } from "next/server";
import { oneclaw } from "@/lib/oneclaw";

export async function POST(req: Request) {
  const { vaultAddress } = await req.json();

  // Agent signs and broadcasts a harvest transaction
  const tx = await oneclaw.agents.submitTransaction(
    process.env.AGENT_ID!,
    {
      chain: "base",
      to: vaultAddress,
      value: "0",
      data: "0x4641257d", // harvest() selector
      simulate_first: true,
    },
  );

  return NextResponse.json({
    txHash: tx.data.tx_hash,
    status: tx.data.status,
  });
}
```

### Example: Fetch secrets for server-side API calls

```typescript
// app/api/price/route.ts
import { NextResponse } from "next/server";
import { oneclaw } from "@/lib/oneclaw";

export async function GET() {
  // Fetch API key from vault at runtime
  const secret = await oneclaw.secrets.get(
    process.env.VAULT_ID!,
    "apis/coingecko-key",
  );

  const res = await fetch(
    `https://pro-api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`,
    { headers: { "x-cg-pro-api-key": secret.data.value } },
  );

  return NextResponse.json(await res.json());
}
```

### Example: Monitor contract events and react

```typescript
// scripts/monitor.ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { oneclaw } from "./lib/oneclaw";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Watch for events and react with an agent transaction
publicClient.watchEvent({
  address: "0xYourContract...",
  event: parseAbiItem("event LiquidationNeeded(address indexed account)"),
  onLogs: async (logs) => {
    for (const log of logs) {
      const account = log.args.account;

      // Agent liquidates the position
      await oneclaw.agents.submitTransaction(process.env.AGENT_ID!, {
        chain: "base",
        to: "0xYourContract...",
        value: "0",
        data: encodeFunctionData({
          abi: contractAbi,
          functionName: "liquidate",
          args: [account],
        }),
        simulate_first: true,
      });
    }
  },
});
```

## Step 4: Combine frontend reads with backend writes

A common pattern: the frontend reads contract state with wagmi, and when action is needed, calls a backend endpoint that uses 1claw.

```typescript
// components/VaultCard.tsx
"use client";

import { useReadContract } from "wagmi";
import { useState } from "react";

export function VaultCard({ vaultAddress }: { vaultAddress: string }) {
  const [harvesting, setHarvesting] = useState(false);

  const { data: pendingRewards } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: vaultAbi,
    functionName: "pendingRewards",
  });

  const handleHarvest = async () => {
    setHarvesting(true);
    try {
      // Call your backend, which uses 1claw to sign and broadcast
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultAddress }),
      });
      const { txHash } = await res.json();
      console.log("Harvested:", txHash);
    } finally {
      setHarvesting(false);
    }
  };

  return (
    <div>
      <p>Pending rewards: {pendingRewards?.toString()}</p>
      <button onClick={handleHarvest} disabled={harvesting}>
        {harvesting ? "Harvesting..." : "Harvest"}
      </button>
    </div>
  );
}
```

In this example:

- `useReadContract` reads on-chain state in the browser (no signing needed)
- "Harvest" calls a server endpoint that signs via 1claw (no wallet popup for the user)
- The agent has guardrails limiting which contracts it can interact with

## Using Scaffold-ETH 2

If you use Scaffold-ETH 2 (which is based on wagmi + RainbowKit), the same patterns apply. Use the built-in hooks for frontend reads and writes:

```typescript
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Frontend read (user's perspective)
const { data: balance } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "balanceOf",
  args: [userAddress],
});

// Frontend write (user signs in wallet)
const { writeContractAsync } = useScaffoldWriteContract({
  contractName: "YourContract",
});
await writeContractAsync({ functionName: "deposit", value: parseEther("1") });
```

For backend/agent operations, use 1claw in your API routes or backend scripts as shown above.

## What to store in the vault

| Secret | Path suggestion | Why |
|--------|----------------|-----|
| WalletConnect project ID | `config/walletconnect-project-id` | Not sensitive but good practice |
| RPC provider API key (Alchemy, Infura) | `rpc/alchemy-key` | Prevents key leakage in frontend bundles |
| Subgraph API key | `apis/subgraph-key` | Rate-limited, should be server-side |
| Contract deployer private key | `keys/deployer` | Used in CI/CD, never in frontend |
| Webhook signing secret | `webhooks/signing-secret` | Validate inbound webhooks |

## Further reading

- [Five-minute walkthrough](/docs/guides/five-minute-walkthrough) for a complete 1claw onboarding
- [Intents API](/docs/agents/intents/overview) for the full transaction signing reference
- [Give an agent access](/docs/vaults/golden-path) for vault, secret, and policy setup
- [Scaffold-Agent](/docs/integrations/scaffold-agent) for a full monorepo template with 1claw + Scaffold-ETH
