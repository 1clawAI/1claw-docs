---
title: Setup 1claw with Claude Code
description: Connect Claude Code to your 1claw vault via MCP and optionally install the 1claw skill so Claude knows when and how to use it.
sidebar_position: 6
---

# Setup 1claw with Claude Code

[Claude Code](https://code.claude.com) can use 1claw in two ways:

1. **MCP** — Connect to the 1claw MCP server so Claude has tools to list, get, put, and manage secrets. Same configuration as Cursor.
2. **Skill (optional)** — Install the 1claw skill so Claude knows when to use 1claw, which tools to call, and best practices (just-in-time fetch, no echoing secrets). Uses the same [Agent Skills](https://agentskills.io/) format as OpenClaw.

## 1. Connect via MCP

Claude Code supports MCP. Use the same setup as **Cursor**:

- **Hosted:** Add the MCP server with URL `https://mcp.1claw.xyz/mcp` and headers `Authorization: Bearer <jwt>` and `X-Vault-ID: <vault-uuid>`. Get the JWT from `POST /v1/auth/agent-token` with your agent ID and API key.
- **Local (stdio):** Run the 1claw MCP server locally with env vars `ONECLAW_AGENT_ID`, `ONECLAW_AGENT_API_KEY`, `ONECLAW_VAULT_ID`.

Configure MCP in Claude Code (e.g. via `claude mcp add` or your Claude Code settings). Exact UI may vary; follow [Anthropic’s MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp) for your version.

**→ Full config examples:** [MCP Setup Guide](/docs/mcp/setup) — use the Cursor sections; they apply to Claude Code.

## 2. Optional: Install the 1claw skill

Skills in Claude Code are `SKILL.md` files in a skill directory. The 1claw skill teaches Claude when to use 1claw (e.g. “I need an API key”), which MCP tools to call, and security practices (don’t store or echo secret values).

### Option A: Copy from the repo (personal, all projects)

Clone or download the 1claw skill and put it in your personal skills folder so it’s available in every project:

```bash
mkdir -p ~/.claude/skills/1claw
curl -sL https://raw.githubusercontent.com/1clawAI/1claw-skill/main/SKILL.md -o ~/.claude/skills/1claw/SKILL.md
```

(If you have the 1claw monorepo cloned with the `skill` submodule, you can copy `skill/SKILL.md` to `~/.claude/skills/1claw/SKILL.md` instead.)

### Option B: Project-only skill

For a single project, create a project-level skill:

```bash
mkdir -p .claude/skills/1claw
curl -sL https://raw.githubusercontent.com/1clawAI/1claw-skill/main/SKILL.md -o .claude/skills/1claw/SKILL.md
```

Claude Code will discover the skill. You can invoke it with `/1claw` or let Claude load it when relevant (e.g. when you ask for a secret or API key).

### Optional supporting files

The full skill package in the [1claw-skill repo](https://github.com/1clawAI/1claw-skill) includes `EXAMPLES.md` and `CONFIG.md`. Clone the repo and copy all three files into `~/.claude/skills/1claw/` or `.claude/skills/1claw/` if you want Claude to use examples and config details.

Reference these in your workflow if you want Claude to use examples and config details; the main instructions are in `SKILL.md`.

## Summary

| Step | Action |
|------|--------|
| MCP | Add 1claw MCP server (hosted or local) — see [MCP Setup](/docs/mcp/setup) (Cursor section). |
| Skill | Copy `skill/SKILL.md` to `~/.claude/skills/1claw/SKILL.md` or `.claude/skills/1claw/SKILL.md`. |
| Test | In Claude Code, ask e.g. “List the secrets in my 1claw vault” or use `/1claw`. |

## See also

- [MCP Setup](/docs/mcp/setup) — Claude Desktop, Cursor, and Claude Code MCP config.
- [Using 1claw with OpenClaw](/docs/guides/openclaw) — Same skill, installed via ClawHub for OpenClaw.
- [Skill source](https://github.com/1clawAI/1claw-skill) — SKILL.md, EXAMPLES.md, CONFIG.md.
