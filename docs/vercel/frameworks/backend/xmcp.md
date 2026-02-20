---
title: xmcp on Vercel
product: vercel
url: /docs/frameworks/backend/xmcp
type: how-to
prerequisites:
  - /docs/frameworks/backend
  - /docs/frameworks
related:
  - /docs/cli
  - /docs/cli/init
  - /docs/routing-middleware
  - /docs/functions
  - /docs/fluid-compute
summary: Build MCP-compatible backends with xmcp and deploy to Vercel. Learn the project structure, tool format, middleware, and how to run locally and in...
---

# xmcp on Vercel

`xmcp` is a TypeScript-first framework for building MCP-compatible backends. It provides an opinionated project structure, automatic tool discovery, and a streamlined middleware layer for request/response processing. You can deploy an xmcp app to Vercel with zero configuration.

## Get started with xmcp on Vercel

Start with xmcp on Vercel by creating a new xmcp project:

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

This scaffolds a project with a `src/tools/` directory for tools, optional `src/middleware.ts`, and an `xmcp.config.ts` file.

To deploy, [connect your Git repository](/new) or [use Vercel CLI](/docs/cli):

```bash filename="terminal"
vc deploy
```

### Get started with Vercel CLI

Get started by initializing a new Xmcp project using [Vercel CLI init command](/docs/cli/init):

```bash filename="terminal"
vc init xmcp
```

This will clone the [Xmcp example repository](https://github.com/vercel/vercel/tree/main/examples/xmcp) in a directory called `xmcp`.

## Local development

To run your xmcp application locally, you can use [Vercel CLI](https://vercel.com/docs/cli/dev):

```bash filename="terminal"
vc dev
```

Alternatively, use your project's dev script:

```bash filename="terminal"
npm run dev
yarn dev
pnpm run dev
```

## Middleware

### xmcp Middleware

In xmcp, an optional `middleware.ts` lets you run code before and after tool execution. This is commonly used for logging, auth, or request shaping:

```ts filename="src/middleware.ts" framework="xmcp"
import { type Middleware } from 'xmcp';

const middleware: Middleware = async (req, res, next) => {
  // Custom processing
  next();
};

export default middleware;
```

### Vercel Routing Middleware

In Vercel, [Routing Middleware](/docs/routing-middleware) executes before a request is processed by your application. Use it for rewrites, redirects, headers, or personalization, and combine it with xmcp's own middleware as needed.

## Vercel Functions

When you deploy an xmcp app to Vercel, your server endpoints automatically run as [Vercel Functions](/docs/functions) and use [Fluid compute](/docs/fluid-compute) by default.

## More resources

- [xmcp documentation](https://xmcp.dev/docs)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)


---

[View full sitemap](/docs/sitemap)
