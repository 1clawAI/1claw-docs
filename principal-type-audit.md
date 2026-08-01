# Principal Type Audit — Phase 11 Merge Gate

**Date**: 2026-08-01
**Author**: 1Claw Engineering
**Status**: Complete

## Context

Phase 11 introduces `"platform_delegated"` as a third `principal_type` value in `CallerIdentity`. Previously, the codebase only had `"user"`, `"agent"`, and `"platform"`. The delegated type represents a platform app acting on behalf of a connected user.

Two patterns exist for principal-type checks:
- **Allowlist** (`== "agent"` or `== "user"`): Safe — `platform_delegated` is correctly excluded.
- **Denylist** (`!= "agent"`): Dangerous — `platform_delegated` silently passes through.

## Fixes Applied

| File | Line | Old Pattern | Risk | Fix |
|------|------|-------------|------|-----|
| `vault/src/api/handlers/secrets.rs` | 45 | `!= "agent"` | Scope bypass — platform_delegated would skip scope enforcement | Changed to `== "user"` |
| `vault/src/api/handlers/bankr_keys.rs` | 165 | `!= "agent"` | Key exposure — raw `bk_usr_` API key leaked to non-agents | Changed to `== "user"` |

## Safe Denylist Instances (No Fix Needed)

These use `!= "agent"` as an agent-only gate (rejecting non-agents). Since `platform_delegated` is correctly rejected alongside `user`, no fix is needed.

| File | Approximate Line | Pattern | Purpose |
|------|-----------------|---------|---------|
| `vault/src/api/handlers/treasury.rs` | ~277 | `!= "agent"` | Agent-only treasury access gate |
| `vault/src/api/handlers/agents.rs` | ~691 | `!= "agent"` | Agent self-update block |
| `vault/src/api/handlers/sharing.rs` | ~84 | `!= "agent"` | Agent share restriction |
| `vault/src/api/handlers/approvals.rs` | ~234 | `!= "agent"` | Agent approval request |
| `vault/src/api/handlers/auth.rs` | ~3092 | `!= "agent"` | Agent token-exchange gate |

## Allowlist Instances Review (`== "agent"` and `== "user"`)

All 75+ allowlist checks have been reviewed. `platform_delegated` is correctly excluded from agent-specific behavior (transaction signing, Shroud config, intents API) and from user-only behavior (MFA, password reset, treasury wallets, account settings). Key categories:

### Agent-only gates (`== "agent"`)
- Transaction handlers: intents API, signing, nonce management — correct (delegated callers should not sign)
- Shroud config checks — correct (delegated callers don't have shroud JWT claims)
- Agent token exchange — correct

### User-only gates (`== "user"`)
- MFA setup/verify — correct (delegated callers cannot manage MFA)
- Password change/reset — correct
- Treasury wallet operations — correct (delegated callers cannot send/swap/export)
- Account settings — correct
- Device management — correct
- Memory reveal (encrypted values) — correct (delegated callers see metadata only)
- CMEK operations — correct
- Billing/subscription management — correct

### Platform-delegated behavior
- Resources created via delegation get `platform_app_id` set and `platform_locked = true`
- Delegation requests without a valid connection → 403
- Delegation disabled on connection → 403
- All delegated actions are logged in `platform_delegation_log`

## Security Invariants

1. Delegated request without valid connection → 403
2. Delegated request on connection with `delegation_enabled = false` → 403
3. Delegated resource creation sets `platform_app_id` + `platform_locked = true`
4. Delegated secret reads without matching scope globs → 403
5. Delegated CMEK/MPC/treasury-wallet/MFA/billing ops → 403
6. Delegated memory reads → 403 (memory reveal is user-only)
7. Cross-platform resource access → 403
8. User disables delegation → all subsequent delegated requests fail
9. Every delegated request is logged regardless of success/failure
10. `enforce_scope_access` rejects `platform_delegated` callers lacking scope match
11. `bankr_keys.rs` does NOT expose API key to `platform_delegated`
12. Pre-Phase 11 connections have `delegation_enabled = false` (migration default)

## Conclusion

All principal_type checks have been audited. The two dangerous denylist patterns have been fixed. No further code changes are required for Phase 11 safety.
