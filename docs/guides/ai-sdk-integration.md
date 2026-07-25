---
title: "Vercel AI SDK and OpenAI Agents SDK"
description: Wire 1claw as a tool provider for AI agents built with the Vercel AI SDK or OpenAI Agents SDK. Secure signing, vault access, and secret management for LLM-powered agents.
sidebar_position: 60
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Vercel AI SDK and OpenAI Agents SDK

Both the [Vercel AI SDK](https://sdk.vercel.ai) and the [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) support tool calling, which lets you give AI agents the ability to interact with external systems. This guide shows how to register 1claw operations as tools so your agents can fetch secrets, sign transactions, and manage vaults without ever seeing raw key material.

## Vercel AI SDK

The Vercel AI SDK provides a `tool()` helper for defining type-safe tools. Here is a complete setup with 1claw tools.

### Install

```bash
npm install ai @ai-sdk/openai @1claw/sdk zod
```

### Define 1claw tools

```typescript
// lib/oneclaw-tools.ts
import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@1claw/sdk";

const oneclaw = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

const agentId = process.env.ONECLAW_AGENT_ID!;
const vaultId = process.env.ONECLAW_VAULT_ID!;

export const oneclawTools = {
  getSecret: tool({
    description: "Fetch a secret from the 1claw vault by path",
    parameters: z.object({
      path: z.string().describe("The secret path, e.g. apis/openai-key"),
    }),
    execute: async ({ path }) => {
      const result = await oneclaw.secrets.get(vaultId, path);
      return { path, type: result.data.type, fetched: true };
      // Intentionally not returning the raw value to the LLM.
      // Use the value in subsequent server-side logic, not in prompts.
    },
  }),

  listSecrets: tool({
    description: "List available secrets in the vault",
    parameters: z.object({
      prefix: z
        .string()
        .optional()
        .describe("Filter by path prefix, e.g. apis/"),
    }),
    execute: async ({ prefix }) => {
      const result = await oneclaw.secrets.list(vaultId, { prefix });
      return {
        secrets: result.data.secrets.map((s: any) => ({
          path: s.path,
          type: s.type,
          description: s.description,
        })),
      };
    },
  }),

  submitTransaction: tool({
    description:
      "Sign and broadcast a blockchain transaction. Value is in ETH.",
    parameters: z.object({
      chain: z
        .string()
        .describe("Chain name: ethereum, base, sepolia, etc."),
      to: z.string().describe("Recipient address"),
      value: z.string().describe("Value in ETH, e.g. 0.01"),
      data: z
        .string()
        .optional()
        .describe("Hex-encoded calldata for contract calls"),
    }),
    execute: async ({ chain, to, value, data }) => {
      const tx = await oneclaw.agents.submitTransaction(agentId, {
        chain,
        to,
        value,
        data,
        simulate_first: true,
      });
      return {
        txHash: tx.data.tx_hash,
        status: tx.data.status,
        chain,
      };
    },
  }),

  signMessage: tool({
    description: "Sign a message with EIP-191 personal_sign",
    parameters: z.object({
      chain: z.string(),
      message: z
        .string()
        .describe("The message to sign (will be hex-encoded)"),
    }),
    execute: async ({ chain, message }) => {
      const hex = Buffer.from(message).toString("hex");
      const result = await oneclaw.agents.signIntent(agentId, {
        intent_type: "personal_sign",
        chain,
        message: hex,
      });
      return {
        signature: result.data.signature,
        from: result.data.from,
      };
    },
  }),
};
```

### Use in a streaming chat endpoint

```typescript
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { oneclawTools } from "@/lib/oneclaw-tools";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    tools: oneclawTools,
    maxSteps: 5, // allow multi-step tool use
    system: `You are a DeFi operations assistant with access to a secure vault 
and transaction signing. Never include raw secret values in your responses 
to the user. Use secrets server-side only.`,
  });

  return result.toDataStreamResponse();
}
```

### Use with MCP (alternative)

The Vercel AI SDK supports MCP servers directly. Instead of defining tools manually:

```typescript
import { experimental_createMCPClient as createMCPClient } from "ai";

const mcpClient = await createMCPClient({
  transport: {
    type: "sse",
    url: "https://mcp.1claw.xyz/mcp",
    headers: {
      Authorization: `Bearer ${process.env.ONECLAW_AGENT_KEY}`,
    },
  },
});

const tools = await mcpClient.tools();

const result = streamText({
  model: openai("gpt-4o"),
  messages,
  tools, // all 1claw MCP tools auto-registered
});
```

This auto-discovers all available tools from the MCP server. Less code, but less control over which tools are exposed.

## OpenAI Agents SDK

The [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) (Python) uses a function-based tool registration model.

### Install

```bash
pip install openai-agents httpx
```

### Define 1claw tools

```python
# tools/oneclaw_tools.py
from agents import function_tool
import httpx
import os

ONECLAW_BASE = "https://api.1claw.xyz"
AGENT_KEY = os.environ["ONECLAW_AGENT_KEY"]
AGENT_ID = os.environ["ONECLAW_AGENT_ID"]
VAULT_ID = os.environ["ONECLAW_VAULT_ID"]

_token_cache = {"token": None}

def _get_token() -> str:
    if _token_cache["token"]:
        return _token_cache["token"]
    resp = httpx.post(
        f"{ONECLAW_BASE}/v1/auth/agent-token",
        json={"api_key": AGENT_KEY},
    )
    _token_cache["token"] = resp.json()["token"]
    return _token_cache["token"]

def _headers():
    return {"Authorization": f"Bearer {_get_token()}"}

@function_tool
def list_secrets(prefix: str = "") -> dict:
    """List secrets in the 1claw vault, optionally filtered by path prefix."""
    params = {"prefix": prefix} if prefix else {}
    resp = httpx.get(
        f"{ONECLAW_BASE}/v1/vaults/{VAULT_ID}/secrets",
        headers=_headers(),
        params=params,
    )
    secrets = resp.json().get("secrets", [])
    return {
        "secrets": [
            {"path": s["path"], "type": s.get("type"), "description": s.get("description")}
            for s in secrets
        ]
    }

@function_tool
def get_secret(path: str) -> dict:
    """Fetch a specific secret from the vault by its path."""
    resp = httpx.get(
        f"{ONECLAW_BASE}/v1/vaults/{VAULT_ID}/secrets/{path}",
        headers=_headers(),
    )
    data = resp.json()
    return {"path": path, "type": data.get("type"), "fetched": True}

@function_tool
def submit_transaction(chain: str, to: str, value: str, data: str = "0x") -> dict:
    """Sign and broadcast a blockchain transaction via 1claw. Value is in ETH."""
    resp = httpx.post(
        f"{ONECLAW_BASE}/v1/agents/{AGENT_ID}/transactions",
        headers=_headers(),
        json={
            "chain": chain,
            "to": to,
            "value": value,
            "data": data,
            "simulate_first": True,
        },
    )
    result = resp.json()
    return {"tx_hash": result.get("tx_hash"), "status": result.get("status")}
```

### Create an agent

```python
# main.py
from agents import Agent, Runner
from tools.oneclaw_tools import list_secrets, get_secret, submit_transaction

agent = Agent(
    name="DeFi Ops",
    instructions="""You manage DeFi operations with access to a secure vault 
and transaction signing via 1claw. Never expose raw secret values. 
Use them server-side only.""",
    tools=[list_secrets, get_secret, submit_transaction],
)

result = Runner.run_sync(
    agent,
    "Check what secrets are available and list the signing keys",
)
print(result.final_output)
```

### Multi-agent handoff

```python
from agents import Agent, Runner

research_agent = Agent(
    name="Research",
    instructions="You research DeFi protocols and yield opportunities.",
    tools=[list_secrets, get_secret],
)

execution_agent = Agent(
    name="Executor",
    instructions="You execute transactions based on research findings.",
    tools=[submit_transaction],
    handoffs=[research_agent],
)

result = Runner.run_sync(
    execution_agent,
    "Find the best yield opportunity and execute a deposit of 0.1 ETH on Base",
)
```

## Security best practices

### Do not return raw secret values to the LLM

The `getSecret` tool above intentionally returns `{ fetched: true }` rather than the raw value. Use the value in server-side logic (e.g., making an API call), not in the LLM's context window.

If you need the LLM to use a secret as part of its reasoning, consider:

1. Using [Shroud](/docs/guides/shroud) to redact secrets from LLM traffic
2. Using [Execution Intents](/docs/guides/intents-api) so the agent calls APIs through bindings without seeing credentials

### Set guardrails on the agent

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_to_allowlist": ["0xContract1...", "0xContract2..."],
    "tx_max_value_eth": "0.5",
    "tx_daily_limit_eth": "5.0"
  }'
```

### Limit tool exposure

Only register the tools your agent actually needs. A research agent does not need `submitTransaction`. An execution agent does not need `putSecret`.

## Further reading

- [MCP integration](/docs/guides/mcp-integration) for MCP-based tool discovery
- [Agent frameworks](/docs/guides/agent-frameworks) for LangChain, CrewAI, and more
- [Intents API](/docs/guides/intents-api) for the full transaction signing reference
- [Shroud](/docs/guides/shroud) for LLM traffic inspection and redaction
