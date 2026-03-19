# Treasury, Safes, and Agent Smart Accounts — Flow Outline

This doc clarifies the three concepts and where keys live. The address you deployed (e.g. `0x646D80569Ba5A84089275EeD8d0acff7C3a75a3b` on Base) **is** a Safe smart account (Safe 1.4.1, ERC-4337). It is not a “multisig” in the sense of “multiple signatures required” — it has two owners (human + agent) with threshold 1, so either can sign.

---

## 1. Treasury Wallet (CDP embedded wallet)

**What it is**
- The human’s wallet on 1claw.xyz: CDP (Coinbase) embedded wallet.
- Same address on all EVM chains. Shown on the Treasury page (Wallet tab): address, QR, balances (ETH + stablecoins per chain).

**Flow**
- User signs in → CDP creates/restores wallet in the browser.
- No Safe, no server-held key. Keys are in the browser/CDP.

**Used for**
- Receiving funds, viewing balances, “Receive” QR.
- As **co-owner** of an agent’s Safe smart account (so the human can sign or recover).

---

## 2. Safes in Treasury: Register vs Deploy

### 2a. Register Safe (current)

**What it is**
- “Register existing Safe” on Treasury → Safes tab.
- Human enters a **Safe address they already deployed elsewhere** (e.g. via Safe{Wallet}, Safe Studio, or another app), plus name and chain.
- Backend stores it as a “Treasury” (Safe) in the DB so it appears in the list. No deployment from 1claw.

**Flow**
- Human deploys a Safe elsewhere (any signers, any threshold).
- Human pastes address in dashboard → Register Safe → name + chain → saved.

### 2b. Deploy Safe (not implemented)

**What it would be**
- “Deploy Safe” from the dashboard: human chooses chain, deploys a **new** Safe from 1claw (e.g. with their CDP wallet as first owner), then adds **agents as signers** (and optionally other humans).
- Would require: deployment flow (e.g. permissionless.js + Pimlico from dashboard, or a backend/TEE deployment service), UI to add signers (agents + addresses), and storing the Safe in Treasury.

**Recommendation**
- Add a “Deploy Safe” path alongside “Register Safe”: deploy new Safe on a chosen chain, then attach agents (and others) as signers and register it in Treasury.

---

## 3. Agent Smart Account (current flow)

**What it is**
- A **Safe 1.4.1 smart account** (ERC-4337) owned by **two owners with threshold 1**: the human (CDP wallet) and the agent (its EOA `evm_address`). So it’s a Safe smart account, not a “2-of-2 multisig”; either party can sign.

**Where is the agent signer key?**
- The agent’s **EVM signer** is an EOA (secp256k1). That key is **not** created at agent creation.
- It is created when:
  1. **Option A:** Human clicks “Deploy Smart Account” and the agent has no `evm_address` yet → dashboard calls `POST /v1/agents/:id/eoa` → **vault** generates a secp256k1 key, stores it in the org’s `__agent-keys` vault at `agents/{agent_id}/evm/private_key` (HSM envelope encryption), sets `evm_address` on the agent, then the dashboard runs the Safe deployment in the **browser** (permissionless.js + Pimlico).
  2. **Option B:** Human calls `POST /v1/agents/:id/eoa` earlier (e.g. from API or a future “Generate signer key” button). Same as above: key generated in **vault**, stored in `__agent-keys`.

So today the **agent’s Safe signer key is generated in the Vault process** (Rust, with HSM envelope encryption), **not** in the Shroud TEE. Transaction **signing** can be done in the TEE when the request goes through Shroud (Shroud fetches the key or uses an internal signing path). Key **generation** for the agent EOA is currently vault-only.

**End-to-end flow (current)**

1. Human creates agent (dashboard or API) → agent gets API key, Ed25519, ECDH. **No** `evm_address` yet.
2. Human opens Agent detail → Smart Account card.
3. If no `evm_address`: on “Deploy Smart Account”, dashboard calls `POST /v1/agents/:id/eoa` → vault generates secp256k1 key, stores in `__agent-keys` at `agents/{id}/evm/private_key`, returns `evm_address`.
4. Dashboard runs **in the browser**: permissionless.js creates ephemeral EOA, deploys Safe with that owner, then one UserOp adds human (CDP) + agent (`evm_address`) as owners and removes ephemeral. Safe address is deterministic (e.g. CREATE2).
5. Dashboard calls `PATCH /v1/agents/:id` with `smart_account_address`, chain, nonce, init data.
6. Human can “Add to Treasury” → same Safe is registered in Treasury (by address) so it appears under Safes.

**After adding to Treasury**
- The same Safe appears in Treasury → Safes. It’s still the agent’s Safe (human + agent as owners, threshold 1). “Register Safe” is “record an existing Safe”; this Safe was **deployed** via the agent flow and then **registered** so it’s visible in the list.

---

## 4. What you’d prefer (TEE + automation)

**TEE for agent signer key**
- Generate the agent’s **secp256k1 EOA** inside the **Shroud TEE** (or another TEE), then **store** only the encrypted key in the vault (e.g. in `__agent-keys` as today). So: generate in TEE, persist in vault/HSM. That would require a new backend or Shroud endpoint (e.g. “create agent EOA key”) that runs inside the TEE and returns the public address (and optionally writes the encrypted secret into the vault).

**Auto-create smart account when agent is created**
- Org-level option, e.g. “Auto-create agent smart account on chain X”.
- On agent creation (or first time the agent is used), backend or a job:
  1. Generates agent EOA (vault or TEE as above).
  2. Deploys the Safe (human + agent, threshold 1) on the chosen chain. Deployment would need to move from “browser + permissionless.js” to a **server-side** flow (vault or Shroud) so it can run without the human clicking “Deploy” (e.g. use a system signer or the human’s delegated key).
  3. Updates agent with `smart_account_address` and chain.

**Auto-generate signing key in TEE and store in vault**
- As above: a dedicated “create agent EOA” path that runs inside the TEE, then stores the key material in the vault (`__agent-keys`) so existing Intents API and Shroud signing keep working. No change to where the key is **stored** (vault), only to **where it is generated** (TEE).

---

## 5. Short answers

| Question | Answer |
|----------|--------|
| Is `0x646D80...` a Safe? | Yes. Safe 1.4.1 smart account (ERC-4337). |
| Is it a “multisig”? | It has 2 owners but threshold 1, so either human or agent can sign. So “Safe smart account” is the right term. |
| Where is the agent’s signer key generated? | Today: in the **vault** (Rust), on `POST /v1/agents/:id/eoa`. |
| Where is it stored? | In the org’s `__agent-keys` vault at `agents/{agent_id}/evm/private_key` (HSM envelope encryption). |
| Can it be generated in the TEE and stored in the vault? | Not yet. Would need a new TEE-side “create agent EOA” flow that then writes the secret into the vault. |
| Register Safe vs Deploy Safe? | **Register Safe** = add an already-deployed Safe by address. **Deploy Safe** = deploy a new Safe from 1claw and add agents as signers — not implemented; could be added alongside Register. |
| How to automate (auto smart account + TEE key)? | Add: (1) TEE-based agent EOA generation + vault storage, (2) server-side Safe deployment (vault or Shroud), (3) org setting to “auto-create agent smart account” on agent creation or first use. |

This file can be moved under `internal-docs/` or `docs/` as you prefer and updated as you implement TEE key generation and Deploy Safe.

---

## 6. Multi-chain smart accounts (one per chain)

**Goal:** Support an agent having a Safe on multiple chains (e.g. Base, Ethereum, Arbitrum). After the first smart account is created, the user can “Add chain” and deploy another Safe on a different chain. The **signing key** is moved out of “Agent Identity” and tied to the **Smart accounts** section in the UI (one EOA signer used for all agent Safes).

**Best practice (recommended):**

- **One EOA signer per agent** — The agent has a single `evm_address` (one secp256k1 key in `__agent-keys` at `agents/{id}/evm/private_key`). That same EOA can be the signer for **multiple Safes** (one per chain). Simpler key management, one backup.
- **One Safe per chain** — Store each Safe in a dedicated table `agent_smart_accounts` (agent_id, chain, chain_id, safe_address, nonce, init_data). So “add chain” = deploy a new Safe on that chain with the same EOA as signer, then add a row.
- **Signing key in Smart accounts section** — In the dashboard, show “EVM signer (EOA)” and “Reveal private key” under the **Smart accounts** card, not under Agent Identity. Identity stays for auth-only material (Ed25519, ECDH). The EVM key is for signing transactions and is conceptually “the signer for these smart accounts”.

**Optional (future):** One signing key **per chain** (e.g. `agent_signing_keys` with chain_id, different EOA per chain). Use only if you need key isolation per chain; adds complexity and key management.

**Implementation outline:**

- **Backend:** New table `agent_smart_accounts` (id, agent_id, chain, chain_id, safe_address, nonce, init_data, created_at). Unique (agent_id, chain_id). Migrate existing single smart_account_* from `agents` into one row. Endpoints: `GET /v1/agents/:id` returns `smart_accounts: []` from this table; `POST /v1/agents/:id/smart-accounts` to add a Safe (chain, chain_id, safe_address, nonce?, init_data?). Legacy columns on `agents` can remain for backward compat (e.g. first entry duplicated) or be deprecated.
- **Intents API / transactions:** When submitting in `smart_account` mode, the request should include `chain_id` (or chain name) so the backend picks the correct Safe from `agent_smart_accounts`. Default to first or a “primary” chain if omitted.
- **Dashboard:** Agent detail page: **Smart accounts** card lists all chains/Safes; “Deploy on another chain” deploys a new Safe (same EOA), then calls `POST .../smart-accounts`. Show “Signer (EOA): 0x…” and “Reveal signer key” in this card. Remove EVM signer block from the **Agent Identity** card.
