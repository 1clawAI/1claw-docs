---
title: SDKs overview
description: Official SDKs for TypeScript, Python, and Go; curl and fetch examples work with any language.
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SDKs overview

Official clients for calling the 1Claw REST API from your own code. Pick the language that matches your service; all three handle agent JWT exchange and refresh the same way.

- **JavaScript/TypeScript** — `@1claw/sdk` for Node.js, Next.js, and browser apps. Types generated from the OpenAPI spec. See [JavaScript SDK](/docs/sdks/javascript).
- **Python** — `oneclaw` on PyPI for scripts, backends, and custom agents. See [Python SDK](/docs/sdks/python). For LangChain or CrewAI, use [langchain-1claw](/docs/integrations/langchain) or [1claw-crewai-tools](/docs/integrations/crewai) instead.
- **Go** — `1claw-go-sdk` for services and infrastructure written in Go. See [Go SDK](/docs/sdks/go).
- **elizaOS** — `@1claw/plugin-elizaos` adds vault and signing actions to elizaOS characters. See [GitHub](https://github.com/1clawAI/1claw-elizaos-plugin).
- **curl / HTTP** — Every endpoint is REST. See [curl examples](/docs/sdks/curl-examples).

If you're connecting Cursor or Claude Desktop to a vault, start with [MCP integration](/docs/integrations/mcp-integration) instead of an SDK.

**API contract:** The canonical source of truth is the **OpenAPI 3.1** spec, published as [@1claw/openapi-spec](https://www.npmjs.com/package/@1claw/openapi-spec).

## Quick example

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Fetch a secret
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.co",
  apiKey: process.env.ONECLAW_API_KEY,
});

const { data: secret } = await client.secrets.get(VAULT_ID, "api-keys/openai");
console.log(secret.value);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from oneclaw import create_client

client = create_client(api_key="1ck_...")
secret = client.secrets.get(VAULT_ID, "api-keys/openai")
print(secret.data["value"])
```

</TabItem>
</Tabs>
