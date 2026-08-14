---
title: Platform wizard
description: Step-by-step dashboard flow to create a platform app, bootstrap template, and first connected user.
sidebar_position: 5
---

# Platform wizard

The **Platform wizard** at `/platform/wizard` walks developers through building on the [Platform API](/docs/platform-api/overview).

## Steps

1. **Create platform app** — Name, slug, redirect URIs, billing model
2. **Create bootstrap template** — Visual Template Spec Builder or JSON spec (vault, agents, policies, signing keys, optional runtimes/automations)
3. **Provision first user** — `upsert_user` + `bootstrap` flow; copy claim URL for end-user

## Platform home (`/platform`)

After setup:

- App list with API key prefix and stats
- Template editor with spec builder
- Connected users and bootstrap history
- Key rotation, webhook secret rotation
- Marketplace listing (optional)

## Grant & claim flows

- **Grant page** (`/connect/{slug}/grant`) — End-user selects vaults/agents to share with platform
- **Claim page** (`/connect/{slug}/claim/{token}`) — Public; end-user claims bootstrapped resources

Requires Pro+ tier for Platform API access.

See also: [Platform API overview](/docs/platform-api/overview), [Multi-tenant bootstrap](/docs/platform-api/multi-tenant), [Webhooks](/docs/platform-api/webhooks).
