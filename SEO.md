# Docs site SEO and discoverability

This file is for maintainers. It describes how the docs site (docs.1claw.co) is made discoverable and how to submit it to search engines.

## What we do in-repo

- **Static HTML (SSG):** Docusaurus builds static HTML for every page (including the index). Crawlers receive full content without executing JavaScript.
- **Index page:** The root `/` page is a real landing page with title, description, and links to docs (not a client-side redirect), so Google and other crawlers can index it.
- **Meta and Open Graph:** Site-wide meta description, keywords, `og:*` and `twitter:*` tags are set in `docusaurus.config.ts`.
- **Sitemap:** The build produces `build/sitemap.xml` (via `@docusaurus/plugin-sitemap`). The sitemap is linked from `static/robots.txt`.
- **robots.txt:** `static/robots.txt` allows all crawlers and points to `https://docs.1claw.co/sitemap.xml`.

## Submitting to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add a property: **URL prefix** `https://docs.1claw.co`.
3. Verify ownership using one of:
   - **HTML tag:** Add a meta tag to the docs. We can add a custom `metadata` entry in `docusaurus.config.ts` with the value Google gives you (e.g. `google-site-verification`).
   - **DNS:** Add the TXT record Google provides to your domain’s DNS for `docs.1claw.co` (or the root if you use a CNAME).
4. After verification, open **Sitemaps** and submit: `https://docs.1claw.co/sitemap.xml`.
5. Optionally use **URL Inspection** to request indexing of the homepage and a few key docs.

After deployment, the sitemap is available at `https://docs.1claw.co/sitemap.xml`. Re-submit the sitemap in GSC after large doc changes if you want to speed up re-crawling.

## Optional: better social preview image

Open Graph currently uses the logo SVG. Some platforms prefer a PNG (e.g. 1200×630). To improve link previews:

1. Add an image (e.g. `static/img/og-image.png`, 1200×630).
2. In `docusaurus.config.ts`, set `themeConfig.image` to `"img/og-image.png"` and/or update the `og:image` metadata to `https://docs.1claw.co/img/og-image.png`.

---

## Further SEO checklist (optional)

After the basics above are in place, these can improve visibility and rich results.

| Priority | Action | Why |
|----------|--------|-----|
| **High** | **Submit sitemap to Bing Webmaster Tools** | [Bing Webmaster Tools](https://www.bing.com/webmasters) — add property `https://docs.1claw.co`, verify (HTML tag or DNS), then submit `https://docs.1claw.co/sitemap.xml`. Bing powers DuckDuckGo and parts of other search/UIs. |
| **High** | **Audit doc frontmatter** | Key doc pages should have a unique `title` and `description` in frontmatter so search results show good snippets. Many docs already do; spot-check high-traffic pages (intro, quickstart, MCP overview, SDK pages). |
| **Medium** | **Add JSON-LD structured data** | Optional: add `WebSite` and/or `Organization` schema so search can show site links. Docusaurus doesn’t ship this by default; you can add a custom plugin or inject script in `docusaurus.config.ts` (e.g. `headTags` or a layout component). |
| **Medium** | **Use a PNG for og:image** | As above; 1200×630 PNG improves how links look when shared (Twitter, Slack, etc.). |
| **Low** | **Core Web Vitals** | Static Docusaurus builds are usually fast. If you use Vercel/Netlify, they handle compression and CDN. Check [PageSpeed Insights](https://pagespeed.web.dev/) after deploy if you want to tune. |
| **Low** | **Backlinks and content** | General SEO: links from 1claw.co, GitHub README, and npm package pages to the docs help discovery. A short “Documentation” link in the main site header/footer is useful. |

Nothing in this checklist is required for basic discoverability; the in-repo setup (SSG, meta, sitemap, robots.txt) plus GSC (and optionally Bing) submission is enough to get indexed.
