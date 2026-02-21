---
title: API & MCP Testing
description: Complete guide to testing the 1claw API and MCP server using curl, including every endpoint group with working examples.
sidebar_position: 1
---

# API & MCP Testing

This page provides ready-to-run `curl` commands for every area of the 1claw API and MCP server. Use these to verify your deployment, debug integrations, or explore the API interactively.

## Setup

Set these environment variables before running the examples:

```bash
export API="https://api.1claw.xyz"
```

---

## 1. Health checks (no auth required)

```bash
# Service health
curl -s "$API/v1/health" | python3 -m json.tool

# HSM connectivity
curl -s "$API/v1/health/hsm" | python3 -m json.tool
```

Expected: `{ "status": "ok" }` for both.

---

## 2. Authentication

### Sign up (new account)

```bash
curl -s -X POST "$API/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourSecurePassword123!"}' \
  | python3 -m json.tool
```

### Email/password login

```bash
curl -s -X POST "$API/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourSecurePassword123!"}' \
  | python3 -m json.tool
```

Save the `access_token`:

```bash
export TOKEN=$(curl -s -X POST "$API/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### Google OAuth login

```bash
curl -s -X POST "$API/v1/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"id_token":"<google-id-token>"}' \
  | python3 -m json.tool
```

### Refresh token

```bash
curl -s -X POST "$API/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}' \
  | python3 -m json.tool
```

### Revoke token

```bash
curl -s -X DELETE "$API/v1/auth/token" \
  -H "Authorization: Bearer $TOKEN"
```

### Change password

```bash
curl -s -X POST "$API/v1/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"old","new_password":"new"}' \
  | python3 -m json.tool
```

---

## 3. Personal API Keys

```bash
# Create an API key
curl -s -X POST "$API/v1/auth/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-ci-key"}' \
  | python3 -m json.tool

# List API keys
curl -s "$API/v1/auth/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Exchange API key for JWT
curl -s -X POST "$API/v1/auth/api-key-token" \
  -H "Content-Type: application/json" \
  -d '{"api_key":"1claw_..."}' \
  | python3 -m json.tool

# Revoke an API key
curl -s -X DELETE "$API/v1/auth/api-keys/<key_id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Vaults

```bash
# Create vault
curl -s -X POST "$API/v1/vaults" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-vault","description":"Testing"}' \
  | python3 -m json.tool

# List vaults
curl -s "$API/v1/vaults" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Get a specific vault
export VAULT_ID="<vault-id-from-create>"
curl -s "$API/v1/vaults/$VAULT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Delete vault
curl -s -X DELETE "$API/v1/vaults/$VAULT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Secrets

```bash
# Store a secret (PUT creates or updates)
curl -s -X PUT "$API/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_key",
    "value": "sk-proj-test123",
    "metadata": {"env": "test"}
  }' \
  | python3 -m json.tool

# List secrets (metadata only, no values)
curl -s "$API/v1/vaults/$VAULT_ID/secrets" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Get secret value (decrypted)
curl -s "$API/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Store a nested-path secret
curl -s -X PUT "$API/v1/vaults/$VAULT_ID/secrets/config/prod/database" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"password","value":"postgres://..."}' \
  | python3 -m json.tool

# Delete a secret
curl -s -X DELETE "$API/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Policies

Policies control which agents (or users) can access which secrets.

```bash
# Create a policy granting an agent read access
curl -s -X POST "$API/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "secret_path_pattern": "api-keys/**",
    "principal_type": "agent",
    "principal_id": "<agent-uuid>",
    "permissions": ["read"]
  }' \
  | python3 -m json.tool

# List policies for a vault
curl -s "$API/v1/vaults/$VAULT_ID/policies" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Update a policy
curl -s -X PUT "$API/v1/vaults/$VAULT_ID/policies/<policy_id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["read", "write"]
  }' \
  | python3 -m json.tool

# Delete a policy
curl -s -X DELETE "$API/v1/vaults/$VAULT_ID/policies/<policy_id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Agents

```bash
# Register an agent
curl -s -X POST "$API/v1/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-agent",
    "description": "A test agent",
    "crypto_proxy_enabled": false
  }' \
  | python3 -m json.tool
# Save the returned agent_id and api_key (ocv_...)

# List agents
curl -s "$API/v1/agents" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Get a single agent
export AGENT_ID="<agent-id>"
curl -s "$API/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Update agent
curl -s -X PATCH "$API/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"renamed-agent","crypto_proxy_enabled":true}' \
  | python3 -m json.tool

# Rotate agent API key
curl -s -X POST "$API/v1/agents/$AGENT_ID/rotate-key" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Delete (deactivate) agent
curl -s -X DELETE "$API/v1/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Agent self-inspection

```bash
# Get the agent's own profile (includes created_by — the human who registered it)
curl -s "$API/v1/agents/me" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  | python3 -m json.tool
```

### Agent authentication

```bash
# Exchange agent API key for JWT
curl -s -X POST "$API/v1/auth/agent-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<agent-uuid>",
    "api_key": "ocv_..."
  }' \
  | python3 -m json.tool

# Use the agent token to fetch secrets
export AGENT_TOKEN="<agent-access-token>"
curl -s "$API/v1/vaults/$VAULT_ID/secrets/api-keys/openai" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  | python3 -m json.tool
```

---

## 8. Sharing

```bash
# Agent shares a secret back with its creator (the human who registered it)
curl -s -X POST "$API/v1/secrets/<secret_id>/share" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_type": "creator",
    "expires_at": "2026-03-01T00:00:00Z",
    "max_access_count": 5
  }' \
  | python3 -m json.tool

# Create a share (by secret ID, with email invite — humans only)
curl -s -X POST "$API/v1/secrets/<secret_id>/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_type": "external_email",
    "email": "colleague@example.com",
    "expires_at": "2026-03-01T00:00:00Z",
    "max_access_count": 5
  }' \
  | python3 -m json.tool

# List shares you created
curl -s "$API/v1/shares/outbound" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# List shares sent to you
curl -s "$API/v1/shares/inbound" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Accept an inbound share
curl -s -X POST "$API/v1/shares/<share_id>/accept" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Decline an inbound share
curl -s -X POST "$API/v1/shares/<share_id>/decline" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Access shared secret (public, no auth — uses share link)
curl -s "$API/v1/share/<share_id>" \
  | python3 -m json.tool

# Revoke a share
curl -s -X DELETE "$API/v1/share/<share_id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. Chains

```bash
# List all supported chains
curl -s "$API/v1/chains" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Get a specific chain (by ID or chain_id)
curl -s "$API/v1/chains/1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 10. Transactions (Crypto Proxy)

The agent must have `crypto_proxy_enabled: true`. Use the agent's JWT. When enabled, the agent is blocked from reading `private_key` and `ssh_key` secrets directly — it must use these proxy endpoints instead.

```bash
# Submit a transaction
curl -s -X POST "$API/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": 1,
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    "value": "0x0",
    "data": "0x"
  }' \
  | python3 -m json.tool

# List transactions for an agent
curl -s "$API/v1/agents/$AGENT_ID/transactions" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  | python3 -m json.tool

# Get a specific transaction
curl -s "$API/v1/agents/$AGENT_ID/transactions/<tx_id>" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  | python3 -m json.tool
```

---

## 11. Billing & Usage

```bash
# Usage summary
curl -s "$API/v1/billing/usage" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Usage history
curl -s "$API/v1/billing/history" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 12. Audit log

```bash
# Query audit events (recent)
curl -s "$API/v1/audit/events" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# With query parameters
curl -s "$API/v1/audit/events?limit=10&action=secret.read" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 13. Organization

```bash
# List org members
curl -s "$API/v1/org/members" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Invite a member
curl -s -X POST "$API/v1/org/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newmember@example.com","role":"member"}' \
  | python3 -m json.tool

# Update member role
curl -s -X PATCH "$API/v1/org/members/<user_id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}' \
  | python3 -m json.tool

# Remove member
curl -s -X DELETE "$API/v1/org/members/<user_id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 14. Security (IP rules)

```bash
# List IP rules
curl -s "$API/v1/security/ip-rules" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Create an allow rule
curl -s -X POST "$API/v1/security/ip-rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cidr":"203.0.113.0/24","rule_type":"allow","description":"Office network"}' \
  | python3 -m json.tool

# Create a block rule
curl -s -X POST "$API/v1/security/ip-rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cidr":"198.51.100.5/32","rule_type":"block","description":"Suspicious IP"}' \
  | python3 -m json.tool

# Delete an IP rule
curl -s -X DELETE "$API/v1/security/ip-rules/<rule_id>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 15. Admin endpoints

These require admin/super-admin privileges.

```bash
# List all settings
curl -s "$API/v1/admin/settings" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Update a setting
curl -s -X PUT "$API/v1/admin/settings/maintenance_mode" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"false"}' \
  | python3 -m json.tool

# Get x402 payment configuration
curl -s "$API/v1/admin/x402" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Update x402 config
curl -s -X PUT "$API/v1/admin/x402" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "facilitator_url": "https://api.cdp.coinbase.com/platform/v2/x402",
    "payment_address": "0x...",
    "network": "base-sepolia"
  }' \
  | python3 -m json.tool

# List all users
curl -s "$API/v1/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Manage chains (admin)
curl -s "$API/v1/admin/chains" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

curl -s -X POST "$API/v1/admin/chains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Polygon",
    "chain_id": 137,
    "rpc_url": "https://polygon-rpc.com",
    "explorer_url": "https://polygonscan.com",
    "is_testnet": false,
    "is_enabled": true
  }' \
  | python3 -m json.tool

# Get/update org limits
curl -s "$API/v1/admin/orgs/<org_id>/limits" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 16. MCP Server Testing

The MCP server runs as a stdio process. You can test it with `npx`:

### Install and configure

```bash
npm install -g @1claw/mcp
```

Or add to your MCP client configuration (e.g. Claude Desktop, Cursor):

```json
{
    "mcpServers": {
        "1claw": {
            "command": "npx",
            "args": ["-y", "@1claw/mcp"],
            "env": {
                "ONECLAW_API_URL": "https://api.1claw.xyz",
                "ONECLAW_AGENT_ID": "<agent-uuid>",
                "ONECLAW_API_KEY": "ocv_..."
            }
        }
    }
}
```

### Test MCP tools via curl (HTTP wrapper)

If you run the MCP server with an HTTP transport (e.g. via `mcp-proxy` or SSE), you can test tools directly:

```bash
export MCP="http://localhost:3001"

# List vaults
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_vaults",
      "arguments": {}
    }
  }' | python3 -m json.tool

# List secrets
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_secrets",
      "arguments": {"prefix": "api-keys/"}
    }
  }' | python3 -m json.tool

# Get a secret
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_secret",
      "arguments": {"path": "api-keys/openai"}
    }
  }' | python3 -m json.tool

# Store a secret
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "put_secret",
      "arguments": {
        "path": "api-keys/new-key",
        "value": "sk-test-123",
        "type": "api_key"
      }
    }
  }' | python3 -m json.tool

# Describe a secret (metadata only)
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "describe_secret",
      "arguments": {"path": "api-keys/openai"}
    }
  }' | python3 -m json.tool

# Rotate a secret
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "rotate_and_store",
      "arguments": {
        "path": "api-keys/openai",
        "value": "sk-new-rotated-value"
      }
    }
  }' | python3 -m json.tool

# Get env bundle
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "get_env_bundle",
      "arguments": {"path": "config/prod-env"}
    }
  }' | python3 -m json.tool

# Create vault
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "create_vault",
      "arguments": {"name": "test-vault", "description": "Created via MCP"}
    }
  }' | python3 -m json.tool

# Grant access
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "grant_access",
      "arguments": {
        "vault_id": "<vault-uuid>",
        "principal_type": "agent",
        "principal_id": "<agent-uuid>",
        "permissions": ["read"]
      }
    }
  }' | python3 -m json.tool

# Share a secret
curl -s -X POST "$MCP" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "share_secret",
      "arguments": {
        "secret_id": "<secret-uuid>",
        "email": "colleague@example.com",
        "expires_at": "2026-03-01T00:00:00Z",
        "max_access_count": 5
      }
    }
  }' | python3 -m json.tool
```

### Test MCP via stdio (interactive)

For direct stdio testing, pipe JSON-RPC messages:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  ONECLAW_API_URL=https://api.1claw.xyz \
  ONECLAW_AGENT_ID=<agent-uuid> \
  ONECLAW_API_KEY=ocv_... \
  npx @1claw/mcp
```

---

## Tips

- **Pretty-print JSON**: Pipe any response through `python3 -m json.tool` or `jq`.
- **Save tokens as variables**: Use the token-extraction one-liner from section 2.
- **HTTP status codes**: Add `-w "\n%{http_code}\n"` to any curl command to see the status code.
- **Verbose mode**: Add `-v` to see full request/response headers.
- **x402 payment**: If an endpoint returns `402`, include a payment header as configured by your x402 setup.
