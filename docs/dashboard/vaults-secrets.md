---
title: Vaults & secrets
description: Manage vaults, store secrets, configure policies, CMEK, and MPC from the 1Claw dashboard.
sidebar_position: 1
---

# Vaults & secrets in the dashboard

## Vault list

**Vaults → All vaults** shows every vault in your org except system vaults (`__agent-keys`, `__treasury-keys`). Each card displays vault name, ID (click to copy), secret count, and creation date.

**Create vault** — Name, optional description. Vault creators have owner bypass on all secrets in that vault.

## Secret detail

From a vault, browse secrets by path prefix. The secret detail page shows:

- Current value (masked; click **Reveal** to show)
- Version history with **Rotate** (server-side generate) and **Disable** on old versions
- `cmek_encrypted` badge when client-side encryption is active
- Copy path for policy configuration

System vault secrets are not browsable from the UI list; use agent-specific reveal cards (identity keys, signing keys).

## Policies

**Vault → Access policies** lists grants for agents and users. **Create policy** opens the policy editor with:

- Vault selector (all org vaults)
- Principal type: Agent or User
- Agent dropdown (or custom UUID)
- Path pattern (glob), permissions, conditions JSON, expiry

Edit and delete policies inline. Policy changes **revoke active agent JWTs** so stale scopes cannot linger.

## Vault settings

**Settings tab** on vault detail:

| Card | Purpose |
|------|---------|
| **Customer-Managed Key (CMEK)** | Generate browser key, enable/disable, rotation job status |
| **MPC custody** | Enable 2-of-2 or 2-of-3 split DEK storage |
| **Danger zone** | Delete vault (requires confirmation) |

## Onboarding wizards

- **Vault wizard** (`/vaults/wizard`) — Create vault → store secret → next steps
- **Onboarding hub** (`/onboarding`) — Progress checks for vault and agent setup

See also: [Vaults overview](/docs/vaults/overview), [Golden path](/docs/vaults/golden-path), [CMEK](/docs/vaults/cmek).
