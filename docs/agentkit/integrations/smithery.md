# Smithery - MCP Registry

> Provide your Agents with hundred of prebuilt tools to interact with

[Smithery](https://smithery.ai/) is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/introduction)) servers registry, listing more than 2,000 MCP servers across multiple use cases:

* Code related tasks (ex: GitHub, [E2B](/integrations/e2b))
* Web Search Integration (ex: Brave, [Browserbase](/integrations/browserbase))
* Database Integration (ex: Neon, Supabase)
* Financial Market Data
* Data & App Analysis
* And more...

## Adding a Smithery MCP Server to your Agent

    Within an existing project, install AgentKit along with the Smithery SDK:

      ```shell npm theme={"system"}
      npm install @inngest/agent-kit inngest @smithery/sdk
      ```

      ```shell pnpm theme={"system"}
      pnpm install @inngest/agent-kit inngest @smithery/sdk
      ```

      ```shell yarn theme={"system"}
      yarn add @inngest/agent-kit inngest @smithery/sdk
      ```

      To create a new project, create a new directory then initialize using your package manager:

        ```shell npm theme={"system"}
        mkdir my-agent-kit-project && npm init
        ```

        ```shell pnpm theme={"system"}
        mkdir my-agent-kit-project && pnpm init
        ```

        ```shell yarn theme={"system"}
        mkdir my-agent-kit-project && yarn init
        ```

    Create an Agent and its associated Network, for example a Neon Assistant Agent:

    ```typescript  theme={"system"}
    import { z } from "zod";
    import {
      anthropic,
      createAgent,
      createNetwork,
      createTool,
    } from "@inngest/agent-kit";

    const neonAgent = createAgent({
      name: "neon-agent",
      system: `You are a helpful assistant that help manage a Neon account.
      IMPORTANT: Call the 'done' tool when the question is answered.
      `,
      tools: [
        createTool({
          name: "done",
          description: "Call this tool when you are finished with the task.",
          parameters: z.object({
            answer: z.string().describe("Answer to the user's question."),
          }),
          handler: async ({ answer }, { network }) => {
            network?.state.kv.set("answer", answer);
          },
        }),
      ],
    });

    const neonAgentNetwork = createNetwork({
      name: "neon-agent",
      agents: [neonAgent],
      defaultModel: anthropic({
        model: "claude-3-5-sonnet-20240620",
        defaultParameters: {
          max_tokens: 1000,
        },
      }),
      router: ({ network }) => {
        if (!network?.state.kv.get("answer")) {
          return neonAgent;
        }
        return;
      },
    });
    ```

    Add the [Neon MCP Smithery Server](https://smithery.ai/server/neon/) to your Agent by using `createSmitheryUrl()` from the `@smithery/sdk/config.js` module
    and providing it to the Agent via the `mcpServers` option:

    ```typescript {7, 10-12, 31-39} theme={"system"}
    import {
      anthropic,
      createAgent,
      createNetwork,
      createTool,
    } from "@inngest/agent-kit";
    import { createSmitheryUrl } from "@smithery/sdk/config.js";
    import { z } from "zod";

    const smitheryUrl = createSmitheryUrl("https://server.smithery.ai/neon/ws", {
      neonApiKey: process.env.NEON_API_KEY,
    });

    const neonAgent = createAgent({
      name: "neon-agent",
      system: `You are a helpful assistant that help manage a Neon account.
      IMPORTANT: Call the 'done' tool when the question is answered.
      `,
      tools: [
        createTool({
          name: "done",
          description: "Call this tool when you are finished with the task.",
          parameters: z.object({
            answer: z.string().describe("Answer to the user's question."),
          }),
          handler: async ({ answer }, { network }) => {
            network?.state.kv.set("answer", answer);
          },
        }),
      ],
      mcpServers: [
        {
          name: "neon",
          transport: {
            type: "ws",
            url: smitheryUrl.toString(),
          },
        },
      ],
    });

    const neonAgentNetwork = createNetwork({
      name: "neon-agent",
      agents: [neonAgent],
      defaultModel: anthropic({
        model: "claude-3-5-sonnet-20240620",
        defaultParameters: {
          max_tokens: 1000,
        },
      }),
      router: ({ network }) => {
        if (!network?.state.kv.get("answer")) {
          return neonAgent;
        }
        return;
      },
    });
    ```

      Integrating Smithery with AgentKit requires using the `createSmitheryUrl()` function to create a valid URL for the MCP server.

      Most Smithery servers instruct to use the `createTransport()` function which is not supported by AgentKit.
      To use the `createSmitheryUrl()` function, simply append `/ws` to the end of the Smithery server URL provided by Smithery.

You will find the complete example on GitHub:

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
