---
title: Embedded Wallet Authentication
description: Email OTP, social login, passkeys, and Sign in with 1Claw OAuth for embedded wallet end-users.
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Embedded Wallet Authentication

End-users authenticate to 1Claw directly (Email OTP, social providers) or via **Sign in with 1Claw** OAuth. On first login, treasury wallets can auto-provision for requested chains. All auth routes are rate-limited (5 burst, 1/sec per IP on public endpoints).

## Email OTP (passwordless)

Best for apps that only need an email address — no password, no seed phrase.

**Flow:**

1. `POST /v1/auth/email-otp/send` — 6-digit code, 5-minute TTL, emailed via Resend
2. `POST /v1/auth/email-otp/verify` — returns a JWT. A first-time address gets a
   user and org **when the request carries `platform_app_id`** (the embedded-wallet
   case) or explicitly sets `allow_signup: true`. Without either, an unrecognised
   address is rejected rather than silently signed up — a valid code proves control
   of an inbox, not consent to create an account.
3. Optional `auto_provision_chains` — generates treasury wallets on first verify

<Tabs groupId="code-examples">
<TabItem value="typescript" label="TypeScript">

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "https://api.1claw.co" });

await client.auth.sendEmailOtp({
  email: "user@example.com",
  platform_app_id: "YOUR_APP_UUID", // optional: tie login to platform app
});

const { data } = await client.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
  auto_provision_chains: ["ethereum", "bitcoin", "solana"],
});

client.http.setToken(data.token);
// data.user_id, data.org_id, data.is_new_user, data.wallet_address
```

</TabItem>
<TabItem value="curl" label="curl">

```bash
# Send code
curl -X POST "https://api.1claw.co/v1/auth/email-otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","platform_app_id":"APP_UUID"}'

# Verify code
curl -X POST "https://api.1claw.co/v1/auth/email-otp/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "code":"123456",
    "auto_provision_chains":["ethereum"]
  }'
# Response: token, user_id, org_id, is_new_user, wallet_address?
```

</TabItem>
</Tabs>

:::caution No email auto-linking
If an email already belongs to another auth method or org, social/OTP flows return **409** — users must link explicitly via the consent flow (see [Cross-org linking](#cross-org-account-linking)).
:::

## Social login

Server-verified OAuth for Google, Apple, and Discord.

| Provider | Client sends | Server validates |
| -------- | ------------ | ---------------- |
| Google | `id_token` | Audience + issuer (`ONECLAW_GOOGLE_CLIENT_ID`) |
| Apple | `id_token` | Audience + issuer (`ONECLAW_APPLE_CLIENT_ID`) |
| Discord | Authorization `code` + `oauth_redirect_uri` | Server-side token exchange (`ONECLAW_DISCORD_CLIENT_ID` + secret) |

```typescript
const { data } = await client.auth.socialLogin({
  provider: "google", // google | apple | discord
  id_token: googleIdToken,
  auto_provision_chains: ["ethereum"],
  oauth_redirect_uri: "https://yourapp.com/auth/callback", // Discord only
});
```

New users receive an auto-provisioned Ethereum treasury wallet by default; pass `auto_provision_chains` for additional chains.

Environment variables (operator-configured on Vault):

- `ONECLAW_GOOGLE_CLIENT_ID`
- `ONECLAW_APPLE_CLIENT_ID`
- `ONECLAW_DISCORD_CLIENT_ID` + `ONECLAW_DISCORD_CLIENT_SECRET`

## Passkeys (WebAuthn)

Passkeys serve two roles for embedded wallets:

### Login passkeys

Standard FIDO2 registration and assertion for passwordless dashboard login:

- `POST /v1/auth/passkeys/assert/begin` + `.../complete` (public)
- `POST /v1/auth/passkeys/register/begin` + `.../complete` (authenticated)

See [Two-factor auth & passkeys](/docs/security/two-factor-auth) for human account passkey management.

### Passkey transaction authorization

For high-value sends, require a WebAuthn assertion bound to the exact transaction instead of (or in addition to) password re-auth:

1. `POST /v1/auth/passkeys/tx-assert/begin` with `{ tx_digest }` — SHA-256 hex of `chain|to|value_wei|data`
2. `POST /v1/auth/passkeys/tx-assert/complete` — returns 5-minute `passkey_token`
3. Send with header `X-Passkey-Token: <token>` on `POST /v1/treasury/wallets/{chain}/send`

The server recomputes the digest from the send body and rejects mismatches.

```typescript
// wallet-react handles this via sendWithPasskey()
const { sendWithPasskey } = useOneclawWallet();
await sendWithPasskey({
  chain: "ethereum",
  to: "0x...",
  amount: "1.0",
});
```

:::tip TX digest binding
The passkey prompt is cryptographically tied to one transaction. A captured token cannot authorize a different recipient or amount.
:::

## Sign in with 1Claw (OAuth)

1Claw acts as an OAuth2/OIDC authorization server. Third-party apps redirect users to the consent page; approved scopes yield access + ID tokens (RS256).

### Authorization URL

Use PKCE (S256) in production:

```typescript
import { generatePKCE, buildAuthorizeUrl } from "@1claw/sdk";

const { codeVerifier, codeChallenge } = await generatePKCE();

sessionStorage.setItem("pkce_verifier", codeVerifier);

const url = buildAuthorizeUrl("https://1claw.co", {
  clientId: "my-wallet-app", // platform app slug
  redirectUri: "https://yourapp.com/oauth/callback",
  scopes: ["openid", "profile", "email"],
  codeChallenge,
  codeChallengeMethod: "S256",
  state: crypto.randomUUID(),
});

window.location.href = url;
```

Dashboard consent page: `/oauth/authorize`.

### Token exchange

```typescript
const { data } = await client.auth.exchangeOAuthCode({
  code: callbackCode,
  client_id: "my-wallet-app",
  redirect_uri: "https://yourapp.com/oauth/callback",
  code_verifier: sessionStorage.getItem("pkce_verifier")!,
});

// data.access_token, data.id_token, data.refresh_token (if offline_access)
const userInfo = await client.auth.getUserInfo(data.access_token);
// userInfo.wallet_address when wallet scope granted
```

### React shortcut

```tsx
import { SignInWith1Claw, handleSignInCallback } from "@1claw/wallet-react";

<SignInWith1Claw
  clientId="my-wallet-app"
  redirectUri="https://yourapp.com/callback"
  scopes={["openid", "profile", "email"]}
  theme="dark"
/>
```

Supported scopes include `openid`, `profile`, `email`, and wallet-related scopes configured on your platform app. Revoke consent: `DELETE /v1/oauth/consent/{app_slug}`.

Full OAuth server details: [Platform API — OAuth](/docs/platform-api/overview) and OpenID discovery at `GET /.well-known/openid-configuration`.

## Cross-org account linking

When a user with an existing 1Claw account (different org) signs in through your embedded flow, the API may return **409** with an `authorize_url`. The `@1claw/wallet-react` widget redirects to the grant/consent page automatically (`onLinkRequired` for custom UX).

After approval, the user's **existing** treasury wallets connect to your app — no duplicate wallets are created.

## Platform-scoped login

Pass `platform_app_id` on Email OTP send/verify to associate the session with your platform app for connection tracking and spend policy resolution.

## Security notes

- Auth endpoints use burst rate limiting; do not poll OTP verify in tight loops
- Failed password re-auth on export/send increments lockout counters (10 failures → 15-minute lock)
- JWTs for users include org membership; treasury endpoints require `principal_type: "user"`

## Related

- [Getting started](/docs/guides/embedded-wallets/getting-started) — platform app setup
- [Send, swap, receive](/docs/guides/embedded-wallets/send-swap-receive) — passkey tx auth on sends
- [React integration](/docs/guides/embedded-wallets/react-integration) — widget auth UX
- [Security overview](/docs/security/security-overview) — threat model and verification endpoints
