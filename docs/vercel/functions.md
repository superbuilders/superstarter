---
title: Vercel Functions
product: vercel
url: /docs/functions
type: conceptual
prerequisites:
  []
related:
  - /docs/fluid-compute
  - /docs/frameworks
  - /docs/cdn
  - /docs/functions/functions-api-reference
  - /docs/functions/functions-api-reference?framework=nextjs
summary: Vercel Functions allow you to run server-side code without managing a server.
---

# Vercel Functions

Vercel Functions lets you run server-side code without managing servers. They adapt automatically to user demand, handle connections to APIs and databases, and offer enhanced concurrency through [fluid compute](/docs/fluid-compute), which is useful for AI workloads or any [I/O-bound](# "What does I/O bound mean?") tasks that require efficient scaling

When you deploy your application, Vercel automatically sets up the tools and optimizations for your chosen [framework](/docs/frameworks). It ensures low latency by routing traffic through Vercel's [CDN](/docs/cdn), and placing your functions in a specific region when you need more control over [data locality](/docs/functions#functions-and-your-data-source).

![Image](https://vercel.com/front/docs/vercel-functions/first_image_light.png)

## Getting started

To get started with creating your first function, copy the code below:

```ts filename="api/hello.ts" framework=all
export default {
  fetch(request: Request) {
    return new Response('Hello from Vercel!');
  },
};
```

```js filename="api/hello.js" framework=all
export default {
  fetch(request) {
    return new Response('Hello from Vercel!');
  },
};
```

While using `fetch` is the recommended way to create a Vercel Function, you can still use HTTP methods like `GET` and `POST`.

```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs-app
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="app/api/hello/route.js" framework=nextjs-app
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts v0="build" filename="pages/api/hello.ts" framework=nextjs
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="pages/api/hello.js" framework=nextjs
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts filename="api/hello.ts" framework=other
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js filename="api/hello.js" framework=other
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

> For \['nextjs']:

When using Next.js Pages, we recommend using [Route Handlers in the App Router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers "Route Handlers"). This enables you to use the [Vercel Functions Web Signature](/docs/functions/functions-api-reference#function-signature), which allows you to use a common signature, a common standard for creating APIs, and stream responses. See the [Functions API Reference](/docs/functions/functions-api-reference?framework=nextjs#config-object) for information on other available options for creating a function with Next.js Pages.

To learn more, see the [quickstart](/docs/functions/quickstart) or [deploy a template](/templates).

## Functions lifecycle

Vercel Functions run in a single [region](/docs/functions/configuring-functions/region) by default, although you can configure them to run in multiple regions if you have globally replicated data. These functions let you add extra capabilities to your application, such as handling authentication, streaming data, or querying databases.

When a user sends a request to your site, Vercel can automatically run a function based on your application code. You do not need to manage servers, or handle scaling.

Vercel creates a new function invocation for each incoming request. If another request arrives soon after the previous one, Vercel [reuses the same function](/docs/fluid-compute#optimized-concurrency) instance to optimize performance and cost efficiency. Over time, Vercel only keeps as many active functions as needed to handle your traffic. Vercel scales your functions down to zero when there are no incoming requests.

By allowing concurrent execution within the same instance (and so using idle time for compute), fluid compute reduces cold starts, lowers latency, and saves on compute costs. It also prevents the need to spin up multiple isolated instances when tasks spend most of their time waiting for external operations.

### Functions and your data source

**Functions** should always execute close to where your data source is to reduce latency. By default, functions using the Node.js runtime execute in Washington, D.C., USA (`iad1`), a common location for external data sources. You can set a new region through your [project's settings on Vercel](/docs/functions/configuring-functions/region#setting-your-default-region).

## Viewing Vercel Function metrics

You can view various performance and cost efficiency metrics using Vercel Observability:

1. Choose your project from the [dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D\&title=Go+to+dashboard).
2. Click on the **Observability** tab and select the **Vercel Functions** section.
3. Click on the chevron icon to expand and see all charts.

From here, you'll be able to see total consumed and saved GB-Hours, and the ratio of the saved usage. When you have [fluid](/docs/fluid-compute) enabled, you will also see the amount of cost savings from the [optimized concurrency model](/docs/fluid-compute#optimized-concurrency).

## Pricing

Vercel Functions are priced based on active CPU, provisioned memory, and invocations. See the [fluid compute pricing](/docs/functions/usage-and-pricing) documentation for more information.

If your project is not using fluid compute, see the [legacy pricing documentation](/docs/functions/usage-and-pricing/legacy-pricing) for Vercel Functions.

## Related

- [What is compute?](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute)
- [Fluid compute](/docs/fluid-compute)
- [Runtimes](/docs/functions/runtimes)
- [Configuring functions](/docs/functions/configuring-functions)
- [Streaming](/docs/functions/streaming-functions)
- [Limits](/docs/functions/limitations)
- [Functions logs](/docs/functions/logs)
- [Debugging slow Vercel Functions](/docs/functions/debug-slow-functions)


---

[View full sitemap](/docs/sitemap)
