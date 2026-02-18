---
title: Give an agent access
description: "End-to-end walkthrough: create a vault and secret, register an agent, create a policy granting read, then have the agent fetch the secret."
sidebar_position: 0
---

# Give an agent access

This is the **golden path**: you create a secret, register an agent, grant it read access via a policy, then the agent fetches the secret at runtime.

## 1. Create a vault and secret (human)

Log in (email/password or Google), then:

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

## 2. Register an agent (human)

```bash
AGENT_RESP=$(curl -s -X POST https://api.1claw.xyz/v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Bot","description":"CI agent","scopes":["vaults:read"]}')
AGENT_ID=$(echo "$AGENT_RESP" | jq -r '.agent.id')
API_KEY=$(echo "$AGENT_RESP" | jq -r '.api_key')
# Store API_KEY securely; it is shown only once.
```

## 3. Create a policy (human)

Grant the agent read access to all secrets in the vault (or use a narrower pattern like `api-keys/*`):

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

## 4. Agent fetches the secret

From the agent’s environment (with `AGENT_ID` and `API_KEY` stored securely):

```bash
# Get agent JWT
AGENT_TOKEN=$(curl -s -X POST https://api.1claw.xyz/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AGENT_ID\",\"api_key\":\"$API_KEY\"}" | jq -r '.access_token')

# Fetch secret
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

The response includes the decrypted `value`. The agent uses it for the intended call and does not persist or log it.

## Summary

| Step | Who   | Action |
|------|--------|--------|
| 1    | Human | Create vault, store secret |
| 2    | Human | Register agent, save API key |
| 3    | Human | Create policy: agent + path pattern + read |
| 4    | Agent | Get token, GET secret by path |

To revoke: delete the policy or deactivate the agent. To rotate: create a new secret version (PUT) or rotate the agent key.
