---
title: Two-factor authentication
description: "TOTP-based two-factor authentication protects human logins with an authenticator app and recovery codes."
sidebar_position: 5
---

# Two-factor authentication (2FA)

1Claw supports TOTP-based two-factor authentication for human user accounts. When enabled, logging in requires both your password (or Google OAuth) **and** a 6-digit code from an authenticator app such as Google Authenticator, Authy, or 1Password.

2FA is optional but recommended. It can be enabled and disabled from **Settings → Security** in the dashboard.

## How it works

### Setup

1. Navigate to **Settings → Security** in the dashboard.
2. Click **Enable 2FA**.
3. Scan the QR code with your authenticator app, or enter the secret key manually.
4. Enter the 6-digit code from your app to verify.
5. Save your **8 recovery codes** in a safe place. Each code can only be used once.

### Login with 2FA

1. Enter your email/password or sign in with Google as usual.
2. If 2FA is enabled, the server responds with a short-lived MFA challenge token instead of a session JWT.
3. The dashboard prompts you for a 6-digit code from your authenticator app.
4. Enter the code (or a recovery code) to complete sign-in.

### Disabling 2FA

1. Navigate to **Settings → Security**.
2. Click **Disable 2FA**.
3. Confirm by entering your current TOTP code or your account password.

## Technical details

| Property | Value |
|---|---|
| Algorithm | TOTP (RFC 6238), SHA-1 |
| Digits | 6 |
| Step | 30 seconds |
| Skew | ±1 step (clock drift tolerance) |
| Secret storage | AES-256-GCM encrypted at rest |
| Recovery codes | 8 codes, encrypted at rest, single-use |
| MFA token TTL | 5 minutes |

### API endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /v1/auth/mfa/status` | Bearer JWT | Returns whether MFA is enabled |
| `POST /v1/auth/mfa/setup` | Bearer JWT | Generates TOTP secret and returns QR code URI |
| `POST /v1/auth/mfa/verify-setup` | Bearer JWT | Verifies initial code, enables MFA, returns recovery codes |
| `POST /v1/auth/mfa/verify` | None (uses MFA token) | Validates TOTP code during login, returns session JWT |
| `DELETE /v1/auth/mfa` | Bearer JWT | Disables MFA (requires TOTP code or password) |

### MFA challenge flow

When a user with 2FA enabled authenticates via `POST /v1/auth/token` or `POST /v1/auth/google`, the server returns:

```json
{
  "mfa_required": true,
  "mfa_token": "<short-lived-jwt>",
  "access_token": "",
  "token_type": "Bearer",
  "expires_in": 300
}
```

The client then calls `POST /v1/auth/mfa/verify` with the `mfa_token` and the user's TOTP code to receive the real session JWT.

### Encryption

TOTP secrets and recovery codes are encrypted with AES-256-GCM using a server-side key configured via the `ONECLAW_TOTP_ENCRYPTION_KEY` environment variable (64 hex characters = 32 bytes). In development mode, if the variable is not set, a key is derived automatically.

## Scope

2FA applies only to **human user logins** (email/password and Google OAuth). It does not apply to:

- Agent authentication (agents use API keys, not passwords)
- Personal API key authentication (`1ck_` keys)
- MCP server connections (token-based)
