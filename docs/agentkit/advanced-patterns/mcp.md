# MCP as tools

> Provide your Agents with MCP Servers as tools

AgentKit supports using [Claude's Model Context Protocol](https://modelcontextprotocol.io/) as tools.

Using MCP as tools allows you to use any MCP server as a tool in your AgentKit network, enabling your Agent
to access thousands of pre-built tools to interact with. Our integration with [Smithery](https://smithery.ai/)
provides a registry of MCP servers for common use cases, with more than 2,000 servers across multiple use cases.

## Using MCP as tools

AgentKit supports configuring MCP servers via `Streamable HTTP`, `SSE` or `WS` transports:

  ```ts Self-hosted MCP server theme={"system"}
  import { createAgent } from "@inngest/agent-kit";

  const neonAgent = createAgent({
    name: "neon-agent",
    system: `You are a helpful assistant that help manage a Neon account.
    `,
    mcpServers: [
      {
        name: "neon",
        transport: {
          type: "ws",
          url: "ws://localhost:8080",
        },
      },
    ],
  });
  ```

  ```ts Smithery MCP server theme={"system"}
  import { createAgent } from "@inngest/agent-kit";
  import { createSmitheryUrl } from "@smithery/sdk/config.js";

  const smitheryUrl = createSmitheryUrl("https://server.smithery.ai/neon/ws", {
    neonApiKey: process.env.NEON_API_KEY,
  });

  const neonAgent = createAgent({
    name: "neon-agent",
    system: `You are a helpful assistant that help manage a Neon account.
    `,
    mcpServers: [
      {
        name: "neon",
        transport: {
          type: "streamable-http",
          url: neonServerUrl.toString(),
        },
      },
    ],
  });
  ```

## `mcpServers` reference

The `mcpServers` parameter allows you to configure Model Context Protocol servers that provide tools for your agent. AgentKit automatically fetches the list of available tools from these servers and makes them available to your agent.

**mcpServers** `MCP.Server[]`
  An array of MCP server configurations.

### MCP.Server

**name** `string` *(required)*
  A short name for the MCP server (e.g., "github", "neon"). This name is used to
  namespace tools for each MCP server. Tools from this server will be prefixed
  with this name (e.g., "neon-createBranch").

**transport** `TransportSSE | TransportWebsocket` *(required)*
  The transport configuration for connecting to the MCP server.

### TransportSSE

**type** `'sse'` *(required)*
  Specifies that the transport is Server-Sent Events.

**url** `string` *(required)*
  The URL of the SSE endpoint.

**eventSourceInit** `EventSourceInit`
  Optional configuration for the EventSource.

**requestInit** `RequestInit`
  Optional request configuration.

### TransportWebsocket

**type** `'ws'` *(required)*
  Specifies that the transport is WebSocket.

**url** `string` *(required)*
  The WebSocket URL of the MCP server.

## Examples

  This examples shows how to use the [Neon MCP Smithery Server](https://smithery.ai/server/neon/) to build a Neon Assistant Agent that can help you manage your Neon databases.

  {" "}

  {" "}

  <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">
    Agents
  </span>

  <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">
    Tools
  </span>

  <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">
    Network
  </span>

  <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">
    Integrations
  </span>

  <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">
    Code-based Router
  </span>
