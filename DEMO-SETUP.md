# Live Demo Setup (https://1claw.xyz/demo)

This doc describes how to configure the special demo account so all three panels (Vault, Shroud, Intents) work in production.

## Env vars (Vercel)

| Variable | Required for | Description |
|----------|----------------|--------------|
| `DEMO_AGENT_API_KEY` | All three | The demo agent's `ocv_` API key. Never exposed to the client. |
| `DEMO_VAULT_ID` | Vault panel | Vault that contains the demo secret (e.g. `demo/api-key`). |
| `DEMO_SECRET_PATH` | Vault panel | Optional. Default `demo/api-key`. |
| `DEMO_INTENTS_CHAIN` | Intents panel | Optional. Default `base-sepolia`. |
| `SHROUD_URL` | Shroud + Intents | Shroud TEE base URL (e.g. `https://shroud.1claw.xyz`). |

## 1. Vault demo

- Create a vault (or use existing) in the demo org. Set `DEMO_VAULT_ID` to its ID.
- Store a secret at path `demo/api-key` (or `DEMO_SECRET_PATH`). Type: `api_key`, value: any placeholder (e.g. `sk-demo-...`).
- Give the demo agent **read** access to that vault (access policy: principal type Agent, this agent, path `**` or `demo/**`).

## 2. Shroud demo

- Enable **Shroud** on the demo agent (dashboard or API).
- The agent needs an LLM API key for the proxy: either store it in a vault Shroud can resolve (e.g. provider-specific path) or ensure the server can pass it when calling Shroud (demo may use a server-side fallback if configured).
- No extra env beyond `DEMO_AGENT_API_KEY` and `SHROUD_URL`.

## 3. Intents demo (private key + funds)

For "Send $0.01 to Vitalik" to work you need:

### 3.1 Agent and Intents API

- Enable **Intents API** on the demo agent.
- (Optional) Set guardrails: e.g. `tx_allowed_chains`: `["base-sepolia"]`, `tx_to_allowlist`: include `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`, `tx_max_value_eth`: `0.02`, or leave empty for no restrictions.

### 3.2 Signing key in a vault

- The backend uses default path **`keys/{chain}-signer`**. For `DEMO_INTENTS_CHAIN=base-sepolia` that is **`keys/base-sepolia-signer`**.
- In a vault the demo agent can access (same org, and agent has a policy allowing read on that path), create a secret:
  - **Path:** `keys/base-sepolia-signer`
  - **Type:** `private_key`
  - **Value:** A hex-encoded secp256k1 private key (e.g. from MetaMask or `cast wallet new`). This wallet is used only for the demo.

### 3.3 Fund the wallet on Base Sepolia

- Derive the Ethereum address from that private key (e.g. `cast wallet address --private-key <key>`).
- Get **Base Sepolia test ETH** from a faucet (e.g. [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) or [Alchemy](https://www.alchemy.com/faucets/base-sepolia)) and send at least **~0.02 ETH** to that address (0.01 for the send to Vitalik plus gas).

### Summary checklist (Intents)

- [ ] Demo agent has Intents API enabled.
- [ ] Agent has read access to a vault that contains `keys/base-sepolia-signer` (type `private_key`).
- [ ] That key’s address is funded with Base Sepolia test ETH (≥ 0.02 ETH).
- [ ] `DEMO_INTENTS_CHAIN` is `base-sepolia` (default) or the chain you use.
- [ ] If using guardrails, they allow this chain, value, and recipient.
