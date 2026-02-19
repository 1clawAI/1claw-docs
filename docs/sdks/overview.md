---
title: SDKs overview
description: 1claw provides a TypeScript/JavaScript SDK (@1claw/sdk); curl and fetch examples work with any language.
sidebar_position: 0
---

# SDKs overview

- **JavaScript/TypeScript** — Official `@1claw/sdk` in the monorepo (`packages/sdk`). Supports agent auth and fetching secrets; optional x402 payment handling. See [JavaScript SDK](/docs/sdks/javascript).
- **Python** — No official SDK yet; use [curl examples](/docs/sdks/curl-examples) or implement a thin client with `requests`/`httpx`. See [Python](/docs/sdks/python).
- **curl / HTTP** — All endpoints are REST; you can use curl, fetch, or any HTTP client. See [curl examples](/docs/sdks/curl-examples).

The API is stable and documented in the [OpenAPI spec](https://github.com/1clawAI/1claw/blob/main/openapi.yaml) in the repo root.
