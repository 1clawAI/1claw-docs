---
title: "Secret rotation and bindings"
description: Rotate credentials without redeploying. Use vault bindings and vault references so agents always get the latest credentials automatically.
sidebar_position: 67
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Secret Rotation and Bindings

Secrets go stale. API keys expire, passwords get compromised, compliance requires periodic rotation. This guide covers two approaches to handling credential lifecycle in 1claw:

1. **Secret rotation** in the vault (manual or server-generated)
2. **Execution Intents bindings** with vault references (credentials rotate automatically without touching the agent)

## Secret rotation

### Manual rotation

Update a secret by PUTting a new value at the same path. The old version is preserved for audit.

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X PUT "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secrets/apis/stripe-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "sk_live_new_key_value",
    "type": "api_key"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.secrets.put(vaultId, "apis/stripe-key", {
  value: "sk_live_new_key_value",
  type: "api_key",
});
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw secret set apis/stripe-key "sk_live_new_key_value" -v $VAULT_ID
```

</TabItem>
</Tabs>

The next time any agent fetches `apis/stripe-key`, it gets the new value. No redeployment needed.

### Server-side rotation (auto-generated values)

For credentials you control (database passwords, internal API keys), let 1claw generate a new value:

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secret-rotate/db/password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": 32,
    "charset": "alphanumeric"
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const rotated = await client.secrets.rotateGenerate(vaultId, "db/password", {
  length: 32,
  charset: "alphanumeric",
});

console.log("New version:", rotated.data.version);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
1claw secret rotate db/password --generate -v $VAULT_ID -l 32 -c alphanumeric
```

</TabItem>
</Tabs>

Charset options: `hex`, `base64`, `alphanumeric`, `ascii`.

The agent fetching this secret on its next request gets the new value. You update the downstream system (database, service) separately.

### Signing key rotation

For multi-chain signing keys:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/signing-keys/ethereum/rotate" \
  -H "Authorization: Bearer $TOKEN"
```

This deactivates the old key and provisions a new one. The old address is preserved in the signing key history. Fund the new address before routing transactions to it.

### Version history

Every rotation creates a new version. View the history:

```bash
curl -s "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secret-versions/apis/stripe-key" \
  -H "Authorization: Bearer $TOKEN" | jq '.versions[] | {version, created_at, is_disabled}'
```

Disable old versions to prevent rollback reads:

```bash
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secret-version-disable/apis/stripe-key/2" \
  -H "Authorization: Bearer $TOKEN"
```

Disabled versions return 410 Gone on read attempts.

## Execution Intents bindings

Bindings are named handles that point to credentials stored in the vault. An agent calls `POST /v1/agents/{id}/execute` with the binding name and 1claw injects the credential at runtime. The agent never sees the raw credential value.

### Why bindings matter for rotation

Without bindings, your agent code looks like this:

```typescript
// Agent fetches the key, then uses it
const secret = await agent.secrets.get(vaultId, "apis/stripe-key");
const stripeKey = secret.data.value;
// Now the agent has the raw key in memory
```

With bindings:

```typescript
// Agent calls through the binding; never sees the key
const result = await agent.bindings.execute(agentId, {
  binding: "stripe",
  intent_type: "http",
  params: {
    url: "https://api.stripe.com/v1/charges",
    method: "GET",
  },
});
```

The credential is injected server-side. When you rotate the underlying secret, the binding automatically uses the new value. No agent code changes.

### Creating a binding

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe",
    "binding_type": "http",
    "description": "Stripe API",
    "config": {
      "base_url": "https://api.stripe.com",
      "auth_type": "bearer"
    },
    "allowed_hosts": ["api.stripe.com"],
    "allowed_paths": ["/v1/*"],
    "credential_source": {
      "type": "vault_ref",
      "vault_id": "'"$VAULT_ID"'",
      "path": "apis/stripe-key"
    }
  }'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.bindings.create(agentId, {
  name: "stripe",
  binding_type: "http",
  description: "Stripe API",
  config: {
    base_url: "https://api.stripe.com",
    auth_type: "bearer",
  },
  allowed_hosts: ["api.stripe.com"],
  allowed_paths: ["/v1/*"],
  credential_source: {
    type: "vault_ref",
    vault_id: vaultId,
    path: "apis/stripe-key",
  },
});
```

</TabItem>
</Tabs>

### Credential sources

| Source | Behavior | Rotation |
|--------|----------|----------|
| `inline` | Credential stored as a copy in `__agent-keys` vault | Must explicitly rotate the binding credential |
| `vault_ref` | Live pointer to a vault secret | Rotations in the source vault are reflected automatically |

Use `vault_ref` whenever possible. It means a single rotation of the source secret propagates to every binding that references it.

### Executing through a binding

```typescript
// HTTP call through the binding
const result = await agent.bindings.execute(agentId, {
  binding: "stripe",
  intent_type: "http",
  params: {
    url: "https://api.stripe.com/v1/charges?limit=5",
    method: "GET",
  },
});

console.log(result.data.status_code); // 200
console.log(result.data.body); // Stripe response
```

The agent specifies what to call. 1claw handles credential injection, SSRF protection, and host allowlisting.

### Supported binding types

| Type | Tier | Description |
|------|------|-------------|
| `http` | Pro+ | REST API calls with credential injection |
| `graphql` | Pro+ | GraphQL queries with credential injection |
| `postgres` | Team+ | Database queries |
| `mysql` | Team+ | Database queries |
| `redis` | Team+ | Key-value operations |
| `grpc` | Team+ | gRPC calls |
| `smtp` | Team+ | Email sending |
| `s3` | Team+ | Object storage operations |

### Testing a binding

Verify connectivity before going live:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings/$BINDING_ID/test" \
  -H "Authorization: Bearer $TOKEN"
```

### Rotating a binding credential

For inline credentials, rotate explicitly:

```bash
curl -X POST "https://api.1claw.xyz/v1/agents/$AGENT_ID/bindings/$BINDING_ID/rotate-credential" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credential": {"api_key": "new_key_value"}}'
```

For `vault_ref` bindings, just rotate the source secret. The binding picks up the new value on the next execution.

## Rotation workflow

Here is a complete rotation workflow for a database password:

```bash
# 1. Generate a new password in the vault
1claw secret rotate db/postgres-password --generate -v $VAULT_ID -l 32 -c alphanumeric

# 2. Read the new password (human only, for updating the database)
NEW_PASS=$(1claw secret get db/postgres-password -v $VAULT_ID --quiet)

# 3. Update the database user password
psql -h db.example.com -U admin -c "ALTER USER app_user PASSWORD '$NEW_PASS'"

# 4. Disable the old version (REST API or SDK — no CLI subcommand yet)
curl -X POST "https://api.1claw.xyz/v1/vaults/$VAULT_ID/secret-version-disable/db/postgres-password/1" \
  -H "Authorization: Bearer $TOKEN"

# 5. Any agent with a vault_ref binding picks up the new password automatically
# No code changes, no redeployment
```

## Scheduled rotation

1claw does not have built-in scheduled rotation (yet). For now, use a cron job or CI/CD pipeline:

```bash
# In a GitHub Action or cron
0 0 1 * * /usr/local/bin/1claw secret rotate db/postgres-password --generate \
  -v $VAULT_ID \
  -l 32 -c alphanumeric
```

Combine with your database user rotation script to complete the workflow.

## Further reading

- [Rotating secrets](/docs/vaults/rotating-secrets) for the core rotation guide
- [Intents API](/docs/agents/intents/overview) for transaction signing
- [Execution Intents](/docs/agents/intents/guardrails#execution-intents) for the full bindings reference
- [Securing agent access](/docs/vaults/securing-access) for policy best practices
