---
title: Python SDK
description: Official oneclaw package — agent auth, vaults, secrets, policies, Intents API, and billing with full API parity.
sidebar_position: 2
---

# Python SDK

The official Python SDK (`oneclaw` on PyPI) provides full API parity with the 1Claw REST API. It supports human and agent workflows, automatic JWT refresh for agent keys, and typed resource modules.

**Repository:** [github.com/1clawAI/1claw-python-sdk](https://github.com/1clawAI/1claw-python-sdk)

:::tip Try it out
Run the **[Python SDK example](https://github.com/1clawAI/1claw-examples/tree/main/python-sdk)** in the examples repo (`pip install oneclaw`, set `ONECLAW_API_KEY`, then `python main.py`).
:::

## Install

```bash
pip install oneclaw
```

Requires Python 3.10+.

## Quick start

### Human (API key or email/password)

```python
from oneclaw import create_client

# User API key (1ck_) — auto-exchanges for JWT
client = create_client(api_key="1ck_your_user_key")

# Or login with email/password
client = create_client(base_url="https://api.1claw.xyz")
client.auth.login("you@example.com", "your-password")

# Create a vault and store a secret
resp = client.vaults.create("My Vault", description="Secrets for my app")
vault_id = resp.data["id"]

client.secrets.set(
    vault_id,
    "api-keys/openai",
    "sk-proj-...",
    type="api_key",
    metadata={"tags": ["openai", "production"]},
)

secret = client.secrets.get(vault_id, "api-keys/openai")
print(secret.data["value"])  # use securely; don't log in production
```

### Agent (API key)

```python
from oneclaw import create_client

# Agent keys (ocv_) auto-exchange for JWTs and refresh before expiry
client = create_client(api_key="ocv_your_agent_key")

# Agent ID is auto-discovered from the token exchange
print(client.resolved_agent_id)

vault_id = "your-vault-id"
data = client.secrets.list(vault_id)
for s in data.data["secrets"]:
    print(f"{s['path']} ({s['type']}, v{s['version']})")
```

### Pre-authenticated JWT

```python
client = create_client(token="eyJ...")
```

## Authentication

| Method | Usage |
| ------ | ----- |
| User API key (`1ck_`) | `create_client(api_key="1ck_...")` |
| Agent API key (`ocv_`) | `create_client(api_key="ocv_...")` — `agent_id` optional (resolved via prefix) |
| Email/password | `client.auth.login(email, password)` |
| Existing JWT | `create_client(token="eyJ...")` |

Environment variables (optional): `ONECLAW_API_KEY`, `ONECLAW_BASE_URL`, `ONECLAW_AGENT_ID`.

## Resource modules

| Module | Methods |
| ------ | ------- |
| `client.auth` | `login`, `signup`, `agent_token`, `forgot_password`, `reset_password` |
| `client.vaults` | `create`, `list`, `get`, `delete` |
| `client.secrets` | `set`, `get`, `list`, `delete`, `rotate_generate`, `list_versions` |
| `client.agents` | `create`, `list`, `get`, `update`, `deactivate`, `enroll`, `submit_transaction`, `sign_intent` |
| `client.policies` | `create`, `list`, `delete` |
| `client.signing_keys` | `create`, `list`, `rotate`, `deactivate`, `balance` |
| `client.sharing` | `create`, `list`, `accept`, `decline` |
| `client.audit` | `list_events` |
| `client.billing` | `subscription`, `credits_balance` |
| `client.bindings` | `create`, `list`, `execute`, `test` (Execution Intents) |
| `client.cards` | `order`, `list`, `get`, `reveal` (Payment Card Vault) |

## Response envelope

All methods return a `Response` object:

```python
resp = client.vaults.create("my-vault")
if resp.error:
    print(resp.error)
else:
    print(resp.data["id"])
```

## Intents API example

```python
from oneclaw import create_client

client = create_client(api_key="ocv_...")
agent_id = client.resolved_agent_id

resp = client.agents.submit_transaction(
    agent_id,
    chain="ethereum",
    to="0x000000000000000000000000000000000000dEaD",
    value="0",
)
print(resp.data.get("tx_hash"), resp.data.get("status"))
```

## Policies example

```python
client.policies.create(
    vault_id,
    principal_type="agent",
    principal_id=agent_id,
    secret_path_pattern="production/*",
    permissions=["read"],
)
```

## Async support

```python
from oneclaw import create_async_client

async def main():
    client = create_async_client(api_key="1ck_...")
    resp = await client.vaults.list()
    print(resp.data)

# asyncio.run(main())
```

## Raw HTTP

For endpoints not yet wrapped, use `client.request()` or fall back to [curl examples](/docs/sdks/curl-examples) with `httpx`/`requests`.

## Related

- [SDKs overview](/docs/sdks/overview)
- [JavaScript SDK](/docs/sdks/javascript)
- [Go SDK](/docs/sdks/go)
- [curl examples](/docs/sdks/curl-examples)
