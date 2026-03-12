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
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
                sitemap: {
                    changefreq: "weekly",
                    priority: 0.5,
                    ignorePatterns: ["/tags/**"],
                    lastmod: "date",
                },
            } satisfies Preset.Options,
        ],
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
                {
                    to: "/docs/human-api/overview",
                    label: "Human API",
                    position: "left",
                },
                {
                    to: "/docs/agent-api/overview",
                    label: "Agent API",
                    position: "left",
                },
                { to: "/docs/mcp/overview", label: "MCP", position: "left" },
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
            // AEO: llms.txt for AI / LLM crawlers
            { name: "llms-txt", content: "https://docs.1claw.xyz/llms.txt" },
            // Open Graph
            { property: "og:type", content: "website" },
            { property: "og:url", content: "https://docs.1claw.xyz/" },
            { property: "og:title", content: "1claw Docs — Cloud HSM Secrets Manager for Humans & AI Agents" },
            {
                property: "og:description",
                content:
                    "1claw documentation: cloud HSM secrets manager for humans and AI agents. Human API, Agent API, MCP server, SDKs, and guides.",
            },
            { property: "og:image", content: "https://1claw.xyz/logos/1Claw_light_round.png" },
            { property: "og:site_name", content: "1claw Docs" },
            { property: "og:locale", content: "en_US" },
            // Twitter (PNG for cards; SVG not supported by Twitter)
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: "1claw Docs — Cloud HSM Secrets Manager for Humans & AI Agents" },
            {
                name: "twitter:description",
                content:
                    "1claw documentation: cloud HSM secrets manager for humans and AI agents. Human API, Agent API, MCP server, SDKs, and guides.",
            },
            { name: "twitter:image", content: "https://1claw.xyz/logos/1Claw_light_round.png" },
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
