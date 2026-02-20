---
title: Deploy MCP servers to Vercel
product: vercel
url: /docs/mcp/deploy-mcp-servers-to-vercel
type: integration
prerequisites:
  - /docs/mcp
related:
  - /docs/functions
  - /docs/fluid-compute
  - /docs/getting-started-with-vercel/fundamental-concepts/what-is-compute
  - /docs/instant-rollback
  - /docs/deployment-protection
summary: Learn how to deploy Model Context Protocol (MCP) servers on Vercel with OAuth authentication and efficient scaling.
---

# Deploy MCP servers to Vercel

Deploy your Model Context Protocol (MCP) servers on Vercel to [take advantage of features](/docs/mcp/deploy-mcp-servers-to-vercel#deploy-mcp-servers-efficiently) like [Vercel Functions](/docs/functions), [OAuth](/docs/mcp/deploy-mcp-servers-to-vercel#enabling-authorization), and [efficient scaling](/docs/fluid-compute) for AI applications.

- Get started with [deploying MCP servers on Vercel](#deploy-an-mcp-server-on-vercel)
- Learn how to [enable authorization](#enabling-authorization) to secure your MCP server

## Deploy MCP servers efficiently

Vercel provides the following features for production MCP deployments:

- **Optimized cost and performance**: [Vercel Functions](/docs/functions) with [Fluid compute](/docs/fluid-compute) handle MCP servers' irregular usage patterns (long idle times, quick message bursts, heavy AI workloads) through [optimized concurrency](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute#optimized-concurrency), [dynamic scaling](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute#dynamic-scaling), and [instance sharing](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute#compute-instance-sharing). You only pay for compute resources you actually use with minimal idle time.
- [**Instant Rollback**](/docs/instant-rollback): Quickly revert to previous production deployments if issues arise with your MCP server.
- [**Preview deployments with Deployment Protection**](/docs/deployment-protection): Secure your preview MCP servers and test changes safely before production
- [**Vercel Firewall**](/docs/vercel-firewall): Protect your MCP servers from malicious attacks and unauthorized access with multi-layered security
- [**Rolling Releases**](/docs/rolling-releases): Gradually roll out new MCP server deployments to a fraction of users before promoting to everyone

## Deploy an MCP server on Vercel

Use the `mcp-handler` package and create the following API route to host an MCP server that provides a single tool that rolls a dice.

```ts filename="app/api/mcp/route.ts"
import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      },
    );
  },
  {},
  { basePath: '/api' },
);

export { handler as GET, handler as POST, handler as DELETE };
```

### Test the MCP server locally

This assumes that your MCP server application, with the above-mentioned API route, runs locally at `http://localhost:3000`.

1. Run the MCP inspector:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i 
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i 
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i 
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i 
    ```
  </Code>
</CodeBlock>

2. Open the inspector interface:
   - Browse to `http://127.0.0.1:6274` where the inspector runs by default
3. Connect to your MCP server:
   - Select **Streamable HTTP** in the drop-down on the left
   - In the **URL** field, use `http://localhost:3000/api/mcp`
   - Expand **Configuration**
   - In the **Proxy Session Token** field, paste the token from the terminal where your MCP server is running
   - Click **Connect**
4. Test the tools:
   - Click **List Tools** under Tools
   - Click on the `roll_dice` tool
   - Test it through the available options on the right of the tools section

When you deploy your application on Vercel, you will get a URL such as `https://my-mcp-server.vercel.app`.

### Configure an MCP host

Using [Cursor](https://www.cursor.com/), add the URL of your MCP server to the [configuration file](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers) in [Streamable HTTP transport format](https://modelcontextprotocol.io/docs/concepts/transports#streamable-http).

```json filename=".cursor/mcp.json"
{
  "mcpServers": {
    "server-name": {
      "url": "https://my-mcp-server.vercel.app/api/mcp"
    }
  }
}
```

You can now use your MCP roll dice tool in [Cursor's AI chat](https://docs.cursor.com/context/model-context-protocol#using-mcp-in-chat) or any other MCP client.

## Enabling authorization

The `mcp-handler` provides built-in OAuth support to secure your MCP server.
This ensures that only authorized clients with valid tokens can access your tools.

### Secure your server with OAuth

To add OAuth authorization to [the MCP server you created in the previous section](#deploy-an-mcp-server-on-vercel):

1. Use the `withMcpAuth` function to wrap your MCP handler
2. Implement token verification logic
3. Configure required scopes and metadata path

```typescript filename="app/api/[transport]/route.ts"
import { withMcpAuth } from 'mcp-handler';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

const handler = createMcpHandler(/* ... same configuration as above ... */);

const verifyToken = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const isValid = bearerToken === '123';
  if (!isValid) return undefined;

  return {
    token: bearerToken,
    scopes: ['read:stuff'],
    clientId: 'user123',
    extra: {
      userId: '123',
    },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['read:stuff'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };
```

### Expose OAuth metadata endpoint

To comply with the MCP specification, your server must expose a [metadata endpoint](https://modelcontextprotocol.io/specification/draft/basic/authorization#authorization-server-discovery) that provides OAuth configuration details.
Among other things, this endpoint allows MCP clients to discover, how to authorize with your server, which authorization servers can issue valid tokens,
and what scopes are supported.

#### How to add OAuth metadata endpoint

1. In your `app/` directory, create a `.well-known` folder.
2. Inside this directory, create a subdirectory called `oauth-protected-resource`.
3. In this subdirectory, create a `route.ts` file with the following code for that specific route.
4. Replace the `https://example-authorization-server-issuer.com` URL with your own [Authorization Server (AS) Issuer URL](https://datatracker.ietf.org/doc/html/rfc9728#name-protected-resource-metadata).

```typescript filename="app/.well-known/oauth-protected-resource/route.ts"
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

const handler = protectedResourceHandler({
  authServerUrls: ['https://example-authorization-server-issuer.com'],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

To view the full list of values available to be returned in the OAuth Protected Resource Metadata JSON, see the protected resource metadata [RFC](https://datatracker.ietf.org/doc/html/rfc9728#name-protected-resource-metadata).

MCP clients that are compliant with the latest version of the MCP spec can now securely connect and invoke tools defined in your MCP server, when provided with a valid OAuth token.

## More resources

Learn how to deploy MCP servers on Vercel, connect to them using the AI SDK, and explore curated lists of public MCP servers.

- [Deploy an MCP server with Next.js on Vercel](https://vercel.com/templates/ai/model-context-protocol-mcp-with-next-js)
- [Deploy an MCP server with Vercel Functions](https://vercel.com/templates/other/model-context-protocol-mcp-with-vercel-functions)
- [Deploy an xmcp server](https://vercel.com/templates/backend/xmcp-boilerplate)
- [Learn about MCP server support on Vercel](https://vercel.com/changelog/mcp-server-support-on-vercel)
- [Use the AI SDK to initialize an MCP client on your MCP host to connect to an MCP server](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client)
- [Use the AI SDK to call tools that an MCP server provides](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#using-mcp-tools)
- [Explore the list from MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [Explore the list from awesome MCP servers](https://github.com/punkpeye/awesome-mcp-servers)


---

[View full sitemap](/docs/sitemap)
