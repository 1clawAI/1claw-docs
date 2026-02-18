---
title: Authentication
description: Get a JWT for the Human API using email/password, Google id_token, or a personal API key (Bearer token).
sidebar_position: 1
---

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

```bash
curl -X POST https://api.1claw.xyz/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

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
**Request body:**

| Field     | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| id_token | string | ✅       | Google ID token from OAuth    |

**Example:**

```bash
curl -X POST https://api.1claw.xyz/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"id_token":"<google-id-token>"}'
```

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

```bash
curl -X POST https://api.1claw.xyz/v1/auth/api-key-token \
  -H "Content-Type: application/json" \
  -d '{"api_key":"1ck_..."}'
```

**Response (200):** Same shape as above.

---

## Revoke token

**Endpoint:** `DELETE /v1/auth/token`  
**Headers:** `Authorization: Bearer <token>`

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

**Response (200):** `{ "message": "Password changed successfully" }`

---

## Error responses

| Status | Meaning                    |
|--------|----------------------------|
| 401    | Invalid credentials/token  |
| 400    | Bad request (e.g. missing field) |

All error bodies use the standard problem-details format (`type`, `title`, `status`, `detail`).
