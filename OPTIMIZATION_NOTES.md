# docs.1claw.xyz Optimization Notes

Phase 2 implementation (2026-08-14). Follow-up completion (2026-08-14).

## Summary of changes

| Phase | Focus | Key changes |
| ----- | ----- | ----------- |
| 2a | Build blocker | `guides/webhooks.md`, shadow report, JSON-LD plugin |
| 2b | Navigation | Quickstart promoted, orphans added to sidebar |
| 2c | Anchor/webhook fixes | Scope default `[]`, platform event name, treasury webhooks |
| **3 (deferred completion)** | All remaining items | See below |

### Phase 3 — deferred items completed

| Item | Status |
| ---- | ------ |
| Glossary scope default | **Fixed** — `[]` (zero access), not `["*"]` |
| Client redirects plugin | **Added** — `@docusaurus/plugin-client-redirects@3.9.2` with agent-chat + principal-type-audit redirects |
| Static OG image | **Added** — `static/img/og-docs.png` (1200×630, from 1claw.xyz OG API) |
| Content splits | **Done** — Shroud → 3 pages; Intents → 3 pages; Changelog hub + `changelog-2026` |
| Cedar/OPA guide | **Added** — `guides/policy-engine.md` |
| Broken anchors | **0** — all cross-links updated after splits |

## New pages

- `guides/policy-engine.md` — Cedar, OPA, shadow/enforce, ABIs, consensus, pending approvals
- `guides/shroud-threat-detection.md` — threat filter deep dive (split from shroud.md)
- `guides/shroud-configuration.md` — config, activity, monitoring (split from shroud.md)
- `guides/intents-signing.md` — multi-chain keys, non-EVM, unified sign (split from intents-api.md)
- `guides/intents-guardrails.md` — guardrails, Execution Intents (split from intents-api.md)
- `reference/changelog-2026.md` — 2026 release notes (split from changelog.md)

## Dependencies

- **`@docusaurus/plugin-client-redirects@3.9.2`** — HTTP redirects for consolidated pages. Install with `pnpm install --ignore-workspace` in the docs submodule (avoids monorepo hoisting to Docusaurus 3.10).
- **Pinned `@docusaurus/*` at 3.9.2** — do not upgrade via workspace root without isolated docs `node_modules`.

## Build verification

```bash
cd docs && pnpm install --ignore-workspace && pnpm run build
```

Expected: `[SUCCESS]`, broken **links** = 0, broken **anchors** = 0.

## Lighthouse

Run post-deploy (or locally):

```bash
cd docs && pnpm run build && pnpm run serve -- --port 3456
npx lighthouse http://localhost:3456/ --only-categories=performance,seo --quiet
npx lighthouse http://localhost:3456/docs/quickstart/humans --only-categories=performance,seo --quiet
npx lighthouse http://localhost:3456/docs/vaults/human-api/overview --only-categories=performance,seo --quiet
```

Target: ≥ 90 performance and SEO on homepage, quickstart, and one API reference page.

**Local Lighthouse (2026-08-14, static `serve build`):**

| Page | Performance | SEO |
| ---- | ----------- | --- |
| Homepage (`/`) | 82 | 100 |
| Quickstart (`/docs/quickstart/humans`) | 81 | 100 |
| Human API (`/docs/vaults/human-api/overview`) | 83 | 100 |

SEO target met. Performance is below 90 on local static serve (large JS bundles + search index); Vercel CDN and production caching may score higher. Main lever: code-split search/Mermaid on doc pages only.

## JSON-LD

- **Site-wide:** Organization + WebSite in `docusaurus.config.ts`
- **Per-page:** `src/plugins/json-ld-postbuild.js` — TechArticle + BreadcrumbList

## LLM discoverability

- `static/llms.txt` — categorized index of all doc pages (build-time generator)
- `static/llms-full.txt` — full concatenated docs (~1.1 MB)
- Raw `.md` per-page endpoints: not implemented (llms-full covers full corpus)

## Still flagged (not fixed)

- **Changelog pre-2026** — only 2026 split; no 2025 archive page (all content was 2026-only)
- **Per-page dynamic OG titles** — static `og-docs.png` used; dynamic `1claw.xyz/api/og` available for future per-route meta
- **Hand-maintained `api-reference.md`** — still points to `@1claw/openapi-spec` as canonical; auto-codegen deferred

## Phase 4 — Product-centric IA (2026-08-14)

Full sidebar reorganization matching product taxonomy:

Introduction → Quickstart → Concepts → **Vaults → Agents → Automations → Runtimes → Cards → Treasury → Sharing → Risk Engine → Platform API → Dashboard → Guides → SDKs → Integrations → Security → Reference**

- **~70 pages moved** from `guides/` into product folders (`vaults/`, `agents/`, `treasury/`, etc.)
- **Human API + MCP** under `vaults/`; **Agent API** under `agents/api/`
- **6 new Dashboard pages** (`dashboard/overview` through `platform-wizard`)
- **New landing pages:** `vaults/overview`, `agents/overview`, `integrations/overview`
- **92 HTTP redirects** in `redirects.js` for old URLs
- **Guides slimmed** to 9 cross-cutting workflow pages
- **Navbar** aligned: Vaults, Agents, Automations, Runtimes, Treasury, Platform
- Build: 143 pages, 0 broken links

### Phase 4b — Sidebar & navbar polish (2026-08-14)

- **`autoCollapseCategories: true`** — only the active category branch stays expanded (fixes multiple sections stuck open)
- Removed explicit `collapsed: false` on Vaults, Agents, Treasury
- Sidebar sub-grouping: Vaults (Access / Lifecycle / Encryption / API), Agents (Lifecycle / Channels / Shroud / Intents / API), Treasury (Wallets / Policy)
- Single-page sections (Automations, Cards, Sharing, Risk Engine) as flat doc links — no empty chevrons
- Integrations split into Official / Clients & frameworks / Migrations
- **Navbar:** Docs · Vaults · Agents · **Build** ▼ · **Developers** ▼ · Search · GitHub (was 7 flat product links)
- Sidebar hideable toggle enabled

