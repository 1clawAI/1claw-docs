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
        { to: "/docs/human-api/overview", label: "Human API", position: "left" },
        { to: "/docs/agent-api/overview", label: "Agent API", position: "left" },
        { to: "/docs/mcp/overview", label: "MCP", position: "left" },
        {
          href: "https://github.com/kmjones1979/1claw",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      links: [
        { label: "Privacy", href: "https://1claw.xyz/privacy" },
        { label: "Terms", href: "https://1claw.xyz/terms" },
        { label: "GitHub", href: "https://github.com/kmjones1979/1claw" },
        { label: "Status", href: "https://1claw.xyz/status" },
      ],
      copyright: "Copyright © 1claw. PolyForm Noncommercial 1.0.0.",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript", "python", "http"],
    },
    metadata: [
      {
        name: "keywords",
        content:
          "HSM, secrets manager, AI agents, API keys, Claude, MCP, zero trust, cloud HSM",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    sitemap: {
      changefreq: "weekly",
      priority: 0.5,
      ignorePatterns: ["/tags/**"],
    },
  } satisfies Preset.ThemeConfig,
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
