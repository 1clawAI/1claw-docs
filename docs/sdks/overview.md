---
title: SDKs overview
description: Official SDKs for TypeScript, Python, and Go; curl and fetch examples work with any language.
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SDKs overview

- **JavaScript/TypeScript** — Official `@1claw/sdk`. Built from the same OpenAPI 3.1 spec as the API; supports agent auth, secrets, billing, and optional x402. See [JavaScript SDK](/docs/sdks/javascript).
- **Python** — Official `oneclaw` package on PyPI. Agent JWT auto-refresh, vaults, secrets, Intents API, Execution Intents, and more. See [Python SDK](/docs/sdks/python).
- **Go** — Official `1claw-go-sdk`. Typed client with agent auth, secrets, billing, Intents API, and more. See [Go SDK](/docs/sdks/go).
- **elizaOS** — Official plugin `@1claw/plugin-elizaos`. Gives any elizaOS character vault secrets and multi-chain signing via 8 built-in actions. See [GitHub](https://github.com/1clawAI/1claw-elizaos-plugin).
- **curl / HTTP** — All endpoints are REST; you can use curl, fetch, or any HTTP client. See [curl examples](/docs/sdks/curl-examples).

**API contract:** The canonical source of truth for the API is the **OpenAPI 3.1** spec. It is published as the npm package [@1claw/openapi-spec](https://www.npmjs.com/package/@1claw/openapi-spec) (YAML and JSON) and is used to generate the SDK's types and to validate requests. For a concise endpoint list, see [API reference](/docs/reference/api-reference).

## Quick example

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Fetch a secret
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
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
