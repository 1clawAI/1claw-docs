---
title: Agent Memory
description: Three-tier encrypted memory system for AI agents — scratch, durable, and semantic.
sidebar_label: "Agent Memory — scratch, durable, semantic storage"
---

# Agent Memory

Agent Memory gives your AI agents persistent, encrypted storage across sessions. Three tiers serve different needs — from ephemeral scratch pads to vector-indexed knowledge bases.

## Three tiers

| Tier | Persistence | Use case | Search |
|------|-------------|----------|--------|
| **Scratch** | TTL-based (auto-expires) | Working memory, temp calculations | Key lookup |
| **Durable** | Permanent until deleted | Conversation history, user preferences | Key lookup |
| **Semantic** | Permanent + vector-indexed | Knowledge base, RAG retrieval | Similarity search |

All tiers are encrypted at rest with the org's KEK via envelope encryption (AES-256-GCM).

## Enable memory on an agent

### Dashboard

1. Go to **Agents → [your agent] → Settings**
2. Toggle **Agent Memory** on
3. Optionally configure namespace allowlist

### CLI

```bash
1claw agent update <agent-id> --memory-enabled true
```

### SDK

```typescript
await client.agents.update(agentId, {
  memory_enabled: true,
  memory_namespace_allowlist: [], // empty = unrestricted
});
```

## Use via SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  agentId: "agent-uuid",
  apiKey: "ocv_...",
});

// Write to durable memory
await client.memory.put(agentId, "preferences", "theme", {
  value: JSON.stringify({ darkMode: true, language: "en" }),
  tier: "durable",
});

// Read
const entry = await client.memory.get(agentId, "preferences", "theme");
console.log(entry.value); // '{"darkMode":true,"language":"en"}'

// List entries in a namespace
const entries = await client.memory.list(agentId, "preferences");

// Delete
await client.memory.delete(agentId, "preferences", "theme");

// Semantic search
const results = await client.memory.search(agentId, {
  namespace: "knowledge",
  query: "How does envelope encryption work?",
  top_k: 5,
});
```

## Use via MCP

The 1Claw MCP server provides memory tools:

```
put_memory     — Store a value
get_memory     — Retrieve a value
list_memory    — List entries in a namespace
delete_memory  — Remove an entry
search_memory  — Semantic similarity search
```

Example MCP usage (from an AI agent):

```
Use the put_memory tool to store this conversation summary
in the "sessions" namespace with key "2024-01-15".
```

## Use via CLI

```bash
# Store a value
1claw memory put <agent-id> conversations/session-1 \
  --value "User asked about pricing" \
  --tier durable

# Retrieve
1claw memory get <agent-id> conversations/session-1

# List namespace
1claw memory list <agent-id> conversations

# Delete
1claw memory delete <agent-id> conversations/session-1

# Semantic search
1claw memory search <agent-id> \
  --namespace knowledge \
  --query "encryption methods" \
  --top-k 5
```

## Framework adapters

Pre-built adapters for popular AI frameworks:

| Framework | Adapter | Location |
|-----------|---------|----------|
| **LangChain** | `OneclawMemory` (BaseMemory) | `packages/agent-templates/adapters/langchain/` |
| **CrewAI** | `OneclawStorage` | `packages/agent-templates/adapters/crewai/` |
| **ElizaOS** | `OneclawMemoryAdapter` | `packages/agent-templates/adapters/elizaos/` |

### LangChain example

```python
from oneclaw_langchain import OneclawMemory
from langchain.chains import ConversationChain
from langchain_openai import ChatOpenAI

memory = OneclawMemory(namespace="conversations", tier="durable")
chain = ConversationChain(llm=ChatOpenAI(), memory=memory)
chain.invoke({"input": "Hello!"})
```

### CrewAI example

```python
from oneclaw_crewai import OneclawStorage

storage = OneclawStorage(namespace="crew-research")
storage.save("findings", {"papers_read": 42, "summary": "..."})
```

### ElizaOS example

```typescript
import { OneclawMemoryAdapter } from "./adapter";

const memory = new OneclawMemoryAdapter({
  namespace: "eliza-agent",
  tier: "durable",
});

await memory.set("user-profile", { name: "Alice" });
const profile = await memory.get("user-profile");
```

## Namespace management

Namespaces organize memory entries (like folders). An agent can have up to 100 namespaces.

```bash
# List all namespaces
1claw memory list <agent-id>

# Restrict which namespaces an agent can write to
1claw agent update <agent-id> \
  --memory-namespace-allowlist "conversations,knowledge,scratch"
```

When `memory_namespace_allowlist` is empty (default), the agent can create any namespace. When non-empty, writes to unlisted namespaces return 403.

## Semantic search

The semantic tier uses `pgvector` with 1536-dimensional embeddings for similarity search. Embeddings are generated automatically when you write to a semantic-tier namespace.

```typescript
// Write knowledge
await client.memory.put(agentId, "docs", "encryption", {
  value: "1Claw uses AES-256-GCM envelope encryption with Cloud KMS",
  tier: "semantic",
});

// Search
const results = await client.memory.search(agentId, {
  namespace: "docs",
  query: "how are secrets encrypted?",
  top_k: 3,
});
// [{ key: "encryption", value: "...", score: 0.94 }]
```

## Quotas per tier

| Billing tier | Max entries/agent | Max namespaces | Semantic search |
|-------------|-------------------|----------------|-----------------|
| Free | 10,000 | 100 | No |
| Pro | 10,000 | 100 | Yes |
| Team | 10,000 | 100 | Yes |
| Business | 10,000 | 100 | Yes |
| Enterprise | Custom | Custom | Yes |

- Maximum value size: 64 KB per entry
- Scratch tier entries are reaped every 60 seconds after TTL expiry

## Next steps

- [Automations](/docs/guides/automations) — trigger memory operations on a schedule
- [Cloud Runtimes](/docs/guides/runtimes) — deploy agents with memory enabled
- [Framework adapters](#framework-adapters) — integrate with LangChain, CrewAI, ElizaOS
