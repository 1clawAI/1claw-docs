import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

/**
 * Static landing page so crawlers (Google, etc.) receive indexable HTML.
 * The previous redirect-only page rendered minimal content before client-side nav.
 */
export default function Home(): React.ReactElement {
    return (
        <Layout
            title="1claw Docs — Cloud HSM Secrets Manager for Humans & AI Agents"
            description="1claw is a cloud HSM secrets manager that lets humans grant AI agents scoped, audited, revocable access to secrets. Documentation for the Human API, Agent API, MCP server, and SDKs."
        >
            <main className="container margin-vert--xl">
                <div className="row">
                    <div className="col col--8 col--offset-2">
                        <h1>1claw Documentation</h1>
                        <p className="lead">
                            Cloud HSM secrets manager for humans and AI agents.
                            Store API keys and credentials in a vault encrypted by
                            keys that never leave the HSM. Grant agents scoped,
                            audited, revocable access — no raw credentials in
                            context or environment.
                        </p>
                        <div className="margin-top--lg">
                            <Link
                                className="button button--primary button--lg margin-right--md"
                                to="/docs/intro"
                            >
                                Get started
                            </Link>
                            <Link
                                className="button button--secondary button--lg"
                                to="/docs/quickstart/"
                            >
                                Quickstart
                            </Link>
                        </div>
                        <section className="margin-top--xl">
                            <h2>Documentation</h2>
                            <ul>
                                <li>
                                    <Link to="/docs/intro">Introduction</Link> —
                                    what 1claw is and how it works
                                </li>
                                <li>
                                    <Link to="/docs/vaults/human-api/overview">
                                        Human API
                                    </Link>{" "}
                                    — manage vaults, secrets, and policies
                                </li>
                                <li>
                                    <Link to="/docs/agents/api/overview">
                                        Agent API
                                    </Link>{" "}
                                    — how agents authenticate and fetch secrets
                                </li>
                                <li>
                                    <Link to="/docs/vaults/mcp/overview">MCP Server</Link>{" "}
                                    — Model Context Protocol tools for Claude,
                                    Cursor, and other AI agents
                                </li>
                                <li>
                                    <Link to="/docs/sdks/overview">SDKs</Link> —
                                    JavaScript, Python, and curl examples
                                </li>
                            </ul>
                        </section>
                    </div>
                </div>
            </main>
        </Layout>
    );
}
