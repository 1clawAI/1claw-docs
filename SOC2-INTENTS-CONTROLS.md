# SOC 2 Type I — Intents API controls (documentation outline)

**§25 — Ongoing.** Use this outline when connecting Vanta/Drata (or your auditor) and when documenting how Intents API supports SOC 2 control objectives. Fill in evidence and control IDs per your framework.

---

## Purpose

The Intents API allows agents to submit blockchain transactions while private keys remain in the vault and are never returned to the client. This document outlines controls that support **security and availability** relevant to SOC 2 (e.g. CC6, CC7, A1.2) for the Intents flow.

---

## 1. Access control (who can sign)

| Control area | Description | Evidence / reference |
|--------------|-------------|----------------------|
| Agent identity | Only the agent that holds the API key (and optional agent_id) can obtain a JWT for transaction endpoints. | Auth: `POST /v1/auth/agent-token`; JWT contains `sub: "agent:<uuid>"`, `org_id`, `intents_api_enabled`. |
| Principal isolation | An agent cannot submit transactions on behalf of another agent. | Handler: `caller.id != agent_id` → 403. |
| Vault/path access | Agent must have a policy granting read access to the vault path that contains the signing key. | Policy engine + `enforce_scope_access`; no key material in response. |
| Intents flag | Transaction endpoints require `intents_api_enabled: true` on the agent. | Middleware/handler: JWT claim and agent record; 403 if false. |

---

## 2. Transaction guardrails (what can be signed)

| Control area | Description | Evidence / reference |
|--------------|-------------|----------------------|
| Chain allowlist | Optional `tx_allowed_chains` restricts which chains the agent can use. | Handler: `validate_agent_tx`; 403 if chain not allowed. |
| Recipient allowlist | Optional `tx_to_allowlist` restricts destination addresses. | Handler: 403 if `to` not in list. |
| Value cap | Optional `tx_max_value` and `tx_daily_limit` limit value per tx and rolling 24h per-chain (in native major units). `tx_max_value_eth` / `tx_daily_limit_eth` accepted as deprecated aliases. | Handler: sum and compare; 403 if exceeded. |
| Signing key path | `signing_key_path` restricted to `keys/*`, `wallets/*`, `agents/{id}/keys/*` to prevent arbitrary secret exfiltration. | `validate_signing_key_path()`; 400 if disallowed. |

---

## 3. Simulation and integrity (revert prevention)

| Control area | Description | Evidence / reference |
|--------------|-------------|----------------------|
| Tenderly simulation | Optional `simulate_first` or org setting `intents_api.require_simulation` runs simulation before signing; 422 if reverted. | Handler: simulate → on revert, record tx as `simulation_failed`, return 422; no sign/broadcast. |
| Nonce serialization | Server-side nonce reservation prevents duplicate/nonce-gap transactions. | DB: `nonce_tracker`; `reserve_next_nonce` with SELECT FOR UPDATE. |
| Idempotency | Optional `Idempotency-Key` header prevents replay of the same request within 24h. | `transaction_idempotency` table; 200 with cached response on duplicate. |

---

## 4. Key handling and audit

| Control area | Description | Evidence / reference |
|--------------|-------------|----------------------|
| Key isolation | Private key decrypted only inside HSM (or TEE when using Shroud); never returned in API response. | Crypto layer; response includes only `tx_hash`, `id`, `status`, optional `signed_tx` (gated by query param). |
| Audit trail | Every transaction (submit, simulate, list, get) logged with agent_id, chain, path, value, status. | Audit events; `audit_events` table and hash chain. |
| Signed tx gating | GET transaction by default omits `signed_tx`; requires `?include_signed_tx=true` to reduce exfiltration risk. | Handler: `TxQueryParams.include_signed_tx`. |

---

## 5. Availability and change management

| Control area | Description | Evidence / reference |
|--------------|-------------|----------------------|
| Deployment | Vault and Shroud deployed via CI/CD (GitHub Actions); changes to transaction logic require code review and main branch. | Repo: `vault/`, `shroud/`; workflows in `.github/workflows/`. |
| Config | Chain registry, RPC URLs, and facilitator URLs are configurable via DB or env; no key material in config. | `chains` table; env for Tenderly, x402 facilitator. |

---

## How to use this in Vanta/Drata

1. **Map to control questions:** For each control area, attach the relevant policy or procedure (e.g. "Access control policy", "Change management") and point to this doc and code paths.
2. **Evidence:** Link to repo paths, API specs, and (if applicable) dashboard screenshots for guardrails and audit log.
3. **Updates:** When you add new guardrails or change the Intents flow, update this outline and re-attach evidence for the next audit cycle.

---

## Contact

For auditor or compliance questions: ops@1claw.xyz.
