---
title: Authentication
description: Get a JWT for the Human API using email/password, Google id_token, or a personal API key (Bearer token).
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Authentication

The Human API expects a **JWT** in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

You can obtain an access token in three ways: email/password, Google OAuth, or a personal API key.

---

## Email and password

**Endpoint:** `POST /v1/auth/token`  
**Request body:**

| Field     | Type   | Required | Description |
|----------|--------|----------|-------------|
| email    | string | ✅       | User email  |
| password | string | ✅       | Password    |

**Example:**

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.auth.login({
  email: "you@example.com",
  password: "your-password",
});
```

</TabItem>
</Tabs>

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

`expires_in` is in seconds (e.g. 900 = 15 minutes). On 401 you get a problem-details JSON body.

---

## Google OAuth

**Endpoint:** `POST /v1/auth/google`  

The server verifies the Google ID token locally via [Google's JWKS](https://www.googleapis.com/oauth2/v3/certs) (RS256 signature, audience, issuer, expiry, email_verified). No external tokeninfo call.

**Request body:**

| Field     | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| id_token | string | ✅       | Google ID token from OAuth    |

**Example:**

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"id_token":"<google-id-token>"}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.auth.google({
  id_token: "<google-id-token>",
});
```

</TabItem>
</Tabs>

**Response (200):** Same as email/password (`access_token`, `token_type`, `expires_in`).

---

## Personal API key

If you have a **personal API key** (e.g. `1ck_...` from the dashboard or `POST /v1/auth/api-keys`), exchange it for a JWT:

**Endpoint:** `POST /v1/auth/api-key-token`  
**Request body:**

| Field    | Type   | Required | Description      |
|----------|--------|----------|------------------|
| api_key  | string | ✅       | Your API key     |

**Example:**

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/api-key-token \
  -H "Content-Type: application/json" \
  -d '{"api_key":"1ck_..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "1ck_...",
});
```

</TabItem>
</Tabs>

**Response (200):** Same shape as above.

:::tip API key expiration
All three key types (`1ck_` human, `ocv_` agent, `plt_` platform) support optional expiration. Set `api_key_expires_at` (ISO 8601) when creating or updating an agent/platform app, or `expires_at` when creating a personal API key. Expired keys return **401 Unauthorized**.
:::

---

## Revoke token

**Endpoint:** `DELETE /v1/auth/token`  
**Headers:** `Authorization: Bearer <token>`

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X DELETE https://api.1claw.xyz/v1/auth/token \
  -H "Authorization: Bearer <token>"
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.auth.logout();
```

</TabItem>
</Tabs>

Returns **204 No Content** on success. Useful to invalidate the current token (e.g. on logout).

---

## Change password

**Endpoint:** `POST /v1/auth/change-password`  
**Headers:** `Authorization: Bearer <token>`  
**Request body:**

| Field            | Type   | Required | Description   |
|------------------|--------|----------|---------------|
| current_password | string | ✅       | Current pwd   |
| new_password     | string | ✅       | New password  |

<Tabs groupId="code-examples">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.1claw.xyz/v1/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"...","new_password":"..."}'
```

</TabItem>
<TabItem value="typescript" label="TypeScript">

```typescript
await client.auth.changePassword({
  current_password: "...",
  new_password: "...",
});
```

</TabItem>
</Tabs>

**Response (200):** `{ "message": "Password changed successfully" }`

---

## Passkey authentication (WebAuthn)

Passwordless login using WebAuthn/FIDO2 passkeys. Uses P-256 ECDSA signatures verified server-side.

### Register a passkey (authenticated)

1. `POST /v1/auth/passkeys/register/begin` — returns challenge, RP info, and public key credential parameters.
2. Call `navigator.credentials.create()` with the returned options.
3. `POST /v1/auth/passkeys/register/complete` — send `credential_id`, `attestation_object`, `client_data_json`, optional `name` and `transports`.

### Sign in with passkey (public)

1. `POST /v1/auth/passkeys/assert/begin` — `{ "email": "user@example.com" }` → returns challenge and `allow_credentials`.
2. Call `navigator.credentials.get()` with the returned options.
3. `POST /v1/auth/passkeys/assert/complete` — send `credential_id`, `authenticator_data`, `client_data_json`, `signature` → returns JWT.

### Manage passkeys

- `GET /v1/auth/passkeys` — list registered passkeys (name, credential ID, created_at, last_used_at).
- `DELETE /v1/auth/passkeys/{id}` — delete a passkey.

---

## Set password (platform users)

Platform-provisioned users who signed up via OIDC or Google (and have no password) can set their first password:

`POST /v1/auth/set-password` with `{ "password": "..." }` (min 8 characters). Returns 400 if user already has a password set. After setting, email/password login is enabled alongside existing auth methods.

---

## Change email

Two-step verified email change:

1. `POST /v1/auth/change-email` — `{ "new_email": "new@example.com" }`. Sends a 6-digit verification code to the new address (15-minute expiry).
2. `POST /v1/auth/verify-email-change` — `{ "code": "123456" }`. Verifies the code and updates the account email.

Only one pending email change request per user at a time.

---

## Error responses

| Status | Meaning                    |
|--------|----------------------------|
| 401    | Invalid credentials/token  |
| 400    | Bad request (e.g. missing field) |

All error bodies use the standard problem-details format (`type`, `title`, `status`, `detail`).
