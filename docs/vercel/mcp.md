---
title: Model Context Protocol
product: vercel
url: /docs/mcp
type: integration
prerequisites:
  []
related:
  - /docs/mcp/deploy-mcp-servers-to-vercel
  - /docs/agent-resources/vercel-mcp
summary: Learn more about MCP and how you can use it on Vercel.
---

# Model Context Protocol

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is a standard interface that lets large language models (LLMs) communicate with external tools and data sources. It allows developers and tool providers to integrate once and interoperate with any MCP-compatible system.

- [Get started with deploying MCP servers on Vercel](/docs/mcp/deploy-mcp-servers-to-vercel)
- Try out [Vercel's MCP server](/docs/agent-resources/vercel-mcp)

## Connecting LLMs to external systems

LLMs don't have access to real-time or external data by default. To provide relevant context—such as current financial data, pricing, or user-specific data—developers must connect LLMs to external systems.

Each tool or service has its own API, schema, and authentication. Managing these differences becomes difficult and error-prone as the number of integrations grows.

## Standardizing LLM interaction with MCP

MCP standardizes the way LLMs interact with tools and data sources. Developers implement a single integration with MCP, and use it to manage communication with any compatible service.

Tool and data providers only need to expose an MCP interface once. After that, their system can be accessed by any MCP-enabled application.

MCP is like the USB-C standard: instead of needing different connectors for every device, you use one port to handle many types of connections.

## MCP servers, hosts and clients

MCP uses a client-server architecture for the AI model to external system communication. The user connects to the AI application, referred to as the MCP host, such as IDEs like Cursor, AI chat apps like ChatGPT or AI agents. To connect to external services, the host creates one connection, referred to as the MCP client, to one external service, referred to as the MCP server. Therefore, to connect to multiple MCP servers, one host needs to open and manage multiple MCP clients.

## More resources

Learn more about Model Context Protocol and explore available MCP servers.

- [Deploy your own MCP servers on Vercel](/docs/mcp/deploy-mcp-servers-to-vercel)
- [Use the AI SDK to initialize an MCP client on your MCP host to connect to an MCP server](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client)
- [Use the AI SDK to call tools that an MCP server provides](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#using-mcp-tools)
- [Use Vercel's MCP server](/docs/agent-resources/vercel-mcp)
- [Explore the list from MCP servers repository](https://github.com/modelcontextprotocol/servers)


---

[View full sitemap](/docs/sitemap)
