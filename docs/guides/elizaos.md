---
title: elizaOS plugin
description: Bootstrap a vault, agent, and policy for elizaOS using @1claw/plugin-elizaos. Human API key is used only during setup.
sidebar_position: 21
---

# elizaOS plugin

The [@1claw/plugin-elizaos](https://www.npmjs.com/package/@1claw/plugin-elizaos) package gives elizaOS characters HSM-backed vault access and multi-chain signing. It wraps [@1claw/sdk](https://www.npmjs.com/package/@1claw/sdk) — no custom HTTP layer.

**Repository:** [github.com/1clawAI/1claw-elizaos-plugin](https://github.com/1clawAI/1claw-elizaos-plugin)

## Install

```bash
npm install @1claw/plugin-elizaos
```

Add to your character:

```json
{
  "plugins": ["@1claw/plugin-elizaos"]
}
```

## Bootstrap (human key → agent key)

Use a **human** API key (`1ck_...` from the dashboard → **API Keys**) **only** to provision resources. The bootstrap script never stores the human key — it writes agent-only credentials (`ocv_...`) for your character.

```bash
git clone https://github.com/1clawAI/1claw-elizaos-plugin.git
cd 1claw-elizaos-plugin
npm install

ONECLAW_HUMAN_API_KEY=1ck_your_key npm run bootstrap
```

This creates:

1. A vault (default name `elizaos-vault`)
2. An agent (default name `elizaos-agent`) with `vault_ids` bound
3. An access policy granting the agent `read` + `write` on the path glob (default `**`)

**Outputs:**

| Output | Contents |
|---|---|
| `.env.elizaos` | `ONECLAW_AGENT_API_KEY`, `ONECLAW_AGENT_ID`, `ONECLAW_VAULT_ID` (file mode `600`) |
| Terminal | One-time `ocv_...` key + elizaOS character JSON snippet |

The human key (`1ck_`) is rejected if you pass an agent key (`ocv_`) by mistake.

### Bootstrap environment variables

| Variable | Default | Description |
|---|---|---|
| `ONECLAW_HUMAN_API_KEY` | (prompt) | Human key `1ck_...` — setup only, never written to disk |
| `ONECLAW_AGENT_NAME` | `elizaos-agent` | Agent name |
| `ONECLAW_VAULT_NAME` | `elizaos-vault` | Vault name |
| `ONECLAW_POLICY_PATH` | `**` | Secret path glob for the policy |
| `ONECLAW_ENABLE_INTENTS` | `false` | Set `true` to enable Intents API on the agent |
| `ONECLAW_OUTPUT_FILE` | `.env.elizaos` | Agent credentials output path |
| `ONECLAW_BASE_URL` | `https://api.1claw.xyz` | API base URL |

### Optional: Intents API at bootstrap

```bash
ONECLAW_HUMAN_API_KEY=1ck_... ONECLAW_ENABLE_INTENTS=true npm run bootstrap
```

### Validate agent credentials

```bash
export $(grep -v '^#' .env.elizaos | xargs)
npm run validate
```

## Character configuration

After bootstrap, load secrets from `.env.elizaos` or paste values into your character:

```json
{
  "name": "my-agent",
  "plugins": ["@1claw/plugin-elizaos"],
  "settings": {
    "secrets": {
      "ONECLAW_AGENT_API_KEY": "ocv_...",
      "ONECLAW_AGENT_ID": "uuid-from-bootstrap",
      "ONECLAW_VAULT_ID": "uuid-from-bootstrap"
    }
  }
}
```

### Runtime plugin settings

| Variable | Required | Default | Description |
|---|---|---|---|
| `ONECLAW_AGENT_API_KEY` | Yes | — | Agent key `ocv_...` |
| `ONECLAW_AGENT_ID` | No | auto | Override auto-discovery |
| `ONECLAW_VAULT_ID` | No | auto | Pin a vault when the agent has several |
| `ONECLAW_BASE_URL` | No | `https://api.1claw.xyz` | API endpoint |
| `ONECLAW_USE_SHROUD` | No | `false` | Route through `shroud.1claw.xyz` |

## Actions

| Action | Description |
|---|---|
| `GET_SECRET` | Fetch a secret by path (redacted in user-facing chat) |
| `LIST_SECRETS` | List paths only |
| `PUT_SECRET` | Store or update a secret |
| `SIGN_MESSAGE` | EIP-191 personal sign |
| `SIGN_TYPED_DATA` | EIP-712 typed data |
| `SIMULATE_TRANSACTION` | Tenderly dry-run |
| `SUBMIT_TRANSACTION` | Sign and broadcast (simulates first) |
| `LIST_SIGNING_KEYS` | Chains and public addresses |

## Security

- Agents only access paths granted by human policies.
- Private signing keys never leave the HSM/TEE.
- Per-agent guardrails (allowlists, caps, daily limits) are enforced server-side when Intents API is enabled.

## Links

- [GitHub — 1claw-elizaos-plugin](https://github.com/1clawAI/1claw-elizaos-plugin)
- [npm — @1claw/plugin-elizaos](https://www.npmjs.com/package/@1claw/plugin-elizaos)
- [Ecosystem directory](https://1claw.xyz/ecosystem)
- [Intents API guide](/docs/guides/intents-api)
- [Shroud guide](/docs/guides/shroud)
