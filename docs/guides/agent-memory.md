---
title: Agent Memory
description: Three-tier memory system for AI agents — scratch (ephemeral), durable (persistent KV), and semantic (vector search). Encrypted at rest.
sidebar_label: "Agent Memory — scratch, durable, semantic storage"
sidebar_position: 22
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent Memory

Agent Memory gives your agents persistent state across sessions. Three tiers cover different use cases — from ephemeral scratch pads to searchable long-term knowledge.

## Memory tiers

| Tier | Persistence | Use case | Search |
|------|------------|----------|--------|
| **Scratch** | TTL-based (auto-expires) | Session context, temp results | Key lookup |
| **Durable** | Permanent until deleted | Preferences, config, facts | Key lookup |
| **Semantic** | Permanent + vector-indexed | Knowledge base, RAG context | Similarity search |

All tiers are **encrypted at rest** with the org's KEK via envelope encryption (same pattern as vault secrets).

## Quickstart

### Enable memory on an agent

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "memory_enabled": true }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.agents.update(agentId, { memory_enabled: true });
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw agent update <agent-id> --memory-enabled true
```

</TabItem>
</Tabs>

### Store and retrieve

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});

// Write scratch memory (auto-expires in 1 hour)
await client.memory.put(agentId, {
  namespace: "session",
  key: "last-query",
  value: "What is the weather in NYC?",
  tier: "scratch",
  ttl_seconds: 3600,
});

// Write durable memory
await client.memory.put(agentId, {
  namespace: "preferences",
  key: "timezone",
  value: "America/New_York",
  tier: "durable",
});

// Write semantic memory (auto-embedded for vector search)
await client.memory.put(agentId, {
  namespace: "knowledge",
  key: "api-limits",
  value: "The 1Claw free tier allows 1000 requests per month and 3 vaults.",
  tier: "semantic",
});

// Read
const { data } = await client.memory.get(agentId, "preferences", "timezone");
console.log(data.value); // "America/New_York"

// Semantic search
const { data: results } = await client.memory.search(agentId, {
  namespace: "knowledge",
  query: "how many vaults can I create?",
  top_k: 5,
});
results.entries.forEach((e) => console.log(e.key, e.score));
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
# Write durable memory
curl -X PUT "https://api.1claw.xyz/v1/agents/$AGENT_ID/memory/preferences/timezone" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "value": "America/New_York", "tier": "durable" }'

# Read
curl "https://api.1claw.xyz/v1/agents/$AGENT_ID/memory/preferences/timezone" \
  -H "Authorization: Bearer $AGENT_TOKEN"

# Semantic search
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/memory/search" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "namespace": "knowledge", "query": "how many vaults?", "top_k": 5 }'
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
# Write
1claw memory put <agent-id> --namespace preferences --key timezone --value "America/New_York" --tier durable

# Read
1claw memory get <agent-id> --namespace preferences --key timezone

# List entries in a namespace
1claw memory list <agent-id> --namespace preferences

# Search
1claw memory search <agent-id> --namespace knowledge --query "how many vaults?"

# Delete
1claw memory delete <agent-id> --namespace session --key last-query
```

</TabItem>
</Tabs>

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/memory` | List namespaces |
| `GET` | `/v1/agents/{id}/memory/{namespace}` | List entries in namespace |
| `PUT` | `/v1/agents/{id}/memory/{namespace}/{key}` | Upsert entry |
| `GET` | `/v1/agents/{id}/memory/{namespace}/{key}` | Get entry |
| `DELETE` | `/v1/agents/{id}/memory/{namespace}/{key}` | Delete entry |
| `POST` | `/v1/agents/{id}/memory/search` | Semantic search |

## Namespaces

Memory is organized into namespaces — logical groupings like `session`, `preferences`, `knowledge`, etc. Agents can be restricted to specific namespaces via `memory_namespace_allowlist`:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "memory_namespace_allowlist": ["session", "preferences", "knowledge"] }'
```

When the allowlist is empty (default), the agent can use any namespace.

## Scratch memory (TTL)

Scratch entries auto-expire after their TTL. Use for:
- Session context that shouldn't outlive a conversation
- Temporary computation results
- Rate-limit tracking or cooldown flags

```typescript
await client.memory.put(agentId, {
  namespace: "session",
  key: "conversation-context",
  value: JSON.stringify({ topic: "refactoring", files: ["main.ts"] }),
  tier: "scratch",
  ttl_seconds: 1800, // 30 minutes
});
```

A background worker reaps expired entries every 60 seconds.

## Semantic search

Semantic-tier entries are automatically embedded (1536-dimensional vectors via pgvector). Search returns entries ranked by cosine similarity:

```json
{
  "entries": [
    { "key": "api-limits", "value": "The 1Claw free tier...", "score": 0.92 },
    { "key": "pricing-faq", "value": "Pro plan includes...", "score": 0.85 }
  ]
}
```

Use for RAG (Retrieval-Augmented Generation), knowledge bases, or any scenario where natural-language lookup is more useful than exact key matching.

## MCP tools

| Tool | Description |
|------|-------------|
| `put_memory` | Write a memory entry |
| `get_memory` | Read a memory entry |
| `list_memory` | List entries in a namespace |
| `delete_memory` | Delete a memory entry |
| `search_memory` | Semantic similarity search |

## Limits

| Constraint | Value |
|-----------|-------|
| Max value size | 64 KB |
| Max entries per agent | 10,000 |
| Max namespaces per agent | 100 |
| Vector dimensions | 1536 |

## Encryption

All memory values are encrypted with a per-entry DEK (data encryption key) via envelope encryption — the same mechanism used for vault secrets. The DEK is wrapped with the org's shared KEK in Cloud KMS. At rest, memory values are AES-256-GCM ciphertext.

## Agent config fields

| Field | Type | Description |
|-------|------|-------------|
| `memory_enabled` | `boolean` | Enable/disable memory for this agent (default: `false`) |
| `memory_namespace_allowlist` | `string[]` | Restrict namespaces the agent can access (empty = all) |
| `default_llm_provider` | `string` | LLM provider for embeddings (optional) |
| `default_llm_model` | `string` | Model for embeddings (optional) |

## Dashboard

The agent detail page shows a **Memory** card with:
- Namespace browser (tree view)
- Entry viewer with value preview
- Write/delete controls
- Search interface for semantic namespaces

## Next steps

- [Cloud Runtimes](/docs/guides/runtimes) — deploy an agent that uses memory across restarts
- [Automations](/docs/guides/automations) — trigger memory cleanup on a schedule
- [Shroud](/docs/guides/shroud) — route LLM embeddings through the proxy
