---
title: Agent Discovery
description: Publish agent cards to the public directory with A2A and MCP URLs. Make your agents discoverable and composable.
sidebar_label: "Agent Discovery — directory, A2A, MCP"
sidebar_position: 23
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Agent Discovery

Agent Discovery lets you publish agents to a public directory so other developers, agents, and platforms can find and connect to them. Each agent gets a **card** — a structured profile with capabilities, tags, and protocol URLs.

## Overview

| Feature | Description |
|---------|-------------|
| **Agent Card** | Public JSON profile at `GET /v1/agents/{id}/card` |
| **Directory** | Searchable, filterable listing at `GET /v1/agents/directory` |
| **A2A URL** | Agent-to-Agent protocol endpoint (Google A2A) |
| **MCP URL** | Model Context Protocol server URL |
| **Tags** | Categorize agents for filtered search |
| **Marketplace** | Platform apps listed with categories and screenshots |

## Enable discoverability

By default, agents are private. To publish an agent to the directory:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PATCH "https://api.1claw.co/v1/agents/$AGENT_ID/discovery" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discoverable": true,
    "public_description": "A DeFi research agent that analyzes token metrics and on-chain data.",
    "public_tags": ["defi", "research", "analytics"],
    "a2a_url": "https://my-agent.run.1claw.co/a2a",
    "mcp_url": "https://my-agent.run.1claw.co/mcp"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.discovery.updateDiscovery(agentId, {
  discoverable: true,
  public_description: "A DeFi research agent that analyzes token metrics.",
  public_tags: ["defi", "research", "analytics"],
  a2a_url: "https://my-agent.run.1claw.co/a2a",
  mcp_url: "https://my-agent.run.1claw.co/mcp",
});
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw directory update <agent-id> \
  --discoverable \
  --description "A DeFi research agent" \
  --tags defi,research,analytics \
  --a2a-url "https://my-agent.run.1claw.co/a2a" \
  --mcp-url "https://my-agent.run.1claw.co/mcp"
```

</TabItem>
</Tabs>

Only human users can update discovery settings — agents cannot make themselves discoverable.

## Agent card

Every discoverable agent has a public card (no authentication required):

```bash
curl "https://api.1claw.co/v1/agents/$AGENT_ID/card"
```

```json
{
  "id": "550e8400-...",
  "name": "DeFi Researcher",
  "description": "Analyzes token metrics and on-chain data.",
  "tags": ["defi", "research", "analytics"],
  "a2a_url": "https://my-agent.run.1claw.co/a2a",
  "mcp_url": "https://my-agent.run.1claw.co/mcp",
  "capabilities": ["secrets", "signing", "memory"]
}
```

## Directory search

The directory is public and supports full-text search and tag filtering:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Search by query
curl "https://api.1claw.co/v1/agents/directory?q=defi&tags=research"

# Paginated listing
curl "https://api.1claw.co/v1/agents/directory?limit=20&offset=0"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.discovery.directory({
  q: "defi",
  tags: ["research"],
  limit: 20,
});
data.agents.forEach((a) => console.log(a.name, a.tags));
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw directory search --query "defi" --tags research
1claw directory card <agent-id>
```

</TabItem>
</Tabs>

## Platform marketplace

Platform apps can also be listed in the marketplace with additional metadata:

```bash
curl "https://api.1claw.co/v1/platform/marketplace"
```

Each listing includes `category`, `listing_tags`, `pricing_summary`, and optional screenshots.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/agents/{id}/card` | Public | Get agent card |
| `GET` | `/v1/agents/directory` | Public | Search directory |
| `PATCH` | `/v1/agents/{id}/discovery` | Human-only | Update discovery settings |
| `GET` | `/v1/platform/marketplace` | Public | Browse platform apps |

## MCP tool

| Tool | Description |
|------|-------------|
| `search_agent_directory` | Search the public directory with query and tag filters |

## Agent discovery fields

| Field | Type | Description |
|-------|------|-------------|
| `discoverable` | `boolean` | Whether the agent appears in the directory (default: `false`) |
| `public_description` | `string` | Description shown in the card and directory |
| `public_tags` | `string[]` | Tags for filtering (e.g. `["defi", "nft"]`) |
| `a2a_url` | `string` | Agent-to-Agent protocol endpoint URL |
| `mcp_url` | `string` | MCP server URL for this agent |

## Dashboard

Navigate to the agent detail page and find the **Discovery** section to:
- Toggle discoverability
- Edit the public description and tags
- Set A2A and MCP URLs
- Preview the agent card

The public directory is also browsable at `/directory` in the dashboard.

## Next steps

- [Cloud Runtimes](/docs/runtimes/overview) — deploy an agent with a public hosting URL
- [Runtime Hosting](/docs/runtimes/hosting) — expose your agent's A2A/MCP endpoints
- [Platform API](/docs/platform-api/overview) — list your platform app in the marketplace
