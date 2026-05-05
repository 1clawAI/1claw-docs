---
title: OIDC federation — use 1claw as an IdP for Anthropic WIF
description: Mint short-lived OIDC JWTs from 1claw and exchange them for upstream tokens (Anthropic Workload Identity Federation, GCP STS, AWS STS) with no static API keys on the relying party.
---

# OIDC federation — Anthropic Workload Identity Federation (WIF)

1claw publishes a standard OpenID Connect issuer — discovery doc, JWKS, and an RFC 8693 token-exchange endpoint — so any external service that supports OIDC federation can validate 1claw-issued JWTs against the published JWKS. **No static Anthropic key, no static GCP service-account key, no static AWS access key sitting on disk.**

## How it works

```
agent ──[ ocv_… or agent JWT ]──▶ 1claw POST /v1/auth/federated-token
                                  │
                                  ├─ verify subject_token
                                  ├─ check agent.federation_enabled
                                  ├─ check audience allowlist
                                  ├─ sign RS256 JWT with KMS HSM key (kid in header)
                                  └─ return access_token, expires_in
agent ──[ federated JWT ]──▶ Anthropic POST /v1/oauth/token
                              │
                              ├─ fetch https://api.1claw.xyz/.well-known/openid-configuration
                              ├─ fetch https://api.1claw.xyz/.well-known/jwks.json
                              ├─ verify alg, kid, iss, aud, exp
                              └─ return sk-ant-oat01-…
agent ──[ sk-ant-oat01-… ]──▶ Claude API
```

Both EdDSA and RS256 keys are advertised in JWKS. Federation tokens are minted with **RS256** specifically because Anthropic's WIF docs list RS256, and RS256 is the most universally supported alg across OIDC relying parties.

## Endpoints

| Endpoint | What it returns |
|----------|-----------------|
| `GET https://api.1claw.xyz/.well-known/openid-configuration` | Issuer, JWKS URL, supported algs, supported grant types. |
| `GET https://api.1claw.xyz/.well-known/jwks.json` | Every active EdDSA + RS256 public key version, keyed by `kid`. |
| `POST https://api.1claw.xyz/v1/auth/federated-token` | RFC 8693 token exchange. |

## Step 1 — Enable federation on the agent

In the dashboard, open the agent detail page and find the **OIDC Federation (Anthropic WIF)** card.

1. Toggle **Enable Federation**.
2. Add an entry to **Allowed Audiences** — e.g. `https://api.anthropic.com`. The list is enforced server-side, so an empty list denies everything.
3. Pick a **Token TTL** (default 15 min, hard cap 60 min).

The card also shows the issuer URL, JWKS URL, and the agent's `sub` (`agent:<uuid>`). Copy these into the Anthropic Console when you register 1claw as an OIDC provider.

## Step 2 — Register 1claw in the Anthropic Console

In the Anthropic Console go to **Workload Identity Federation → Add provider** and fill in:

| Field | Value |
|-------|-------|
| Provider type | OpenID Connect |
| Issuer URL | `https://api.1claw.xyz` |
| JWKS URL | `https://api.1claw.xyz/.well-known/jwks.json` |
| Subject claim | `sub` |
| Allowed audience | `https://api.anthropic.com` (or whatever Anthropic gives you) |

Anthropic caches the JWKS, so a key rotation may take a few minutes to propagate.

## Step 3 — Exchange a 1claw credential for a federated JWT

The token exchange endpoint accepts both JSON and `application/x-www-form-urlencoded`.

### SDK

```ts
import { OneclawClient } from "@1claw/sdk";

const client = new OneclawClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: process.env.ONECLAW_AGENT_API_KEY!, // ocv_...
});

const { data, error } = await client.auth.exchangeFederatedToken({
  audience: "https://api.anthropic.com",
});

if (error) throw new Error(error.message);

const federatedJwt = data!.access_token;
console.log("expires_in", data!.expires_in);
```

### CLI

```bash
1claw auth federated-token --audience https://api.anthropic.com --raw > federated.jwt
```

### curl

```bash
curl -sS -X POST https://api.1claw.xyz/v1/auth/federated-token \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=${ONECLAW_AGENT_API_KEY}" \
  -d "subject_token_type=urn:1claw:params:oauth:token-type:api-key" \
  -d "audience=https://api.anthropic.com"
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6InJzMjU2LXYxIiwidHlwIjoiSldUIn0...",
  "issued_token_type": "urn:ietf:params:oauth:token-type:jwt",
  "token_type": "Bearer",
  "expires_in": 900
}
```

## Step 4 — Exchange the federated JWT at Anthropic

```bash
curl -sS https://api.anthropic.com/v1/oauth/token \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "assertion=$(cat federated.jwt)"
```

Anthropic returns an `sk-ant-oat01-…` token you can then use against the Claude API.

## Claims on the 1claw-issued JWT

| Claim | Value |
|-------|-------|
| `iss` | `https://api.1claw.xyz` (or your `vault_public_url` if customized) |
| `sub` | `agent:<agent_uuid>` |
| `aud` | The audience you requested (must be on the agent's allowlist) |
| `exp` | `iat + agent.federated_token_ttl_seconds` (default 900s, max 3600s) |
| `iat` | issued-at, in seconds |
| `jti` | unique token id (for revocation tracking) |
| `org` | the agent's organization id |
| `scopes` | the agent's scopes, optionally narrowed by the request |
| `vault_ids` | vault scoping, when set on the agent |

The header always includes `alg: RS256`, `typ: JWT`, and a `kid` that resolves against `/.well-known/jwks.json`.

## Security guardrails

- **`federation_enabled = false`** by default — no agent ships federation-capable until a human flips the toggle.
- **Empty audience allowlist denies everything.** No silent allow-all.
- **Hard TTL cap of 60 minutes**, default 15 minutes. Both enforced as a DB CHECK and clamped in the handler.
- **Rate limit:** 5 burst, 1/sec on `/v1/auth/federated-token`.
- **Audit log:** every successful mint emits an `auth.federated_token_issued` event in the audit hash chain.
- **Revocation:** the `jti` is tracked in `agent_active_tokens` so you can revoke active federated tokens just like agent JWTs.

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| Anthropic: `invalid_token: kid not found` | Their JWKS cache is stale; wait a few minutes or refresh in the console. |
| `403 Federation not enabled` | Toggle the agent's federation switch in the dashboard. |
| `403 audience not allowed` | Add the audience to the agent's allowlist. |
| `400 audience must be an absolute URL` | Use `https://`; localhost and private CIDRs are blocked in production. |
| `503 RS256 signing key not configured` | 1claw deployment misconfigured; contact ops@1claw.xyz. |
| Anthropic complains about `iss` | Make sure the issuer in the Anthropic Console exactly matches `iss` in the JWT (no trailing slash). |

## Combine with Shroud for defense-in-depth

A federated JWT is a bearer credential. Pair federation with [Shroud](./shroud.md) so the upstream LLM call goes through 1claw's TEE proxy: Shroud holds the federated credential, redacts secrets in the prompt, enforces per-agent policy, and the agent never sees the upstream `sk-ant-oat01-…`.

## See also

- [Agent self-onboarding](./agent-self-onboarding.md)
- [Securing agent access](./securing-agent-access.md)
- [Audit and compliance](./audit-and-compliance.md)
