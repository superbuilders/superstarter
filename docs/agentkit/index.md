---
title: AgentKit Documentation
---

# AgentKit Documentation

*46 pages scraped on 2026-02-17*

| Section | Pages |
| --- | --- |
| advanced-patterns | 7 |
| changelog | 1 |
| concepts | 9 |
| examples | 1 |
| getting-started | 3 |
| guided-tour | 4 |
| integrations | 4 |
| overview | 1 |
| reference | 11 |
| streaming | 5 |

---

## advanced-patterns

- [Human in the Loop](./advanced-patterns/human-in-the-loop.md) — Enable your Agents to wait for human input.
- [UI Streaming with useAgent](./advanced-patterns/legacy-ui-streaming.md) — Stream AgentKit events to your UI with the useAgent hook.
- [MCP as tools](./advanced-patterns/mcp.md) — Provide your Agents with MCP Servers as tools
- [Multi-steps tools](./advanced-patterns/multi-steps-tools.md) — Use multi-steps tools to create more complex Agents.
- [Configuring Multi-tenancy](./advanced-patterns/multitenancy.md) — Configure capacity based on users or organizations.
- [Configuring Retries](./advanced-patterns/retries.md) — Configure retries for your AgentKit network Agents and Tool calls.
- [Deterministic state routing](./advanced-patterns/routing.md) — State based routing in Agent Networks

## changelog

- [Changelog](./changelog/overview.md) — Recent releases, new features, and fixes.

## concepts

- [Agents](./concepts/agents.md) — Create agents to accomplish specific tasks with tools inside a network.
- [Deployment](./concepts/deployment.md) — Deploy your AgentKit networks to production.
- [History](./concepts/history.md) — Learn how to persist conversations for your agents and networks
- [Memory](./concepts/memory.md) — Learn how to give your agents long-term, reflective memory using Mem0.
- [Models](./concepts/models.md) — Leverage different provider's models across Agents.
- [Networks](./concepts/networks.md) — Combine one or more agents into a Network.
- [Routers](./concepts/routers.md) — Customize how calls are routed between Agents in a Network.
- [State](./concepts/state.md) — Shared memory, history, and key-value state for Agents and Networks.
- [Tools](./concepts/tools.md) — Extending the functionality of Agents for structured output or performing tasks.

## examples

- [Examples](./examples/overview.md)

## getting-started

- [Installation](./getting-started/installation.md) — How to install AgentKit
- [Local development](./getting-started/local-development.md) — Run AgentKit locally with live traces and logs.
- [Quick start](./getting-started/quick-start.md) — Learn the basics of AgentKit in a few minutes.

## guided-tour

- [Code Assistant v2: Complex code analysis](./guided-tour/agentic-workflows.md) — Use AgentKit Tools and Custom Router to add agentic capabilities.
- [Code Assistant v3: Autonomous Bug Solver](./guided-tour/ai-agents.md) — Build a custom Agent Router to autonomously solve bugs.
- [Code Assistant v1: Explaining a given code file](./guided-tour/ai-workflows.md) — Leveraging AgentKit's Agent concept to power a RAG workflow.
- [The three levels of AI apps](./guided-tour/overview.md) — A comprehensive guide to building AI Agents with AgentKit

## integrations

- [Using AgentKit with Browserbase](./integrations/browserbase.md) — Develop AI Agents that can browse the web
- [Using AgentKit with Daytona](./integrations/daytona.md) — Build Coding Agents with Daytona's secure and elastic infrastructure for executing AI-generated code
- [Using AgentKit with E2B](./integrations/e2b.md) — Develop Coding Agents using E2B Sandboxes as tools
- [Smithery - MCP Registry](./integrations/smithery.md) — Provide your Agents with hundred of prebuilt tools to interact with

## overview

- [AgentKit](./overview.md) — A TypeScript library to create and orchestrate AI Agents.

## reference

- [createAgent](./reference/create-agent.md) — Define an agent
- [createNetwork](./reference/create-network.md) — Define a network
- [createTool](./reference/create-tool.md) — Provide tools to an agent
- [Introduction](./reference/introduction.md) — SDK Reference
- [Anthropic Model](./reference/model-anthropic.md) — Configure Anthropic as your model provider
- [Gemini Model](./reference/model-gemini.md) — Configure Google Gemini as your model provider
- [Grok Model](./reference/model-grok.md) — Configure Grok as your model provider
- [OpenAI Model](./reference/model-openai.md) — Configure OpenAI as your model provider
- [Network Router](./reference/network-router.md) — Controlling the flow of execution between agents in a Network.
- [createState](./reference/state.md) — Leverage a Network's State across Routers and Agents.
- [useAgent](./reference/use-agent.md) — React hook for building real-time, multi-threaded AI applications

## streaming

- [Events](./streaming/events.md)
- [Overview](./streaming/overview.md) — Realtime event streaming with AgentKit + useAgent
- [Provider](./streaming/provider.md) — A deep dive into the provider for streaming agents
- [Transport](./streaming/transport.md) — A deep dive into the transport layer for streaming agents
- [Usage Guide](./streaming/usage-guide.md) — A deep dive into streaming agents

