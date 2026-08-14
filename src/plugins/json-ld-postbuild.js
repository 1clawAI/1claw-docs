/**
 * Post-build plugin: inject TechArticle + BreadcrumbList JSON-LD into each doc HTML file.
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://docs.1claw.xyz";

function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const fm = {};
    for (const line of match[1].split("\n")) {
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
    return fm;
}

function titleFromMarkdown(content, fm) {
    if (fm.title) return fm.title;
    const h1 = content.match(/^#\s+(.+)$/m);
    return h1 ? h1[1].trim() : "1claw Docs";
}

function routeToHtmlPath(outDir, route) {
    const rel = route.replace(/^\//, "");
    const flat = path.join(outDir, `${rel}.html`);
    if (fs.existsSync(flat)) return flat;
    const nested = path.join(outDir, rel, "index.html");
    if (fs.existsSync(nested)) return nested;
    return null;
}

function routeToMdPath(siteDir, route) {
    const slug = route.replace(/^\/docs\/?/, "") || "intro";
    const mdPath = path.join(siteDir, "docs", `${slug}.md`);
    return fs.existsSync(mdPath) ? mdPath : null;
}

function jsonLdPlugin() {
    return {
        name: "json-ld-injector",
        async postBuild({ siteDir, outDir, routesPaths }) {
            const docRoutes = routesPaths.filter((p) => p.startsWith("/docs/"));

            for (const route of docRoutes) {
                const htmlPath = routeToHtmlPath(outDir, route);
                const mdPath = routeToMdPath(siteDir, route);
                if (!htmlPath || !mdPath) continue;

                const md = fs.readFileSync(mdPath, "utf8");
                const fm = parseFrontmatter(md);
                const title = titleFromMarkdown(md, fm);
                const description = fm.description || "1claw documentation";
                const pageUrl = `${SITE_URL}${route}`;

                const graph = [
                    {
                        "@type": "TechArticle",
                        "@id": `${pageUrl}#article`,
                        headline: title,
                        description,
                        url: pageUrl,
                        author: {
                            "@type": "Organization",
                            name: "1Claw",
                            url: "https://1claw.xyz",
                        },
                        publisher: { "@id": "https://1claw.xyz/#organization" },
                        isPartOf: { "@id": "https://docs.1claw.xyz/#website" },
                    },
                    {
                        "@type": "BreadcrumbList",
                        "@id": `${pageUrl}#breadcrumb`,
                        itemListElement: [
                            {
                                "@type": "ListItem",
                                position: 1,
                                name: "Docs",
                                item: `${SITE_URL}/docs/intro`,
                            },
                            {
                                "@type": "ListItem",
                                position: 2,
                                name: title,
                                item: pageUrl,
                            },
                        ],
                    },
                ];

                const script = `<script type="application/ld+json">${JSON.stringify({
                    "@context": "https://schema.org",
                    "@graph": graph,
                })}</script>`;

                let html = fs.readFileSync(htmlPath, "utf8");
                if (html.includes("#article")) continue;
                html = html.replace("</head>", `${script}</head>`);
                fs.writeFileSync(htmlPath, html);
            }
        },
    };
}

module.exports = jsonLdPlugin;
