# 4-Week Growth Sprint — Execution Plan (Refined)

> **Use this with:** the main sprint doc (Notion/MD). This plan maps each item to **repos/files**, **dependencies**, and **concrete steps**. Refined from the Cursor-generated plan with: **Intents product track**, analytics depth, Shroud enterprise motion, crypto ICP outreach, x402 positioning, and gap items the original missed.

**North star:** Free → Team conversion within 14 days of hitting the request limit.  
**Secondary:** One signed Intents pilot by end of Week 4.

---

## Progress tracker

> Updated: 2026-03-16

### ✅ Shipped (code deployed to production)

| # | Item | Commit | Notes |
|---|------|--------|-------|
| §1 | Re-license SDK/MCP/CLI to MIT | SDK 0.14.0, MCP 0.15.0, CLI 0.7.0 | Also licensed CLI; docs licensing page added |
| §2 | Hero rewrite + single CTA | `c309c5f` | Single-sentence subcopy; MCP install primary CTA; Intents soft link |
| §3 | `/intents` sub-page | `c309c5f` | 30 mainnet chains (109+ via Tenderly), x402, guardrails, pricing CTA |
| §4 | `/shroud` sub-page | `c309c5f` | 6-layer pipeline, per-agent config, SIEM mention, enterprise CTA |
| §5 | Badges / "Works with" row | `c309c5f` | "Works natively with Claude · Cursor · GPT" (shields.io removed — rendering issues) |
| §6 | PostHog + funnel events | `e6341c4` | 20+ events: free_limit_hit, upgrade_page_visited, intents_page_visited, etc. Dual-send to PostHog + internal queue |
| §7 | Limit-hit upgrade modal | `e6341c4` | Vault + Intents variants (value_cap, daily_limit, tx_count); agent settings link |
| §12 | Pricing Intents callout | `62b2dab` | "Building on-chain agents?" amber section on pricing page |
| §16 | 90-day audit log export | `62b2dab` | `GET /v1/audit/export?format=csv\|json` + dashboard buttons |
| §17 | "Built for teams using" row | `bd98d8a` | Claude, Cursor, GPT, Copilot, Windsurf + chain names + "+109 more" |
| §18 | 5 SEO landing pages | `2499040` | /cursor-secrets, /claude-api-key-security, /mcp-secrets-manager, /ai-agent-wallet-security, /defi-agent-signing |
| §24 | `/security` page | `2499040` | HSM hierarchy, TEE attestation, Intents pipeline, compliance roadmap, audit trail |
| §27 | Per-agent usage metrics | `bd98d8a` | Usage card on agent detail: reads, writes, txns, sim rejections, access denied, last active |
| §35 | Enterprise inquiry flow | `bd98d8a` | Enterprise CTA → Calendly (was mailto) |
| — | Nav Platform dropdown | `c309c5f` | Vault, Shroud, Intents with descriptions |
| — | Docs licensing page | `c309c5f` | `docs/docs/concepts/licensing.md` |
| — | Promo code system | `7b5c766` | Backend + admin UI + billing redemption + ETHGLOBAL code seeded |
| — | Calendly links | Earlier | Hero, navbar, billing, pricing |
| — | Pricing light mode fix | Earlier | Theme-aware classes on pricing page |
| — | RLS fixes | `d0be58a` + Supabase MCP | Migration 044: cmek_rotation_jobs, revoked_tokens, promo_codes, promo_redemptions |

### 🔧 In progress (code)

| # | Item | Status |
|---|------|--------|
| §14 | SSO (SAML/OIDC) | Starting — needs WorkOS account |
| §22 | Live demo / playground | Starting |
| §36 | SCIM provisioning | Blocked on WorkOS |

### 📋 Manual / content items — YOUR TODO list

| # | Item | What you need to do | Time est. |
|---|------|---------------------|-----------|
| §8 | Intents ICP prospect list | Fill Crypto/DeFi tab in spreadsheet. Search GitHub, Twitter, Telegram, Farcaster for DeFi bot builders with hardcoded keys. | 3h |
| §9 | Twitter threads (2) | Thread 1: "Your API key is in Claude's chat history" (schedule Tue 9am). Thread 2: DeFi private key thread 3 days later. | 2h each |
| §10 | MCP onboarding < 60s | Time the flow: landing → docs → MCP install → first secret fetch. Document friction points. | 4h |
| §11 | Directory submissions | Submit to: MCP.so, HN Show HN, There's An AI For That, Futurepedia, DeFi Llama, Base ecosystem, Electric Capital. | 3h |
| §13 | `intents.1claw.xyz` subdomain | Add domain alias in Vercel dashboard → point to `/intents` page. DNS A/CNAME record. | 30m |
| §15 | Intents quickstart polish | Write end-to-end "first transaction" quickstart, Tenderly docs, error codes, TypeScript + Python examples. | 4h |
| §19 | DM crypto/DeFi prospects | Use ICP list from §8. Send threat-framing DM template. Track responses. | 3h |
| §20 | Product Hunt launch (Vault) | Prep: 30 upvoters, 5 maker comments, PH50 code, thumbnail. Launch Tue/Wed. | 1d |
| §21 | TEE proxy blog post | 1,500 words: Shroud architecture, Aho-Corasick, GKE. Cross-post dev.to + HN. | 6h |
| §23 | Intents cold outreach (DeFi) | 3-email sequence to DeFi teams. Target 3 demo calls. Sources: Base Ecosystem Fund, a16z crypto, CDP Discord. | 1d |
| §25 | SOC 2 Type I evidence | Connect Vanta/Drata to AWS, GitHub, G Suite. Document Intents controls. | Ongoing |
| §26 | CMEK docs polish | Ensure dashboard + docs support CMEK registration/rotation. Add to `/security`. | 2d |
| §28 | x402 integration guide | `docs/docs/guides/x402.md` — end-to-end agent pays for API calls. Code example. | 4h |
| §29 | Cold email 200 mid-market | Apollo/Clay: 200 contacts (AI dev ICP). 3-email sequence. Target 5 demo calls. | 1d |
| §30 | MCP tutorial creators | Find 5 creators, partner with 2-3 (free Business). Set up referral tracking. | 4h |
| §31 | Case study #1 | Prioritize Intents if users exist; otherwise Vault. 500 words, homepage + `/customers`. | 4h |
| §32 | Intents pilot agreement | Draft one-page agreement. Lawyer review (~$500). 60-90 day pilot structure. | 2h + lawyer |
| §33 | Intents PH launch | Separate from Vault launch. "AI agents sign txns without holding private keys." Week 4-5. | 1d |
| §34 | Onboarding email sequence | Set up Customer.io/Loops. Vault sequence (Day 0-14) + Intents sequence (Day 0-14). | 4h |
| §37 | Enterprise prospecting | Track A: 5 fin/healthcare companies (LinkedIn). Track B: crypto funds (Telegram). Goal: 2-3 calls. | 1d |
| §38 | Week 4 retrospective | Signups, activations, conversion, Intents adoption, acquisition sources. Set weeks 5-8 priorities. | 3h |
| §39 | MCP event submission | Find 3-5 MCP meetups. Submit talk: "Production-grade MCP servers that don't leak credentials." | 4h |

### 📝 Post-ship follow-ups

- **SEO pages**: Submit all 5 + `/security` + `/intents` + `/shroud` to Google Search Console
- **PostHog**: Verify events are flowing in PostHog dashboard; set up funnels (signup → first_secret → limit_hit → upgrade)
- **npm publish**: Run `npm publish` for SDK 0.14.0, MCP 0.15.0, CLI 0.7.0 (MIT license change)
- **shields.io badges**: Re-add once GitHub stars / npm downloads are meaningful (currently removed due to rendering)
- **Audit export**: Test CSV/JSON export with real data after vault deploy completes
- **Promo codes**: Create additional codes for events/partnerships as needed via Settings → Admin

---

## How to use this plan

- **P0** = must ship that week. **P1** = ship if P0s are done. **P2** = backlog, week 5+.
- **File paths** relative to monorepo root.
- **[NEW]** = not in original Cursor plan — net-new additions.
- **[REVISED]** = original plan was incomplete or incorrect.
- **Parallel** = safe to start same day as adjacent items.
- **✅ [DONE]** = shipped to production.

---

## Pre-sprint: One-time setup

| Task | Where | Notes |
|------|--------|-------|
| Create prospect spreadsheet | Google Sheet / Notion | Two tabs: **AI Dev ICP** (Vault/Shroud), **Crypto/DeFi ICP** (Intents). See columns below. |
| Sign up PostHog | — | PostHog Cloud recommended. Get API key before Week 1 Day 1. |
| Sign up WorkOS | — | Needed for SSO (Week 2) and SCIM (Week 4). Free tier covers initial implementation. |
| Engage SOC 2 auditor | Vanta or Drata | Start conversation Week 1; evidence collection starts Week 3. |
| Register `intents.1claw.xyz` subdomain | DNS / Vercel | Takes minutes; needed for Week 2 Intents landing page. |
| Register `shroud.1claw.xyz` subdomain | DNS / Vercel | Same. |
| Create `intents-pilot` Stripe product | Stripe dashboard | Custom-priced; needed for any signed pilots. |
| Notion import | — | Import main sprint doc; use toggles per week. |

**Prospect spreadsheet columns (AI Dev ICP tab):**  
`Name | Handle | Company | Platform | Evidence of problem | Outreach status | Response | Call booked | Converted`

**Prospect spreadsheet columns (Crypto/DeFi ICP tab):**  
`Name | Handle | Project | Chain | Agent type | Evidence of key exposure risk | Outreach status | Response | Pilot interest`

---

# Week 1 — Foundation & Quick Wins

## Dependency order

```
[License SDK+MCP] ──► [Docs "open vs proprietary" page]
        │
[Hero + single CTA] ──► [/shroud sub-page + /intents sub-page] (parallel after hero)
        │
[PostHog + funnel events] ──► [Limit-hit modal → direct checkout]
        │
[Twitter thread] ──► [ICP list: AI Dev tab + Crypto tab] (parallel)
        │
[Intents: audit existing docs gaps] (parallel, no deps)
```

---

## 1. ✅ Re-license SDK + MCP to MIT [P0] [DONE]

**Effort:** ~2 hours  
**Repos:** `packages/sdk/`, `packages/mcp/`

| Step | File | Action |
|------|------|--------|
| 1 | `packages/sdk/LICENSE` | Replace with standard MIT text. Entity: "1Claw Contributors" or legal entity name. Year: 2026. |
| 2 | `packages/mcp/LICENSE` | Same. |
| 3 | `packages/sdk/package.json` | `"license": "MIT"` |
| 4 | `packages/mcp/package.json` | `"license": "MIT"` |
| 5 | `packages/sdk/README.md` | Update License section → MIT, link to LICENSE file. |
| 6 | `packages/mcp/README.md` | Same. |

**MIT template (short):** Use the full standard MIT text from https://opensource.org/licenses/MIT (Copyright (c) 2026 1Claw Contributors).

> **[REVISED]** If there is an Intents client-side SDK (e.g. `packages/intents-sdk` or equivalent), evaluate and MIT-license it too — DeFi developers are particularly allergic to noncommercial restrictions.

**Add "Open source vs proprietary" to docs:**
- File: `docs/docs/concepts/licensing.md` (new) or inline on `docs/src/pages/index.tsx`
- Content:
  - **MIT (free to use commercially):** `@1claw/sdk`, `@1claw/mcp`, CLI, any Intents client SDK
  - **Proprietary (access via 1claw.xyz):** Vault API, Dashboard, Shroud TEE service, Intents signing backend

---

## 2. ✅ Hero rewrite + single CTA [P0] [DONE]

**Effort:** ~4 hours  
**File:** `dashboard/src/app/page.tsx`

| Step | Change |
|------|--------|
| 1 | Hero headline stays ("Your API key is in your chat history right now"). Subcopy: remove "HSM-backed vault... TEE proxy... Intents API" list. Replace with: "1claw keeps credentials in an HSM vault. Agents fetch them at runtime — they never appear in context, logs, or memory." One sentence, one idea. |
| 2 | Primary CTA: "Install the MCP server →" → `https://docs.1claw.xyz/docs/mcp/overview` (or MCP quickstart path). |
| 3 | Secondary: "Advanced: LLM traffic inspection →" → `/shroud` |
| 4 | **[NEW]** Third soft link (small, below CTAs): "Building on-chain agents? → Intents API" → `/intents` |
| 5 | Move `<ThreePillars />` below the before/after terminal demo. New order: `Hero` → `TrustBar` → `ProblemSolution` / BeforeAfter → `HowItWorks` → `ThreePillars` → … → `Pricing` |

---

## 3. ✅ [NEW] `/intents` sub-page [P0] [DONE]

**Effort:** ~4 hours  
**File:** `dashboard/src/app/intents/page.tsx` (new)

The Intents product needs its own landing page — DeFi/crypto developers searching for "AI agent transaction signing" or "MCP crypto wallet security" need a dedicated destination.

**Page structure:**

- **Hero:** "Your DeFi agent shouldn't hold private keys" — Subcopy: "1claw Intents lets agents submit transaction intents. The signing happens in a TEE. Keys never leave hardware." CTA: "Read the Intents docs →" + "Talk to us →" (Typeform/Calendly)
- **Before/after terminal:** Before: agent has raw private key in env, signs directly. After: agent submits intent, 1claw signs in TEE, agent never sees key.
- **Three guardrails (visible, concrete):** Per-agent allowlists; value caps (max ETH per tx, per day); chain restrictions; Tenderly simulation before broadcast.
- **Supported chains grid:** Ethereum, Base, Arbitrum, Polygon, Optimism.
- **x402 section:** "Your agent can pay for its own compute" — agent holds no USDC; submits payment intent, 1claw signs settlement; agent never controls funds.
- **Pricing CTA:** "Intents is available on Business and Enterprise plans. Custom pricing for high-volume DeFi teams." [Talk to us →]

**Nav update:** In `dashboard/src/components/marketing/navbar.tsx`, add "Platform" dropdown: Vault (main), Shroud (`/shroud`), Intents (`/intents`). Remove individual product links from top-level nav. Keep "Docs", "Pricing", "Blog", "Sign in", "Start free".

---

## 4. ✅ `/shroud` sub-page [P1] [DONE]

**Effort:** ~3 hours  
**File:** `dashboard/src/app/shroud/page.tsx` (new)

Move existing Shroud marketing content from homepage. Add:

- **Differentiator:** "Shroud is vault-aware — it knows which strings in your prompts are secrets, because it has your vault." Generic proxies don't have this.
- **Buyer persona:** "For security engineers and compliance teams, not just developers"
- **SIEM integration** mention (even "coming soon" if not shipped)
- **Enterprise CTA:** "Shroud Enterprise: dedicated TEE nodes, compliance reporting, custom PII policies → Talk to us"

---

## 5. ✅ Badges [P1] [DONE]

**Effort:** ~1 hour  
**File:** `dashboard/src/app/page.tsx` (Hero section)

- GitHub stars: `https://img.shields.io/github/stars/1clawAI/1claw` (or your repo)
- npm downloads: `https://img.shields.io/npm/dw/@1claw/sdk`
- **[NEW]** Add: "Works natively with Claude · Cursor · GPT" as a text row with small product logos — SEO and social proof before star count is meaningful.

---

## 6. ✅ Instrument free-tier → upgrade funnel [P0] [DONE]

**Effort:** ~3 hours  
**Files:** `dashboard/src/lib/analytics.ts`, `dashboard/src/lib/api/client.ts`, vault (for server-side events)

**Existing:** `dashboard/src/lib/analytics.ts` — custom event queue to `/api/v1/analytics/events`. Add PostHog; send same event names for one dashboard.

**[REVISED]** Full event list including Intents funnel:

**Vault funnel events:**

| Event | Emit location | Priority |
|-------|---------------|----------|
| `mcp_server_installed` | Docs: "Copy config" click or first MCP doc page view | P1 proxy |
| `first_secret_stored` | Dashboard: `usePutSecret` success callback | P0 |
| `first_agent_fetch` | Vault API: first successful agent secret retrieval | P0 |
| `free_limit_hit` | `client.ts` on 402 response or quota header threshold | P0 |
| `upgrade_page_visited` | Dashboard: page_view on `/settings/billing` or `/pricing` | P0 |
| `team_plan_converted` | Stripe webhook → PostHog server-side | P0 |

**[NEW] Intents funnel events:**

| Event | Emit location | Why it matters |
|-------|---------------|----------------|
| `intents_page_visited` | `/intents` page load | Top-of-funnel |
| `intents_docs_visited` | Docs: Intents guide page view | Intent signal |
| `first_intent_submitted` | Vault API: first `POST /v1/agents/{id}/transactions` | Activation |
| `first_intent_signed` | Vault API: transaction reaches `signed` status | Value delivered |
| `intents_pilot_inquiry` | Typeform webhook → PostHog | Enterprise lead |

**Implementation:** Extend `EventName` in `analytics.ts` for all events. Server-side Intents events: emit from vault transaction handler (e.g. `vault/src/api/handlers/transactions.rs`) via PostHog HTTP API. For `free_limit_hit`, check both request quota and Intents transaction quota if separate.

---

## 7. ✅ Limit-hit upgrade modal [P0] [DONE]

**Effort:** ~4 hours  
**Files:** `dashboard/src/components/upgrade-prompt.tsx`, `dashboard/src/lib/stores/upgrade-store.ts`, `dashboard/src/lib/api/client.ts`

**Vault flow (unchanged):**

- Extend store: `openLimitHitModal(requestsUsed: number)`.
- Modal variant: "You've made 1,000 requests this month" + "Your agents are running — here's how to keep them running." Direct Team checkout link. Trigger on 402 or quota headers. Email nudge 24h after limit hit.

**[NEW] Intents-specific modal variant:**

When an agent hits its transaction value cap or daily limit (not just request quota):

- Title: "Your agent hit its daily transaction limit"
- Body: "Increase value caps or daily limits in agent settings, or upgrade to Business for higher defaults."
- CTA: Direct to agent settings + upgrade

Add `openIntentsLimitModal(agentId, limitType: 'value_cap' | 'daily_limit' | 'tx_count')` to the upgrade store.

---

## 8. [NEW] Intents ICP prospect list [P0]

**Effort:** ~3 hours (parallel to AI Dev ICP list)

Intents has a separate ICP: **DeFi protocol teams, crypto trading bot builders, on-chain AI agent projects.**

**Where to find them:** GitHub (`"private key" AND ("ai agent" OR "langchain" OR "mcp")`), Twitter/X (`"agent" AND ("private key" OR "wallet signing" OR "web3")`, `"defi bot" AND "security"`), Farcaster/Lens, Telegram (DeFi dev groups, AI x crypto), The Graph Discord, Uniswap/Base builder channels.

**Target profile:** Developer building autonomous trading agent, arbitrage bot, or DeFi workflow agent who hardcodes a key in env or has the agent call a centralized signing service they built.

Fill the **Crypto/DeFi ICP** tab: `Name | Handle | Project | Chain | Agent type | Evidence of key exposure risk | Outreach status | Response | Pilot interest`.

---

## 9. “Your API key is in Claude’s chat history” thread [P0]

**Effort:** ~2 hours

- Draft 10-tweet thread (hook → step-by-step evidence → “We built something to fix this” → CTA). Screenshot credential-in-context. Schedule Tuesday 9am; post from @1clawAI and founder.

**[NEW] Thread 2 for crypto (post 3 days after Thread 1):**  
"Your DeFi agent probably holds a private key right now. Here's why that's a ticking clock." — Steps 1–4: key in env/memory, extractable via prompt injection; show blocked scenario with Intents. Steps 5–8: guardrails. Step 9–10: CTA to `/intents`.

---

## 10. MCP onboarding &lt; 60 seconds [P1]

**Effort:** ~4 hours

- Time current flow: landing → docs → install MCP → first secret fetch. Shorten to single “paste this block” into Claude Desktop/Cursor. One Quickstart to first `get_secret` in &lt; 60 seconds.
- **[NEW]** After Vault onboarding, time the Intents quickstart. If first transaction can’t be submitted in &lt; 5 minutes, document every friction point for Week 2 fixes.

---

## 11. Directory submissions [P1]

**[REVISED]** Original list plus crypto-specific:

| Directory | Audience | Priority |
|-----------|----------|----------|
| MCP.so | MCP server builders | P0 |
| Product Hunt | General dev | Schedule Week 2 |
| Hacker News Show HN | Dev/security | P0 |
| There's An AI For That | AI tools | P1 |
| Futurepedia | AI tools | P1 |
| **[NEW]** DeFi Llama ecosystem | DeFi developers | P0 for Intents |
| **[NEW]** Base ecosystem directory | Base chain builders | P0 for Intents |
| **[NEW]** Electric Capital developer registry | Crypto open-source devs | P1 |

---

# Week 2 — Distribution & First Users

## 12. ✅ New pricing page ($299 / $999 / Enterprise) [P0] [PARTIAL — Intents callout shipped; tier rename TBD]

**Effort:** ~6 hours  
**File:** `dashboard/src/app/pricing/page.tsx`

**Tiers:** Free | Team $299/mo | Business $999/mo | Enterprise (custom). Feature comparison table, ROI line: "One credential leak costs more than a year of Business plan." Direct checkout for Team and Business. Grandfather existing paying customers (12 months at current price).

**[REVISED]** Add below the main pricing table:

- **Building on-chain agents?** — "1claw Intents is included in Business and Enterprise plans. For high-volume DeFi teams: custom per-transaction pricing available." [Talk to us about Intents →] (links to `/intents#pricing` or Typeform).
- **x402:** Do not feature x402 on the main pricing page. Move it to `/intents` as an "Autonomous agent billing" section so it doesn’t confuse non-crypto buyers.

---

## 13. [NEW] `intents.1claw.xyz` subdomain live [P0]

**Effort:** ~2 hours

Point `intents.1claw.xyz` to the `/intents` Next.js page (Vercel domain config or rewrite). Same content as `1claw.xyz/intents` for now — subdomain gives Intents its own URL for outreach and SEO.

---

## 14. SSO (SAML/OIDC) for Team tier [P0]

**Effort:** ~2 days  
**Repos:** vault, dashboard

- Integrate WorkOS or Auth0. Backend: IdP callback, map to `users` table. Dashboard: SSO config for Team tier. Test Google Workspace, Okta, Azure AD. Pricing: "SSO included in Team."
- **[NEW]** When SSO ships, ensure agent policy assignment (which agents can submit Intents, value caps per agent) is team-member-scoped. Admin adding a new engineer via SSO shouldn’t auto-grant ability to modify Intents guardrails. Consider `requires_admin: bool` on Intents config mutations (e.g. `vault/src/domain/policy.rs` or agent-policy logic).

---

## 15. [NEW] Intents Quickstart polish [P0]

**Effort:** ~4 hours  
**Files:** `docs/docs/guides/intents-api.md`, SDK examples

| Missing item | Where it belongs |
|--------------|-----------------|
| End-to-end "submit your first transaction" quickstart (&lt; 10 steps) | `docs/docs/quickstart/intents.md` (new) |
| How Tenderly simulation works and when it blocks | Intents guide, new section |
| "What happens if the intent is rejected" — error codes and retry logic | Intents guide |
| Working example: TypeScript + ethers.js submitting an intent | e.g. `packages/sdk/examples/intents-basic.ts` or docs |
| Working example: Python + web3.py | New example file or docs |
| Multi-agent Intents: different value caps per agent | New guide section |
| x402 end-to-end: agent pays for its own API calls | `docs/docs/guides/x402.md` (new) |

---

## 16. ✅ 90-day audit log export [P1] [DONE]

**Effort:** ~1 day

- **Vault:** `GET /v1/audit/export?format=csv|json&from=...&to=...` (90 days). Include: timestamp, agent_id, secret_path, action, IP.
- **Dashboard:** "Export" button on audit log page.
- **[NEW]** Include Intents transaction log in export: `intent_id`, `agent_id`, `to_address`, `value_eth`, `chain`, `simulation_result`, `broadcast_status`, `tx_hash` — required for compliance at crypto funds.

---

## 17. ✅ “Used by teams at…” / “Works with” [P1] [DONE]

**Effort:** ~2 hours

- If 2–3 company logos: "Used by teams at [logos]". If not: "Built for teams using Claude, Cursor, and Copilot" with product logos.
- **[NEW] Intents:** If early on-chain agent users exist, list protocol/project name or "Used by teams building on Base and Arbitrum" with chain logos — more credible to DeFi ICP than generic company logos.

---

## 18. ✅ SEO landing pages [P1] [DONE]

**Effort:** ~8 hours (original 3 + 2 new)

| Page | Target keyword | Audience |
|------|----------------|----------|
| `/cursor-secrets` | "cursor secrets management" | Cursor developers |
| `/claude-api-key-security` | "claude api key security" | Claude developers |
| `/mcp-secrets-manager` | "mcp server secrets manager" | MCP builders |
| **[NEW]** `/ai-agent-wallet-security` | "ai agent private key security" | DeFi/crypto developers |
| **[NEW]** `/defi-agent-signing` | "autonomous trading agent key management" | DeFi bot builders |

Each: ~800 words, answer the query, code snippet, CTA. Submit to Google Search Console.

---

## 19. [NEW] DM crypto/DeFi ICP prospects [P0]

**Effort:** ~3 hours (parallel to AI dev DMs)

DM the Crypto/DeFi ICP list from Week 1. Template (threat framing for DeFi):

> "Hey [name] — saw you're building [project/bot] on [chain]. Quick question: how are you handling the private key for your agent's wallet? Asking because we just shipped something that might be relevant — agents can submit transaction intents without ever holding the key."

Track responses; expect ~15–25% for technical DeFi outreach (lower than AI dev, larger deal potential).

---

## 20. Product Hunt launch [P0]

**Effort:** ~1 day

- Prep: 30 people to upvote at 12:01am PST; 5 maker comments; `PH50` 50% off first month; hunter; thumbnail and gallery. Launch Tuesday or Wednesday (Vault).
- **[REVISED]** Prepare a **separate** Product Hunt listing for Intents in Week 3 or 4. Vault launch Week 2; Intents launch Week 4 (or Week 5). Different tagline and audience.

---

## 21. “How we built the TEE proxy” article [P1]

**Effort:** ~6 hours

- 1,500 words: Shroud architecture, TEE, Aho-Corasick, GKE confidential nodes. Publish on blog; cross-post dev.to; HN "Show HN."
- **[NEW]** Queue for Week 3: **"How 1claw Intents works: TEE transaction signing for AI agents"** — why encrypted key in env isn’t enough, TEE attestation, Tenderly step, multi-chain nonce, x402 mechanics. Positions 1claw as authority for secure on-chain agent infra; shareable in DeFi Telegram groups.

---

# Week 3 — Conversion & First Revenue

## 22. Live demo / playground [P0]

**Effort:** ~1 day

- **Vault demo:** Sandbox: store fake API key, register demo agent, MCP fetch — no signup. Before (key in prompt) vs after (vault reference). CTA "Try it → Sign up."
- **[REVISED] Intents demo tab:** Pre-populated demo agent with sandbox wallet (testnet only, e.g. Base Sepolia). Visitor: set value cap → submit "send 0.001 ETH" intent → watch simulation → see "signed" status. Private key never appears; show audit log entry. CTA: "Deploy this for your agent →" to `/intents` or docs. This is the strongest conversion tool for the DeFi ICP.

---

## 23. [NEW] Intents cold outreach: DeFi teams [P0]

**Effort:** ~1 day

Use Crypto/DeFi ICP list. Target: DeFi protocol teams, crypto funds, on-chain AI projects (3–20 engineers building autonomous agents).

**Sources:** Base Ecosystem Fund portfolio, a16z crypto portfolio (AI agent projects), Coinbase Developer Platform Discord, Bankless builder community, job postings ("solidity" + "AI" + "agent" on Wellfound/LinkedIn).

**3-email sequence (DeFi-specific):**

| Email | Subject | Hook |
|-------|---------|------|
| 1 | "How is your trading agent handling the signing key?" | Key in env = exfiltration risk |
| 2 | "[demo link]: DeFi agent that signs without holding the key" | Solution demo |
| 3 | "Last note — happy to do a security architecture review" | No-pitch close |

**Target:** 3 demo calls with DeFi teams; one pilot agreement by end of Week 4.

---

## 24. ✅ `/security` page [P1] [DONE]

**Effort:** ~4 hours  
**File:** `dashboard/src/app/security/page.tsx` (new)

- HSM key hierarchy, TEE attestation, network isolation, data residency, compliance roadmap (SOC 2 Type I in progress, Type II date). Link from pricing and footer.
- **[REVISED] Intents section:** Private key isolation (key in TEE, never exported); intent validation pipeline (allowlist → value cap → chain → Tenderly → signing); replay protection (idempotency, nonce); "What Intents cannot do" (e.g. cannot sign to non-allowlisted address even if agent compromised). This is what crypto fund security teams need before production approval.

---

## 25. SOC 2 Type I evidence [P0]

**Effort:** Ongoing

- Vanta or Drata: connect AWS, GitHub, G Suite; document access control, encryption, incident response, vuln management, training.
- **[NEW] Intents controls to document:** Private key never exported from TEE (TEE attestation logs); transaction signing audit trail (append-only intent log); value cap enforcement (policy engine tests); replay protection (idempotency deduplication). Document in language auditors can verify.

---

## 26. CMEK [P1]

**Effort:** ~2 days

- Existing CMEK in vault; ensure dashboard and docs support registration and rotation; add to `/security` and Enterprise.
- **[NEW]** For Intents, CMEK = customer-managed key-encryption-key wrapping the signing key in the TEE. Add to CMEK docs when shipped — required for institutional DeFi teams.

---

## 27. ✅ Per-agent usage dashboard [P1] [DONE]

**Effort:** ~1 day

- **Vault:** Per-agent request count (daily/weekly/monthly), secrets accessed (path + time), last active, anomaly flag.
- **[REVISED] Intents metrics:** Total intents submitted; total value signed (ETH equivalent); simulation rejections (last 7 days); allowlist violations attempted; daily value cap utilization %. Surfaces on agent detail page for security team buy-in.

---

## 28. [NEW] x402 integration guide and positioning [P1]

**Effort:** ~4 hours  
**File:** `docs/docs/guides/x402.md` (new)

x402 is under-documented. An agent that **pays for its own API requests in USDC on Base without holding funds** is a strong Intents demo.

- End-to-end guide: agent submits x402 payment intent → 1claw signs → Coinbase CDP facilitator settles on Base.
- Code example: TypeScript agent using 1claw x402 to pay for API calls to a paid MCP service.
- Position as "future of agent economics" — agents as first-class economic actors. Potential crypto media hook (CoinDesk, Decrypt, The Block) if pitched well.

---

## 29. Cold email 200 mid-market (AI dev) [P0]

**Effort:** ~1 day

- Apollo/Clay: 200 contacts (platform/staff/security engineers, 20–200 employees, LLM-building). 3-email sequence (problem → case/demo → breakup). Target 5 demo calls. (Vault/Shroud motion.)

---

## 30. MCP tutorial creators + referral program [P1]

- MCP: Find 5 tutorial creators; partner with 2–3 (free Business for "deploy MCP securely" content). Referral tracking.
- Referral program: "Refer a team, get $50 credit" in sidebar; manual credit until volume justifies automation.

---

# Week 4 — Scale & First Enterprise

## 31. Case study #1 [P0]

**Effort:** ~4 hours

- **[REVISED]** If any Intents users by Week 4, **prioritize an Intents case study** — "DeFi team runs autonomous trading agent without the agent ever holding the signing key" is a stronger headline than "startup stores API keys in vault." If no Intents users, do Vault case study per original plan (best Team customer, 500-word case study, homepage + `/customers`).

---

## 32. [NEW] Intents pilot agreement [P0]

**Effort:** Ongoing  
**Target:** One signed pilot by end of Week 4

Pilot is different from a Vault Team subscription. Structure:

- **Duration:** 60–90 days
- **Price:** $0 or nominal ($500/mo) — goal is reference + case study
- **1claw:** dedicated support, SLA on signing latency, custom guardrails
- **Customer:** monthly feedback call, permission as reference (anonymized OK)
- **Conversion:** pilot → Business/Enterprise if &gt;X intents/month or &gt;Y ETH value/month

Draft one-page pilot agreement. Lawyer review once (~$500). Store in `/legal/intents-pilot-agreement.md` or equivalent.

---

## 33. [NEW] Intents Product Hunt launch [P1]

Launch 1claw Intents separately, ~1 week after Vault. Different tagline and maker comments.  
Tagline example: "Let your AI agents sign on-chain transactions — without ever holding the private key".

---

## 34. Onboarding email sequence [P0]

**Effort:** ~4 hours

- **Vault sequence:** Day 0 (MCP quickstart), 1 (first fetch?), 3 (first policy), 7 (requests + social proof), 14 (bring team). Trigger on signup. Tool: Customer.io or Loops.
- **[NEW] Intents sequence** (trigger when user enables Intents on first agent): Day 0 "Intents enabled — submit your first transaction"; Day 1 "First intent simulation — what to check"; Day 3 "Guardrails: allowlists, value caps, chains"; Day 7 "You've submitted X intents — what other teams build"; Day 14 "Ready for production? What Enterprise adds for on-chain teams."

---

## 35. ✅ Enterprise inquiry flow [P1] [DONE]

Typeform 5 questions (company size, use case, compliance, timeline, budget). "Talk to us about Enterprise" on pricing → Calendly + Slack notification.

---

## 36. Shroud per-agent config + SCIM [P1]

- Shroud: Confirm "14 PII redactions in the last hour" (or equivalent) is surfaced — key upsell moment.
- SCIM: WorkOS; test Okta and Azure AD; document in Enterprise docs; add to feature list.

---

## 37. First enterprise prospect: two tracks [P0]

**[REVISED]** Two motions:

**Track A: Vault + Shroud (fin/healthcare)**  
5 companies; reach security/platform via LinkedIn; offer free 45-min "AI agent security architecture review." Goal: 2–3 calls.

**Track B: [NEW] Intents (crypto funds / DeFi protocols)**  
Target: crypto funds or market makers running autonomous agents, DeFi protocols with on-chain automation.

Outreach (LinkedIn or Telegram — crypto founders often more reachable on Telegram):

> "Hey [name] — [Fund/Protocol] is doing interesting work with [automated strategy/on-chain agent]. Quick question: how are you handling signing key security for your agents? We've built something that might be relevant — agents submit intents, signing happens in a TEE, the key never touches the agent runtime. Happy to show a 20-minute demo."

**Goal:** 2 calls with crypto fund security teams; one leads to pilot agreement.

---

## 38. Week 4 retrospective [P0]

**Effort:** ~3 hours

**Vault (original):** Signups, activations, free→paid conversion, acquisition source per customer, median time to first fetch, median time limit-hit → upgrade.

**[NEW] Intents:** How many teams enabled Intents? First intent submitted? Active pilot conversations? Acquisition source for every Intents lead? Blocker for teams who looked but didn’t activate?

**[NEW] Combined:** What’s the Vault → Intents upgrade rate? (Teams who started with Vault then enabled Intents.) Indicates whether the platform story works or Intents needs its own acquisition path.

Use answers to set weeks 5–8 priorities.

---

## 39. MCP-focused event [P1]

**Effort:** ~4 hours

- Find 3–5 MCP events/meetups; submit "How to build production-grade MCP servers that don't leak credentials"; prepare 20-min outline.

---

# Gaps in the original plan (summary)

| Gap | Severity | Where addressed |
|-----|----------|-----------------|
| No Intents landing page | High | Sections 3, 13 |
| No crypto/DeFi ICP prospect list | High | Sections 8, 19, 23, 37 |
| No Intents funnel instrumentation | High | Section 6 |
| No Intents onboarding sequence | Medium | Section 34 |
| No Intents quickstart polish | Medium | Section 15 |
| x402 absent from docs/marketing | Medium | Section 28 |
| Intents security page content | Medium | Section 24, 25 |
| No Intents pilot agreement | Medium | Section 32 |
| No DeFi directory submissions | Low–Medium | Section 11 |
| Intents audit log export missing | Low | Section 16 |
| Per-agent Intents metrics absent | Low | Section 27 |

---

# Revised file map

| Area | Key files |
|------|-----------|
| License | `packages/sdk/LICENSE`, `packages/mcp/LICENSE`, both `package.json` |
| Intents SDK license | `packages/intents-sdk/LICENSE` (if exists) |
| Intents landing page | `dashboard/src/app/intents/page.tsx` (new) |
| Intents subdomain | Vercel domain config + DNS |
| Shroud landing page | `dashboard/src/app/shroud/page.tsx` (new) |
| Docs "open vs proprietary" | `docs/docs/concepts/licensing.md` (new) |
| Hero + nav | `dashboard/src/app/page.tsx`, `dashboard/src/components/marketing/navbar.tsx` |
| Analytics (all events) | `dashboard/src/lib/analytics.ts`, vault transaction handler |
| Limit-hit modals | `dashboard/src/components/upgrade-prompt.tsx`, `dashboard/src/lib/stores/upgrade-store.ts` |
| Pricing page | `dashboard/src/app/pricing/page.tsx` |
| Intents quickstart docs | `docs/docs/quickstart/intents.md` (new) |
| x402 guide | `docs/docs/guides/x402.md` (new) |
| Security page | `dashboard/src/app/security/page.tsx` (new) |
| Pilot agreement | `/legal/intents-pilot-agreement.md` or equivalent |

---

# Risks and mitigations (revised)

| Risk | Mitigation |
|------|------------|
| SSO in 2 days tight | WorkOS; scope to Google Workspace + Okta first; Azure AD in week 3. |
| SOC 2 long lead | Start Week 1; Vanta automates ~70%; use "in progress" as selling point. |
| No crypto ICP logos yet | Use chain logos (Base, Ethereum, Arbitrum) as "supports" — same credibility. |
| Intents pilot &gt; 4 weeks to close | Start pilot conversations Week 2; 4 weeks = target for LOI or strong commitment, not necessarily signed contract. |
| First agent fetch hard to instrument | Use "first_secret_stored" + "agent_registered" for Vault; use first `POST /intents` for Intents. |
| x402 confuses non-crypto buyers | Keep on `/intents` only; do not mention on main pricing page. |
| DeFi outreach lower response rate | Use Telegram/Farcaster in addition to Twitter/LinkedIn — DeFi devs often more reachable there. |
| Intents demo needs testnet | Use Base Sepolia; funded demo wallet; Tenderly simulation = no real funds at risk. |

---

*Last updated: 2026-03-16. 20 items shipped. Refines the Cursor-generated sprint plan with full Intents coverage, crypto ICP strategy, x402 positioning, and instrumentation gaps.*
