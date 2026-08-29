---
title: LangChain integration
description: Official langchain-1claw package for vault secrets, encrypted memory, signing, and automations in LangChain agents.
sidebar_position: 1
---

# LangChain

If your LangChain agent needs API keys, wallet signing, or memory that outlives a single chat session, you have two bad defaults: paste secrets into `.env` and hope nothing leaks, or hand-roll HTTP calls against the 1Claw API in every project.

[`langchain-1claw`](https://pypi.org/project/langchain-1claw/) is the official package. It wraps the agent API as LangChain tools, a chat message history, and a memory retriever. You pass an `ocv_` agent key, call `get_all_tools()`, and wire the result into LangGraph or a tool-calling agent. Secrets stay in the vault. Signing happens server-side. Memory is encrypted and searchable.

## Install

```bash
pip install langchain-1claw
```

## Prerequisites

1. A [1Claw](https://1claw.co) account with a vault and at least one secret path your agent can read.
2. An agent registered in your org with an `ocv_` API key.
3. Access policies that grant the agent read (and write, if needed) on the paths you expect the tools to touch.

## Quick start

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

from langchain_1claw import OneclawClient, get_all_tools

client = OneclawClient(api_key="ocv_your_agent_key")
tools = get_all_tools(client)

llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You have access to a secure vault, signing keys, and encrypted memory."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "List the API keys we have stored."})
print(result["output"])
```

`agent_id` and `vault_id` are optional. When omitted, the client resolves them from the token exchange response.

## What you get

| Category | Tools |
|----------|-------|
| Secrets | get, put, list, rotate |
| Memory | put, get, semantic search |
| Signing | EIP-191 message sign, multi-chain transactions, balance check |
| Automations | trigger workflow runs |

Plus `OneclawChatMessageHistory` for durable conversation storage and `OneclawMemoryRetriever` for RAG over agent memory.

## MCP alternative

If you already run LangChain with MCP adapters, you can point at the hosted 1Claw MCP server instead of installing this package. That path auto-discovers a larger tool set but adds a network hop. See [Agent frameworks](/docs/integrations/agent-frameworks#langchain) for MCP setup.

For most Python LangChain projects, `langchain-1claw` is simpler: typed tools, no MCP server to run, and the same policy gates on the backend.

## Links

- PyPI: [langchain-1claw](https://pypi.org/project/langchain-1claw/)
- Source: [github.com/1clawAI/langchain-1claw](https://github.com/1clawAI/langchain-1claw)
- Broader framework guide: [Agent frameworks](/docs/integrations/agent-frameworks)
