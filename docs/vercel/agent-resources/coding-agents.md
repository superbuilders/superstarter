---
title: Coding Agents
product: vercel
url: /docs/agent-resources/coding-agents
type: conceptual
prerequisites:
  - /docs/agent-resources
related:
  - /docs/agent-resources/coding-agents/claude-code
  - /docs/agent-resources/coding-agents/opencode
  - /docs/agent-resources/coding-agents/blackbox
  - /docs/agent-resources/coding-agents/cline
  - /docs/agent-resources/coding-agents/roo-code
summary: Learn about coding agents on Vercel.
---

# Coding Agents

AI coding agents are transforming how developers write, debug, and refactor code. Route these agents through AI Gateway to get a single dashboard for spend tracking, access to any model, and automatic fallbacks, all while using the familiar interfaces of your favorite tools.

## Why route coding agents here?

| Benefit            | Without                              | With                            |
| ------------------ | ------------------------------------ | ------------------------------- |
| **Spend tracking** | Separate dashboards per provider     | Single unified view             |
| **Model access**   | Limited to agent's default models    | 200+ models from all providers  |
| **Billing**        | Multiple invoices, multiple accounts | One Vercel invoice              |
| **Reliability**    | Single point of failure              | Automatic provider fallbacks    |
| **Observability**  | Limited or no visibility             | Full request traces and metrics |

## Supported agents

### Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's agentic coding tool for the terminal. Configure it with environment variables:

```bash
export ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh"
export ANTHROPIC_API_KEY="your-ai-gateway-api-key"
```

Once configured, Claude Code works exactly as before, but requests route through the gateway.

See the [Claude Code documentation](/docs/agent-resources/coding-agents/claude-code) for advanced configuration.

### OpenCode

[OpenCode](https://github.com/opencode-ai/opencode) is an open-source, terminal-based AI coding assistant with native support. Connect directly from within the tool:

```bash
opencode
> /connect
# Select "Vercel AI Gateway" and enter your API key
```

OpenCode automatically discovers available models and lets you switch between them on the fly.

See the [OpenCode documentation](/docs/agent-resources/coding-agents/opencode) for more features.

### Blackbox AI

[Blackbox AI](https://blackbox.ai) is a terminal-based CLI for AI-powered code generation and debugging. Configure it with the interactive setup:

```bash
blackbox configure
# Select "Configure Providers", choose "Vercel AI Gateway", and enter your API key
```

See the [Blackbox AI documentation](/docs/agent-resources/coding-agents/blackbox) for installation and setup.

### Cline

[Cline](https://cline.bot) is a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) that provides autonomous coding assistance. Configure it directly in VS Code:

1. Open the Cline settings panel
2. Select **Vercel AI Gateway** as your API Provider
3. Paste your API key
4. Choose a model from the auto-populated catalog

Cline tracks detailed metrics including reasoning tokens, cache performance, and latency.

See the [Cline documentation](/docs/agent-resources/coding-agents/cline) for troubleshooting tips.

### Roo Code

[Roo Code](https://roocode.com) is a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline) that brings AI assistance directly into your editor. Configure it through the settings panel:

1. Click the gear icon in the Roo Code panel
2. Select **Vercel AI Gateway** as your provider
3. Enter your API key
4. Choose from hundreds of available models

Roo Code includes prompt caching support for Claude and GPT models to reduce costs.

See the [Roo Code documentation](/docs/agent-resources/coding-agents/roo-code) for setup details.

### Conductor

[Conductor](https://conductor.build) is a Mac app that lets you run multiple Claude Code agents in parallel, each with an isolated copy of your codebase. Configure it through the settings panel:

1. Go to **Settings** -> **Env**
2. Add the environment variables under **Claude Code**
3. Set `ANTHROPIC_BASE_URL` to `https://ai-gateway.vercel.sh`

Conductor lets you review and merge changes from multiple agents in one place.

See the [Conductor documentation](/docs/agent-resources/coding-agents/conductor) for setup details.

### Crush

[Crush](https://github.com/charmbracelet/crush) is a terminal-based AI coding assistant by Charmbracelet with LSP integration and MCP support. Configure it interactively:

```bash
crush
# Select "Vercel AI Gateway", choose a model, and enter your API Key
```

See the [Crush documentation](/docs/agent-resources/coding-agents/crush) for installation options.

## Getting started

1. **Get an API key**: Create one in the [AI Gateway page](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=AI+Gateway)
2. **Choose your agent**: Pick from Claude Code, OpenCode, Blackbox AI, Cline, Roo Code, Conductor, or Crush
3. **Configure the connection**: Point the agent to `https://ai-gateway.vercel.sh`
4. **Start coding**: Use the agent as normal - all requests route through the gateway

## Monitoring usage

Once your coding agents are connected, view usage in the [Observability tab](https://vercel.com/dashboard/observability):

- **Spend by agent**: See how much each tool costs
- **Model usage**: Track which models your agents use most
- **Request traces**: Debug issues with full request/response logs

## Next steps

- [Set up Claude Code](/docs/agent-resources/coding-agents/claude-code)
- [Try OpenCode](/docs/agent-resources/coding-agents/opencode) for native integration
- [Set up Blackbox AI](/docs/agent-resources/coding-agents/blackbox) CLI for code generation
- [Configure Cline](/docs/agent-resources/coding-agents/cline) for autonomous coding assistance
- [Install Roo Code](/docs/agent-resources/coding-agents/roo-code) as a VS Code extension
- [Configure Conductor](/docs/agent-resources/coding-agents/conductor) for parallel agents
- [Configure Crush](/docs/agent-resources/coding-agents/crush) for LSP-enhanced coding


---

[View full sitemap](/docs/sitemap)
