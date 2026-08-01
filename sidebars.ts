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
                    label: "Getting started",
                    items: [
                        {
                            type: "doc",
                            id: "guides/five-minute-walkthrough",
                            label: "5-minute walkthrough — vault, key, transaction",
                        },
                    ],
                },
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
                        {
                            type: "doc",
                            id: "guides/secret-rotation-bindings",
                            label: "Rotation & bindings — rotate without redeploying",
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
                        {
                            type: "doc",
                            id: "guides/approvals",
                            label: "Human-in-the-loop — approvals for agent actions",
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
                            id: "guides/agent-templates",
                            label: "Agent templates — contribute a spawn template",
                        },
                        {
                            type: "doc",
                            id: "guides/openclaw",
                            label: "OpenClaw — Cursor / editor plugin",
                        },
                        {
                            type: "doc",
                            id: "guides/elizaos",
                            label: "elizaOS — vault + signing plugin",
                        },
                        {
                            type: "doc",
                            id: "guides/scaffold-agent",
                            label: "Scaffold-Agent — monorepo for onchain AI agents",
                        },
                        {
                            type: "doc",
                            id: "guides/ecosystem",
                            label: "Ecosystem — all integrations directory",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Wallet & key infra migrations",
                    items: [
                        {
                            type: "doc",
                            id: "guides/migrate-from-dynamic",
                            label: "Dynamic — migration guide",
                        },
                        {
                            type: "doc",
                            id: "guides/migrate-from-privy",
                            label: "Privy — side-by-side integration",
                        },
                        {
                            type: "doc",
                            id: "guides/coinbase-smart-wallet",
                            label: "Coinbase Wallet / Smart Wallet",
                        },
                        {
                            type: "doc",
                            id: "guides/migrate-from-turnkey",
                            label: "Turnkey — migration from API key infra",
                        },
                        {
                            type: "doc",
                            id: "guides/web3auth",
                            label: "Web3Auth — social login + 1claw backend",
                        },
                        {
                            type: "doc",
                            id: "guides/thirdweb",
                            label: "Thirdweb — replace Engine, keep frontend",
                        },
                        {
                            type: "doc",
                            id: "guides/magic",
                            label: "Magic — auth wallets + 1claw agents",
                        },
                        {
                            type: "doc",
                            id: "guides/fireblocks",
                            label: "Fireblocks — institutional custody complement",
                        },
                        {
                            type: "doc",
                            id: "guides/safe-multisig",
                            label: "Safe — proposals, signing, auto-execute",
                        },
                        {
                            type: "doc",
                            id: "guides/account-abstraction",
                            label: "ERC-4337 — smart accounts with 1claw signers",
                        },
                        {
                            type: "doc",
                            id: "guides/wagmi-rainbowkit",
                            label: "wagmi + RainbowKit — frontend + 1claw backend",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "AI agent integrations",
                    items: [
                        {
                            type: "doc",
                            id: "guides/agent-frameworks",
                            label: "Agent frameworks — Eliza, GOAT, LangChain, CrewAI",
                        },
                        {
                            type: "doc",
                            id: "guides/mcp-deep-dive",
                            label: "MCP for AI tools — Cursor, Claude, VS Code, Zed",
                        },
                        {
                            type: "doc",
                            id: "guides/ai-sdk-integration",
                            label: "Vercel AI SDK / OpenAI Agents SDK",
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
                            id: "guides/bankr-key-vending",
                            label: "Bankr Key Vending — dynamic short-lived keys",
                        },
                        {
                            type: "doc",
                            id: "guides/payment-cards",
                            label: "Payment Cards — order prepaid/gift cards via x402",
                        },
                        {
                            type: "doc",
                            id: "guides/crypto-proxy",
                            label: "Note: Crypto proxy renamed → Intents API",
                        },
                        {
                            type: "doc",
                            id: "guides/multi-chain-signing",
                            label: "Multi-chain signing keys — per-agent keypairs",
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
                        {
                            type: "doc",
                            id: "guides/multi-tenant-platform",
                            label: "Multi-tenant — bootstrap users with templates",
                        },
                        {
                            type: "doc",
                            id: "guides/embedded-wallets-quickstart",
                            label: "Embedded wallets — 2-minute quickstart",
                        },
                        {
                            type: "doc",
                            id: "guides/wallet-react",
                            label: "@1claw/wallet-react — embeddable React widget",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Automations, runtimes & memory",
                    items: [
                        {
                            type: "doc",
                            id: "guides/automations",
                            label: "Automations — cron, webhooks, AI workflows",
                        },
                        {
                            type: "doc",
                            id: "guides/runtimes",
                            label: "Cloud Runtimes — managed containers for agents",
                        },
                        {
                            type: "doc",
                            id: "guides/agent-memory",
                            label: "Agent Memory — scratch, durable, semantic storage",
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
                "security/risk-engine",
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
