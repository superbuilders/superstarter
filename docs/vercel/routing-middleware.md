---
title: Routing Middleware
product: vercel
url: /docs/routing-middleware
type: conceptual
prerequisites:
  []
related:
  - /docs/fluid-compute
  - /docs/functions/runtimes/edge
  - /docs/frameworks
  - /docs/regions
  - /docs/edge-config
summary: Learn how you can use Routing Middleware, code that executes before a request is processed on a site, to provide speed and personalization to your...
---

# Routing Middleware

> **🔒 Permissions Required**: Routing Middleware

Routing Middleware **executes code *before* a request is processed on a site**, and are built on top of [fluid compute](/docs/fluid-compute). Based on the request, you can modify the response.

Because it runs globally before the cache, Routing Middleware is an effective way of providing personalization to statically generated content. Depending on the incoming request, you can execute custom logic, rewrite, redirect, add headers and more, before returning a response.

The default runtime for Routing Middlewares is [Edge](/docs/functions/runtimes/edge). See [runtime options](#runtime-options) for information on how to change the runtime of your Routing Middleware.

> For \['nextjs', 'nextjs-app']:

## Creating a Routing Middleware

You can use Routing Middleware with [**any framework**](/docs/frameworks). To add a Routing Middleware to your app, you need to create a  file at your project's root directory.

```ts v0="build" filename="middleware.ts" framework=all
export default function middleware(request: Request) {
  const url = new URL(request.url);

  // Redirect old paths
  if (url.pathname === '/old-page') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/new-page' },
    });
  }

  // Continue to next handler
  return new Response('Hello from your Middleware!');
}
```

```js v0="build" filename="middleware.js" framework=all
export default function middleware(request) {
  const url = new URL(request.url);

  // Redirect old paths
  if (url.pathname === '/old-page') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/new-page' },
    });
  }

  // Continue to next handler
  return new Response('Hello from your Middleware!');
}
```

> For \['nextjs', 'nextjs-app']:

## Logging

Routing Middleware has full support for the [`console`](https://developer.mozilla.org/docs/Web/API/Console) API, including `time`, `debug`, `timeEnd`. Logs will appear inside your Vercel project by clicking **View Functions Logs** next to the deployment.

## Using a database with Routing Middleware

If your Routing Middleware depends on a database far away from one of [our supported regions](/docs/regions), the overall latency of API requests could be slower than expected, due to network latency while connecting to the database from an edge region. To avoid this issue, use a global database. Vercel has multiple global storage products, including [Edge Config](/docs/edge-config) and [Vercel Blob](/docs/storage/vercel-blob). You can also explore the storage category of the [Vercel Marketplace](/marketplace?category=storage) to learn which option is best for you.

## Limits on requests

The following limits apply to requests processed by Routing Middleware:

| Name                              | Limit |
| --------------------------------- | ----- |
| Maximum URL length                | 14 KB |
| Maximum request body length       | 4 MB  |
| Maximum number of request headers | 64    |
| Maximum request headers length    | 16 KB |

## Runtime options

Routing Middleware is available on the [Node.js](/docs/functions/runtimes/node-js), [Bun](/docs/functions/runtimes/bun), and [Edge](/docs/functions/runtimes/edge) runtimes. The default runtime for Routing Middleware is Edge. You can change the runtime to Node.js by exporting a [`config`](/docs/routing-middleware/api#config-object) object with a `runtime` property in your  file.

To use the Bun runtime, set [`bunVersion`](/docs/project-configuration#bunversion) in your `vercel.json` file and your runtime config to `nodejs`.

```ts filename="middleware.ts" framework=nextjs-app
export const config = {
  runtime: 'nodejs', // or 'edge' (default)
};
export default function middleware(request: Request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

```js filename="middleware.js" framework=nextjs-app
export const config = {
  runtime: 'nodejs' // or 'edge' (default)
}
export default function middleware(request: Request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

```ts filename="middleware.ts" framework=nextjs
export const config = {
  runtime: 'nodejs', // or 'edge' (default)
};
export default function middleware(request: Request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

```js filename="middleware.js" framework=nextjs
export const config = {
  runtime: 'nodejs', // or 'edge' (default)
};
export default function middleware(request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

```ts filename="middleware.ts" framework=other
export const config = {
  runtime: 'nodejs', // or 'edge' (default)
};
export default function middleware(request: Request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

```js filename="middleware.js" framework=other
export const config = {
  runtime: 'nodejs' // or 'edge' (default)
}
export default function middleware(request: Request) {
  // Your middleware logic here
  return new Response('Hello from your Middleware!');
}
```

## Pricing

Routing Middleware is priced using the [fluid compute](/docs/fluid-compute) model, which means you are charged by the amount of compute resources used by your Routing Middleware. See the [fluid compute pricing documentation](/docs/functions/usage-and-pricing) for more information.

## Observability

The [Vercel Observability dashboard](/docs/observability) provides visibility into your routing middleware usage, including invocation counts and performance metrics. You can get more [insights](/docs/observability/insights) with [Observability Plus](/docs/observability/observability-plus):

- Analyze invocations by request path
- Break down actions by type, such as redirects or rewrites
- View rewrite targets and frequency
- Use the query builder for custom insights

## More resources

Learn more about Routing Middleware by exploring the following resources:

- [Getting Started with Routing Middleware](/docs/routing-middleware/getting-started)
- [Routing Middleware API Reference](/docs/routing-middleware/api)
- [Fluid compute](/docs/fluid-compute)
- [Runtimes](/docs/functions/runtimes)


---

[View full sitemap](/docs/sitemap)
