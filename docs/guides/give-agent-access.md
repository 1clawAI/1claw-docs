---
title: Give an agent access
description: "End-to-end walkthrough: create a vault and secret, register an agent, create a policy granting read, then have the agent fetch the secret."
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Give an agent access

This is the **golden path**: you create a secret, register an agent, grant it read access via a policy, then the agent fetches the secret at runtime.

## 1. Create a vault and secret (human)

Log in (email/password or Google), then:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Get token (see Quickstart for humans)
export TOKEN="..."

# Create vault
VAULT_RESP=$(curl -s -X POST https://api.1claw.xyz/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production","description":"Prod secrets"}')
VAULT_ID=$(echo "$VAULT_RESP" | jq -r '.id')

# Store a secret
curl -s -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","value":"sk-proj-..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_API_KEY,
});

const { data: vault } = await client.vault.create({
  name: "Production",
  description: "Prod secrets",
});

await client.secrets.set(vault.id, "api-keys/openai", "sk-proj-...", {
  type: "api_key",
});
```

</TabItem>
</Tabs>

## 2. Register an agent (human)

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
AGENT_RESP=$(curl -s -X POST https://api.1claw.xyz/v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Bot","description":"CI agent","scopes":["vaults:read"]}')
AGENT_ID=$(echo "$AGENT_RESP" | jq -r '.agent.id')
API_KEY=$(echo "$AGENT_RESP" | jq -r '.api_key')
# Store API_KEY securely; it is shown only once.
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const { data } = await client.agents.create({
  name: "My Bot",
  description: "CI agent",
  scopes: ["vaults:read"],
});
const agentId = data.agent.id;
const apiKey = data.api_key; // Store securely — shown only once
```

</TabItem>
</Tabs>

## 3. Create a policy (human)

Grant the agent read access to all secrets in the vault (or use a narrower pattern like `api-keys/*`):

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -s -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"secret_path_pattern\": \"**\",
    \"principal_type\": \"agent\",
    \"principal_id\": \"$AGENT_ID\",
    \"permissions\": [\"read\"]
  }"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.access.grantAgent(vault.id, agentId, ["read"], {
  secretPathPattern: "**",
});
```

</TabItem>
</Tabs>

## 4. Agent fetches the secret

From the agent's environment (with `AGENT_ID` and `API_KEY` stored securely):

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
# Get agent JWT
AGENT_TOKEN=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AGENT_ID\",\"api_key\":\"$API_KEY\"}" | jq -r '.access_token')

# Fetch secret
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

// In the agent's runtime
const agentClient = createClient({
  baseUrl: "https://api.1claw.xyz",
  agentId: process.env.ONECLAW_AGENT_ID,
  apiKey: process.env.ONECLAW_AGENT_API_KEY,
});

const { data: secret } = await agentClient.secrets.get(VAULT_ID, "api-keys/openai");
// Use secret.value — don't log or persist
```

</TabItem>
</Tabs>

The response includes the decrypted `value`. The agent uses it for the intended call and does not persist or log it.

## Summary

| Step | Who   | Action |
|------|--------|--------|
| 1    | Human | Create vault, store secret |
| 2    | Human | Register agent, save API key |
| 3    | Human | Create policy: agent + path pattern + read |
| 4    | Agent | Get token, GET secret by path |

To revoke: delete the policy or deactivate the agent. To rotate: create a new secret version (PUT) or rotate the agent key.

## Alternative: Agent self-enrollment

Instead of steps 1-2 above, the agent can **self-enroll** by calling a public endpoint with no credentials:

```bash
curl -s -X POST https://api.1claw.xyz/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","human_email":"you@example.com"}'
```

Or via the CLI:

```bash
npx @1claw/cli agent enroll my-agent --email you@example.com
```

The human receives the agent's credentials by email and still needs to create a policy (step 3). After that, the agent proceeds with step 4 as normal.

This is particularly useful when:
- The agent is deployed independently and doesn't have access to the human's dashboard.
- You're onboarding many agents that each need to register with their human counterpart.
- The agent is an AI assistant that wants to store and share secrets with its user.

See [Agent Self-Onboarding](/docs/guides/agent-self-onboarding) for the full agent-first flow, including sharing secrets back to the human.

For managing large numbers of agents, see [Managing Agent Fleets](/docs/guides/agent-fleet-management).
