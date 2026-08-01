---
title: Agent Memory
description: Three-tier memory system for AI agents — scratch (ephemeral), durable (persistent), and semantic (vector-indexed) — encrypted at rest with envelope encryption.
sidebar_position: 22
---

# Agent Memory

Agent Memory provides a three-tier storage system so your AI agents can remember context across sessions, store intermediate results, and perform similarity search over past interactions. All memory values are encrypted at rest using envelope encryption with your org's KEK.

:::info Requirements
Agent Memory is available on all tiers. Semantic search requires **Pro or higher**. See [Tier Limits](#tier-limits) below.
:::

## Overview

| Tier | Persistence | Use Case | Indexing |
|---|---|---|---|
| **Scratch** | TTL-based (auto-expires) | Temporary state, session context, intermediate results | Key-value |
| **Durable** | Permanent until deleted | Long-term facts, preferences, learned behaviors | Key-value |
| **Semantic** | Permanent until deleted | Knowledge base, conversation history for RAG | Vector (1536-dim) |

---

## Enabling Memory

Memory must be enabled per-agent. Set `memory_enabled: true` when creating or updating an agent:

```bash
curl -X PATCH "https://api.1claw.xyz/v1/agents/AGENT_UUID" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "memory_enabled": true,
    "memory_namespace_allowlist": ["session", "knowledge", "preferences"]
  }'
```

| Field | Type | Default | Description |
|---|---|---|---|
| `memory_enabled` | boolean | `false` | Enable memory for this agent |
| `memory_namespace_allowlist` | string[] | `[]` (unrestricted) | Limit namespaces the agent can use |

:::tip Namespace allowlists
When set, the agent can only read/write to the listed namespaces. Empty means unrestricted. Use allowlists for multi-tenant agents to prevent namespace collisions.
:::

---

## Namespaces

Namespaces organize memory entries into logical groups. Think of them like folders or buckets.

```
agent-memory/
├── session/          ← scratch: current conversation state
├── preferences/      ← durable: user preferences, config
├── knowledge/        ← semantic: indexed facts for RAG
└── tool-outputs/     ← durable: cached tool results
```

### List namespaces

```bash
curl "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory" \
  -H "Authorization: Bearer AGENT_JWT"
```

Response:

```json
{
  "namespaces": [
    { "name": "session", "entry_count": 12 },
    { "name": "knowledge", "entry_count": 847 },
    { "name": "preferences", "entry_count": 5 }
  ]
}
```

---

## CRUD Operations

### Put (upsert) a memory entry

```bash
curl -X PUT "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/session/current-task" \
  -H "Authorization: Bearer AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "Researching ETH/USDC liquidity pools on Uniswap v3",
    "tier": "scratch",
    "ttl_seconds": 3600
  }'
```

| Field | Type | Default | Description |
|---|---|---|---|
| `value` | string | required | Memory content (max 64 KB) |
| `tier` | string | `"durable"` | `scratch`, `durable`, or `semantic` |
| `ttl_seconds` | integer | `null` | Auto-delete after N seconds (scratch tier only) |

### Get a memory entry

```bash
curl "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/session/current-task" \
  -H "Authorization: Bearer AGENT_JWT"
```

Response:

```json
{
  "namespace": "session",
  "key": "current-task",
  "value": "Researching ETH/USDC liquidity pools on Uniswap v3",
  "tier": "scratch",
  "ttl_expires_at": "2026-08-01T16:00:00Z",
  "created_at": "2026-08-01T15:00:00Z",
  "updated_at": "2026-08-01T15:00:00Z"
}
```

### List entries in a namespace

```bash
curl "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/knowledge?limit=50" \
  -H "Authorization: Bearer AGENT_JWT"
```

### Delete a memory entry

```bash
curl -X DELETE "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/session/current-task" \
  -H "Authorization: Bearer AGENT_JWT"
```

---

## TTL (Scratch Tier)

Scratch entries auto-expire after the specified TTL. Use them for:

- Current conversation state
- Intermediate computation results
- Short-lived cache entries
- Session tokens that should self-destruct

The `memory_ttl_reaper` background worker runs every 60 seconds and deletes expired entries. If no `ttl_seconds` is provided for a scratch entry, it defaults to 1 hour.

```typescript
// Store scratch memory that expires in 15 minutes
await client.memory.put(agentId, "session", "context", {
  value: JSON.stringify({ messages: lastFiveMessages }),
  tier: "scratch",
  ttl_seconds: 900,
});
```

---

## Semantic Search

Semantic-tier entries are automatically embedded into 1536-dimensional vectors (via pgvector) for similarity search. Use this for RAG, knowledge retrieval, and finding related past interactions.

### Store a semantic entry

```bash
curl -X PUT "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/knowledge/eth-staking-101" \
  -H "Authorization: Bearer AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "Ethereum staking requires a minimum of 32 ETH. Validators earn rewards for proposing and attesting to blocks. Staking APY varies between 3-5% depending on network participation.",
    "tier": "semantic"
  }'
```

### Search by similarity

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/AGENT_UUID/memory/search" \
  -H "Authorization: Bearer AGENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "knowledge",
    "query": "How much ETH do I need to stake?",
    "top_k": 5
  }'
```

Response:

```json
{
  "results": [
    {
      "namespace": "knowledge",
      "key": "eth-staking-101",
      "value": "Ethereum staking requires a minimum of 32 ETH...",
      "score": 0.92,
      "created_at": "2026-07-15T10:00:00Z"
    }
  ]
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `namespace` | string | required | Namespace to search within |
| `query` | string | required | Natural language query |
| `top_k` | integer | `10` | Max results to return |

---

## Encryption

All memory values are encrypted at rest using envelope encryption:

1. A unique per-entry DEK (data encryption key) is generated
2. The value is encrypted with AES-256-GCM using the DEK
3. The DEK is wrapped (encrypted) with the org's shared KEK in Google Cloud KMS
4. Both the wrapped DEK and encrypted value are stored in the database

This means memory contents are never stored in plaintext, and the KMS key never leaves the HSM boundary.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/v1/agents/{id}/memory` | List namespaces |
| GET | `/v1/agents/{id}/memory/{namespace}` | List entries in namespace |
| PUT | `/v1/agents/{id}/memory/{namespace}/{key}` | Upsert entry |
| GET | `/v1/agents/{id}/memory/{namespace}/{key}` | Get entry |
| DELETE | `/v1/agents/{id}/memory/{namespace}/{key}` | Delete entry |
| POST | `/v1/agents/{id}/memory/search` | Semantic search |

---

## SDK

```typescript
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: "AGENT_UUID",
  apiKey: "ocv_AGENT_KEY",
});

// Store durable memory
await client.memory.put(agentId, "preferences", "risk-tolerance", {
  value: JSON.stringify({ maxSlippage: 0.5, maxGas: 50 }),
  tier: "durable",
});

// Store scratch memory with TTL
await client.memory.put(agentId, "session", "current-task", {
  value: "Monitoring ETH price for entry",
  tier: "scratch",
  ttl_seconds: 300,
});

// Store semantic memory
await client.memory.put(agentId, "knowledge", "defi-lesson-1", {
  value: "Impermanent loss occurs when the price ratio of pooled tokens changes...",
  tier: "semantic",
});

// Retrieve
const entry = await client.memory.get(agentId, "preferences", "risk-tolerance");

// Search semantically
const results = await client.memory.search(agentId, {
  namespace: "knowledge",
  query: "What is impermanent loss?",
  top_k: 3,
});

// List namespaces
const namespaces = await client.memory.listNamespaces(agentId);

// List entries
const entries = await client.memory.list(agentId, "session");

// Delete
await client.memory.delete(agentId, "session", "current-task");
```

---

## CLI

```bash
# Store a memory entry
1claw memory put AGENT_ID session current-task \
  --value "Processing batch job" --tier scratch --ttl 600

# Get an entry
1claw memory get AGENT_ID preferences risk-tolerance

# List entries in a namespace
1claw memory list AGENT_ID knowledge

# Search semantically
1claw memory search AGENT_ID --namespace knowledge \
  --query "What is impermanent loss?" --top-k 5

# Delete
1claw memory delete AGENT_ID session current-task
```

---

## MCP Tools

| Tool | Description |
|---|---|
| `put_memory` | Store or update a memory entry |
| `get_memory` | Retrieve a memory entry by namespace and key |
| `list_memory` | List entries in a namespace |
| `delete_memory` | Delete a memory entry |
| `search_memory` | Semantic similarity search |

---

## Tier Limits

| Tier | Max Entries / Agent | Namespaces | Semantic Search |
|---|---|---|---|
| Free | 1,000 | 10 | No |
| Pro | 10,000 | 100 | Yes |
| Team | 10,000 | 100 | Yes |
| Business | 10,000 | 100 | Yes |
| Enterprise | Custom | Custom | Yes |

Additional limits:
- Max value size: 64 KB per entry
- Max namespaces per agent: 100
- Max entries per agent: 10,000

---

## Best Practices

1. **Use scratch for conversation state** — set short TTLs (5–15 min) so stale context auto-cleans.
2. **Use durable for learned preferences** — facts about user behavior, configuration, calibration values.
3. **Use semantic for knowledge bases** — store factual content that benefits from similarity retrieval.
4. **Namespace by concern** — separate `session`, `knowledge`, `preferences`, and `tool-cache` to avoid key collisions.
5. **Set namespace allowlists for multi-tenant agents** — prevent one user's data from leaking into another namespace.
6. **Keep values under 10 KB for semantic tier** — embeddings work best on focused, single-topic content. Split long documents into paragraphs.
