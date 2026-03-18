import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Docs are organized by product: Vault (secrets + APIs + MCP), Shroud (LLM proxy), Intents (transaction signing).
 * This makes it easier to find what you need by product.
 */
const sidebars: SidebarsConfig = {
    docs: [
        "intro",
        {
            type: "category",
            label: "Concepts",
            link: { type: "doc", id: "concepts/what-is-1claw" },
            items: [
                "concepts/parts-of-1claw",
                "concepts/hsm-architecture",
                "concepts/secrets-model",
                "concepts/human-vs-agent-api",
                "concepts/trust-model",
            ],
        },
        {
            type: "category",
            label: "Vault",
            link: { type: "doc", id: "human-api/overview" },
            collapsed: false,
            items: [
                {
                    type: "category",
                    label: "Quickstart",
                    link: { type: "doc", id: "quickstart/index" },
                    items: ["quickstart/humans", "quickstart/agents"],
                },
                {
                    type: "category",
                    label: "Human API",
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
                    label: "Vault guides",
                    items: [
                        "guides/give-agent-access",
                        "guides/securing-agent-access",
                        "guides/scoped-permissions",
                        "guides/revoking-access",
                        "guides/rotating-secrets",
                        "guides/customer-managed-keys",
                        "guides/sharing-secrets",
                        "guides/agent-self-onboarding",
                        "guides/agent-fleet-management",
                        "guides/crypto-proxy",
                        "guides/mcp-integration",
                        "guides/cli",
                        "guides/openclaw",
                        "guides/email-notifications",
                        "guides/billing-and-usage",
                        "guides/deploying-updates",
                        "guides/audit-and-compliance",
                        "guides/troubleshooting",
                    ],
                },
            ],
        },
        {
            type: "category",
            label: "Shroud",
            link: { type: "doc", id: "guides/shroud" },
            items: [],
        },
        {
            type: "category",
            label: "Intents",
            link: { type: "doc", id: "guides/intents-api" },
            items: [],
        },
        {
            type: "category",
            label: "Treasury",
            link: { type: "doc", id: "guides/treasury" },
            items: [],
        },
        {
            type: "category",
            label: "SDKs",
            link: { type: "doc", id: "sdks/overview" },
            items: ["sdks/javascript", "sdks/python", "sdks/curl-examples"],
        },
        {
            type: "category",
            label: "Security",
            items: [
                "security/hsm-overview",
                "security/key-hierarchy",
                "security/agent-keys",
                "security/zero-trust",
                "security/two-factor-auth",
                "security/compliance",
            ],
        },
        {
            type: "category",
            label: "Reference",
            items: [
                "reference/api-reference",
                "reference/request-pipeline",
                "reference/api-mcp-testing",
                "reference/error-codes",
                "reference/rate-limits",
                "reference/glossary",
                "reference/changelog",
            ],
        },
    ],
};

export default sidebars;
