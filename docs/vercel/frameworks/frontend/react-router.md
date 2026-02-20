---
title: React Router on Vercel
product: vercel
url: /docs/frameworks/frontend/react-router
type: conceptual
prerequisites:
  - /docs/frameworks/frontend
  - /docs/frameworks
related:
  - /docs/functions
  - /docs/fluid-compute
  - /docs/functions/streaming-functions
  - /docs/functions/streaming
  - /docs/cdn
summary: "Learn how to use Vercel's features with React Router as a framework."
---

# React Router on Vercel

React Router is a multi-strategy router for React. When used [as a framework](https://reactrouter.com/home#react-router-as-a-framework), React Router enables fullstack, [server-rendered](#server-side-rendering-ssr) React applications. Its built-in features for nested pages, error boundaries, transitions between loading states, and more, enable developers to create modern web apps.With Vercel, you can deploy React Router applications with server-rendering or static site generation (using [SPA mode](https://reactrouter.com/how-to/spa)) to Vercel with zero configuration.> **💡 Note:** It is **highly recommended** that your application uses the [Vercel
> Preset](#vercel-react-router-preset) when deploying to Vercel.## `@vercel/react-router`The optional `@vercel/react-router` package contains Vercel specific utilities for use in React Router applications. The package contains various entry points for specific use cases:* `@vercel/react-router/vite` import
  - Contains the [Vercel Preset](#vercel-react-router-preset) to enhance React Router functionality on Vercel
* `@vercel/react-router/entry.server` import
  - For situations where you need to [define a custom `entry.server` file](#using-a-custom-app/entry.server-file).To get started, navigate to the root directory of your React Router project with your terminal and install `@vercel/react-router` with your preferred package manager:<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/react-router
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/react-router
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/react-router
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/react-router
    ```
  </Code>
</CodeBlock>## Vercel React Router PresetWhen using the [React Router](https://reactrouter.com/start/framework/installation) as a framework, you should configure the Vercel Preset to enable the full feature set that Vercel offers.To configure the Preset, add the following lines to your `react-router.config` file:```ts {1-1,8-8} filename="/react-router.config.ts"
import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
```When this Preset is configured, your React Router application is enhanced with Vercel-specific functionality:* Allows function-level configuration (i.e. `memory`, `maxDuration`, etc.) on a per-route basis
* Allows Vercel to understand the routing structure of the application, which allows for bundle splitting
* Accurate "Deployment Summary" on the deployment details page## Server-Side Rendering (SSR)Server-Side Rendering (SSR) allows you to render pages dynamically on the server. This is useful for pages where the rendered data needs to be unique on every request. For example, checking authentication or looking at the location of an incoming request. Server-Side Rendering is invoked using [Vercel Functions](/docs/functions).[Routes](https://reactrouter.com/start/framework/routing) defined in your application are deployed with server-side rendering by default.The following example demonstrates a basic route that renders with SSR:```ts filename="/app/routes.ts" framework=all
import { type RouteConfig, index } from '@react-router/dev/routes';

export default [index('routes/home.tsx')] satisfies RouteConfig;
``````js filename="/app/routes.js" framework=all
import { index } from '@react-router/dev/routes';

export default [index('routes/home.jsx')];
``````tsx filename="/app/routes/home.tsx" framework=all
import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  return <Welcome />;
}
``````jsx filename="/app/routes/home.jsx" framework=all
import { Welcome } from '../welcome/welcome';

export function meta({}) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  return <Welcome />;
}
```**To summarize, Server-Side Rendering (SSR) with React Router on Vercel:*** Scales to zero when not in use
* Scales automatically with traffic increases
* Has framework-aware infrastructure to generate Vercel Functions
* Supports the use of Vercel's [Fluid compute](/docs/fluid-compute) for enhanced performance## Response streaming[Streaming HTTP responses](/docs/functions/streaming-functions "HTTP Streams")with React Router on Vercel is supported with Vercel Functions. See the
[Streaming with Suspense](https://reactrouter.com/how-to/suspense) page in the
React Router docs for general instructions.**Streaming with React Router on Vercel:*** Offers faster Function response times, improving your app's user experience
* Allows you to return large amounts of data without exceeding Vercel Function response size limits
* Allows you to display Instant Loading UI from the server with React Router's `<Await>`[Learn more about Streaming](/docs/functions/streaming)## `Cache-Control` headersVercel's [CDN](/docs/cdn) caches your content at the edge in order to serve data to your users as fast as possible. [Static caching](/docs/cdn-cache#static-files-caching) works with zero configuration.By adding a `Cache-Control` header to responses returned by your React Router routes, you can specify a set of caching rules for both client (browser) requests and server responses. A cache must obey the requirements defined in the Cache-Control header.React Router supports defining response headers by exporting a [headers](https://reactrouter.com/how-to/headers) function within a route.The following example demonstrates a route that adds `Cache-Control` headers which instruct the route to:* Return cached content for requests repeated within 1 second without revalidating the content
* For requests repeated after 1 second, but before 60 seconds have passed, return the cached content and mark it as stale. The stale content will be revalidated in the background with a fresh value from your [`loader`](https://reactrouter.com/start/framework/route-module#loader) function```tsx filename="/app/routes/example.tsx" framework=all
import { Route } from './+types/some-route';

export function headers(_: Route.HeadersArgs) {
  return {
    'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
  };
}

export async function loader() {
  // Fetch data necessary to render content
}
``````jsx filename="/app/routes/example.jsx" framework=all
export function headers(_) {
  return {
    'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
  };
}

export async function loader() {
  // Fetch data necessary to render content
}
```See [our docs on cache limits](/docs/cdn-cache#limits) to learn the max size and lifetime of caches stored on Vercel.**To summarize, using `Cache-Control` headers with React Router on Vercel:*** Allow you to cache responses for server-rendered React Router apps using Vercel Functions
* Allow you to serve content from the cache *while updating the cache in the background* with `stale-while-revalidate`[Learn more about caching](/docs/cdn-cache#how-to-cache-responses)## Analytics[Vercel's Analytics](/docs/analytics) features enable you to visualize and monitor your application's performance over time. The Analytics tab in your project's dashboard offers detailed insights into your website's visitors, with metrics like top pages, top referrers, and user demographics.To use Analytics, navigate to the Analytics tab of your project dashboard on Vercel and select **Enable** in the modal that appears.To track visitors and page views, we recommend first installing our `@vercel/analytics` package by running the terminal command below in the root directory of your React Router project:<CodeBlock>
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
</CodeBlock>Then, follow the instructions below to add the `Analytics` component to your app. The `Analytics` component is a wrapper around Vercel's tracking script, offering a seamless integration with React Router.Add the following component to your `root` file:```tsx filename="app/root.tsx" framework=all
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
```**To summarize, Analytics with React Router on Vercel:*** Enables you to track traffic and see your top-performing pages
* Offers you detailed breakdowns of visitor demographics, including their OS, browser, geolocation and more[Learn more about Analytics](/docs/analytics)## Using a custom server entrypointYour React Router application may define a custom server entrypoint, which is useful
for supplying a "load context" for use by the application's loaders and actions.The server entrypoint file is expected to export a Web API-compatible function that
matches the following signature:```ts
export default async function (request: Request) => Response | Promise<Response>;
```To implement a server entrypoint using the [Hono web framework](https://hono.dev), follow these steps:First define the `build.rollupOptions.input` property in your Vite config file:```ts {7-13} filename="/vite.config.ts" framework=all
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: './server/app.ts',
        }
      : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}));
``````js {7-13} filename="/vite.config.js" framework=all
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: './server/app.js',
        }
      : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}));
```Then, create the server entrypoint file:```ts filename="/server/app.ts" framework=all
import { Hono } from 'hono';
import { createRequestHandler } from 'react-router';

// @ts-expect-error - virtual module provided by React Router at build time
import * as build from 'virtual:react-router/server-build';

declare module 'react-router' {
  interface AppLoadContext {
    VALUE_FROM_HONO: string;
  }
}

const app = new Hono();

// Add any additional Hono middleware here

const handler = createRequestHandler(build);
app.mount('/', (req) =>
  handler(req, {
    // Add your "load context" here based on the current request
    VALUE_FROM_HONO: 'Hello from Hono',
  }),
);

export default app.fetch;
``````js filename="/server/app.js" framework=all
import { Hono } from 'hono';
import { createRequestHandler } from 'react-router';

import * as build from 'virtual:react-router/server-build';

const app = new Hono();

// Add any additional Hono middleware here

const handler = createRequestHandler(build);
app.mount('/', (req) =>
  handler(req, {
    // Add your "load context" here based on the current request
    VALUE_FROM_HONO: 'Hello from Hono',
  }),
);

export default app.fetch;
```**To summarize, using a custom server entrypoint with React Router on Vercel allows you to:*** Supply a "load context" for use in your `loader` and `action` functions
* Use a Web API-compatible framework alongside your React Router application## Using a custom `app/entry.server` fileBy default, Vercel supplies an implementation of the `entry.server` file which is configured
for streaming to work with Vercel Functions. This version will be used when
no `entry.server` file is found in the project.However, your application may define a customized `app/entry.server.jsx` or `app/entry.server.tsx`
file if necessary. When doing so, your custom `entry.server` file should use the `handleRequest`
function exported by `@vercel/react-router/entry.server`.For example, to supply the `nonce` option and set the corresponding `Content-Security-Policy` response header:```tsx filename="/app/entry.server.tsx" framework=all
import { handleRequest } from '@vercel/react-router/entry.server';
import type { AppLoadContext, EntryContext } from 'react-router';

export default async function (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext?: AppLoadContext,
): Promise<Response> {
  const nonce = crypto.randomUUID();
  const response = await handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    routerContext,
    loadContext,
    { nonce },
  );
  response.headers.set(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}'`,
  );
  return response;
}
``````jsx filename="/app/entry.server.jsx" framework=all
import { handleRequest } from '@vercel/react-router/entry.server';

export default async function (
  request,
  responseStatusCode,
  responseHeaders,
  routerContext,
  loadContext,
) {
  const nonce = crypto.randomUUID();
  const response = await handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    routerContext,
    loadContext,
    { nonce },
  );
  response.headers.set(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}'`,
  );
  return response;
}
```## More benefitsSee [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.## More resourcesLearn more about deploying React Router projects on Vercel with the following resources:* [Explore the React Router docs](https://reactrouter.com/home)


---

[View full sitemap](/docs/sitemap)
