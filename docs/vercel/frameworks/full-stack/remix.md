---
title: Remix on Vercel
product: vercel
url: /docs/frameworks/full-stack/remix
type: conceptual
prerequisites:
  - /docs/frameworks/full-stack
  - /docs/frameworks
related:
  - /docs/functions/streaming-functions
  - /docs/cdn
  - /docs/cdn-cache
  - /docs/analytics
  - /docs/frameworks
summary: "Learn how to use Vercel's features with Remix."
---

# Remix on Vercel

Remix is a fullstack, [server-rendered](#server-side-rendering-ssr) React framework. Its built-in features for nested pages, error boundaries, transitions between loading states, and more, enable developers to create modern web apps.With Vercel, you can deploy server-rendered Remix and Remix V2 applications to Vercel with zero configuration. When using the [Remix Vite plugin](https://remix.run/docs/en/main/future/vite), static site generation using [SPA mode](https://remix.run/docs/en/main/future/spa-mode) is also supported.> **💡 Note:** It is **highly recommended** that your application uses the Remix Vite plugin,
> in conjunction with the [Vercel Preset](#vercel-vite-preset), when deploying
> to Vercel.## Getting started## `@vercel/remix`The [`@vercel/remix`](https://www.npmjs.com/package/@vercel/remix) package exposes useful types and utilities for Remix apps deployed on Vercel, such as:* [`json`](https://remix.run/docs/en/main/utils/json)
* [`defer`](https://remix.run/docs/en/main/utils/defer)
* [`createCookie`](https://remix.run/docs/en/main/utils/cookies#createcookie)To best experience Vercel features such as [streaming](#response-streaming), [Vercel Functions](#vercel-functions), and more, we recommend importing utilities from `@vercel/remix` rather than from standard Remix packages such as `@remix-run/node`.`@vercel/remix` should be used anywhere in your code that you normally would import utility functions from the following packages:* [`@remix-run/node`](https://www.npmjs.com/package/@remix-run/node)
* [`@remix-run/cloudflare`](https://www.npmjs.com/package/@remix-run/cloudflare)
* [`@remix-run/server-runtime`](https://www.npmjs.com/package/@remix-run/server-runtime)To get started, navigate to the root directory of your Remix project with your terminal and install `@vercel/remix` with your preferred package manager:<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/remix
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/remix
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/remix
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/remix
    ```
  </Code>
</CodeBlock>## Vercel Vite PresetWhen using the [Remix Vite plugin](https://remix.run/docs/en/main/future/vite) (highly recommended), you should configure the Vercel Preset to enable the full feature set that Vercel offers.To configure the Preset, add the following lines to your `vite.config` file:```ts {5-5,12-12} filename="/vite.config.ts"
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { vercelPreset } from '@vercel/remix/vite';

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
    }),
    tsconfigPaths(),
  ],
});
```Using this Preset enables Vercel-specific functionality such as rendering your Remix application with Vercel Functions.## Server-Side Rendering (SSR)Server-Side Rendering (SSR) allows you to render pages dynamically on the server. This is useful for pages where the rendered data needs to be unique on every request. For example, checking authentication or looking at the location of an incoming request.Remix routes defined in `app/routes` are deployed with server-side rendering by default.The following example demonstrates a basic route that renders with SSR:```tsx filename="/app/routes/_index.tsx" framework=all
export default function IndexRoute() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>This route is rendered on the server</h1>
    </div>
  );
}
``````jsx filename="/app/routes/_index.jsx" framework=all
export default function IndexRoute() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>This route is rendered on the server</h1>
    </div>
  );
}
```### Vercel FunctionsVercel Functions execute using Node.js. They enable developers to write functions that use resources that scale up and down based on traffic demands. This prevents them from failing during peak hours, but keeps them from running up high costs during periods of low activity.Remix API routes in `app/routes` are deployed as Vercel Functions by default.The following example demonstrates a basic route that renders a page with the heading, "Welcome to Remix with Vercel":```tsx filename="/app/routes/serverless-example.tsx" framework=all
export default function Serverless() {
  return <h1>Welcome to Remix with Vercel</h1>;
}
``````jsx filename="/app/routes/serverless-example.jsx" framework=all
export default function Serverless() {
  return <h1>Welcome to Remix with Vercel</h1>;
}
```**To summarize, Server-Side Rendering (SSR) with Remix on Vercel:*** Scales to zero when not in use
* Scales automatically with traffic increases
* Has framework-aware infrastructure to generate Vercel Functions## Response streaming[Streaming HTTP responses](/docs/functions/streaming-functions "HTTP Streams")with Remix on Vercel is supported with Vercel Functions. See the
[Streaming](https://remix.run/docs/en/main/guides/streaming) page in the Remix
docs for general instructions.The following example demonstrates a route that simulates a throttled network by delaying a promise's result, and renders a loading state until the promise is resolved:```tsx filename="/app/routes/defer-route.tsx" framework=all
import { Suspense } from 'react';
import { Await, useLoaderData } from '@remix-run/react';
import { defer } from '@vercel/remix';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loader({ request }) {
  const version = process.versions.node;

  return defer({
    // Don't let the promise resolve for 1 second
    version: sleep(1000).then(() => version),
  });
}

export default function DeferredRoute() {
  const { version } = useLoaderData();

  return (
    <Suspense fallback={'Loading…'}>
      <Await resolve={version}>{(version) => <strong>{version}</strong>}</Await>
    </Suspense>
  );
}
``````jsx filename="/app/routes/defer-route.jsx" framework=all
import { Suspense } from 'react';
import { Await, useLoaderData } from '@remix-run/react';
import { defer } from '@vercel/remix';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loader({ request }) {
  const version = process.versions.node;

  return defer({
    // Don't let the promise resolve for 1 second
    version: sleep(1000).then(() => version),
  });
}

export default function DeferredRoute() {
  const { version } = useLoaderData();

  return (
    <Suspense fallback={'Loading…'}>
      <Await resolve={version}>{(version) => <strong>{version}</strong>}</Await>
    </Suspense>
  );
}
```**To summarize, Streaming with Remix on Vercel:*** Offers faster Function response times, improving your app's user experience
* Allows you to return large amounts of data without exceeding Vercel Function response size limits
* Allows you to display Instant Loading UI from the server with Remix's `defer()` and `Await`[Learn more about Streaming](/docs/functions/streaming-functions)## `Cache-Control` headersVercel's [CDN](/docs/cdn) caches your content at the edge in order to serve data to your users as fast as possible. [Static caching](/docs/cdn-cache#static-files-caching) works with zero configuration.By adding a `Cache-Control` header to responses returned by your Remix routes, you can specify a set of caching rules for both client (browser) requests and server responses. A cache must obey the requirements defined in the Cache-Control header.Remix supports header modifications with the [`headers`](https://remix.run/docs/en/main/route/headers) function, which you can export in your routes defined in `app/routes`.The following example demonstrates a route that adds `Cache Control` headers which instruct the route to:* Return cached content for requests repeated within 1 second without revalidating the content
* For requests repeated after 1 second, but before 60 seconds have passed, return the cached content and mark it as stale. The stale content will be revalidated in the background with a fresh value from your [`loader`](https://remix.run/docs/en/1.14.0/route/loader) function```tsx filename="/app/routes/example.tsx" framework=all
import type { HeadersFunction } from '@vercel/remix';

export const headers: HeadersFunction = () => ({
  'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
});

export async function loader() {
  // Fetch data necessary to render content
}
``````jsx filename="/app/routes/example.jsx" framework=all
export const headers = () => ({
  'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
});

export async function loader() {
  // Fetch data necessary to render content
}
```See [our docs on cache limits](/docs/cdn-cache#limits) to learn the max size and lifetime of caches stored on Vercel.**To summarize, using `Cache-Control` headers with Remix on Vercel:*** Allow you to cache responses for server-rendered Remix apps using Vercel Functions
* Allow you to serve content from the cache *while updating the cache in the background* with `stale-while-revalidate`[Learn more about caching](/docs/cdn-cache#how-to-cache-responses)## AnalyticsVercel's Analytics features enable you to visualize and monitor your application's performance over time. The Analytics tab in your project's dashboard offers detailed insights into your website's visitors, with metrics like top pages, top referrers, and user demographics.To use Analytics, navigate to the Analytics tab of your project dashboard on Vercel and select **Enable** in the modal that appears.To track visitors and page views, we recommend first installing our `@vercel/analytics` package by running the terminal command below in the root directory of your Remix project:<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/analytics
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/analytics
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/analytics
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/analytics
    ```
  </Code>
</CodeBlock>Then, follow the instructions below to add the `Analytics` component to your app. The `Analytics` component is a wrapper around Vercel's tracking script, offering a seamless integration with Remix.Add the following component to your `root` file:```tsx filename="app/root.tsx" framework=all
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <html lang="en">
      <body>
        <Analytics />
      </body>
    </html>
  );
}
``````jsx filename="app/root.jsx" framework=all
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <html lang="en">
      <body>
        <Analytics />
      </body>
    </html>
  );
}
```**To summarize, Analytics with Remix on Vercel:*** Enables you to track traffic and see your top-performing pages
* Offers you detailed breakdowns of visitor demographics, including their OS, browser, geolocation and more[Learn more about Analytics](/docs/analytics)## Using a custom `app/entry.server` fileBy default, Vercel supplies an implementation of the `entry.server` file which is configured
for streaming to work with Vercel Functions. This version will be used when
no `entry.server` file is found in the project, or when the existing `entry.server` file has
not been modified from the base Remix template.However, if your application requires a customized `app/entry.server.jsx` or `app/entry.server.tsx`
file (for example, to wrap the `<RemixServer>` component with a React context), you should
base it off of this template:```tsx filename="/app/entry.server.tsx" framework=all
import { RemixServer } from '@remix-run/react';
import { handleRequest, type EntryContext } from '@vercel/remix';

export default async function (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  let remixServer = <RemixServer context={remixContext} url={request.url} />;
  return handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixServer,
  );
}
``````jsx filename="/app/entry.server.jsx" framework=all
import { RemixServer } from '@remix-run/react';
import { handleRequest } from '@vercel/remix';

export default async function (
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  let remixServer = <RemixServer context={remixContext} url={request.url} />;
  return handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixServer,
  );
}
```## Using a custom `server` file> **💡 Note:** Defining a custom `server` file is not supported when using the Remix Vite
> plugin on Vercel.It's usually not necessary to define a custom server.js file within your Remix application when deploying to Vercel. In general, we do not recommend it.If your project requires a custom [`server`](https://remix.run/docs/en/main/file-conventions/remix-config#md-server) file, you will need to [install `@vercel/remix`](#@vercel/remix) and import `createRequestHandler` from `@vercel/remix/server`. The following example demonstrates a basic `server.js` file:```js filename="server.js" framework=all
import { createRequestHandler } from '@vercel/remix/server';
import * as build from '@remix-run/dev/server-build';

export default createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext() {
    return {
      nodeLoadContext: true,
    };
  },
});
``````ts filename="server.ts" framework=all
import { createRequestHandler } from '@vercel/remix/server';
import * as build from '@remix-run/dev/server-build';

export default createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext() {
    return {
      nodeLoadContext: true,
    };
  },
});
```## More benefitsSee [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.## More resourcesLearn more about deploying Remix projects on Vercel with the following resources:* [Explore Remix in a monorepo](/templates/remix/turborepo-kitchensink)
* [Deploy our Product Roadmap template](/templates/remix/roadmap-voting-app-rowy)
* [Explore the Remix docs](https://remix.run/docs/en/main)


---

[View full sitemap](/docs/sitemap)
