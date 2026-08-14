---
title: CrewAI integration
description: Official 1claw-crewai-tools package for vault secrets, memory, signing, and automations in CrewAI crews.
sidebar_position: 2
---

# CrewAI

CrewAI agents call tools the same way other frameworks do. The friction is credentials: you do not want API keys in prompts, repo files, or crew memory, and you do not want every crew author rewriting auth and vault HTTP.

[`1claw-crewai-tools`](https://pypi.org/project/1claw-crewai-tools/) (`import oneclaw_crewai`) ships eleven CrewAI tools backed by the same agent API as the rest of 1Claw. One shared client, one `get_all_tools()` call, and your researcher or operator agent can fetch secrets, write memory, sign transactions, or kick off automations without touching raw keys.

## Install

```bash
pip install 1claw-crewai-tools
```

## Prerequisites

Same as LangChain: vault, agent with `ocv_` key, and policies on the paths your crew will use.

## Quick start

```python
import os
from crewai import Agent, Crew, Process, Task
from oneclaw_crewai import OneclawClient, get_all_tools

client = OneclawClient(api_key=os.environ["ONECLAW_AGENT_API_KEY"])
tools = get_all_tools(client)

researcher = Agent(
    role="Research analyst",
    goal="Use vault and memory tools without exposing secrets in output",
    backstory="You fetch credentials at runtime and store findings in encrypted memory.",
    tools=tools,
)

task = Task(
    description="Read path demo/api-key with oneclaw_vault. Report success and length only.",
    expected_output="One line confirming the read.",
    agent=researcher,
)

crew = Crew(agents=[researcher], tasks=[task], process=Process.sequential)
crew.kickoff()
```

## Single tool (legacy)

If you only need secret fetch, `OneclawVaultTool` still accepts explicit `agent_id`, `api_key`, and `vault_id`:

```python
from oneclaw_crewai import OneclawVaultTool

vault_tool = OneclawVaultTool(
    agent_id=os.environ["ONECLAW_AGENT_ID"],
    api_key=os.environ["ONECLAW_AGENT_API_KEY"],
    vault_id=os.environ["ONECLAW_VAULT_ID"],
)
```

## Security notes

- Tool return values can contain plaintext credentials. Do not log crew output in production.
- Set `verbose=False` on agents in production. CrewAI prints tool results to stdout when verbose is on.
- All tools disable CrewAI result caching so rotated secrets are not served from a stale cache.

## Links

- PyPI: [1claw-crewai-tools](https://pypi.org/project/1claw-crewai-tools/)
- Source: [github.com/1clawAI/1claw-crewai-tools](https://github.com/1clawAI/1claw-crewai-tools)
- Broader framework guide: [Agent frameworks](/docs/integrations/agent-frameworks)
