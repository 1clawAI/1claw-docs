# docs.1claw.xyz Optimization Notes

Phase 2 implementation (2026-08-14). Seven commits on `main`.

## Summary of changes

| Commit | Focus | Key changes |
| ------ | ----- | ----------- |
| 1 | Build blocker | Created `guides/webhooks.md` with vault-verified event list |
| 2 | Navigation | Quickstart top-level sidebar, orphans (Go SDK, x402, OAuth, setup-by-client, webhooks), licensing in Concepts, agent-chat/principal-type-audit stubs |
| 3 | SEO | Keywords frontmatter, `showLastUpdateTime: true`, crypto-proxy description |
| 4 | Structured data | Post-build JSON-LD plugin (`TechArticle` + `BreadcrumbList` per doc page) |
| 5 | LLM discoverability | Categorized 128-page index in `llms.txt`; generator updates both files |
| 6 | Content | Changelog year nav, Shroud/Intents TOCs + next steps, OpenAPI canonical note on api-reference |
| 7 | Journey polish | Real Python auth examples, grant/policy glossary cross-links |

## Dependencies

- **Pinned `@docusaurus/*` to 3.9.2** — accidental `pnpm add @docusaurus/plugin-client-redirects` upgraded core to 3.10.2 via monorepo hoisting and broke SSG (`path_to_regexp` error). Docs installs must use `pnpm install --ignore-workspace` in the submodule.
- **`@docusaurus/plugin-client-redirects` not added** — incompatible with current install path; duplicates consolidated via unlisted stub pages with prominent move links instead.

## Follow-up fixes (2026-08-14)

### Broken anchors (fixed)

- `/docs/guides/agent-communication` → updated link to `#llm-token-billing-optional-add-on` on billing-and-usage
- `/docs/guides/mcp-integration` → updated links to `#local-daemon-secret-proxy` and `#local-vault-offline-encrypted` on cli guide

### Factual doc discrepancies (fixed)

- **`guides/treasury.md` webhook events** — replaced stale 12-event table with pointer to canonical `guides/webhooks.md`
- **`guides/platform-api.md`** and **`reference/changelog.md`** — corrected `platform.claim.redeemed` → `platform.user.claimed` to match vault `VALID_WEBHOOK_EVENTS`

### Still flagged (not fixed)

- **Glossary Scope default** — says `["*"]` when no policies; workspace rules say scopes default to `[]` (zero access). Flagged only.

### OG image

- **Static og-image not added.** Site uses dynamic OG URLs via `1claw.xyz/api/og?title=...` in `docusaurus.config.ts` `themeConfig.metadata`. A static `static/img/og-docs.png` would duplicate this; dynamic endpoint supports per-page titles if extended later.

### Client redirects plugin

- Revisit when docs submodule has isolated `node_modules` on Docusaurus 3.10+ or when `@docusaurus/plugin-client-redirects` path_to_regexp issue is resolved. Stub pages preserve URLs without auto-HTTP-redirect.

### Content splits (future)

- `guides/shroud.md` (~1,650 lines) and `guides/intents-api.md` (~1,700 lines) received in-page TOCs only; full subpage splits deferred.
- Changelog remains single file with year anchor; no `changelog/2026.md` split.

### Cedar/OPA v2

- Already documented in `reference/changelog.md` v0.48.0 entry (policy backend settings, contract ABIs, pending approvals, consensus triggers). No separate guide added — handlers verified in vault; detailed guide deferred to internal runbook parity.

## Build verification

```bash
cd docs && pnpm install --ignore-workspace && pnpm run build
```

Expected: `[SUCCESS] Generated static files in "build"`. Broken **links** = 0. Broken **anchors** = 0.

## JSON-LD approach

- **Site-wide:** `Organization` + `WebSite` in `docusaurus.config.ts` `headTags`
- **Per-page:** `src/plugins/json-ld-postbuild.js` injects `TechArticle` + `BreadcrumbList` into each doc HTML file's `<head>` at `postBuild`
- Chose post-build injection over DocItem swizzle because `@docusaurus/theme-common/internal` and `@docusaurus/plugin-content-docs/client` failed to resolve in the client bundle on Docusaurus 3.9.2

## Lighthouse

Not run in this pass (no local serve + Lighthouse CI configured). Recommend running against `pnpm run serve` preview post-deploy on Vercel.
