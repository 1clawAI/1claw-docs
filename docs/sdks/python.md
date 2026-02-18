---
title: Python
description: Use requests or httpx with the 1claw REST API from Python; no official SDK yet; examples show agent auth and fetching a secret.
sidebar_position: 2
---

# Python

There is no official Python SDK. Use **requests** or **httpx** with the same REST endpoints. Below: agent auth and fetch secret.

## Agent: get token and fetch secret

```python
import os
import requests

BASE = "https://api.1claw.xyz"
AGENT_ID = os.environ["ONECLAW_AGENT_ID"]
API_KEY = os.environ["ONECLAW_AGENT_API_KEY"]

# Get JWT
r = requests.post(
    f"{BASE}/v1/auth/agent-token",
    json={"agent_id": AGENT_ID, "api_key": API_KEY},
)
r.raise_for_status()
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# List secrets (metadata only)
vault_id = "ae370174-9aee-4b02-ba7c-d1519930c709"
r = requests.get(f"{BASE}/v1/vaults/{vault_id}/secrets", headers=headers)
r.raise_for_status()
for s in r.json()["secrets"]:
    print(s["path"], s["type"])

# Get secret value
r = requests.get(
    f"{BASE}/v1/vaults/{vault_id}/secrets/api-keys/openai",
    headers=headers,
)
r.raise_for_status()
value = r.json()["value"]
# Use value only as needed; don't log or persist
```

## Human: email/password token

```python
r = requests.post(
    f"{BASE}/v1/auth/token",
    json={"email": "you@example.com", "password": "your-password"},
)
r.raise_for_status()
token = r.json()["access_token"]
```

Then use `Authorization: Bearer <token>` for vaults, secrets, policies, and agents as in the [Human API](/docs/human-api/overview) docs.
