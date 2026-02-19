---
title: Sharing Secrets
description: Share secrets with teammates or external collaborators by email, even if they don't have an account yet.
sidebar_position: 4
---

# Sharing Secrets

1Claw supports sharing individual secrets with other users, agents, or external collaborators via email. Shares are time-limited, access-counted, and can be revoked at any time.

## Share types

| `recipient_type`   | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `user`             | Direct share to an existing 1Claw user by ID                |
| `agent`            | Direct share to a registered agent by ID                    |
| `external_email`   | Invite-by-email — the recipient doesn't need an account yet |
| `anyone_with_link` | Anyone with the share URL can access                        |

## Create a share

```bash
curl -X POST https://api.1claw.xyz/v1/secrets/{secret_id}/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_type": "external_email",
    "email": "colleague@example.com",
    "expires_at": "2026-03-15T00:00:00Z",
    "max_access_count": 5
  }'
```

**Response:**

```json
{
    "id": "uuid",
    "share_url": "https://api.1claw.xyz/v1/share/uuid",
    "recipient_type": "external_email",
    "recipient_email": "colleague@example.com",
    "expires_at": "2026-03-15T00:00:00Z",
    "max_access_count": 5
}
```

## Invite-by-email flow

When you share with `recipient_type: "external_email"`:

1. A share record is created with the recipient's email.
2. The recipient receives an email notification with a link to sign in.
3. When the recipient signs up or logs in with that email, all pending shares are **automatically claimed** — they appear in the recipient's account.
4. The recipient can then access the shared secret through the API or dashboard.

This means agents can share secrets with humans who don't have accounts yet. The human simply signs up with the invited email address and their shares are waiting.

## Access a share

```bash
curl https://api.1claw.xyz/v1/share/{share_id}
```

Returns the decrypted secret value if the share is still valid (not expired, under access limit).

## Revoke a share

Only the creator can revoke:

```bash
curl -X DELETE https://api.1claw.xyz/v1/share/{share_id} \
  -H "Authorization: Bearer $TOKEN"
```

## Using the SDK

```ts
import { createClient } from "@1claw/sdk";

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "...",
});

// Share by email
const share = await client.sharing.create(secretId, {
    recipient_type: "external_email",
    email: "colleague@example.com",
    expires_at: "2026-03-15T00:00:00Z",
    max_access_count: 5,
});

// Access a share
const secret = await client.sharing.access(shareId);

// Revoke
await client.sharing.revoke(shareId);
```

## Email notifications

When a share is created with `external_email`, the recipient receives an email. The share creator also receives a notification each time the shared secret is accessed.

See [Email Notifications](/docs/guides/email-notifications) for the full list of automated emails.

## Security considerations

- Shares respect the `max_access_count` — once exhausted, the link is dead.
- Shares expire at `expires_at` — past that datetime, access is denied.
- Share creators are notified on each access.
- Revoked shares return 404 immediately.
- Optional: add a `passphrase` or `ip_allowlist` to the share for additional protection.
