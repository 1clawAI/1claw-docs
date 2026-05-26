import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Docs: Concepts, Guides (how-tos), product areas (Vault, Shroud, Intents, Treasury), SDKs, Security, Reference.
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
            label: "Guides",
            link: {
                type: "generated-index",
                title: "Guides",
                description:
                    "Task-focused walkthroughs: when to use each guide is spelled out in the sidebar title.",
                slug: "/category/guides",
            },
            items: [
                {
                    type: "category",
                    label: "Access & policies",
                    items: [
                        {
                            type: "doc",
                            id: "guides/give-agent-access",
                            label: "Golden path — vault, secret, policy, agent fetch",
                        },
                        {
                            type: "doc",
                            id: "guides/securing-agent-access",
                            label: "Reduce blast radius — vault binding, scopes, TTL",
                        },
                        {
                            type: "doc",
                            id: "guides/scoped-permissions",
                            label: "Fine-grained access — policies and API key scopes",
                        },
                        {
                            type: "doc",
                            id: "guides/revoking-access",
                            label: "Offboard — revoke policies and tighten access",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Secrets & encryption",
                    items: [
                        {
                            type: "doc",
                            id: "guides/rotating-secrets",
                            label: "Rotate credentials safely in the vault",
                        },
                        {
                            type: "doc",
                            id: "guides/sharing-secrets",
                            label: "Share with people or agents (inbound / outbound)",
                        },
                        {
                            type: "doc",
                            id: "guides/customer-managed-keys",
                            label: "CMEK — extra client-side encryption layer",
                        },
                        {
                            type: "doc",
                            id: "guides/mpc",
                            label: "MPC — split keys across HSM providers",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Agents & scale",
                    items: [
                        {
                            type: "doc",
                            id: "guides/agent-self-onboarding",
                            label: "Self-enrollment — agents request access via email flow",
                        },
                        {
                            type: "doc",
                            id: "guides/agent-fleet-management",
                            label: "Many agents — environments, keys, and operations",
                        },
                        {
                            type: "doc",
                            id: "guides/oidc-federation",
                            label: "OIDC federation — Anthropic WIF, no static keys",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Tools, CLI & integrations",
                    items: [
                    {
                        type: "doc",
                        id: "guides/mcp-integration",
                        label: "MCP — Claude Desktop and compatible clients",
                    },
                    {
                        type: "doc",
                        id: "guides/base-mcp-secure",
                        label: "Base MCP — secure Base MCP with 1Claw",
                    },
                        {
                            type: "doc",
                            id: "guides/cli",
                            label: "CLI — CI/CD, env pull/push, full API",
                        },
                        {
                            type: "doc",
                            id: "guides/openclaw",
                            label: "OpenClaw — Cursor / editor plugin",
                        },
                        {
                            type: "doc",
                            id: "guides/scaffold-agent",
                            label: "Scaffold-Agent — monorepo for onchain AI agents",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "LLM, transactions & treasury",
                    items: [
                        {
                            type: "doc",
                            id: "guides/shroud",
                            label: "Shroud — LLM proxy, redaction, threat detection",
                        },
                        {
                            type: "doc",
                            id: "guides/ide-shroud-setup",
                            label: "IDEs — local proxy for Cursor, Copilot, Claude Code",
                        },
                        {
                            type: "doc",
                            id: "guides/intents-api",
                            label: "Intents API — sign txs without raw private keys",
                        },
                        {
                            type: "doc",
                            id: "guides/crypto-proxy",
                            label: "Note: Crypto proxy renamed → Intents API",
                        },
                        {
                            type: "doc",
                            id: "guides/treasury",
                            label: "Treasury — Safe multisigs & access requests",
                        },
                        {
                            type: "doc",
                            id: "guides/platform-api",
                            label: "Platform API — build products on 1Claw",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Billing, ops & compliance",
                    items: [
                        {
                            type: "doc",
                            id: "guides/billing-and-usage",
                            label: "Billing — tiers, credits, x402, LLM token add-on",
                        },
                        {
                            type: "doc",
                            id: "guides/deploying-updates",
                            label: "Ship changes — agents, policies, rotation",
                        },
                        {
                            type: "doc",
                            id: "guides/audit-and-compliance",
                            label: "Audit log — evidence for reviews and compliance",
                        },
                        {
                            type: "doc",
                            id: "guides/email-notifications",
                            label: "Email — enroll, shares, billing alerts",
                        },
                        {
                            type: "doc",
                            id: "guides/troubleshooting",
                            label: "Troubleshooting — common API and auth issues",
                        },
                    ],
                },
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
            ],
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
                "reference/shroud-supported-models",
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
