---
title: "Agent frameworks (Eliza, GOAT, LangChain, CrewAI)"
description: Give AI agents 1claw signing keys, vault access, and approval flows. Integration patterns for elizaOS, GOAT SDK, LangChain, and CrewAI.
sidebar_position: 58
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent Frameworks

Most vault and key management products assume a human is clicking around a dashboard. 1Claw is built for headless agents: scoped API keys, policy-gated secret paths, server-side signing, and audit logs for every fetch.

This guide shows how to plug 1Claw into elizaOS, GOAT, LangChain, and CrewAI. The shape is the same in each case: a human registers an agent and grants policies once; the framework calls 1Claw at runtime for secrets, signing, and memory. The agent never holds raw private keys.

For dedicated packages, see [`langchain-1claw`](https://pypi.org/project/langchain-1claw/), [`1claw-crewai-tools`](https://pypi.org/project/1claw-crewai-tools/), and the [ecosystem page](/docs/guides/ecosystem).

## The pattern (same for every framework)

Regardless of which framework you use, the integration follows the same shape:

1. **Register an agent** in 1claw (human does this once)
2. **Create policies** granting the agent access to specific secrets and paths
3. **Configure the framework** with the agent's API key (`ocv_`) or connect via MCP
4. **The agent calls 1claw** at runtime to fetch secrets, sign transactions, or store data

The agent never holds raw private keys. Secrets are fetched just-in-time. Transactions are signed server-side. Everything is audit-logged.

## elizaOS

elizaOS has a dedicated 1claw plugin. See the full guide: [elizaOS plugin](/docs/guides/elizaos).

Quick setup:

```bash
npm install @1claw/plugin-elizaos
```

```json
{
  "plugins": ["@1claw/plugin-elizaos"]
}
```

The plugin provides actions for vault access (`get_secret`, `put_secret`), multi-chain signing (`submit_transaction`, `sign_message`), and Shroud LLM routing. Set `ONECLAW_AGENT_API_KEY` in your environment and the plugin handles JWT exchange and token refresh.

## GOAT SDK

[GOAT](https://github.com/goat-sdk/goat) (Great Onchain Agent Toolkit) provides tools for AI agents to interact with blockchains. Integrate 1claw as the signing backend.

### Option 1: MCP tools (recommended)

GOAT supports MCP tool providers. Point it at the 1claw MCP server:

```typescript
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { oneclaw } from "@goat-sdk/wallet-oneclaw";

const tools = await getOnChainTools({
  wallet: oneclaw({
    apiKey: process.env.ONECLAW_AGENT_KEY!,
    agentId: process.env.ONECLAW_AGENT_ID!,
  }),
});
```

Or configure MCP directly in GOAT's tool registry:

```json
{
  "mcpServers": {
    "1claw": {
      "url": "https://mcp.1claw.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ocv_your_agent_api_key"
      }
    }
  }
}
```

### Option 2: Direct SDK integration

```typescript
import { createClient } from "@1claw/sdk";

const oneclaw = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_KEY!,
});

// Custom GOAT tool that uses 1claw for signing
const signTransactionTool = {
  name: "sign_and_broadcast",
  description: "Sign and broadcast a blockchain transaction",
  parameters: {
    chain: { type: "string" },
    to: { type: "string" },
    value: { type: "string" },
    data: { type: "string", optional: true },
  },
  async execute({ chain, to, value, data }) {
    const tx = await oneclaw.agents.submitTransaction(agentId, {
      chain,
      to,
      value,
      data,
      simulate_first: true,
    });
    return { txHash: tx.data.tx_hash, status: tx.data.status };
  },
};
```

## LangChain

[LangChain](https://langchain.com) agents use tools for external actions. 1claw integrates as a set of custom tools or through MCP.

### MCP integration (simplest)

LangChain supports MCP tool servers. Configure the 1claw MCP server and LangChain auto-discovers all available tools.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async with MultiServerMCPClient(
    {
        "1claw": {
            "url": "https://mcp.1claw.xyz/mcp",
            "headers": {
                "Authorization": "Bearer ocv_your_agent_api_key"
            },
            "transport": "streamable_http",
        }
    }
) as client:
    tools = client.get_tools()

    agent = create_react_agent(
        ChatOpenAI(model="gpt-4o"),
        tools,
    )

    result = await agent.ainvoke({
        "messages": [
            {"role": "user", "content": "List all secrets in the vault"}
        ]
    })
```

### Custom LangChain tools

If you prefer explicit tool definitions:

```python
from langchain.tools import tool
import httpx

ONECLAW_BASE = "https://api.1claw.xyz"
AGENT_KEY = "ocv_..."

async def get_agent_token():
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ONECLAW_BASE}/v1/auth/agent-token",
            json={"api_key": AGENT_KEY},
        )
        return resp.json()["token"]

@tool
async def get_secret(vault_id: str, path: str) -> str:
    """Fetch a secret from the 1claw vault."""
    token = await get_agent_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ONECLAW_BASE}/v1/vaults/{vault_id}/secrets/{path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()["value"]

@tool
async def submit_transaction(
    agent_id: str,
    chain: str,
    to: str,
    value: str,
) -> dict:
    """Sign and broadcast a blockchain transaction via 1claw."""
    token = await get_agent_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ONECLAW_BASE}/v1/agents/{agent_id}/transactions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "chain": chain,
                "to": to,
                "value": value,
                "simulate_first": True,
            },
        )
        data = resp.json()
        return {"tx_hash": data["tx_hash"], "status": data["status"]}
```

Use these tools in a LangGraph agent:

```python
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

agent = create_react_agent(
    ChatOpenAI(model="gpt-4o"),
    [get_secret, submit_transaction],
)
```

## CrewAI

[CrewAI](https://crewai.com) uses a similar tool pattern. Define 1claw tools as CrewAI-compatible functions:

```python
from crewai import Agent, Task, Crew
from crewai.tools import tool
import httpx

ONECLAW_BASE = "https://api.1claw.xyz"

@tool
def fetch_api_key(vault_id: str, secret_path: str) -> str:
    """Fetch an API key from the 1claw vault for use in a task."""
    token = _get_agent_token()
    resp = httpx.get(
        f"{ONECLAW_BASE}/v1/vaults/{vault_id}/secrets/{secret_path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    return resp.json()["value"]

@tool
def sign_transaction(
    agent_id: str,
    chain: str,
    to: str,
    value: str,
    data: str = "0x",
) -> dict:
    """Sign and broadcast a transaction through 1claw's Intents API."""
    token = _get_agent_token()
    resp = httpx.post(
        f"{ONECLAW_BASE}/v1/agents/{agent_id}/transactions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "chain": chain,
            "to": to,
            "value": value,
            "data": data,
            "simulate_first": True,
        },
    )
    return resp.json()

# Create a crew with vault-aware, signing-capable agents
defi_agent = Agent(
    role="DeFi Operations Agent",
    goal="Execute yield farming strategies safely",
    tools=[fetch_api_key, sign_transaction],
    backstory="You manage DeFi positions using 1claw for secure signing.",
)

harvest_task = Task(
    description="Check pending rewards on the yield vault and harvest if above 0.1 ETH",
    agent=defi_agent,
)

crew = Crew(agents=[defi_agent], tasks=[harvest_task])
result = crew.kickoff()
```

## Security considerations for agent frameworks

### Never embed secrets in agent prompts

Bad:

```python
# DO NOT do this
agent.run("Use API key sk-abc123 to call the exchange API")
```

Good:

```python
# Agent fetches the key at runtime from the vault
agent.run("Fetch the exchange API key from the vault at apis/exchange-key, then call the exchange")
```

### Enable Shroud for LLM routing

If your agent framework routes LLM calls through an API, point them through Shroud for automatic secret redaction:

```bash
# Instead of:
export OPENAI_API_BASE=https://api.openai.com/v1

# Use:
export OPENAI_API_BASE=https://shroud.1claw.xyz/v1
```

Shroud strips any accidentally-leaked secrets from prompts before they reach the LLM provider. See [Shroud guide](/docs/guides/shroud).

### Set transaction guardrails

Every agent that signs transactions should have guardrails:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_to_allowlist": ["0xKnownContract..."],
    "tx_max_value_eth": "0.1",
    "tx_daily_limit_eth": "1.0",
    "tx_allowed_chains": ["base"],
    "tx_max_per_day": 50
  }'
```

### Use approval flows for high-risk actions

For agents that might take consequential actions (large transfers, contract deployments), set up human-in-the-loop approvals. See [Approvals guide](/docs/guides/approvals).

## Choosing your integration method

| Method | Best for | Setup time |
|--------|----------|------------|
| MCP server | Any framework with MCP support (LangChain, Cursor, Claude) | 2 minutes |
| SDK tools | Custom tool definitions, full control | 10 minutes |
| Plugin | elizaOS (dedicated plugin available) | 5 minutes |
| Direct API | Frameworks without SDK/MCP support | 15 minutes |

The MCP path is almost always the fastest. If your framework supports MCP tool servers, start there.

## Further reading

- [elizaOS plugin](/docs/guides/elizaos) for the dedicated elizaOS integration
- [MCP integration](/docs/guides/mcp-integration) for connecting via MCP
- [Intents API](/docs/guides/intents-api) for the full transaction signing reference
- [Shroud](/docs/guides/shroud) for LLM traffic inspection
- [Human-in-the-loop approvals](/docs/guides/approvals) for agent governance
