---
title: Agent Safe accounts (Phase 5)
description: Counterfactual Gnosis Safe provisioning, EOA→Safe migration, module registry, and allowance sync — on-chain deploy pending Guard audit.
sidebar_label: Safe accounts
---

# Agent Safe accounts (Phase 5 foundation)

v0.56.2 introduces **counterfactual Safe** accounts for agents: addresses are derived deterministically from the agent EOA owner and pinned module deployments, but **no on-chain deploy broadcast** runs until the `Guard.sol` contract completes external audit.

:::warning Audit gate
On-chain deploy, cosign, passkey enrollment, timelock, and ERC-4337 endpoints return **501** with `{ error, phase, message }` until Guard is audited and pinned on mainnet. Do not broadcast Guard to production without audit sign-off.
:::

## Account types

| Type | Description |
| ---- | ----------- |
| **EOA** | Agent secp256k1 signer (`agents/{id}/chains/{chain}/private_key`) |
| **Counterfactual Safe** | Derived Safe address + config; `deploy_status: counterfactual` until lazy deploy (501 stub) |

## APIs

| Endpoint | Auth | Notes |
| -------- | ---- | ----- |
| `GET/POST /v1/agents/{id}/accounts` | Human + agent list | List or provision EOA / counterfactual Safe |
| `POST /v1/agents/{id}/accounts/migrate` | Human | Build migration plan; optional `deprecate_eoa` |
| `POST /v1/agents/{id}/accounts/{chain}/deprecate-eoa` | Human | Deprecate EOA signing path for a chain |
| `GET /v1/safe/module-registry/{chain}` | Public | Pinned Safe v1.4.1 + Zodiac module addresses |
| `POST /v1/org/safe/sync-allowances` | Owner/admin | Compile allowance targets from guardrails; `onchain_sync: counterfactual` |

501 stubs (pre-audit): `POST .../accounts/{chain}/deploy`, `POST .../safe/cosign`, `POST .../safe/passkey-enroll`, `POST .../safe/timelock`, `POST .../safe/erc4337`.

## Dashboard

**Agents → [agent] → Migrate to Safe** wizard at `/agents/[agentId]/migrate-safe`.

## SDK

```typescript
const { data } = await client.agents.listAccounts(agentId);
await client.agents.migrateToSafe(agentId, { chain: "ethereum", deprecate_eoa: true });
await client.agents.deprecateEoaAccount(agentId, "ethereum");
const registry = await client.agents.getSafeModuleRegistry("ethereum");
await client.agents.syncOrgSafeAllowances(); // owner/admin
```

## CLI

```bash
1claw agent accounts list <agent-id>
1claw agent accounts migrate <agent-id> --chain ethereum [--deprecate-eoa]
1claw agent accounts deprecate-eoa <agent-id> --chain ethereum
1claw safe module-registry ethereum
1claw safe sync-allowances
```

## MCP

`list_agent_accounts`, `migrate_agent_to_safe`, `deprecate_agent_eoa`, `get_safe_module_registry`, `sync_org_safe_allowances`

## Contracts

Foundry scaffold lives in `contracts/` (`Guard.sol` + tests). Counterfactual signing uses execTransaction calldata built server-side without broadcasting deploy until audit completes.

See also [Treasury Safe multisig](/docs/treasury/safe-multisig) for human-operated multisigs (separate from agent counterfactual accounts).
