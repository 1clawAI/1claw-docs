---
title: Principal-Type Audit
description: Inventory of principal_type checks in Vault — allowlist vs denylist patterns and platform_delegated safety (Phase 11 merge gate).
sidebar_position: 25
---

# Principal-Type Audit (Phase 11)

Platform delegation introduces `principal_type: "platform_delegated"` when a `plt_` key presents `X-Platform-Connection` for a connection with `delegation_enabled=true`. Human-only paths must use an **allowlist** (`== "user"`) or `require_human()` that rejects every non-user principal. A **denylist** (`!= "agent"` or `== "agent" → forbid`) incorrectly admits `platform_delegated` into human-only surfaces.

## Types (quick reference)

| `principal_type` | How it is set | Typical credentials |
| --- | --- | --- |
| `user` | User JWT / `1ck_` key | Dashboard, human API key |
| `agent` | Agent JWT (`sub: agent:<uuid>`) | `ocv_` → agent-token |
| `platform` | `plt_` without connection header | Platform operator |
| `platform_delegated` | `plt_` + `X-Platform-Connection` when enabled | Same `plt_`, scoped |
| `oauth` | OAuth access token | Sign in with 1Claw |

New connections default to `delegation_enabled = false` (migration 151).

## Classification legend

| Class | Pattern | Verdict |
| --- | --- | --- |
| **Allowlist** | `principal_type == "user"` / `!= "user" → forbid` | Correct for human-only; rejects `platform_delegated` |
| **Denylist** | `principal_type != "agent"` or `== "agent" → forbid` only | **RISKY** on human-only paths (allows `platform_delegated`) |
| **Explicit platform_delegated** | Sets/`platform_delegated` flag or branches on it | OK when intentional |
| **Scope enforcement** | `enforce_scope_access` / `enforce_delegation_scope` | OK |

Delegation-capable CRUD (vaults, agents, secrets, automations, runtimes) intentionally uses `== "agent" → forbid` **plus** `enforce_delegation_scope` so humans and `platform_delegated` can operate within scopes. That combination is **not** treated as RISKY.

---

## Key findings (verified in code)

| # | Finding | Status |
| --- | --- | --- |
| 1 | `secrets.rs` `enforce_scope_access` uses `== "user"` to skip JWT path scopes | **FIXED** (allowlist) |
| 2 | `bankr_keys.rs` `expose_api_key` uses `== "user"` | **FIXED** (allowlist) |
| 3 | Remaining human-only denylists that admit `platform_delegated` | See [RISKY denylist inventory](#risky-denylist-inventory) |
| 4 | Memory plaintext reveal (get/list) must not be available via delegation | **FIXED** — `resolve_agent_for_memory` rejects `platform_delegated` |
| 5 | CMEK / MPC / MFA use `!= "user"`; treasury wallets `require_human` allowlist | CMEK/MPC/MFA **OK**; treasury wallets **FIXED**; billing has **no** principal gate |

---

## Summary table

| Location | Check | Class | Notes |
| --- | --- | --- | --- |
| `api/handlers/secrets.rs` `enforce_scope_access` | `== "user"` skip | Allowlist + Scope | Agents **and** `platform_delegated` must match JWT/path scopes |
| `api/handlers/secrets.rs` handlers | `enforce_delegation_scope(secrets:*)` | Scope | Delegated secret CRUD gated by scopes |
| `api/handlers/bankr_keys.rs` lease | `expose_api_key = == "user"` | Allowlist | API key never returned to agents / delegated |
| `api/handlers/vaults.rs` CMEK enable/disable | `!= "user"` | Allowlist | Human-only |
| `api/handlers/vaults.rs` MPC enable | `!= "user"` | Allowlist | Human-only |
| `api/handlers/cmek.rs` rotate | `!= "user"` | Allowlist | Human-only |
| `api/handlers/auth.rs` MFA / email-change / set-password / export-data | `!= "user"` | Allowlist | Human-only |
| `api/handlers/api_keys.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/org.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/admin.rs` / `admin_guard` | `!= "user"` | Allowlist | Platform admin humans |
| `api/handlers/risk.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/devices.rs` / most `passkeys.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/reauth.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/bankr_config.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/ip_rules.rs` | `!= "user"` | Allowlist | Human-only |
| `api/handlers/approvals.rs` decide/list | `!= "user"` | Allowlist | Human decide path |
| `api/handlers/oauth.rs` authorize | `!= "user"` | Allowlist | Consent is human |
| `api/handlers/platform.rs` update delegation | `!= "user"` | Allowlist | End-user consent |
| `api/handlers/treasury.rs` (most) | `!= "user"` | Allowlist | Safe/treasury admin |
| `api/handlers/treasury_proposals.rs` execute | `!= "user"` | Allowlist | Force-execute human-only |
| `api/handlers/signing_keys.rs` export | `!= "user"` | Allowlist | Key material export |
| `api/handlers/treasury_wallets.rs` `require_human` | `!= "user"` | Allowlist | Was denylist; fixed for Phase 11 |
| `api/handlers/agent_memory.rs` | rejects `platform_delegated` | Explicit | Agents (own) + users only for plaintext |
| `api/middleware/auth.rs` | sets `platform_delegated` | Explicit | Header + `delegation_enabled` |
| `api/middleware/auth.rs` `enforce_delegation_scope` | scope match | Scope | Empty scopes deny |
| `api/handlers/{vaults,agents,secrets,automations,runtimes}.rs` | `== "agent" → forbid` + `enforce_delegation_scope` | Explicit + Scope | Delegation-capable CRUD — OK |
| `api/handlers/webhooks.rs` | `== "agent" → forbid` | Denylist | **RISKY** — no delegation scope |
| `api/handlers/signing_keys.rs` create/rotate/deactivate | `== "agent" → forbid` | Denylist | **RISKY** — provisioning not user-allowlisted |
| `api/handlers/bindings.rs` create/rotate | `== "agent" → forbid` | Denylist | **RISKY** — credential binding writes |
| `api/handlers/spend_policies.rs` | `== "agent" → forbid` | Denylist | **RISKY** if reachable with delegated identity |
| `api/handlers/{deposit_destinations,internal_accounts,fiat,chat,channels}.rs` `require_human` | `== "agent"` | Denylist | **RISKY** — still denylist |
| `api/handlers/runtimes.rs` shell `require_human` | `!= "user"` | Allowlist | Was denylist; fixed for Phase 11 |
| `api/handlers/billing_v2.rs` / `llm_billing.rs` | _(none)_ | Gap | Prefer `== "user"` on mutating billing |
| `api/handlers/approvals.rs` request | `!= "agent"` | Allowlist-of-agents | Agent-only — OK |
| `api/handlers/treasury.rs` request_access | `!= "agent"` | Allowlist-of-agents | Agent-only — OK |
| `api/handlers/agents.rs` `/me` | `!= "agent"` | Allowlist-of-agents | Agent-only — OK |
| `api/handlers/sharing.rs` recipient `creator` | `!= "agent"` | Allowlist-of-agents | Agent-only — OK |
| `api/handlers/auth.rs` federated exchange subject | `!= "agent"` | Allowlist-of-agents | Agent-only — OK |

---

## Detail by pattern

### Allowlist (`== "user"` / `!= "user"`)

Used for MFA, CMEK, MPC, org admin, API keys, risk, devices/passkeys, reauth, Bankr org config, IP rules, platform delegation toggle, most treasury Safe admin, signing-key **export**, and treasury wallets.

```rust
if caller.principal_type != "user" {
    return Err(AppError::Forbidden("Only users can …".into()));
}
```

### Scope enforcement (OK)

`enforce_scope_access` (`secrets.rs`): only `principal_type == "user"` skips path-scope checks; agents and `platform_delegated` must match a scope glob.

`enforce_delegation_scope` (`auth.rs`): for `platform_delegated` callers, require exact / `resource:*` / `*` match; empty scopes deny. Non-delegated callers pass.

### Explicit `platform_delegated` (OK)

Auth middleware resolves `X-Platform-Connection`, requires `delegation_enabled`, loads `delegation_scopes`, sets `principal_type = "platform_delegated"`. Wrong app → connection mismatch → 401.

### RISKY denylist inventory

These human-sensitive (or privileged) paths still use agent denylist and **do not** call `enforce_delegation_scope`:

| File | Helper / site | Recommendation |
| --- | --- | --- |
| `deposit_destinations.rs` | `require_human` | `!= "user"` |
| `internal_accounts.rs` | `require_human` | `!= "user"` |
| `fiat.rs` | `require_human` | `!= "user"` |
| `chat.rs` | `require_human` | `!= "user"` |
| `channels.rs` | `require_human` | `!= "user"` |
| `runtimes.rs` | shell `require_human` | ~~`!= "user"`~~ **FIXED** |
| `webhooks.rs` | all mutating handlers | `!= "user"` |
| `signing_keys.rs` | create / rotate / deactivate | `!= "user"` (export already allowlisted) |
| `bindings.rs` | create / rotate-credential | `!= "user"` |
| `spend_policies.rs` | mutating handlers | `!= "user"` |
| `billing_v2.rs` / `llm_billing.rs` | subscribe / portal / topup / disable | add `== "user"` |

Shared helper preference:

```rust
fn require_human(caller: &CallerIdentity) -> Result<(), AppError> {
    if caller.principal_type != "user" {
        return Err(AppError::Forbidden(
            "This operation is only available to human users.".into(),
        ));
    }
    Ok(())
}
```

---

## Memory / CMEK / MPC / Treasury / MFA / Billing

| Surface | Rejects `platform_delegated`? |
| --- | --- |
| Memory plaintext get/list | Yes (`resolve_agent_for_memory`) |
| CMEK enable/disable/rotate | Yes (`!= "user"`) |
| MPC enable | Yes (`!= "user"`) |
| MFA setup/status/disable | Yes (`!= "user"`) |
| Treasury Safe admin (`treasury.rs`) | Yes (`!= "user"`) |
| Treasury wallets | Yes (`require_human` allowlist) |
| Billing mutate (`billing_v2` / LLM billing) | **No dedicated check** — follow-up |

---

## Merge gate checklist

- [ ] `enforce_scope_access` remains allowlist (`== "user"` only skips scopes)
- [ ] Bankr lease never exposes `api_key` unless `principal_type == "user"`
- [ ] Memory plaintext paths reject `platform_delegated` → 403
- [ ] CMEK / MPC / MFA / treasury wallets reject `platform_delegated` → 403
- [ ] No new human-only handler uses `== "agent" → forbid` without documenting why delegated is allowed
- [ ] Remaining RISKY rows above are fixed or explicitly accepted with ticket
- [ ] `scripts/test-platform-delegation-prod.sh` ≥ 12 TOTAL assertions covering the Phase 11 plan list
- [ ] Runtime `rebuild` returns `stopped` (no stuck `building` without Cloud Build)

### Suggested follow-ups (non-blocking if ticketed)

1. Convert remaining `require_human` denylists (deposit, fiat, internal accounts, chat, channels).
2. Allowlist webhooks, signing-key provision, bindings create, spend policies.
3. Add `principal_type == "user"` on billing mutations.

## Related

- [Platform API](./platform-api.md)
- [Multi-tenant platform](./multi-tenant-platform.md)
- Prod script: `scripts/test-platform-delegation-prod.sh`
