---
title: Treasury
description: Multi-sig treasury wallets (Safe) for humans and agents. Create Safes, add signers, and manage agent access requests.
sidebar_label: Treasury
sidebar_position: 2
tags: [treasury, safe, multisig, agents, evm]
---

# Treasury

Treasury lets you manage **Safe multisig wallets** for your organization. Humans use CDP embedded wallets; agents have EOA (externally-owned account) addresses. You can create treasuries, add signers (users or agents), and control which agents can request access to spend from a Safe.

---

## What is Treasury?

- **Treasuries** are Safe multisig wallets. Each treasury has a name, chain, threshold, and a list of signers.
- **Signers** can be users (CDP embedded wallets) or agents (EOA addresses). Agents must have an `evm_address` before they can be added as signers or request access.
- **Access requests**: Agents request access to a treasury; humans approve or deny. This workflow ensures humans retain control over which agents can transact from shared funds.

---

## Agent EVM Addresses

Agents have two address types:

| Type | Description |
|------|-------------|
| **EOA** (`evm_address`) | Externally-owned account. Required for treasury signer and access requests. |
| **Smart Account** | ERC-4337 Safe 1.4.1 deployed via permissionless.js + Pimlico. Optional; used for human-like smart account flows. |

Agents receive an EOA when created or when identity keys are rotated. The `evm_address` is derived from the agent's secp256k1 key and is required before an agent can request treasury access.

---

## Smart Account Deployment

Humans can deploy a **smart account** (Safe 1.4.1) for an agent via the Dashboard. This uses ERC-4337 account abstraction with Pimlico as the bundler. The deployment is chain-specific; configure `smart_account_chain` and `smart_account_chain_id` on the agent.

---

## Access Request Workflow

1. **Agent requests access**: `POST /v1/treasury/{treasury_id}/access-requests` (agent auth only). The agent must have an `evm_address`.
2. **Human lists requests**: `GET /v1/treasury/{treasury_id}/access-requests` (user auth).
3. **Human approves or denies**: `POST /v1/treasury/{treasury_id}/access-requests/{request_id}/approve` or `.../deny` (user auth).

Only agents can create access requests; only users can approve or deny them.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/treasury` | User | Create a treasury (Safe multisig) |
| GET | `/v1/treasury` | User | List treasuries |
| GET | `/v1/treasury/{treasury_id}` | User | Get treasury details |
| POST | `/v1/treasury/{treasury_id}/signers` | User | Add a signer (user or agent) |
| DELETE | `/v1/treasury/{treasury_id}/signers/{signer_id}` | User | Remove a signer |
| POST | `/v1/treasury/{treasury_id}/access-requests` | Agent | Request access (agent-only) |
| GET | `/v1/treasury/{treasury_id}/access-requests` | User | List access requests |
| POST | `/v1/treasury/{treasury_id}/access-requests/{request_id}/approve` | User | Approve an access request |
| POST | `/v1/treasury/{treasury_id}/access-requests/{request_id}/deny` | User | Deny an access request |

---

## Create a Treasury

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Safe",
    "chain": "base",
    "chain_id": 8453,
    "threshold": 2,
    "safe_address": "0x..."
  }'
```

- `name`: Display name for the treasury.
- `chain`: Chain name (e.g. `base`, `ethereum`, `sepolia`).
- `chain_id`: Chain ID (e.g. 8453 for Base).
- `threshold`: Number of signatures required for a transaction.
- `safe_address`: Optional. Pre-deployed Safe address; omit to create a new Safe.

---

## Add a Signer

```bash
curl -X POST "https://api.1claw.xyz/v1/treasury/{treasury_id}/signers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signer_type": "agent",
    "signer_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

- `signer_type`: `user` or `agent`.
- `signer_id`: User UUID or agent UUID. For agents, the agent must have an `evm_address`.

---

## Dashboard

Navigate to **Treasury** (`/treasury`) in the Dashboard to:

- View your CDP embedded wallet
- Create and list Safe treasuries
- Deploy smart accounts for agents
- Add or remove signers
- View and approve/deny agent access requests

---

## See Also

- [Intents API](/docs/guides/intents-api) — How agents sign transactions
- [API Reference](/docs/reference/api-reference#treasury) — Full endpoint list
