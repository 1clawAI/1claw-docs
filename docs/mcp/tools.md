---
title: MCP Tool Reference
description: Detailed documentation for every tool provided by the 1claw MCP server, including parameters, examples, and error handling.
sidebar_position: 2
---

# Tool Reference

## list_secrets

List all secrets stored in the vault. Returns paths, types, versions, and metadata — **never secret values**.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `prefix` | string | No | Filter secrets by path prefix (e.g. `api-keys/`) |

### Example

```
Agent: "What secrets are available?"
→ list_secrets()

Found 3 secret(s):
- api-keys/stripe  (type: api_key, version: 2, expires: never)
- api-keys/openai  (type: api_key, version: 1, expires: 2026-12-31T23:59:59Z)
- passwords/db-prod  (type: password, version: 5, expires: never)
```

---

## get_secret

Fetch the decrypted value of a secret by its path. Use this immediately before making an API call that requires the credential.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Secret path (e.g. `api-keys/stripe`) |

### Example

```
Agent: "I need the Stripe API key"
→ get_secret(path: "api-keys/stripe")

{"path":"api-keys/stripe","type":"api_key","version":2,"value":"sk_live_..."}
```

### Errors

| Status | Meaning |
|--------|---------|
| 404 | No secret found at this path |
| 410 | Secret is expired or has exceeded its maximum access count |
| 402 | Free tier quota exhausted — upgrade at 1claw.xyz/settings/billing |

---

## put_secret

Create a new secret or update an existing one. Each call creates a new version.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Secret path (e.g. `api-keys/stripe`) |
| `value` | string | Yes | The secret value to store |
| `type` | string | No | Secret type. Default: `api_key`. Options: `api_key`, `password`, `private_key`, `certificate`, `file`, `note`, `ssh_key`, `env_bundle` |
| `metadata` | object | No | Arbitrary JSON metadata to attach |
| `expires_at` | string | No | ISO 8601 expiry datetime |
| `max_access_count` | number | No | Auto-expire after this many reads |

### Example

```
Agent: "Store this new API key"
→ put_secret(path: "api-keys/stripe", value: "sk_live_new...", type: "api_key")

Secret stored at 'api-keys/stripe' (version 3, type: api_key).
```

---

## delete_secret

Soft-delete a secret. All versions are marked as deleted. This is reversible by an admin.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Secret path to delete |

### Example

```
Agent: "Delete the old Stripe key"
→ delete_secret(path: "api-keys/old-stripe")

Secret at 'api-keys/old-stripe' has been soft-deleted.
```

---

## describe_secret

Get metadata for a secret without fetching its value. Use this to check if a secret exists or is still valid.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Secret path to describe |

### Example

```
Agent: "Is the Stripe key still valid?"
→ describe_secret(path: "api-keys/stripe")

{
  "path": "api-keys/stripe",
  "type": "api_key",
  "version": 2,
  "metadata": {},
  "created_at": "2026-01-15T10:30:00Z",
  "expires_at": null
}
```

---

## rotate_and_store

Store a new value for an existing secret, creating a new version. Useful when an agent has regenerated an API key and needs to persist it.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Secret path to rotate |
| `value` | string | Yes | The new secret value |

### Example

```
Agent: "I regenerated the Stripe key, store the new one"
→ rotate_and_store(path: "api-keys/stripe", value: "sk_live_rotated...")

Rotated secret at 'api-keys/stripe'. New version: 3.
```

---

## get_env_bundle

Fetch a secret of type `env_bundle`, parse its `KEY=VALUE` lines, and return a structured JSON object. Useful for injecting environment variables into subprocesses.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Path to an `env_bundle` secret |

### Example

```
Agent: "Get the production environment variables"
→ get_env_bundle(path: "config/prod-env")

{
  "DATABASE_URL": "postgres://...",
  "REDIS_URL": "redis://...",
  "API_KEY": "sk_..."
}
```

The secret value should contain one `KEY=VALUE` per line. Lines starting with `#` and blank lines are ignored.
