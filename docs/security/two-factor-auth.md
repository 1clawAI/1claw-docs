---
title: Two-factor authentication
description: "TOTP-based two-factor authentication protects human logins with an authenticator app and recovery codes."
sidebar_position: 5
---

# Two-factor authentication (2FA)

1Claw supports TOTP-based two-factor authentication for human user accounts. When enabled, logging in requires both your primary credential (password, passkey, or social login) **and** a 6-digit code from an authenticator app such as Google Authenticator, Authy, or 1Password.

2FA is optional but recommended. Enable and disable it from **Settings → Security** in the dashboard.

**Availability:** TOTP 2FA and passkey-based login MFA are available on **every plan**, including Free. The API field `eligible` in `MfaStatusResponse` is always `true` (kept for client compatibility). There is no tier gate.

## How it works

### Setup

1. Navigate to **Settings → Security** in the dashboard.
2. Click **Enable 2FA**.
3. Scan the QR code with your authenticator app, or enter the secret key manually.
4. Enter the 6-digit code from your app to verify.
5. Save your **8 recovery codes** in a safe place. Each code can only be used once.

### Login with 2FA (TOTP)

1. Sign in with email/password, Google, Apple, Discord, or email OTP as usual.
2. If TOTP is enabled (and passkey MFA is **not** enabled), the server responds with `{ mfa_required: true, mfa_token, mfa_method: "totp" }` instead of a session JWT.
3. The dashboard prompts you for a 6-digit code from your authenticator app.
4. Enter the code (or a recovery code) to complete sign-in via `POST /v1/auth/mfa/verify`.

### Login with passkey MFA (v0.56.3)

When **Require passkey for login 2FA** is enabled (`require_passkey_for_mfa` via `GET/PATCH /v1/auth/settings`), password/social/email-OTP login returns `{ mfa_required: true, mfa_token, mfa_method: "passkey" }` instead of a TOTP prompt. Complete the step with:

1. `POST /v1/auth/mfa/passkey/begin` — accepts `{ mfa_token }`; returns WebAuthn challenge, `rp_id`, and `allow_credentials`.
2. `POST /v1/auth/mfa/passkey/complete` — accepts `{ mfa_token, credential_id, authenticator_data, client_data_json, signature }`; returns the session JWT on success.

**Requirements:** At least one registered passkey before enabling. When both TOTP and passkey MFA are configured, **passkey MFA takes precedence** for the login step. Disabling passkey MFA requires step-up authentication (`X-Auth-Confirm`, purpose `security.mfa_passkey.disable`) with a passkey or TOTP when either is enrolled.

This is separate from [**vault passkey unlock**](/docs/security/two-factor-auth#vault-passkey-unlock) (`require_passkey_for_vaults`), which gates secret reads—not login.

### Disabling 2FA

Disabling requires proof of the factor you are removing, not your account password alone.

1. Navigate to **Settings → Security**.
2. Click **Disable 2FA**.
3. Confirm with **either**:
   - A current TOTP code or unused recovery code in the request body (`{ "code": "123456" }`), **or**
   - Step-up authentication via `X-Auth-Confirm` (purpose `security.mfa.disable`) with a passkey or TOTP when either is enrolled.

A stolen session plus password is **not** sufficient to strip 2FA.

## Technical details

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Algorithm      | TOTP (RFC 6238), SHA-1                 |
| Digits         | 6                                      |
| Step           | 30 seconds                             |
| Skew           | ±1 step (clock drift tolerance)        |
| Secret storage | AES-256-GCM encrypted at rest          |
| Recovery codes | 8 codes, encrypted at rest, single-use |
| MFA token TTL  | 5 minutes                              |

### API endpoints

| Endpoint                         | Auth                  | Description                                                |
| -------------------------------- | --------------------- | ---------------------------------------------------------- |
| `GET /v1/auth/mfa/status`        | Bearer JWT            | Returns `{ enabled, eligible }` (`eligible` always true)   |
| `POST /v1/auth/mfa/setup`        | Bearer JWT            | Generates TOTP secret and returns QR code URI              |
| `POST /v1/auth/mfa/verify-setup` | Bearer JWT            | Verifies initial code, enables MFA, returns recovery codes |
| `POST /v1/auth/mfa/verify`       | None (uses MFA token) | Validates TOTP code during login, returns session JWT      |
| `DELETE /v1/auth/mfa`            | Bearer JWT            | Disables TOTP MFA (requires TOTP/recovery code or passkey step-up) |
| `GET /v1/auth/settings`          | Bearer JWT (user)     | Returns `require_passkey_for_vaults`, `require_passkey_for_mfa` |
| `PATCH /v1/auth/settings`        | Bearer JWT (user)     | Toggle vault unlock or passkey login MFA                      |
| `POST /v1/auth/mfa/passkey/begin` | None (uses MFA token) | Start passkey MFA ceremony during login                       |
| `POST /v1/auth/mfa/passkey/complete` | None (uses MFA token) | Complete passkey MFA; returns session JWT                 |

### MFA challenge flow

When a user with login MFA enabled authenticates via `POST /v1/auth/token` (email/password), the server returns:

```json
{
    "mfa_required": true,
    "mfa_method": "totp",
    "mfa_token": "<short-lived-jwt>",
    "access_token": "",
    "token_type": "Bearer",
    "expires_in": 300
}
```

When `require_passkey_for_mfa` is enabled, `mfa_method` is `"passkey"` and the client completes via `POST /v1/auth/mfa/passkey/begin` + `.../complete` instead of TOTP.

Otherwise the client calls `POST /v1/auth/mfa/verify` with the `mfa_token` and the user's TOTP code to receive the real session JWT.

### Encryption

TOTP secrets and recovery codes are encrypted with AES-256-GCM using `ONECLAW_TOTP_ENCRYPTION_KEY` (64 hex characters = 32 bytes). In development, if the variable is not set, a key is derived automatically.

## Scope

2FA applies only to **human user logins** (email/password and flows that issue a user JWT after primary auth). It does not apply to:

- Agent authentication (`ocv_` API keys and agent JWTs from `POST /v1/auth/agent-token`)
- Personal API key authentication (`1ck_` keys)
- Platform API keys (`plt_` keys)
- MCP server connections (token-based)

Passkey-only login bypasses the password path but still goes through login MFA when TOTP or passkey MFA is enabled on the account.

## Vault passkey unlock {#vault-passkey-unlock}

Optional per-user setting `require_passkey_for_vaults` (managed via `GET/PATCH /v1/auth/settings`). When enabled, `get_secret` and `get_secret_version` require an `X-Passkey-Token` header from `POST /v1/auth/passkeys/vault-assert/begin` + `.../complete` (User Verified passkey ceremony). Tokens are reusable for 5 minutes so one prompt covers a burst of reads. Dashboard: **Settings → Security → Vault unlock** card.
