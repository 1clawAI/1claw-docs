import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    docs: [
        "intro",
        {
            type: "category",
            label: "Concepts",
            link: { type: "doc", id: "concepts/what-is-1claw" },
            items: [
                "concepts/hsm-architecture",
                "concepts/secrets-model",
                "concepts/human-vs-agent-api",
                "concepts/trust-model",
            ],
        },
        {
            type: "category",
            label: "Quickstart",
            items: ["quickstart/humans", "quickstart/agents"],
        },
        {
            type: "category",
            label: "Human API",
            link: { type: "doc", id: "human-api/overview" },
            items: [
                "human-api/authentication",
                {
                    type: "category",
                    label: "Secrets",
                    items: [
                        "human-api/secrets/create",
                        "human-api/secrets/read",
                        "human-api/secrets/update",
                        "human-api/secrets/delete",
                        "human-api/secrets/rotate",
                    ],
                },
                {
                    type: "category",
                    label: "Grants (Policies)",
                    items: [
                        "human-api/grants/create-grant",
                        "human-api/grants/revoke-grant",
                        "human-api/grants/list-grants",
                    ],
                },
                {
                    type: "category",
                    label: "Agents",
                    items: [
                        "human-api/agents/register-agent",
                        "human-api/agents/list-agents",
                        "human-api/agents/deactivate-agent",
                    ],
                },
                "human-api/errors",
            ],
        },
        {
            type: "category",
            label: "Agent API",
            link: { type: "doc", id: "agent-api/overview" },
            items: [
                "agent-api/authentication",
                "agent-api/fetch-secret",
                "agent-api/list-accessible-secrets",
                "agent-api/audit-log",
                "agent-api/errors",
            ],
        },
        {
            type: "category",
            label: "MCP Server",
            link: { type: "doc", id: "mcp/overview" },
            items: ["mcp/setup", "mcp/tools", "mcp/security", "mcp/deployment"],
        },
        {
            type: "category",
            label: "SDKs",
            link: { type: "doc", id: "sdks/overview" },
            items: ["sdks/javascript", "sdks/python", "sdks/curl-examples"],
        },
        {
            type: "category",
            label: "Guides",
            items: [
                "guides/give-agent-access",
                "guides/rotating-secrets",
                "guides/scoped-permissions",
                "guides/sharing-secrets",
                "guides/revoking-access",
                "guides/mcp-integration",
                "guides/email-notifications",
                "guides/billing-and-usage",
                "guides/deploying-updates",
                "guides/audit-and-compliance",
            ],
        },
        {
            type: "category",
            label: "Security",
            items: [
                "security/hsm-overview",
                "security/key-hierarchy",
                "security/zero-trust",
                "security/compliance",
            ],
        },
        {
            type: "category",
            label: "Reference",
            items: [
                "reference/api-reference",
                "reference/error-codes",
                "reference/rate-limits",
                "reference/changelog",
            ],
        },
    ],
};

export default sidebars;
