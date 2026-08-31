---
title: curl examples
description: Example curl commands for 1claw auth, vaults, secrets, and agents; works with any environment that has curl.
sidebar_position: 3
---

# curl examples

Base URL used: `https://api.1claw.co`. Replace with your Cloud Run URL if different.

## Human: get JWT

```bash
curl -s -X POST https://api.1claw.co/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
# Save access_token as $TOKEN
```

## Human: create vault and secret

```bash
export TOKEN="<access_token>"

# Create vault
curl -s -X POST https://api.1claw.co/v1/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Vault","description":"Secrets"}'

# Store secret (use vault id from response)
export VAULT_ID="<vault_id>"
curl -s -X PUT "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","value":"sk-proj-..."}'

# Read secret
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

## Agent: get JWT and read secret

```bash
curl -s -X POST https://api.1claw.co/v1/auth/agent-token \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<uuid>","api_key":"ocv_..."}'
# Save access_token

export TOKEN="<agent_access_token>"
export VAULT_ID="<vault_id>"
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

## Agent: self-enroll

```bash
# With human email (pending enrollment; Allow/Deny emailed; response may include approval_url)
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","human_email":"you@example.com"}'

# Name only (response includes approval_url; human approves while signed in)
curl -s -X POST https://api.1claw.co/v1/agents/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'
# API key is emailed after approval — not returned from enroll
```

## List secrets (metadata only)

```bash
curl -s "https://api.1claw.co/v1/vaults/$VAULT_ID/secrets" \
  -H "Authorization: Bearer $TOKEN"
```

## Create policy (grant agent read)

```bash
curl -s -X POST "https://api.1claw.co/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "secret_path_pattern": "**",
    "principal_type": "agent",
    "principal_id": "<agent_uuid>",
    "permissions": ["read"]
  }'
```
