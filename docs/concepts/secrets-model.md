---
title: Secrets model
description: Secrets live in vaults at paths, have types and optional metadata, expiry, and versioning; values are encrypted and never returned in list responses.
sidebar_position: 2
---

# Secrets model

A **secret** is a named value stored inside a **vault** at a **path**. The path is a slash-separated identifier (e.g. `passwords/one`, `api-keys/stripe`). Paths must be alphanumeric with hyphens, underscores, and slashes; no leading or trailing slashes.

## Secret types

The API accepts a `type` field when creating or updating a secret. Allowed values (from the vault schema):

- `password`
- `api_key`
- `private_key`
- `certificate`
- `file`
- `note`
- `ssh_key`
- `env_bundle`

The value is always stored as bytes; for display the API may return it as a UTF-8 string when possible.

## Metadata and options

- **metadata** — Optional JSON object (e.g. tags, description). Stored and returned with the secret.
- **expires_at** — Optional ISO 8601 datetime. After this time the secret is treated as expired and will not be returned (410 Gone).
- **max_access_count** — Optional integer. After this many reads, the secret returns 410 Gone.
- **rotation_policy** — Optional; reserved for future rotation behavior.

## Versioning

Each `PUT` to the same vault and path creates a **new version** (version 1, 2, 3, …). Listing secrets returns the latest version per path; you can request a specific version via the versioned endpoint if the API exposes it. Delete is soft-delete (marks all versions of that path as deleted).

## What is returned

- **List secrets** (`GET /v1/vaults/:vault_id/secrets`) — Returns metadata only: id, path, type, version, metadata, created_at, expires_at. Never the value.
- **Get secret** (`GET /v1/vaults/:vault_id/secrets/:path`) — Returns metadata **and** the decrypted value (only if the caller has read permission and the secret is not expired or over access count).

Values are never logged or returned in list/audit responses; only “secret accessed” style events are recorded.
