import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "1claw Docs",
    tagline: "Cloud HSM Secrets Manager for Humans & AI Agents",
    favicon: "img/logo.svg",
    url: "https://docs.1claw.xyz",
    baseUrl: "/",
    organizationName: "1claw",
    projectName: "1claw-docs",
    onBrokenLinks: "throw",
    // SSR/SSG: Docusaurus build produces static HTML for every page (including index).
    trailingSlash: false,
    markdown: {
        mermaid: true,
        hooks: {
            onBrokenMarkdownLinks: "warn",
        },
    },
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },
    presets: [
        [
            "classic",
            {
                docs: {
                    routeBasePath: "docs",
                    sidebarPath: "./sidebars.ts",
                    editUrl: undefined,
                    showLastUpdateTime: false,
                    showLastUpdateAuthor: false,
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
                sitemap: {
                    changefreq: "weekly",
                    priority: 0.5,
                    ignorePatterns: ["/tags/**"],
                },
                gtag: {
                    trackingID: "G-333VRQ54M7",
                    anonymizeIP: true,
                },
            } satisfies Preset.Options,
        ],
    ],
    headTags: [
        {
            tagName: "script",
            attributes: { type: "application/ld+json" },
            innerHTML: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Organization",
                        "@id": "https://1claw.xyz/#organization",
                        name: "1Claw",
                        url: "https://1claw.xyz",
                        logo: {
                            "@type": "ImageObject",
                            url: "https://1claw.xyz/logos/png/1claw-round-black.png",
                        },
                        sameAs: ["https://github.com/1clawAI", "https://x.com/1clawAI"],
                    },
                    {
                        "@type": "WebSite",
                        "@id": "https://docs.1claw.xyz/#website",
                        url: "https://docs.1claw.xyz",
                        name: "1claw Docs",
                        publisher: { "@id": "https://1claw.xyz/#organization" },
                        potentialAction: {
                            "@type": "SearchAction",
                            target: {
                                "@type": "EntryPoint",
                                urlTemplate: "https://docs.1claw.xyz/docs/?q={search_term_string}",
                            },
                            "query-input": "required name=search_term_string",
                        },
                    },
                ],
            }),
        },
    ],
    themeConfig: {
        image: "img/logo.svg",
        navbar: {
            title: "1claw",
            logo: {
                alt: "1claw",
                src: "img/logo.svg",
            },
            items: [
                { to: "/docs/intro", label: "Docs", position: "left" },
                { to: "/docs/human-api/overview", label: "Vault", position: "left" },
                { to: "/docs/guides/shroud", label: "Shroud", position: "left" },
                { to: "/docs/guides/intents-api", label: "Intents", position: "left" },
                { to: "/docs/guides/automations", label: "Automations", position: "left" },
                { to: "/docs/guides/runtimes", label: "Runtimes", position: "left" },
                { to: "/docs/guides/treasury", label: "Treasury", position: "left" },
                { type: "search", position: "right" },
                {
                    href: "https://github.com/1clawAI",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            links: [
                { label: "Privacy", href: "https://1claw.xyz/privacy" },
                { label: "Terms", href: "https://1claw.xyz/terms" },
                { label: "GitHub", href: "https://github.com/1clawAI" },
                { label: "Status", href: "https://1claw.xyz/status" },
                { label: "Support (Telegram)", href: "https://t.me/+jG4Rm7XHJ79mNDRh" },
            ],
            copyright: "Copyright © 1claw. PolyForm Noncommercial 1.0.0.",
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: [
                "bash",
                "json",
                "typescript",
                "python",
                "http",
            ],
        },
        metadata: [
            {
                name: "description",
                content:
                    "1claw documentation: cloud HSM secrets manager for humans and AI agents. Human API, Agent API, MCP server, SDKs, OpenClaw plugin, and guides.",
            },
            {
                name: "keywords",
                content:
                    "1claw, HSM, secrets manager, AI agents, API keys, Claude, MCP, Model Context Protocol, zero trust, cloud HSM, vault, Cursor, OpenClaw, documentation",
            },
            { name: "llms-txt", content: "https://docs.1claw.xyz/llms.txt" },
            { property: "og:type", content: "website" },
            { property: "og:image", content: "https://1claw.xyz/api/og?title=1claw%20Documentation&subtitle=Human%20API%20%C2%B7%20Agent%20API%20%C2%B7%20MCP%20Server%20%C2%B7%20SDKs%20%C2%B7%20Guides" },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { property: "og:site_name", content: "1claw Docs" },
            { property: "og:locale", content: "en_US" },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:image", content: "https://1claw.xyz/api/og?title=1claw%20Documentation&subtitle=Human%20API%20%C2%B7%20Agent%20API%20%C2%B7%20MCP%20Server%20%C2%B7%20SDKs%20%C2%B7%20Guides" },
        ],
        // Sitemap is configured in the preset above; themeConfig.sitemap is also read by the plugin.
        sitemap: {
            changefreq: "weekly",
            priority: 0.5,
            ignorePatterns: ["/tags/**"],
            lastmod: "date",
        },
    } satisfies Preset.ThemeConfig,
    themes: [
        "@docusaurus/theme-mermaid",
        [
            "@easyops-cn/docusaurus-search-local",
            {
                hashed: true,
                indexBlog: false,
                docsRouteBasePath: "/docs",
                highlightSearchTermsOnTargetPage: true,
                searchResultContextMaxLength: 80,
            },
        ],
    ],
    plugins: [
        "docusaurus-plugin-copy-page-button",
        function excludeNodeModulesMdx() {
            return {
                name: "exclude-node-modules-mdx",
                configureWebpack() {
                    return {
                        module: {
                            rules: [
                                {
                                    test: /\.(?:md|mdx)$/,
                                    include: /node_modules/,
                                    use: [],
                                    type: "javascript/auto",
                                },
                            ],
                        },
                    };
                },
            };
        },
    ],
};

export default config;
